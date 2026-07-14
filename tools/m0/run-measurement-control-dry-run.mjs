#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanArtifactBytes } from './scan-evidence-artifact.mjs';

export const CONTROL_DRY_RUN_SCHEMA_VERSION = 'm0-measurement-control-dry-run/0.1.0';
const worker = join(dirname(fileURLToPath(import.meta.url)), 'measurement-control-worker.mjs');

export function runMeasurementControlDryRun({ spawn = spawnSync, workerPath = worker } = {}) {
  const attempts = [];
  for (let slot = 1; slot <= 3; slot += 1) {
    const started = process.hrtime.bigint();
    const result = spawn(process.execPath, [workerPath], { encoding: 'utf8', shell: false, timeout: 3000, windowsHide: true });
    const elapsedNanoseconds = Number(process.hrtime.bigint() - started);
    if (result.status !== 0 || result.stdout !== 'CONTROL_WORKER_OK\n' || !Number.isSafeInteger(elapsedNanoseconds) || elapsedNanoseconds < 0) {
      throw new Error('CONTROL_WORKER_FAILED');
    }
    attempts.push({ plannedSlotId: `CONTROL-${slot}`, workerExitCode: 0, elapsedNanoseconds });
  }
  const report = { schemaVersion: CONTROL_DRY_RUN_SCHEMA_VERSION, purpose: 'HARNESS_OVERHEAD_CONTROL_ONLY', interpretation: 'NOT_A_BENCHMARK_RESULT', repetitionsPlanned: 3, camera: 'NOT_OPENED', network: 'NOT_OPENED', attempts };
  const scan = scanArtifactBytes('resource-trace', Buffer.from(`${JSON.stringify(report)}\n`, 'utf8'));
  if (!scan.ok) throw new Error(`SCANNER_REJECTED_${scan.code}`);
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { const report = runMeasurementControlDryRun(); console.log(`CONTROL_DRY_RUN_OK: attempts=${report.attempts.length}`); }
  catch (error) { console.error(`INVALID: ${error.message}`); process.exitCode = 1; }
}
