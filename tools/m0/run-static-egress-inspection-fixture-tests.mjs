#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectStaticEgress } from './inspect-static-egress.mjs';

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-static-egress-'));
let failures = 0;
function test(name, condition) { console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`); if (!condition) failures += 1; }
try {
  writeFileSync(join(root, 'safe.mjs'), "import { readFileSync } from 'node:fs';\n");
  test('safe-source-passes', inspectStaticEgress(root).ok);
  mkdirSync(join(root, 'nested'));
  writeFileSync(join(root, 'nested', 'network.mjs'), "import { request } from 'node:https';\n");
  const rejected = inspectStaticEgress(root);
  test('network-module-rejected-recursively', !rejected.ok && rejected.findings.some((finding) => finding.code === 'NETWORK_MODULE' && finding.file === 'nested/network.mjs'));
} finally { rmSync(root, { recursive: true, force: true }); }
if (failures) process.exitCode = 1; else console.log('STATIC_EGRESS_INSPECTION_FIXTURES_PASSED: 2');
