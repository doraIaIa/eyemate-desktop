#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_ARTIFACT_TYPES, SCANNER_VERSION, scanArtifactBytes } from './scan-evidence-artifact.mjs';

export const MANIFEST_SCHEMA_VERSION = 'm0-evidence-manifest/0.1.0';
export const ARTIFACT_LIST_SCHEMA_VERSION = 'm0-evidence-artifact-list/0.1.0';
const RESERVED_PATH_SEGMENTS = new Set(['user', 'users', 'profile', 'profiles']);

class ToolError extends Error {
  constructor(code, exitCode = 1) { super(code); this.code = code; this.exitCode = exitCode; }
}

function safeRelativePath(value, prefix = '') {
  if (typeof value !== 'string' || value.length === 0 || isAbsolute(value) || value.includes('\\') || value.includes(':')
    || value.includes('..') || value.includes('//') || value.split('/').some((part) => part === '.' || part === '')) return false;
  return (prefix === '' || value.startsWith(prefix)) && !value.split('/').some((part) => RESERVED_PATH_SEGMENTS.has(part.toLowerCase()));
}

function rootPath(rootInput) {
  try {
    if (lstatSync(rootInput).isSymbolicLink()) throw new Error('symlink');
    const root = realpathSync(rootInput);
    if (!lstatSync(root).isDirectory()) throw new Error('not-directory');
    return root;
  } catch { throw new ToolError('EVIDENCE_ROOT_UNREADABLE', 2); }
}

function insideRoot(root, input, code, allowMissingFinal = false) {
  if (!safeRelativePath(input)) throw new ToolError(code);
  const target = resolve(root, input);
  if (relative(root, target).startsWith(`..${sep}`) || relative(root, target) === '..') throw new ToolError(code);
  const segments = input.split('/');
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
    } catch (error) {
      if (error instanceof ToolError) throw error;
      if (allowMissingFinal && index === segments.length - 1) continue;
      throw new ToolError('INPUT_UNREADABLE', 2);
    }
  }
  return target;
}

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function collisionKey(path) { return path.toLowerCase(); }

function artifactSnapshot(path) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
  return { dev: stats.dev, ino: stats.ino, size: stats.size, mtimeMs: stats.mtimeMs, ctimeMs: stats.ctimeMs };
}

function sameSnapshot(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function readStableArtifact(path) {
  try {
    const before = artifactSnapshot(path);
    const bytes = readFileSync(path);
    const after = artifactSnapshot(path);
    if (!sameSnapshot(before, after)) throw new ToolError('TOCTOU_ARTIFACT_CHANGED');
    return { bytes, snapshot: after };
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError('ARTIFACT_UNREADABLE', 2);
  }
}

function assertUnchanged(path, snapshot) {
  try {
    if (!sameSnapshot(snapshot, artifactSnapshot(path))) throw new ToolError('TOCTOU_ARTIFACT_CHANGED');
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError('TOCTOU_ARTIFACT_CHANGED');
  }
}

function readArtifactList(root, listPath) {
  const path = insideRoot(root, listPath, 'UNSAFE_ARTIFACT_LIST');
  let list;
  try { list = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new ToolError('INVALID_ARTIFACT_LIST', 2); }
  if (!list || list.schemaVersion !== ARTIFACT_LIST_SCHEMA_VERSION || !Array.isArray(list.artifacts) || list.artifacts.length === 0) {
    throw new ToolError('INVALID_ARTIFACT_LIST');
  }
  return list.artifacts;
}

function buildEntries(root, artifacts, afterHash) {
  const paths = new Map();
  const entries = artifacts.map((artifact) => {
    if (!artifact || !ALLOWED_ARTIFACT_TYPES.has(artifact.type) || !safeRelativePath(artifact.path, 'artifacts/')) {
      throw new ToolError('INVALID_ARTIFACT_DECLARATION');
    }
    const key = collisionKey(artifact.path);
    if (paths.has(key)) throw new ToolError(paths.get(key) === artifact.path ? 'DUPLICATE_NORMALIZED_PATH' : 'WINDOWS_PATH_COLLISION');
    paths.set(key, artifact.path);
    const path = insideRoot(root, artifact.path, 'UNSAFE_ARTIFACT_PATH');
    const artifactFile = readStableArtifact(path);
    const scan = scanArtifactBytes(artifact.type, artifactFile.bytes);
    if (!scan.ok) throw new ToolError(`SCANNER_REJECTED_${scan.code}`);
    const entry = { path: artifact.path, type: artifact.type, byteSize: artifactFile.bytes.length, sha256: sha256(artifactFile.bytes), scannerVersion: SCANNER_VERSION };
    afterHash?.(path);
    assertUnchanged(path, artifactFile.snapshot);
    return entry;
  });
  return entries.sort((left, right) => left.path.localeCompare(right.path) || left.type.localeCompare(right.type));
}

function writeAtomic(path, text) {
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, path);
  } catch (error) {
    try { unlinkSync(temporary); } catch { /* no temporary file */ }
    if (error instanceof ToolError) throw error;
    throw new ToolError('MANIFEST_WRITE_FAILED', 2);
  }
}

