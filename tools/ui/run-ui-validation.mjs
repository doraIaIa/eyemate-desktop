import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = process.platform === "win32"
  ? path.join(root, "node_modules", "electron", "dist", "electron.exe")
  : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-ui-"));
const screenshots = path.join(root, "docs", "validation", "ui-screenshots");
await mkdir(screenshots, { recursive: true });

const child = spawn(electron, ["dist/main/main.js", "--ui-validate", `--ui-screenshot-dir=${screenshots}`, `--user-data-dir=${userData}`], {
  cwd: root,
  shell: false,
  stdio: "inherit"
});

const code = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
if (code !== 0) throw new Error(`UI_VALIDATION_FAILED:${String(code)}`);
console.log("UI_FUNCTIONAL_VALIDATION_PASS");
