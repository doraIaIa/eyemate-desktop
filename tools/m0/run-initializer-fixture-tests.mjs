#!/usr/bin/env node

import { closeSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initializeRunDirectory, INITIALIZATION_SCHEMA_VERSION } from './initialize-run-directory.mjs';

const metadata = { schemaVersion: INITIALIZATION_SCHEMA_VERSION, runId: '20260714T000000Z__electron__DP-DEV__WL-001-v1__r01', repository: 'eyemate-desktop', candidate: 'electron', deviceProfileId: 'DP-DEV', workloadId: 'WL-001', workloadVersion: '1.0.0', repetition: 1, commit: null, dirtyWorktree: false, commandId: 'm0.run.initialize' };
function root() { return mkdtempSync(join(tmpdir(), 'eyemate-m0-init-')); }
function reject(name, code, action) { try { action(); console.error(`FAIL: ${name}`); return 1; } catch (error) { const ok = String(error.code).includes(code); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); return ok ? 0 : 1; } }
function worker(root, metadataFile, barrier) { return new Promise((resolve) => { const child = spawn(process.execPath, [fileURLToPath(new URL('./initializer-concurrent-worker.mjs', import.meta.url)), root, metadataFile, barrier], { shell: false }); let output = ''; child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { output += chunk; }); child.on('close', (code) => resolve({ code, output })); }); }
let failures = 0; const roots = [];
try {
  let current = root(); roots.push(current); const result = initializeRunDirectory(current, metadata); const context = join(current, result.runRelative, 'context.json'); if (!lstatSync(context).isFile()) throw new Error('context'); console.log('PASS: valid-layout');
  failures += reject('existing-run', 'RUN_DIRECTORY_EXISTS', () => initializeRunDirectory(current, metadata));
  current = root(); roots.push(current); const before = readdirSync(current).length; initializeRunDirectory(current, metadata, true); if (readdirSync(current).length !== before) throw new Error('dry-run-write'); console.log('PASS: dry-run');
  current = root(); roots.push(current); const metadataFile = join(current, 'metadata.json'); const barrier = join(current, 'barrier'); writeFileSync(metadataFile, JSON.stringify(metadata)); const concurrent = [worker(current, metadataFile, barrier), worker(current, metadataFile, barrier)]; closeSync(openSync(barrier, 'w')); const results = await Promise.all(concurrent); const codes = results.map((item) => item.code).sort().join(','); const count = readdirSync(join(current, 'runs', 'electron', 'DP-DEV', 'WL-001', metadata.runId)).filter((name) => name === 'context.json').length; console.log(`CONCURRENT_RESULTS: ${results.map((item) => `${item.code}:${item.output.trim()}`).join(' | ')}`); if (codes !== '0,1' || count !== 1) { console.error('FAIL: concurrent-create'); failures += 1; } else console.log('PASS: concurrent-create');
  current = root(); roots.push(current); failures += reject('invalid-run-id', 'INVALID_RUN_ID', () => initializeRunDirectory(current, { ...metadata, runId: '../bad' }));
  failures += reject('invalid-schema', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, schemaVersion: 'bad' }));
  failures += reject('traversal-candidate', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: '../bad' }));
  failures += reject('absolute-candidate', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: 'C:/bad' }));
  failures += reject('reserved-name', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: 'CON.txt' }));
  failures += reject('trailing-dot', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: 'electron.' }));
  failures += reject('length-boundary', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: 'a'.repeat(81) }));
  current = root(); roots.push(current); const parent = join(current, 'runs', 'electron', 'DP-DEV', 'WL-001'); mkdirSync(parent, { recursive: true }); writeFileSync(join(parent, 'sentinel.txt'), 'keep'); failures += reject('failure-cleanup', 'CONTEXT_WRITE_FAILED', () => initializeRunDirectory(current, metadata, false, { beforeContextWrite: () => { throw new Error('fixture'); } })); if (!lstatSync(join(parent, 'sentinel.txt')).isFile()) { console.error('FAIL: cleanup-preexisting-parent'); failures += 1; } else console.log('PASS: cleanup-preexisting-parent');
  current = root(); roots.push(current); const outside = root(); roots.push(outside); try { symlinkSync(outside, join(current, 'runs'), 'junction'); failures += reject('initializer-junction', 'UNSAFE_SYMLINK', () => initializeRunDirectory(current, metadata)); if (readdirSync(outside).length !== 0) { console.error('FAIL: junction-outside-write'); failures += 1; } else console.log('PASS: junction-outside-write'); } catch (error) { console.log(`SKIP: initializer-junction (${error.code ?? 'UNAVAILABLE'})`); }
} finally { for (const current of roots) rmSync(current, { recursive: true, force: true }); }
if (failures > 0) { console.error(`INITIALIZER_FIXTURE_TEST_FAILURES: ${failures}`); process.exitCode = 1; } else console.log('INITIALIZER_FIXTURE_TESTS_PASSED: 15');