export function generateManifest(rootInput, listPath, manifestPath, options = {}) {
  const root = rootPath(rootInput);
  const artifacts = readArtifactList(root, listPath);
  const entries = buildEntries(root, artifacts, options.afterHash);
  if (!safeRelativePath(manifestPath) || !manifestPath.startsWith('manifests/') || !manifestPath.includes('/')) throw new ToolError('UNSAFE_MANIFEST_PATH');
  const parentRelative = manifestPath.split('/').slice(0, -1).join('/');
  const parent = insideRoot(root, parentRelative, 'UNSAFE_MANIFEST_PATH', true);
  try { mkdirSync(parent, { recursive: true }); } catch { throw new ToolError('MANIFEST_DIRECTORY_FAILED', 2); }
  const output = insideRoot(root, manifestPath, 'UNSAFE_MANIFEST_PATH', true);
  const manifest = { schemaVersion: MANIFEST_SCHEMA_VERSION, scannerVersion: SCANNER_VERSION, entryCount: entries.length, entries };
  writeAtomic(output, stableJson(manifest));
  return manifest;
}

function readManifest(root, manifestPath) {
  const path = insideRoot(root, manifestPath, 'UNSAFE_MANIFEST_PATH');
  let manifest;
  try { manifest = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new ToolError('INVALID_MANIFEST', 2); }
  if (!manifest || manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) throw new ToolError('UNSUPPORTED_MANIFEST_SCHEMA');
  if (manifest.scannerVersion !== SCANNER_VERSION || !Array.isArray(manifest.entries) || manifest.entryCount !== manifest.entries.length) {
    throw new ToolError('INVALID_MANIFEST');
  }
  return manifest;
}

function walkArtifacts(root) {
  const directory = insideRoot(root, 'artifacts', 'UNSAFE_ARTIFACT_PATH');
  const paths = [];
  function walk(current, relativePath) {
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const nextRelative = `${relativePath}/${item.name}`;
      const next = insideRoot(root, nextRelative, 'UNSAFE_SYMLINK');
      if (item.isDirectory()) walk(next, nextRelative);
      else if (item.isFile()) paths.push(nextRelative);
      else throw new ToolError('UNSUPPORTED_ARTIFACT_NODE');
    }
  }
  walk(directory, 'artifacts');
  return paths.sort();
}

export function verifyManifest(rootInput, manifestPath, strict = false) {
  const root = rootPath(rootInput);
  const manifest = readManifest(root, manifestPath);
  const expected = new Map();
  const errors = [];
  for (const entry of manifest.entries) {
    if (!entry || !safeRelativePath(entry.path, 'artifacts/') || !ALLOWED_ARTIFACT_TYPES.has(entry.type)
      || !Number.isInteger(entry.byteSize) || entry.byteSize < 0 || !/^[0-9a-f]{64}$/i.test(entry.sha256 ?? '')
      || entry.scannerVersion !== SCANNER_VERSION) {
      errors.push('INVALID_MANIFEST_ENTRY');
      continue;
    }
    const key = collisionKey(entry.path);
    if (expected.has(key)) { errors.push(expected.get(key) === entry.path ? 'DUPLICATE_NORMALIZED_PATH' : 'WINDOWS_PATH_COLLISION'); continue; }
    expected.set(key, entry.path);
    try {
      const path = insideRoot(root, entry.path, 'UNSAFE_ARTIFACT_PATH');
      const artifactFile = readStableArtifact(path);
      const scan = scanArtifactBytes(entry.type, artifactFile.bytes);
      if (!scan.ok) errors.push(`SCANNER_REJECTED_${scan.code}`);
      if (artifactFile.bytes.length !== entry.byteSize) errors.push('SIZE_MISMATCH');
      if (sha256(artifactFile.bytes) !== entry.sha256) errors.push('HASH_MISMATCH');
      assertUnchanged(path, artifactFile.snapshot);
    } catch (error) { errors.push(error instanceof ToolError && error.code !== 'INPUT_UNREADABLE' ? error.code : 'ARTIFACT_MISSING'); }
  }
  if (strict) {
    try {
      for (const path of walkArtifacts(root)) if (!expected.has(collisionKey(path))) errors.push('UNDECLARED_ARTIFACT');
    } catch (error) { errors.push(error instanceof ToolError ? error.code : 'STRICT_SCAN_FAILED'); }
  }
  if (errors.length > 0) throw new ToolError([...new Set(errors)].join(','));
  return manifest;
}

function main() {
  const [command, root, firstPath, secondPath] = process.argv.slice(2);
  try {
    if (command === 'generate' && root && firstPath && secondPath) {
      const manifest = generateManifest(root, firstPath, secondPath);
      console.log(`MANIFEST_CREATED: entries=${manifest.entryCount} schema=${MANIFEST_SCHEMA_VERSION}`);
      return;
    }
    if (command === 'verify' && root && firstPath && (!secondPath || secondPath === '--strict')) {
      const manifest = verifyManifest(root, firstPath, secondPath === '--strict');
      console.log(`MANIFEST_VALID: entries=${manifest.entryCount} schema=${MANIFEST_SCHEMA_VERSION}`);
      return;
    }
    throw new ToolError('USAGE', 2);
  } catch (error) {
    const toolError = error instanceof ToolError ? error : new ToolError('UNEXPECTED_ERROR', 2);
    console.error(`${toolError.exitCode === 2 ? 'ERROR' : 'INVALID'}: ${toolError.code}`);
    process.exitCode = toolError.exitCode;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
