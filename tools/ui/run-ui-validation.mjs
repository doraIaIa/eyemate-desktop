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

async function run(argumentsList) {
  const child = spawn(electron, ["dist/main/main.js", ...argumentsList, `--user-data-dir=${userData}`], { cwd: root, shell: false, stdio: "inherit" });
  return await new Promise((resolve) => child.once("exit", resolve));
}

const uiCode = await run(["--ui-validate", `--ui-screenshot-dir=${screenshots}`]);
if (uiCode !== 0) throw new Error(`UI_VALIDATION_FAILED:${String(uiCode)}`);
const seedCode = await run(["--ui-recovery-seed"]);
if (seedCode !== 0) throw new Error(`UI_RECOVERY_SEED_FAILED:${String(seedCode)}`);
const recoveryCode = await run(["--ui-recovery-check"]);
await rm(userData, { recursive: true, force: true });
if (recoveryCode !== 0) throw new Error(`UI_RECOVERY_CHECK_FAILED:${String(recoveryCode)}`);
console.log("UI_FUNCTIONAL_VALIDATION_PASS");
