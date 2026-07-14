#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupM0 } from './run-m0-cleanup-check.mjs';

let failures = 0;
function test(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`);
  if (!condition) failures += 1;
}

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-cleanup-'));
try {
  mkdirSync(join(root, '.m0', 'reports'), { recursive: true });
  writeFileSync(join(root, '.m0', 'reports', 'synthetic.json'), '{}\n');
  const dryRun = cleanupM0({ root, apply: false });
  test('dry-run-keeps-output', dryRun.m0Output.beforeFiles === 1 && dryRun.m0Output.afterFiles === 1 && !dryRun.m0Output.removed);
  const apply = cleanupM0({ root, apply: true });
  test('apply-removes-output', apply.m0Output.beforeFiles === 1 && apply.m0Output.afterFiles === 0 && apply.m0Output.removed);
  test('certificate-store-not-modified', apply.certificateStoreAction === 'NOT_MODIFIED_CURRENT_USER_TEST_CERT_RETAINED');
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures) process.exitCode = 1;
else console.log('M0_CLEANUP_FIXTURES_PASSED: 3');
