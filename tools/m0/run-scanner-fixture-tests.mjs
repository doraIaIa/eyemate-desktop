#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanArtifact } from './scan-evidence-artifact.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const scanner = join(directory, 'scan-evidence-artifact.mjs');
const cases = [
  { name: 'safe-allowlisted', type: 'run-record', file: 'safe-artifact.json', status: 0, code: 'SAFE:' },
  { name: 'forbidden-content', type: 'run-record', file: 'forbidden-artifact.json', status: 1, code: 'FORBIDDEN_FIELD' },
  { name: 'forbidden-user-path', type: 'resource-trace', file: 'forbidden-path.txt', status: 1, code: 'FORBIDDEN_VALUE' },
  { name: 'forbidden-secret-token', type: 'network-evidence', file: 'forbidden-secret.txt', status: 1, code: 'FORBIDDEN_VALUE' },
  { name: 'unknown-type', type: 'unknown', file: 'safe-artifact.json', status: 2, code: 'UNKNOWN_ARTIFACT_TYPE' },
];

let failures = 0;
for (const testCase of cases) {
  const result = spawnSync(process.execPath, [scanner, testCase.type, join(directory, 'fixtures', testCase.file)], { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  const imported = scanArtifact(testCase.type, join(directory, 'fixtures', testCase.file));
  const passed = result.status === testCase.status && output.includes(testCase.code)
    && imported.exitCode === result.status && imported.code.includes(testCase.code.replace('SAFE:', 'SAFE'));
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${testCase.name}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`SCANNER_FIXTURE_TEST_FAILURES: ${failures}`);
  process.exitCode = 1;
} else {
  console.log(`SCANNER_FIXTURE_TESTS_PASSED: ${cases.length}`);
}
