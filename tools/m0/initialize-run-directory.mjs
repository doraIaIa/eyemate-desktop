#!/usr/bin/env node

import { lstatSync, mkdirSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const INITIALIZATION_SCHEMA_VERSION = 'm0-run-initialization/0.1.0';
export const INITIALIZER_VERSION = 'm0-run-directory-initializer/0.1.0';
const RESERVED = new Set(['user', 'users', 'profile', 'profiles', 'con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9']);

class ToolError extends Error { constructor(code, exitCode = 1) { super(code); this.code = code; this.exitCode = exitCode; } }
function safeSegment(value) { const base = typeof value === 'string' ? value.split('.')[0].toLowerCase() : ''; return typeof value === 'string' && value.length > 0 && value.length <= 80 && !/[. ]$/.test(value) && /^[A-Za-z0-9._-]+$/.test(value) && !RESERVED.has(base); }
function safeRelative(value) { return typeof value === 'string' && value.length > 0 && !isAbsolute(value) && !value.includes('\\') && !value.includes(':') && !value.includes('\0') && !value.includes('..') && !value.includes('//') && value.split('/').every((part) => safeSegment(part)); }
function safeRoot(rootInput) { try { if (lstatSync(rootInput).isSymbolicLink() || !lstatSync(rootInput).isDirectory()) throw new Error(); return resolve(rootInput); } catch { throw new ToolError('EVIDENCE_ROOT_UNREADABLE', 2); } }
function inside(root, child) {
  if (!safeRelative(child)) throw new ToolError('UNSAFE_CHILD_PATH');
  const target = resolve(root, child);
  if (relative(root, target).startsWith(`..${sep}`)) throw new ToolError('UNSAFE_CHILD_PATH');
  let current = root;
  for (const part of child.split('/')) { current = resolve(current, part); try { if (lstatSync(current).isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK'); } catch (error) { if (error instanceof ToolError) throw error; } }
  return target;
}
function validate(metadata) {
  if (!metadata || metadata.schemaVersion !== INITIALIZATION_SCHEMA_VERSION || !safeSegment(metadata.candidate) || !/^DP-[A-Z]+$/.test(metadata.deviceProfileId ?? '') || !/^WL-\d{3}$/.test(metadata.workloadId ?? '') || !/^\d+\.\d+\.\d+$/.test(metadata.workloadVersion ?? '') || !Number.isInteger(metadata.repetition) || metadata.repetition < 1) throw new ToolError('INVALID_INITIALIZATION_METADATA');
  const expected = `${metadata.candidate}__${metadata.deviceProfileId}__${metadata.workloadId}-v${metadata.workloadVersion.split('.')[0]}__r${String(metadata.repetition).padStart(2, '0')}`;
  if (!/^\d{8}T\d{6}Z__/.test(metadata.runId ?? '') || !metadata.runId.endsWith(expected)) throw new ToolError('INVALID_RUN_ID');
  if (metadata.commit !== null && !/^[0-9a-f]{40}$/i.test(metadata.commit ?? '')) throw new ToolError('INVALID_COMMIT');
  if (typeof metadata.dirtyWorktree !== 'boolean' || !safeSegment(metadata.repository ?? '') || !safeSegment(metadata.commandId ?? '')) throw new ToolError('INVALID_INITIALIZATION_METADATA');
}
function atomicJson(path, value) { const temp = `${path}.tmp-${process.pid}`; try { writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' }); renameSync(temp, path); } catch { try { rmSync(temp, { force: true }); } catch {} throw new ToolError('CONTEXT_WRITE_FAILED', 2); } }

export function initializeRunDirectory(rootInput, metadata, dryRun = false, hooks = {}) {
  validate(metadata); const root = safeRoot(rootInput);
  const runRelative = `runs/${metadata.candidate}/${metadata.deviceProfileId}/${metadata.workloadId}/${metadata.runId}`;
  const runDirectory = inside(root, runRelative);
  const layout = [runRelative, `${runRelative}/artifacts`, `${runRelative}/manifests`, `${runRelative}/reports`];
  if (dryRun) return { runRelative, layout, dryRun: true };
  let created = false;
  const createdParents = [];
  try {
    for (const parentRelative of ['runs', `runs/${metadata.candidate}`, `runs/${metadata.candidate}/${metadata.deviceProfileId}`, `runs/${metadata.candidate}/${metadata.deviceProfileId}/${metadata.workloadId}`]) {
      const parent = inside(root, parentRelative);
      try { lstatSync(parent); } catch { mkdirSync(parent, { mode: 0o700 }); createdParents.push(parent); }
    }
    mkdirSync(runDirectory, { recursive: false, mode: 0o700 }); created = true;
    for (const child of ['artifacts', 'manifests', 'reports']) mkdirSync(inside(root, `${runRelative}/${child}`), { mode: 0o700 });
    try { hooks.beforeContextWrite?.(runDirectory); } catch { throw new ToolError('CONTEXT_WRITE_FAILED', 2); }
    atomicJson(inside(root, `${runRelative}/context.json`), { ...metadata, initializedAtUtc: new Date().toISOString(), initializerVersion: INITIALIZER_VERSION, runRelative, artifactRefs: [] });
    return { runRelative, layout, dryRun: false };
  } catch (error) {
    if (created) { try { rmSync(runDirectory, { recursive: true, force: true }); for (const parent of createdParents.reverse()) rmdirSync(parent); } catch { throw new ToolError('INITIALIZATION_CLEANUP_FAILED', 2); } }
    throw error instanceof ToolError ? error : new ToolError('RUN_DIRECTORY_EXISTS');
  }
}

function main() { const [command, root, json, flag] = process.argv.slice(2); try { if (command !== 'init' || !root || !json || (flag && flag !== '--dry-run')) throw new ToolError('USAGE', 2); const result = initializeRunDirectory(root, JSON.parse(json), flag === '--dry-run'); console.log(`${result.dryRun ? 'DRY_RUN' : 'INITIALIZED'}: run=${result.runRelative}`); } catch (error) { const tool = error instanceof ToolError ? error : new ToolError('INVALID_METADATA_JSON', 2); console.error(`${tool.exitCode === 2 ? 'ERROR' : 'INVALID'}: ${tool.code}`); process.exitCode = tool.exitCode; } }
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
