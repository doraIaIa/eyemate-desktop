#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkToolOutputAdmission } from './check-tool-output-admission.mjs';

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-tool-output-'));
let failures = 0;
function test(name, result, code, exitCode) { const pass = result.code === code && result.exitCode === exitCode; console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failures += 1; }
try {
  const safe = join(root, 'summary.json'); writeFileSync(safe, '{"summary":"synthetic"}\n');
  test('safe-text-admitted', checkToolOutputAdmission('resource-trace', safe), 'ADMITTED_SAFE_TEXT', 0);
  const forbidden = join(root, 'forbidden.json'); writeFileSync(forbidden, '{"username":"forbidden"}\n');
  test('forbidden-text-scanner-rejected', checkToolOutputAdmission('resource-trace', forbidden), 'SCANNER_REJECTED_FORBIDDEN_FIELD', 1);
  test('etl-quarantined-without-read', checkToolOutputAdmission('resource-trace', join(root, 'capture.etl')), 'QUARANTINE_RAW_CAPTURE', 1);
  test('unsupported-output-quarantined', checkToolOutputAdmission('resource-trace', join(root, 'capture.csv')), 'QUARANTINE_UNSUPPORTED_OUTPUT', 1);
} finally { rmSync(root, { recursive: true, force: true }); }
if (failures) process.exitCode = 1; else console.log('TOOL_OUTPUT_ADMISSION_FIXTURES_PASSED: 4');
