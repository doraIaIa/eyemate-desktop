#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

class CleanupError extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.code = code;
    this.exitCode = exitCode;
  }
}

function assertInsideRoot(path, root) {
  const base = resolve(root);
  const absolute = resolve(path);
  if (!(absolute === base || absolute.startsWith(base + sep))) throw new CleanupError('UNSAFE_CLEANUP_PATH', 2);
  return absolute;
}

function countFiles(path) {
  if (!existsSync(path)) return 0;
  let count = 0;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) count += countFiles(child);
    else if (entry.isFile()) count += 1;
  }
  return count;
}

function processScan() {
  const script = [
    '$root=$env:M0_REPO_ROOT.ToLowerInvariant()',
    "$matches=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.ToLowerInvariant().StartsWith($root) -and ($_.Name -in @('electron.exe','eyemate-m0-tauri.exe')) }",
    '[Console]::WriteLine(($matches | Measure-Object).Count)',
  ].join('; ');
  const result = spawnSync(POWERSHELL, ['-NoProfile', '-Command', script], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 5000, env: { ...process.env, M0_REPO_ROOT: REPO_ROOT } });
  if (result.status !== 0) return { ok: false, code: 'PROCESS_SCAN_FAILED', count: null };
  const count = Number(result.stdout.trim());
  return { ok: Number.isFinite(count) && count === 0, code: count === 0 ? 'NO_REPO_CANDIDATE_PROCESS' : 'REPO_CANDIDATE_PROCESS_RUNNING', count };
}

export function cleanupM0({ apply = false, root = REPO_ROOT } = {}) {
  const m0Root = assertInsideRoot(resolve(root, '.m0'), root);
  const beforeFiles = countFiles(m0Root);
  const process = processScan();
  if (!process.ok) throw new CleanupError(process.code);
  if (apply && existsSync(m0Root)) {
    if (!statSync(m0Root).isDirectory()) throw new CleanupError('M0_OUTPUT_NOT_DIRECTORY');
    rmSync(m0Root, { recursive: true, force: true });
  }
  const afterFiles = countFiles(m0Root);
  return {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    m0Output: { existed: beforeFiles > 0, beforeFiles, afterFiles, removed: apply && beforeFiles > 0 && afterFiles === 0 },
    processScan: process,
    certificateStoreAction: 'NOT_MODIFIED_CURRENT_USER_TEST_CERT_RETAINED',
  };
}

function main() {
  try {
    const apply = process.argv.includes('--apply');
    const dryRun = process.argv.includes('--dry-run') || !apply;
    if (!apply && !dryRun) throw new CleanupError('USAGE', 2);
    const result = cleanupM0({ apply });
    console.log(`M0_CLEANUP_${result.mode}: m0FilesBefore=${result.m0Output.beforeFiles} m0FilesAfter=${result.m0Output.afterFiles} process=${result.processScan.code} cert=${result.certificateStoreAction}`);
  } catch (error) {
    const code = error instanceof CleanupError ? error.code : 'M0_CLEANUP_FAILED';
    console.error(`ERROR: ${code}`);
    process.exitCode = error instanceof CleanupError ? error.exitCode : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
