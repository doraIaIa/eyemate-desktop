import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = process.platform === "win32" ? path.join(root, "node_modules", "electron", "dist", "electron.exe") : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-living-aurora-"));
const temporaryScreenshots = await mkdtemp(path.join(os.tmpdir(), "eyemate-living-aurora-screenshots-"));
const screenshots = process.env.EYEMATE_UPDATE_UI_EVIDENCE === "1" ? path.join(root, "docs", "validation", "ui-screenshots") : temporaryScreenshots;
await mkdir(screenshots, { recursive: true });
const child = spawn(electron, ["dist/main/main.js", "--living-aurora-validate", `--user-data-dir=${userData}`, `--ui-screenshot-dir=${screenshots}`], { cwd: root, shell: false, stdio: "inherit" });
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
await rm(temporaryScreenshots, { recursive: true, force: true });
if (exitCode !== 0) throw new Error(`LIVING_AURORA_DESIGN_LAB_FAILED:${String(exitCode)}`);
console.log("LIVING_AURORA_DESIGN_LAB_VALIDATION_PASS");
