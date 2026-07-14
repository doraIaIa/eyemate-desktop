#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanArtifactBytes } from './scan-evidence-artifact.mjs';
import { buildMsix } from './build-msix-feasibility.mjs';

export const PERFORMANCE_SCHEMA_VERSION = 'm0-candidate-performance/0.1.0';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_HOLD_MS = 2500;
const DEFAULT_REPETITIONS = 3;
const DEFAULT_SAMPLE_INTERVAL_MS = 125;
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

const CANDIDATES = {
  electron: { executable: 'node_modules/electron/dist/electron.exe', args: ['candidates/electron/main.mjs', '--test'] },
  tauri: { executable: 'candidates/tauri/src-tauri/target/debug/eyemate-m0-tauri.exe', args: ['--test'] },
};

class BenchmarkError extends Error {
  constructor(code, exitCode = 1) {
    super(code);
    this.code = code;
    this.exitCode = exitCode;
  }
}

function safeRelative(input, code) {
  if (!input || input.includes('\0') || /^[a-z]+:/i.test(input) || input.startsWith('\\\\') || input.startsWith('/') || input.includes('..')) throw new BenchmarkError(code, 2);
  const absolute = resolve(REPO_ROOT, input);
  if (!(absolute === REPO_ROOT || absolute.startsWith(REPO_ROOT + sep))) throw new BenchmarkError(code, 2);
  return absolute;
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function packagePath(outputRoot, candidate) {
  return join(outputRoot, 'packages', `eyemate-m0-${candidate}.msix`);
}

function zipPayloadManifest(path) {
  const script = [
    "$ErrorActionPreference='Stop'",
    'Add-Type -AssemblyName System.IO.Compression.FileSystem',
    '$zip=[System.IO.Compression.ZipFile]::OpenRead($env:M0_MSIX_PATH)',
    "try { $entries=$zip.Entries | Where-Object { $_.FullName -notin @('AppxBlockMap.xml','AppxSignature.p7x') } | Sort-Object FullName | ForEach-Object { $stream=$_.Open(); try { $sha=[Security.Cryptography.SHA256]::Create(); $hash=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant() } finally { $stream.Dispose() }; [PSCustomObject]@{Name=$_.FullName;Length=$_.Length;Hash=$hash} }; $json=$entries | ConvertTo-Json -Compress; $sha2=[Security.Cryptography.SHA256]::Create(); [Console]::WriteLine([BitConverter]::ToString($sha2.ComputeHash([Text.Encoding]::UTF8.GetBytes($json))).Replace('-','').ToLowerInvariant()) } finally { $zip.Dispose() }",
  ].join('; ');
  const result = spawnSync(POWERSHELL, ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 30000,
    env: { ...process.env, M0_MSIX_PATH: path },
  });
  if (result.status !== 0 || !/^[a-f0-9]{64}$/i.test(result.stdout.trim())) throw new BenchmarkError('NORMALIZED_PACKAGE_MANIFEST_FAILED');
  return result.stdout.trim().toLowerCase();
}

function buildTwice(candidate) {
  const firstRoot = safeRelative(`.m0/perf/${candidate}-build-a`, 'UNSAFE_OUTPUT_PATH');
  const secondRoot = safeRelative(`.m0/perf/${candidate}-build-b`, 'UNSAFE_OUTPUT_PATH');
  rmSync(firstRoot, { recursive: true, force: true });
  rmSync(secondRoot, { recursive: true, force: true });
  buildMsix(candidate, { outputRoot: `.m0/perf/${candidate}-build-a`, sign: false });
  buildMsix(candidate, { outputRoot: `.m0/perf/${candidate}-build-b`, sign: false });
  const firstPath = packagePath(firstRoot, candidate);
  const secondPath = packagePath(secondRoot, candidate);
  const first = { byteSize: statSync(firstPath).size, sha256: hashFile(firstPath), normalizedPayloadSha256: zipPayloadManifest(firstPath) };
  const second = { byteSize: statSync(secondPath).size, sha256: hashFile(secondPath), normalizedPayloadSha256: zipPayloadManifest(secondPath) };
  return {
    first,
    second,
    rawPackageDeterministic: first.byteSize === second.byteSize && first.sha256 === second.sha256,
    normalizedPayloadDeterministic: first.normalizedPayloadSha256 === second.normalizedPayloadSha256,
    nondeterminismScope: first.sha256 === second.sha256 ? 'NONE_OBSERVED' : 'MSIX_CONTAINER_OR_BLOCKMAP_METADATA',
  };
}

function parseSample(output) {
  const [workingSetText, cpuText, countText] = String(output).trim().split(',');
  const workingSetBytes = Number(workingSetText);
  const cpuSeconds = Number(cpuText);
  const processCount = Number(countText);
  if (!Number.isFinite(workingSetBytes) || workingSetBytes < 0) return null;
  return {
    workingSetBytes,
    cpuSeconds: Number.isFinite(cpuSeconds) && cpuSeconds >= 0 ? cpuSeconds : 0,
    processCount: Number.isFinite(processCount) && processCount >= 0 ? processCount : 0,
  };
}

