import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = process.platform === "win32"
  ? path.join(root, "node_modules", "electron", "dist", "electron.exe")
  : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-m3-smoke-"));
const child = spawn(electron, [path.join(root, "dist", "main", "main.js"), "--m3-smoke", `--user-data-dir=${userData}`], { cwd: root, stdio: "inherit", shell: false });
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
process.exitCode = typeof exitCode === "number" ? exitCode : 1;
