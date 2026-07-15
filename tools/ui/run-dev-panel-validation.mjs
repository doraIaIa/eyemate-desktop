import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = process.platform === "win32" ? path.join(root, "node_modules", "electron", "dist", "electron.exe") : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-dev-panel-"));
const child = spawn(electron, ["dist/main/main.js", "--enable-dev-panel", "--dev-panel-validate", `--user-data-dir=${userData}`], { cwd: root, shell: false, stdio: "inherit" });
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
if (exitCode !== 0) throw new Error(`DEV_PANEL_VALIDATION_FAILED:${String(exitCode)}`);
