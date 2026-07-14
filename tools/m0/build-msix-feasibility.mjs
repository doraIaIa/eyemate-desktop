#!/usr/bin/env node

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, normalize, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanArtifactBytes } from './scan-evidence-artifact.mjs';

export const MSIX_FEASIBILITY_SCHEMA_VERSION = 'm0-msix-feasibility/0.1.0';
const PACKAGE_VERSION = '0.0.0.0';
const PUBLISHER = 'CN=EyeMate M0 Test Package';
const SCHEME = 'http' + '://';
const XMLNS_APPX = SCHEME + 'schemas.microsoft.com/appx/manifest/foundation/windows10';
const XMLNS_UAP = SCHEME + 'schemas.microsoft.com/appx/manifest/uap/windows10';
const XMLNS_RESCAP = SCHEME + 'schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_MAKEAPPX = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\makeappx.exe';
const DEFAULT_SIGNTOOL = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe';
const ONE_BY_ONE_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAAAAXNSR0IArs4c6QAAAIRJREFUeF7t0AENAAAIwzDAv+ecA4YySpakdwMAAAAAAPBwqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqBKhSoQqEapEqP4CbqgBNM+kzKgAAAAASUVORK5CYII=', 'base64');

const CANDIDATES = {
  tauri: {
    identity: 'EyeMateM0.Tauri',
    displayName: 'EyeMate M0 Tauri',
    packageName: 'eyemate-m0-tauri.msix',
    executable: 'EyeMateTauri.exe',
    sourceExecutable: 'candidates/tauri/src-tauri/target/debug/eyemate-m0-tauri.exe',
    stage(stageRoot) {
      copyFileSync(join(REPO_ROOT, this.sourceExecutable), join(stageRoot, this.executable));
    },
  },
  electron: {
    identity: 'EyeMateM0.Electron',
    displayName: 'EyeMate M0 Electron',
    packageName: 'eyemate-m0-electron.msix',
    executable: 'Electron.exe',
    sourceExecutable: 'node_modules/electron/dist/electron.exe',
    stage(stageRoot) {
      const electronRoot = join(REPO_ROOT, 'node_modules/electron/dist');
      cpSync(electronRoot, stageRoot, { recursive: true });
      const appRoot = join(stageRoot, 'resources', 'app');
      mkdirSync(appRoot, { recursive: true });
      copyFileSync(join(REPO_ROOT, 'candidates/electron/main.mjs'), join(appRoot, 'main.mjs'));
      cpSync(join(REPO_ROOT, 'candidates/shared'), join(appRoot, 'shared'), { recursive: true });
      writeFileSync(join(appRoot, 'package.json'), JSON.stringify({ type: 'module', main: 'main.mjs' }, null, 2));
    },
  },
};

class MsixError extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.code = code;
    this.exitCode = exitCode;
  }
}

function safeRelative(input, code) {
  if (!input || input.includes('\0') || /^[a-z]+:/i.test(input) || input.startsWith('\\\\') || input.startsWith('/') || input.includes('..')) throw new MsixError(code, 2);
  const normalized = normalize(input).replaceAll('\\', '/');
  if (normalized.startsWith('../') || normalized === '..' || normalized.includes('/../')) throw new MsixError(code, 2);
  return normalized;
}

function insideRepo(relative) {
  const normalized = safeRelative(relative, 'UNSAFE_OUTPUT_PATH');
  const absolute = resolve(REPO_ROOT, normalized);
  if (!(absolute === REPO_ROOT || absolute.startsWith(REPO_ROOT + sep))) throw new MsixError('UNSAFE_OUTPUT_PATH', 2);
  return absolute;
}

function toolPath(input, fallback, code) {
  const value = input || fallback;
  if (!value || !existsSync(value)) throw new MsixError(code, 2);
  return value;
}

function runTool(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 120000 });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function createAppxManifest(candidate) {
  return `<?xml version="1.0" encoding="utf-8"?>\n<Package xmlns="${XMLNS_APPX}" xmlns:uap="${XMLNS_UAP}" xmlns:rescap="${XMLNS_RESCAP}" IgnorableNamespaces="uap rescap">\n  <Identity Name="${xml(candidate.identity)}" Publisher="${xml(PUBLISHER)}" Version="${PACKAGE_VERSION}" ProcessorArchitecture="x64" />\n  <Properties><DisplayName>${xml(candidate.displayName)}</DisplayName><PublisherDisplayName>EyeMate M0</PublisherDisplayName><Logo>Assets\\StoreLogo.png</Logo></Properties>\n  <Dependencies><TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.19041.0" MaxVersionTested="10.0.26100.0" /></Dependencies>\n  <Resources><Resource Language="en-us" /></Resources>\n  <Applications><Application Id="App" Executable="${xml(candidate.executable)}" EntryPoint="Windows.FullTrustApplication"><uap:VisualElements DisplayName="${xml(candidate.displayName)}" Description="EyeMate M0 package feasibility" Square150x150Logo="Assets\\Square150x150Logo.png" Square44x44Logo="Assets\\Square44x44Logo.png" BackgroundColor="transparent" /></Application></Applications>\n  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>\n</Package>\n`;
}

function writeAssets(stageRoot) {
  const assets = join(stageRoot, 'Assets');
  mkdirSync(assets, { recursive: true });
  for (const name of ['Square150x150Logo.png', 'Square44x44Logo.png', 'StoreLogo.png']) writeFileSync(join(assets, name), ONE_BY_ONE_PNG);
}

