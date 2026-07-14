#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runMeasurementControlDryRun, CONTROL_DRY_RUN_SCHEMA_VERSION } from './run-measurement-control-dry-run.mjs';
import { generateManifest, verifyManifest } from './generate-evidence-manifest.mjs';

const report = runMeasurementControlDryRun();
const slots = report.attempts.map((attempt) => attempt.plannedSlotId).join(',');
const local = report.schemaVersion === CONTROL_DRY_RUN_SCHEMA_VERSION && report.purpose === 'HARNESS_OVERHEAD_CONTROL_ONLY' && report.interpretation === 'NOT_A_BENCHMARK_RESULT' && report.camera === 'NOT_OPENED' && report.network === 'NOT_OPENED' && slots === 'CONTROL-1,CONTROL-2,CONTROL-3' && report.attempts.every((attempt) => Number.isSafeInteger(attempt.elapsedNanoseconds) && attempt.elapsedNanoseconds >= 0);
console.log(`${local ? 'PASS' : 'FAIL'}: three-fixed-control-attempts`);
const cli = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'run-measurement-control-dry-run.mjs')], { encoding: 'utf8', shell: false });
const cliPass = cli.status === 0 && cli.stdout.includes('CONTROL_DRY_RUN_OK: attempts=3');
console.log(`${cliPass ? 'PASS' : 'FAIL'}: cli-control-run`);
let negative = false;
try { runMeasurementControlDryRun({ spawn: () => ({ status: 1, stdout: '' }) }); } catch (error) { negative = error.message === 'CONTROL_WORKER_FAILED'; }
console.log(`${negative ? 'PASS' : 'FAIL'}: worker-failure-rejected`);
const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-control-dry-run-'));
let evidence = false;
try {
  mkdirSync(join(root, 'artifacts'));
  writeFileSync(join(root, 'artifacts', 'control-dry-run.json'), `${JSON.stringify(report)}\n`);
  writeFileSync(join(root, 'artifact-list.json'), JSON.stringify({ schemaVersion: 'm0-evidence-artifact-list/0.1.0', artifacts: [{ path: 'artifacts/control-dry-run.json', type: 'resource-trace' }] }));
  generateManifest(root, 'artifact-list.json', 'manifests/control-dry-run.json');
  evidence = verifyManifest(root, 'manifests/control-dry-run.json', true).entryCount === 1;
} finally { rmSync(root, { recursive: true, force: true }); }
console.log(`${evidence ? 'PASS' : 'FAIL'}: scanner-manifest-verified-report`);
if (!local || !cliPass || !negative || !evidence) { process.exitCode = 1; } else console.log('CONTROL_DRY_RUN_FIXTURES_PASSED: 4');