function sampleProcessTree(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const script = `$ids=@(${pid}); for($i=0;$i -lt $ids.Count;$i++){ $children=Get-CimInstance Win32_Process -Filter "ParentProcessId=$($ids[$i])" -ErrorAction SilentlyContinue; foreach($c in $children){ $child=[int]$c.ProcessId; if($ids -notcontains $child){ $ids += $child } } }; $ws=0; $cpu=0; $count=0; foreach($id in $ids){ $p=Get-Process -Id $id -ErrorAction SilentlyContinue; if($p){ $ws += [int64]$p.WorkingSet64; $cpu += [double]$p.CPU; $count += 1 } }; [Console]::WriteLine(("{0},{1},{2}" -f $ws, $cpu, $count))`;
  const result = spawnSync(POWERSHELL, ['-NoProfile', '-Command', script], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 3000 });
  if (result.status !== 0) return null;
  return parseSample(result.stdout);
}

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function measureAttempt(candidateKey, attemptNumber, options) {
  const config = options.candidates?.[candidateKey] || CANDIDATES[candidateKey];
  if (!config) throw new BenchmarkError('UNKNOWN_CANDIDATE', 2);
  const executable = resolve(REPO_ROOT, config.executable);
  if (!existsSync(executable)) throw new BenchmarkError('CANDIDATE_BINARY_MISSING');
  const args = [...config.args, `--m0-hold-ms=${options.holdMs}`];
  const started = process.hrtime.bigint();
  const child = spawn(executable, args, { cwd: REPO_ROOT, shell: false, windowsHide: true, stdio: 'ignore' });
  const samples = [];
  let exitCode = null;
  child.on('exit', (code) => { exitCode = code; });
  while (exitCode === null) {
    const sample = options.sampleProcessTree ? options.sampleProcessTree(child.pid) : sampleProcessTree(child.pid);
    if (sample) samples.push(sample);
    await wait(options.sampleIntervalMs);
  }
  const elapsedNanoseconds = Number(process.hrtime.bigint() - started);
  const firstCpu = samples[0]?.cpuSeconds ?? 0;
  const lastCpu = samples.at(-1)?.cpuSeconds ?? firstCpu;
  return {
    plannedSlotId: `${candidateKey.toUpperCase()}-${attemptNumber}`,
    exitCode,
    elapsedNanoseconds,
    sampleCount: samples.length,
    peakWorkingSetBytes: samples.reduce((max, sample) => Math.max(max, sample.workingSetBytes), 0),
    cpuSecondsDelta: Math.max(0, lastCpu - firstCpu),
    maxProcessTreeCount: samples.reduce((max, sample) => Math.max(max, sample.processCount), 0),
  };
}

export async function runCandidatePerformance(options = {}) {
  const holdMs = options.holdMs ?? DEFAULT_HOLD_MS;
  const repetitions = options.repetitions ?? DEFAULT_REPETITIONS;
  const sampleIntervalMs = options.sampleIntervalMs ?? DEFAULT_SAMPLE_INTERVAL_MS;
  const candidates = options.candidateKeys || ['electron', 'tauri'];
  const results = [];
  for (const candidate of candidates) {
    const reproducibility = options.skipPackageBuild ? null : buildTwice(candidate);
    const attempts = [];
    for (let index = 1; index <= repetitions; index += 1) attempts.push(await measureAttempt(candidate, index, { ...options, holdMs, sampleIntervalMs }));
    results.push({ candidate, packageReproducibility: reproducibility, attempts });
  }
  const report = {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    purpose: 'M0_CAMERA_OFF_LOCAL_PERFORMANCE_AND_REPRODUCIBILITY',
    interpretation: 'ARCHITECTURE_POC_EVIDENCE_NOT_PRODUCTION_BUDGET',
    camera: 'NOT_OPENED',
    network: 'NOT_OPENED_BY_HARNESS',
    repetitions,
    holdMs,
    sampleIntervalMs,
    measurement: {
      startupElapsed: 'process spawn to process exit in test mode',
      ram: 'peak sampled working set bytes for process tree',
      cpu: 'sampled process tree CPU seconds delta',
      package: 'unsigned MSIX built twice; raw MSIX hash may vary because of container/block map metadata',
    },
    results,
  };
  const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const scan = scanArtifactBytes('resource-trace', bytes);
  if (!scan.ok) throw new BenchmarkError(`REPORT_SCANNER_REJECTED_${scan.code}`);
  return { report, bytes };
}

function summarize(report) {
  return report.results.map((result) => {
    const elapsedMs = result.attempts.map((attempt) => Math.round(attempt.elapsedNanoseconds / 1_000_000)).join('/');
    const peakMb = Math.round(Math.max(...result.attempts.map((attempt) => attempt.peakWorkingSetBytes)) / 1024 / 1024);
    const deterministic = result.packageReproducibility ? result.packageReproducibility.normalizedPayloadDeterministic : 'SKIPPED';
    return `${result.candidate}:elapsedMs=${elapsedMs}:peakMB=${peakMb}:normalizedPayloadDeterministic=${deterministic}`;
  }).join(' ');
}

async function main() {
  try {
    const outputRoot = safeRelative('.m0/perf/reports', 'UNSAFE_OUTPUT_PATH');
    mkdirSync(outputRoot, { recursive: true });
    const { report, bytes } = await runCandidatePerformance();
    writeFileSync(join(outputRoot, 'm0-candidate-performance.json'), bytes);
    console.log(`M0_PERFORMANCE_MEASURED: ${summarize(report)}`);
  } catch (error) {
    const code = error instanceof BenchmarkError ? error.code : 'PERFORMANCE_MEASUREMENT_FAILED';
    console.error(`ERROR: ${code}`);
    process.exitCode = error instanceof BenchmarkError ? error.exitCode : 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
