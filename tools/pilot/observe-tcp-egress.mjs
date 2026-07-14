import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = path.join(root, "node_modules", "electron", "dist", "electron.exe");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-egress-"));
const outputDirectory = path.join(root, ".pilot", "egress");
const powershell = "@(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId) | ConvertTo-Json -Compress";

function descendants(processes, rootPid) {
  const result = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const process of processes) if (result.has(Number(process.ParentProcessId)) && !result.has(Number(process.ProcessId))) { result.add(Number(process.ProcessId)); changed = true; }
  }
  return result;
}

function isExternal(address) {
  const normalized = String(address).toLowerCase();
  return !["127.0.0.1", "::1", "0.0.0.0", "::", "*"].includes(normalized) && !normalized.startsWith("127.");
}

async function processTree(rootPid) {
  const { stdout } = await executeFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", powershell], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const value = JSON.parse(stdout);
  return descendants(Array.isArray(value) ? value : value ? [value] : [], rootPid);
}

function remoteAddress(endpoint) {
  const value = String(endpoint);
  if (value.startsWith("[")) return value.slice(1, value.indexOf("]"));
  return value.slice(0, value.lastIndexOf(":"));
}

async function tcpSnapshot(processIds) {
  const { stdout } = await executeFile("netstat.exe", ["-ano", "-p", "tcp"], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  let observed = 0;
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^\s*TCP\s+\S+\s+(\S+)\s+(ESTABLISHED|SYN_SENT)\s+(\d+)\s*$/i.exec(line);
    if (match && processIds.has(Number(match[3])) && isExternal(remoteAddress(match[1]))) observed += 1;
  }
  return observed;
}

let observedConnections = 0;
let samples = 0;
let childExitCode = null;
const startedAt = Date.now();
try {
  const child = spawn(electron, ["dist/main/main.js", "--egress-observe", `--user-data-dir=${userData}`], { cwd: root, shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
  child.stderr.on("data", () => { /* Không ghi raw process output vào evidence. */ });
  const exit = new Promise((resolve) => child.once("exit", (code) => { childExitCode = code; resolve(); }));
  await new Promise((resolve) => setTimeout(resolve, 800));
  const processIds = await processTree(child.pid);
  while (childExitCode === null && Date.now() - startedAt < 15_000) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (childExitCode !== null) break;
    observedConnections += await tcpSnapshot(processIds);
    samples += 1;
  }
  if (childExitCode === null) { child.kill(); await exit; throw new Error("EGRESS_WORKLOAD_TIMEOUT"); }
  await exit;
  if (childExitCode !== 0) throw new Error(`EGRESS_WORKLOAD_EXIT_${childExitCode ?? 1}`);
  const summary = {
    schemaVersion: "pilot-tcp-egress-observation/0.1.0",
    workload: "LOCAL_UI_ROUTES",
    durationMs: Date.now() - startedAt,
    samples,
    processTreeAttribution: true,
    tcpExternalConnectionObservations: observedConnections,
    finding: observedConnections === 0 ? "NOT_OBSERVED_TCP_ONLY" : "UNEXPECTED_TCP_OBSERVED",
    wprNetworkTrace: "BLOCKED_0XC5585011",
    limitations: ["NO_UDP_OR_DNS_PAYLOAD_COVERAGE", "NO_PACKET_CONTENT", "NOT_A_NO_EGRESS_PROOF"]
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "tcp-observation.json"), `${JSON.stringify(summary, null, 2)}\n`, { flag: "w" });
  console.log(`${summary.finding} samples=${samples} observations=${observedConnections}`);
  if (observedConnections > 0) process.exitCode = 1;
} finally {
  await rm(userData, { recursive: true, force: true });
}