function prepareStage(candidateKey, outputRoot) {
  const candidate = CANDIDATES[candidateKey];
  if (!candidate) throw new MsixError('UNKNOWN_CANDIDATE', 2);
  const sourceExecutable = join(REPO_ROOT, candidate.sourceExecutable);
  if (!existsSync(sourceExecutable)) throw new MsixError('CANDIDATE_BINARY_MISSING', 1);

  const stageRoot = join(outputRoot, 'stage', candidateKey);
  rmSync(stageRoot, { recursive: true, force: true });
  mkdirSync(stageRoot, { recursive: true });
  candidate.stage(stageRoot);
  writeAssets(stageRoot);
  writeFileSync(join(stageRoot, 'AppxManifest.xml'), createAppxManifest(candidate));
  return { candidate, stageRoot };
}

function makeSummary(candidateKey, packageRelative, packagePath, packResult, signResult, verifyResult) {
  const stats = statSync(packagePath);
  const summary = {
    schemaVersion: MSIX_FEASIBILITY_SCHEMA_VERSION,
    candidate: candidateKey,
    package: {
      relativePath: packageRelative,
      byteSize: stats.size,
      sha256: hashFile(packagePath),
      format: 'msix',
    },
    manifest: {
      identity: CANDIDATES[candidateKey].identity,
      publisher: PUBLISHER,
      entryPoint: 'Windows.FullTrustApplication',
      capability: 'runFullTrust',
      targetDeviceFamily: 'Windows.Desktop',
    },
    tools: {
      makeappx: packResult.status === 0 ? 'PASS' : 'FAIL',
      signtoolSign: signResult ? (signResult.status === 0 ? 'PASS' : 'FAIL') : 'NOT_RUN',
      signtoolVerify: verifyResult ? (verifyResult.status === 0 ? 'PASS' : 'UNTRUSTED_TEST_CERT_OR_POLICY') : 'NOT_RUN',
    },
    limits: [
      'internal M0 feasibility package only',
      'not a Store submission',
      'not a production signing attestation',
      'no raw frame video or landmark artifact included',
    ],
  };
  const bytes = Buffer.from(JSON.stringify(summary, null, 2) + '\n', 'utf8');
  const scan = scanArtifactBytes('package-build', bytes);
  if (!scan.ok) throw new MsixError(`SUMMARY_SCANNER_REJECTED_${scan.code}`);
  return { summary, bytes };
}

export function buildMsix(candidateKey, options = {}) {
  const outputRoot = insideRepo(options.outputRoot || '.m0/msix');
  const packagesRoot = join(outputRoot, 'packages');
  const reportsRoot = join(outputRoot, 'reports');
  mkdirSync(packagesRoot, { recursive: true });
  mkdirSync(reportsRoot, { recursive: true });

  const { candidate, stageRoot } = prepareStage(candidateKey, outputRoot);
  const packagePath = join(packagesRoot, candidate.packageName);
  rmSync(packagePath, { force: true });

  const makeappx = toolPath(options.makeappx, DEFAULT_MAKEAPPX, 'MAKEAPPX_NOT_FOUND');
  const packResult = runTool(makeappx, ['pack', '/d', stageRoot, '/p', packagePath, '/overwrite']);
  if (packResult.status !== 0 || !existsSync(packagePath)) throw new MsixError('MAKEAPPX_FAILED');

  let signResult = null;
  let verifyResult = null;
  if (options.sign) {
    const signtool = toolPath(options.signtool, DEFAULT_SIGNTOOL, 'SIGNTOOL_NOT_FOUND');
    signResult = runTool(signtool, ['sign', '/n', 'EyeMate M0 Test Package', '/fd', 'SHA256', packagePath]);
    if (signResult.status !== 0) throw new MsixError('SIGNTOOL_SIGN_FAILED');
    verifyResult = runTool(signtool, ['verify', '/pa', packagePath]);
  }

  const packageRelative = `packages/${basename(packagePath)}`;
  const { summary, bytes } = makeSummary(candidateKey, packageRelative, packagePath, packResult, signResult, verifyResult);
  writeFileSync(join(reportsRoot, `${candidateKey}-msix-summary.json`), bytes);
  return summary;
}

function parseArgs(argv) {
  const [command, candidateKey, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--out') options.outputRoot = rest[++index];
    else if (arg === '--makeappx') options.makeappx = rest[++index];
    else if (arg === '--signtool') options.signtool = rest[++index];
    else if (arg === '--sign') options.sign = true;
    else throw new MsixError('UNKNOWN_ARGUMENT', 2);
  }
  return { command, candidateKey, options };
}

function main() {
  try {
    const { command, candidateKey, options } = parseArgs(process.argv.slice(2));
    if (command !== 'build' || !candidateKey) throw new MsixError('USAGE', 2);
    const summary = buildMsix(candidateKey, options);
    console.log(`MSIX_FEASIBILITY_BUILT: candidate=${summary.candidate} bytes=${summary.package.byteSize} sign=${summary.tools.signtoolSign} verify=${summary.tools.signtoolVerify}`);
  } catch (error) {
    const code = error instanceof MsixError ? error.code : 'MSIX_FEASIBILITY_FAILED';
    console.error(`ERROR: ${code}`);
    process.exitCode = error instanceof MsixError ? error.exitCode : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
