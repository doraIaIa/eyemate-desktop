import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const startedAt = performance.now();
const child = spawn(process.execPath, [path.join(root, "node_modules", "electron", "cli.js"), path.join(root, "dist", "main", "main.js"), "--m3-smoke"], { cwd: root, shell: false, windowsHide: true });
const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code) => resolve(code ?? 1)); });
if (exitCode !== 0) throw new Error(`M4_SMOKE_FAILED_${exitCode}`);
const artifact = await stat(path.join(root, ".m1", "msix", "eyemate-m1.msix"));
const result = { schemaVersion: "m4-performance/0.1.0", observedAtUtc: new Date().toISOString(), deviceProfile: "CURRENT_HOST_UNIDENTIFIED", coldStartSmokeMs: Math.round(performance.now() - startedAt), msixBytes: artifact.size, cameraOff: "OBSERVED", cameraOn: "UNKNOWN_NO_RUNTIME", cpu: "UNKNOWN_NO_SAMPLER", memory: "UNKNOWN_NO_SAMPLER" };
const output = path.join(root, ".m4", "performance");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "latest.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(`M4_PERFORMANCE_OBSERVATION ${result.coldStartSmokeMs}ms ${result.msixBytes}bytes`);
