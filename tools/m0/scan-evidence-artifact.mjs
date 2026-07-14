#!/usr/bin/env node

import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCANNER_VERSION = 'm0-artifact-scanner/0.1.0';
export const ALLOWED_ARTIFACT_TYPES = new Set([
  'run-record', 'device-snapshot', 'resource-trace', 'network-evidence',
  'privacy-scan-report', 'sqlite-migration', 'package-build', 'lifecycle-accessibility',
]);
const MAX_TEXT_BYTES = 1024 * 1024;
const FORBIDDEN_KEY = /(?:^|[\s,{])"?(?:raw[_-]?frame|raw[_-]?video|video[_-]?frame|raw[_-]?landmarks?|landmarks?|pixel[_-]?buffer|exact[_-]?per[_-]?frame[_-]?series|username|home[_-]?path|serial[_-]?number|device[_-]?instance[_-]?id|token|secret|private[_-]?key)"?\s*[:=]/im;
const FORBIDDEN_VALUE = /(?:[a-z]:\\users\\|\\\\[^\\]+\\|file:\/\/|\/users\/|\/home\/|authorization:|bearer\s+|-----begin [a-z ]*private key-----)/i;

function sameSnapshot(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function snapshot(path) {
  const stats = lstatSync(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('unsafe-file');
  return { dev: stats.dev, ino: stats.ino, size: stats.size, mtimeMs: stats.mtimeMs, ctimeMs: stats.ctimeMs };
}

export function scanArtifactBytes(type, bytes) {
  if (!ALLOWED_ARTIFACT_TYPES.has(type)) return { ok: false, code: 'UNKNOWN_ARTIFACT_TYPE', exitCode: 2 };
  if (!Buffer.isBuffer(bytes)) return { ok: false, code: 'INVALID_ARTIFACT_BYTES', exitCode: 2 };
  if (bytes.length > MAX_TEXT_BYTES) return { ok: false, code: 'ARTIFACT_TOO_LARGE', exitCode: 1 };
  if (bytes.includes(0)) {
    return { ok: false, code: 'BINARY_ARTIFACT', exitCode: 1 };
  }

  const text = bytes.toString('utf8');
  const codes = [];
  if (FORBIDDEN_KEY.test(text)) codes.push('FORBIDDEN_FIELD');
  if (FORBIDDEN_VALUE.test(text)) codes.push('FORBIDDEN_VALUE');

  if (codes.length > 0) {
    return { ok: false, code: codes.join(','), exitCode: 1 };
  }

  return { ok: true, code: 'SAFE', exitCode: 0, bytes: bytes.length };
}

export function scanArtifact(type, input) {
  let path;
  let before;
  let bytes;
  try {
    path = resolve(input);
    before = snapshot(path);
    bytes = readFileSync(path);
    if (!sameSnapshot(before, snapshot(path))) return { ok: false, code: 'ARTIFACT_CHANGED', exitCode: 1 };
  } catch {
    return { ok: false, code: 'INPUT_UNREADABLE', exitCode: 2 };
  }
  return scanArtifactBytes(type, bytes);
}

function main() {
  const [type, input] = process.argv.slice(2);
  if (!type || !input) {
    console.error('USAGE: node tools/m0/scan-evidence-artifact.mjs <artifact-type> <artifact-file>');
    process.exitCode = 2;
    return;
  }
  const result = scanArtifact(type, input);
  if (!result.ok) {
    console.error(`${result.exitCode === 2 ? 'ERROR' : 'REJECTED'}: ${result.code}`);
    process.exitCode = result.exitCode;
    return;
  }
  console.log(`SAFE: type=${type} bytes=${result.bytes}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
