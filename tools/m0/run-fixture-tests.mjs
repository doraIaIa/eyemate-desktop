#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const validator = join(directory, 'validate-evidence-schema.mjs');
const fixtures = [
  { name: 'valid', file: 'valid-run.jsonl', status: 0, codes: ['VALID:'] },
  { name: 'forbidden-field', file: 'invalid-forbidden-field.jsonl', status: 1, codes: ['FORBIDDEN_FIELD:'] },
  { name: 'forbidden-alias', file: 'invalid-forbidden-alias.jsonl', status: 1, codes: ['FORBIDDEN_FIELD:record.raw_frame', 'FORBIDDEN_FIELD:record.videoFrame', 'FORBIDDEN_FIELD:record.landmarks', 'FORBIDDEN_FIELD:record.rawLandmarks'] },
  { name: 'missing-observed-value', file: 'invalid-missing-observed-value.jsonl', status: 1, codes: ['OBSERVED_VALUE_REQUIRED:'] },
  { name: 'invalid-reference-and-duplicate', file: 'invalid-reference-and-duplicate.jsonl', status: 1, codes: ['INVALID_DEVICE_SNAPSHOT_REF', 'INVALID_RUN_PLAN_REF', 'INVALID_ARTIFACT_REF:artifactRefs[0]', 'DUPLICATE_ARTIFACT_REF', 'DUPLICATE_METRIC_ID'] },
  { name: 'unsupported-schema', file: 'invalid-unsupported-schema.jsonl', status: 1, codes: ['UNSUPPORTED_SCHEMA_VERSION'] },
  { name: 'malformed-json', file: 'invalid-malformed.jsonl', status: 1, codes: ['INVALID_JSON'] },
];

let failures = 0;
for (const fixture of fixtures) {
  const result = spawnSync(process.execPath, [validator, join(directory, 'fixtures', fixture.file)], { encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  const passed = result.status === fixture.status && fixture.codes.every((code) => output.includes(code));
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${fixture.name}`);
  if (!passed) failures += 1;
}

if (failures > 0) {
  console.error(`FIXTURE_TEST_FAILURES: ${failures}`);
  process.exitCode = 1;
} else {
  console.log(`FIXTURE_TESTS_PASSED: ${fixtures.length}`);
}
