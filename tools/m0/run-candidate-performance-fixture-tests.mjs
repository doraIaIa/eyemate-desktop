#!/usr/bin/env node

import { runCandidatePerformance, PERFORMANCE_SCHEMA_VERSION } from './run-candidate-performance.mjs';
import { generateManifest, verifyManifest } from './generate-evidence-manifest.mjs';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let failures = 0;
function test(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`);
  if (!condition) failures += 1;
}

const fakeSample = (() => {
  let value = 0;
  return () => {
    value += 1;
    return { workingSetBytes: 1000 + value, cpuSeconds: value / 100, processCount: 1 };
  };
})();

const result = await runCandidatePerformance({
  candidateKeys: ['fixture'],
  candidates: { fixture: { executable: process.execPath, args: ['-e', 'setTimeout(() => {}, 80)', '--'] } },
  repetitions: 2,
  holdMs: 10,
  sampleIntervalMs: 20,
  sampleProcessTree: fakeSample,
  skipPackageBuild: true,
});

const report = result.report;
test('schema-and-purpose', report.schemaVersion === PERFORMANCE_SCHEMA_VERSION && report.camera === 'NOT_OPENED' && report.network === 'NOT_OPENED_BY_HARNESS');
test('two-fixed-attempts', report.results[0].attempts.map((attempt) => attempt.plannedSlotId).join(',') === 'FIXTURE-1,FIXTURE-2');
test('finite-metrics', report.results[0].attempts.every((attempt) => attempt.exitCode === 0 && Number.isSafeInteger(attempt.elapsedNanoseconds) && attempt.elapsedNanoseconds > 0 && attempt.peakWorkingSetBytes > 0 && attempt.sampleCount > 0));
test('package-build-skipped-only-in-fixture', report.results[0].packageReproducibility === null);

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-performance-'));
let manifested = false;
try {
  mkdirSync(join(root, 'artifacts'));
  writeFileSync(join(root, 'artifacts', 'performance.json'), result.bytes);
  writeFileSync(join(root, 'artifact-list.json'), JSON.stringify({ schemaVersion: 'm0-evidence-artifact-list/0.1.0', artifacts: [{ path: 'artifacts/performance.json', type: 'resource-trace' }] }));
  generateManifest(root, 'artifact-list.json', 'manifests/performance.json');
  manifested = verifyManifest(root, 'manifests/performance.json', true).entryCount === 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}
test('scanner-manifest-verified-report', manifested);

if (failures) process.exitCode = 1;
else console.log('CANDIDATE_PERFORMANCE_FIXTURES_PASSED: 5');
