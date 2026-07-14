#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { initializeRunDirectory, INITIALIZATION_SCHEMA_VERSION } from './initialize-run-directory.mjs';
import { generateManifest, verifyManifest } from './generate-evidence-manifest.mjs';
import { scanArtifact } from './scan-evidence-artifact.mjs';
import { spawnSync } from 'node:child_process';

const directory = dirname(fileURLToPath(import.meta.url));
const validRun = join(directory, 'fixtures', 'valid-run.jsonl');
const forbidden = join(directory, 'fixtures', 'forbidden-artifact.json');
const metadata = { schemaVersion: INITIALIZATION_SCHEMA_VERSION, runId: '20260714T030000Z__electron__DP-DEV__WL-001-v1__r01', repository: 'eyemate-desktop', candidate: 'electron', deviceProfileId: 'DP-DEV', workloadId: 'WL-001', workloadVersion: '1.0.0', repetition: 1, commit: null, dirtyWorktree: false, commandId: 'm0.pipeline.synthetic' };
function root() { return mkdtempSync(join(tmpdir(), 'eyemate-m0-pipeline-')); }
function list(rootPath, path, type) { writeFileSync(join(rootPath, 'artifact-list.json'), JSON.stringify({ schemaVersion: 'm0-evidence-artifact-list/0.1.0', artifacts: [{ path, type }] })); }
function expectReject(name, code, action) { try { action(); console.error(`FAIL: ${name}`); return 1; } catch (error) { const ok = String(error.code ?? '').includes(code); console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} (${error.code ?? 'UNEXPECTED'})`); return ok ? 0 : 1; } }
function prepare(rootPath) { initializeRunDirectory(rootPath, metadata); mkdirSync(join(rootPath, 'artifacts')); cpSync(validRun, join(rootPath, 'artifacts', 'valid-run.jsonl')); list(rootPath, 'artifacts/valid-run.jsonl', 'run-record'); }
let failures = 0; const roots = [];
try {
  let current = root(); roots.push(current);
  failures += expectReject('initializer-invalid-metadata', 'INVALID_INITIALIZATION_METADATA', () => initializeRunDirectory(current, { ...metadata, candidate: '../bad' }));
  if (existsSync(join(current, 'runs'))) { console.error('FAIL: initializer-invalid-no-partial'); failures += 1; } else console.log('PASS: initializer-invalid-no-partial');

  current = root(); roots.push(current); mkdirSync(join(current, 'artifacts')); cpSync(forbidden, join(current, 'artifacts', 'forbidden.json'));
  const scan = scanArtifact('run-record', join(current, 'artifacts', 'forbidden.json'));
  if (scan.ok || !scan.code.includes('FORBIDDEN_FIELD')) { console.error('FAIL: scanner-forbidden'); failures += 1; } else console.log('PASS: scanner-forbidden');
  list(current, 'artifacts/forbidden.json', 'run-record');
  failures += expectReject('manifest-scanner-rejected', 'SCANNER_REJECTED', () => generateManifest(current, 'artifact-list.json', 'manifests/forbidden.json'));
  if (existsSync(join(current, 'manifests', 'forbidden.json'))) { console.error('FAIL: manifest-no-partial'); failures += 1; } else console.log('PASS: manifest-no-partial');

  current = root(); roots.push(current); prepare(current); generateManifest(current, 'artifact-list.json', 'manifests/synthetic.json'); writeFileSync(join(current, 'artifacts', 'valid-run.jsonl'), '{"changed":true}\n');
  failures += expectReject('verify-modified', 'HASH_MISMATCH', () => verifyManifest(current, 'manifests/synthetic.json', true));

  current = root(); roots.push(current); prepare(current); generateManifest(current, 'artifact-list.json', 'manifests/synthetic.json'); unlinkSync(join(current, 'artifacts', 'valid-run.jsonl'));
  failures += expectReject('verify-missing', 'ARTIFACT_MISSING', () => verifyManifest(current, 'manifests/synthetic.json', true));

  current = root(); roots.push(current); prepare(current);
  const validation = spawnSync(process.execPath, [join(directory, 'validate-evidence-schema.mjs'), join(current, 'artifacts', 'valid-run.jsonl')], { encoding: 'utf8' });
  if (validation.status !== 0) throw new Error('VALIDATOR_FAILED');
  generateManifest(current, 'artifact-list.json', 'manifests/synthetic.json'); verifyManifest(current, 'manifests/synthetic.json', true); verifyManifest(current, 'manifests/synthetic.json', true);
  if (!existsSync(join(current, 'runs', 'electron', 'DP-DEV', 'WL-001', metadata.runId, 'context.json'))) throw new Error('MISSING_CONTEXT');
  console.log('PASS: successful-pipeline-traceable');
} finally { for (const current of roots) rmSync(current, { recursive: true, force: true }); }
if (failures > 0) { console.error(`SYNTHETIC_PIPELINE_FAILURES:${failures}`); process.exitCode = 1; } else console.log('SYNTHETIC_PIPELINE_PASS: 9');
