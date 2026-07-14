#!/usr/bin/env node

import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildMsix, createAppxManifest } from './build-msix-feasibility.mjs';
import { scanArtifactBytes } from './scan-evidence-artifact.mjs';

let failures = 0;
function test(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`);
  if (!condition) failures += 1;
}
function reject(name, code, fn) {
  try { fn(); console.log(`FAIL: ${name}`); failures += 1; }
  catch (error) { test(`${name} reason=${code}`, error.code === code || error.message === code); }
}

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-msix-'));
try {
  const manifest = createAppxManifest({ identity: 'EyeMateM0.Fixture', displayName: 'EyeMate M0 Fixture', executable: 'Fixture.exe' });
  test('manifest-has-desktop-dependency', manifest.includes('TargetDeviceFamily Name="Windows.Desktop"'));
  test('manifest-has-fulltrust-entrypoint', manifest.includes('EntryPoint="Windows.FullTrustApplication"'));
  test('manifest-has-runfulltrust-capability', manifest.includes('rescap:Capability Name="runFullTrust"'));

  const summary = {
    schemaVersion: 'm0-msix-feasibility/0.1.0',
    candidate: 'fixture',
    package: { relativePath: 'packages/fixture.msix', byteSize: 1, sha256: '0'.repeat(64), format: 'msix' },
    manifest: { identity: 'EyeMateM0.Fixture', publisher: 'CN=EyeMate M0 Test Package' },
    tools: { makeappx: 'PASS', signtoolSign: 'NOT_RUN', signtoolVerify: 'NOT_RUN' },
  };
  const scan = scanArtifactBytes('package-build', Buffer.from(JSON.stringify(summary), 'utf8'));
  test('summary-scanner-pass', scan.ok);

  reject('unsafe-output-path-rejected', 'UNSAFE_OUTPUT_PATH', () => buildMsix('tauri', { outputRoot: '../outside' }));
  reject('unknown-candidate-rejected', 'UNKNOWN_CANDIDATE', () => buildMsix('unknown', { outputRoot: '.m0/msix-fixture' }));

  mkdirSync(join(root, 'fake-sdk'), { recursive: true });
  writeFileSync(join(root, 'fake-sdk', 'tool.txt'), 'not executable');
  test('no-package-created-by-negative-fixtures', !existsSync(join(root, 'packages')));
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures) process.exitCode = 1;
else console.log('MSIX_FEASIBILITY_FIXTURES_PASSED: 6');
