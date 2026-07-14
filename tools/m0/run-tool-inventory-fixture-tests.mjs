#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildMeasurementToolInventory, collectMeasurementToolInventory, TOOL_INVENTORY_SCHEMA_VERSION } from './collect-measurement-tool-inventory.mjs';
import { scanArtifact } from './scan-evidence-artifact.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const collector = join(directory, 'collect-measurement-tool-inventory.mjs');
const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-tool-inventory-'));
const fixedTime = '2026-07-14T00:00:00.000Z';
const outputs = new Map([
  ['node', 'v24.12.0\n'], ['wpr', 'Windows Performance Recorder'], ['xperf', ''], ['logman', ''], ['wevtutil', ''],
]);
const probe = (definition) => ({ availability: definition.toolId === 'xperf' ? 'NOT_FOUND' : 'AVAILABLE', output: outputs.get(definition.toolId) ?? '' });
let failures = 0;
let skips = 0;
function test(name, predicate) { const passed = Boolean(predicate); console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`); if (!passed) failures += 1; }

try {
  const inventory = buildMeasurementToolInventory({ probe, collectedAtUtc: fixedTime });
  test('schema-and-fixed-allowlist', inventory.schemaVersion === TOOL_INVENTORY_SCHEMA_VERSION && inventory.tools.map((item) => item.toolId).join(',') === 'node,wpr,xperf,logman,wevtutil');
  test('version-is-normalized-not-raw-output', inventory.tools[0].version === 'v24.12.0' && !JSON.stringify(inventory).includes('Windows Performance Recorder'));
  test('no-machine-or-command-identifiers', !/(?:source|command|path|hostname|username)/i.test(JSON.stringify(inventory)));

  collectMeasurementToolInventory(root, 'artifacts/tool-inventory.json', { probe, collectedAtUtc: fixedTime });
  const artifact = join(root, 'artifacts', 'tool-inventory.json');
  const persisted = JSON.parse(readFileSync(artifact, 'utf8'));
  test('safe-artifact-written', existsSync(artifact) && scanArtifact('resource-trace', artifact).ok && persisted.collectedAtUtc === fixedTime);

  let unsafeCode = '';
  try { collectMeasurementToolInventory(root, '../tool-inventory.json', { probe, collectedAtUtc: fixedTime }); } catch (error) { unsafeCode = error.code; }
  test('unsafe-output-rejected-without-write', unsafeCode === 'UNSAFE_OUTPUT_PATH' && !existsSync(join(root, '..', 'tool-inventory.json')));

  const junctionRoot = mkdtempSync(join(tmpdir(), 'eyemate-m0-tool-inventory-junction-'));
  const outside = mkdtempSync(join(tmpdir(), 'eyemate-m0-tool-inventory-outside-'));
  try {
    symlinkSync(outside, join(junctionRoot, 'artifacts'), 'junction');
    let junctionCode = '';
    try { collectMeasurementToolInventory(junctionRoot, 'artifacts/tool-inventory.json', { probe, collectedAtUtc: fixedTime }); } catch (error) { junctionCode = error.code; }
    test('junction-output-rejected-without-outside-write', junctionCode === 'UNSAFE_SYMLINK' && !existsSync(join(outside, 'tool-inventory.json')));
  } catch (error) { console.log(`SKIP: junction-output-rejected (${error.code ?? 'UNAVAILABLE'})`); skips += 1; } finally { rmSync(junctionRoot, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }

  const cliRoot = mkdtempSync(join(tmpdir(), 'eyemate-m0-tool-inventory-cli-'));
  try {
    const result = spawnSync(process.execPath, [collector, 'collect', cliRoot, 'artifacts/tool-inventory.json'], { encoding: 'utf8', shell: false });
    test('cli-actual-local-probe', result.status === 0 && result.stdout.includes('INVENTORY_CREATED') && scanArtifact('resource-trace', join(cliRoot, 'artifacts', 'tool-inventory.json')).ok);
  } finally { rmSync(cliRoot, { recursive: true, force: true }); }
} finally { rmSync(root, { recursive: true, force: true }); }

if (failures > 0) { console.error(`TOOL_INVENTORY_FIXTURE_FAILURES: ${failures}`); process.exitCode = 1; } else console.log(`TOOL_INVENTORY_FIXTURE_TESTS_PASSED: ${7 - skips}; SKIPPED: ${skips}`);
