#!/usr/bin/env node

import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { platform, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { generateManifest, verifyManifest } from './generate-evidence-manifest.mjs';

const directory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const fixtureRoot = join(directory, 'fixtures', 'evidence-root');
const forbiddenFixture = join(directory, 'fixtures', 'forbidden-artifact.json');

function freshRoot() {
  const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-manifest-'));
  cpSync(fixtureRoot, root, { recursive: true });
  return root;
}

function expectPass(name, action) {
  try { action(); console.log(`PASS: ${name}`); return 0; }
  catch (error) { console.error(`FAIL: ${name} (${error.code ?? 'UNEXPECTED'})`); return 1; }
}

function expectReject(name, code, action) {
  try { action(); console.error(`FAIL: ${name} (accepted)`); return 1; }
  catch (error) {
    const passed = String(error.code ?? '').includes(code);
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`);
    return passed ? 0 : 1;
  }
}

let failures = 0;
let skips = 0;
const roots = [];
try {
  let root = freshRoot(); roots.push(root);
  failures += expectPass('generate-and-verify-strict', () => {
    generateManifest(root, 'lists/manifest-input.json', 'manifests/first.json');
    verifyManifest(root, 'manifests/first.json', true);
  });
  failures += expectPass('deterministic-manifest', () => {
    generateManifest(root, 'lists/manifest-input.json', 'manifests/second.json');
    const first = JSON.parse(readFileSync(join(root, 'manifests', 'first.json'), 'utf8'));
    const second = JSON.parse(readFileSync(join(root, 'manifests', 'second.json'), 'utf8'));
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('NONDETERMINISTIC');
  });

  root = freshRoot(); roots.push(root);
  generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json');
  const original = readFileSync(join(root, 'artifacts', 'valid-artifact.json'), 'utf8');
  writeFileSync(join(root, 'artifacts', 'valid-artifact.json'), original.replace('COLD', 'WARM'));
  failures += expectReject('modified-artifact', 'HASH_MISMATCH', () => verifyManifest(root, 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json');
  writeFileSync(join(root, 'artifacts', 'valid-artifact.json'), 'x', { flag: 'a' });
  failures += expectReject('size-mismatch', 'SIZE_MISMATCH', () => verifyManifest(root, 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json');
  unlinkSync(join(root, 'artifacts', 'valid-artifact.json'));
  failures += expectReject('missing-artifact', 'ARTIFACT_MISSING', () => verifyManifest(root, 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  failures += expectReject('duplicate-normalized-path', 'DUPLICATE_NORMALIZED_PATH', () => generateManifest(root, 'lists/manifest-duplicate.json', 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  failures += expectReject('windows-path-collision', 'WINDOWS_PATH_COLLISION', () => generateManifest(root, 'lists/manifest-case-collision.json', 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  failures += expectReject('unsafe-path', 'INVALID_ARTIFACT_DECLARATION', () => generateManifest(root, 'lists/manifest-unsafe.json', 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  failures += expectReject('user-profile-path', 'INVALID_ARTIFACT_DECLARATION', () => generateManifest(root, 'lists/manifest-user-path.json', 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  failures += expectReject('manifest-self-inclusion', 'UNSAFE_MANIFEST_PATH', () => generateManifest(root, 'lists/manifest-input.json', 'artifacts/self.json'));

  root = freshRoot(); roots.push(root);
  mkdirSync(join(root, 'manifests', 'existing-directory'), { recursive: true });
  failures += expectReject('atomic-write-cleanup', 'MANIFEST_WRITE_FAILED', () => generateManifest(root, 'lists/manifest-input.json', 'manifests/existing-directory'));
  if (!lstatSync(join(root, 'manifests', 'existing-directory')).isDirectory() || readdirSync(join(root, 'manifests')).some((name) => name.startsWith('existing-directory.tmp-'))) {
    console.error('FAIL: atomic-write-cleanup-state'); failures += 1;
  } else console.log('PASS: atomic-write-cleanup-state');

  root = freshRoot(); roots.push(root);
  failures += expectReject('toctou-after-hash', 'TOCTOU_ARTIFACT_CHANGED', () => generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json', {
    afterHash: (path) => writeFileSync(path, 'synthetic mutation after hash\n'),
  }));

  root = freshRoot(); roots.push(root);
  cpSync(forbiddenFixture, join(root, 'artifacts', 'rejected-artifact.txt'));
  failures += expectReject('scanner-rejected-artifact', 'SCANNER_REJECTED', () => generateManifest(root, 'lists/manifest-scanner-rejected.json', 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json');
  cpSync(forbiddenFixture, join(root, 'artifacts', 'valid-artifact.json'));
  failures += expectReject('verify-scanner-rejected-artifact', 'SCANNER_REJECTED', () => verifyManifest(root, 'manifests/check.json'));

  root = freshRoot(); roots.push(root);
  writeFileSync(join(root, 'invalid-duplicate.json'), readFileSync(join(directory, 'fixtures', 'manifest-invalid-duplicate.json')));
  failures += expectReject('verify-duplicate-normalized-path', 'DUPLICATE_NORMALIZED_PATH', () => verifyManifest(root, 'invalid-duplicate.json'));

  root = freshRoot(); roots.push(root);
  writeFileSync(join(root, 'invalid-unsafe.json'), readFileSync(join(directory, 'fixtures', 'manifest-invalid-unsafe.json')));
  failures += expectReject('verify-unsafe-path', 'INVALID_MANIFEST_ENTRY', () => verifyManifest(root, 'invalid-unsafe.json'));

  root = freshRoot(); roots.push(root);
  writeFileSync(join(root, 'manifests.json'), readFileSync(join(directory, 'fixtures', 'manifest-unsupported.json')));
  failures += expectReject('unsupported-manifest-schema', 'UNSUPPORTED_MANIFEST_SCHEMA', () => verifyManifest(root, 'manifests.json'));

  root = freshRoot(); roots.push(root);
  generateManifest(root, 'lists/manifest-input.json', 'manifests/check.json');
  writeFileSync(join(root, 'artifacts', 'extra.txt'), 'synthetic extra artifact\n');
  failures += expectReject('strict-extra-artifact', 'UNDECLARED_ARTIFACT', () => verifyManifest(root, 'manifests/check.json', true));

  root = freshRoot(); roots.push(root);
  const fileLink = join(root, 'artifacts', 'linked-artifact.json');
  try {
    symlinkSync(forbiddenFixture, fileLink, 'file');
    writeFileSync(join(root, 'lists', 'symlink-file.json'), JSON.stringify({ schemaVersion: 'm0-evidence-artifact-list/0.1.0', artifacts: [{ path: 'artifacts/linked-artifact.json', type: 'run-record' }] }));
    failures += expectReject('symlink-artifact', 'UNSAFE_SYMLINK', () => generateManifest(root, 'lists/symlink-file.json', 'manifests/check.json'));
  } catch (error) {
    skips += 1;
    console.log(`SKIP: symlink-artifact (${error.code ?? 'UNAVAILABLE'})`);
  }

  root = freshRoot(); roots.push(root);
  const directoryLink = join(root, 'artifacts', 'linked-directory');
  try {
    symlinkSync(directory, directoryLink, platform() === 'win32' ? 'junction' : 'dir');
    writeFileSync(join(root, 'lists', 'symlink-directory.json'), JSON.stringify({ schemaVersion: 'm0-evidence-artifact-list/0.1.0', artifacts: [{ path: 'artifacts/linked-directory/README.md', type: 'run-record' }] }));
    failures += expectReject('symlink-directory-component', 'UNSAFE_SYMLINK', () => generateManifest(root, 'lists/symlink-directory.json', 'manifests/check.json'));
  } catch (error) {
    skips += 1;
    console.log(`SKIP: symlink-directory-component (${error.code ?? 'UNAVAILABLE'})`);
  }
} finally {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`MANIFEST_FIXTURE_TEST_FAILURES: ${failures}`);
  process.exitCode = 1;
} else {
  console.log(`MANIFEST_FIXTURE_TESTS_PASSED: ${21 - skips}; SKIPPED: ${skips}`);
}
