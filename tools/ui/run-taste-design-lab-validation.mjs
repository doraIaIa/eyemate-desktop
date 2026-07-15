import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = await readFile(path.join(root, "src", "renderer", "taste-design-lab.ts"), "utf8");
const styles = await readFile(path.join(root, "src", "renderer", "taste-design-lab.css"), "utf8");
const forbiddenSource = ["window.eyeMate", "ipcRenderer", "ipcMain", "cameraRuntime", "fetch(", "XMLHttpRequest", "WebSocket", "indexedDB", "localStorage", "sessionStorage"];
for (const token of forbiddenSource) if (source.includes(token)) throw new Error(`TASTE_DESIGN_LAB_FORBIDDEN_BOUNDARY:${token}`);
if (/https?:\/\/|@import|url\s*\(/i.test(`${source}\n${styles}`)) throw new Error("TASTE_DESIGN_LAB_REMOTE_ASSET_FORBIDDEN");
if (/addEventListener\s*\(\s*["']scroll["']/.test(source)) throw new Error("TASTE_DESIGN_LAB_SCROLL_HIJACK_FORBIDDEN");
for (const token of ["taste-nav-track", "taste-click-ripple", "taste-view-enter", "taste-tile-enter", "taste-bar-rise", "prefers-reduced-motion"]) {
  if (!`${source}\n${styles}`.includes(token)) throw new Error(`TASTE_DESIGN_LAB_MOTION_EVIDENCE_MISSING:${token}`);
}

const electron = process.platform === "win32" ? path.join(root, "node_modules", "electron", "dist", "electron.exe") : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-taste-design-lab-"));
const temporaryScreenshots = await mkdtemp(path.join(os.tmpdir(), "eyemate-taste-design-lab-screenshots-"));
const screenshots = process.env.EYEMATE_UPDATE_UI_EVIDENCE === "1" ? path.join(root, "docs", "validation", "ui-screenshots") : temporaryScreenshots;
await mkdir(screenshots, { recursive: true });
const child = spawn(electron, ["dist/main/main.js", "--taste-design-lab-validate", `--user-data-dir=${userData}`, `--ui-screenshot-dir=${screenshots}`], { cwd: root, shell: false, stdio: "inherit" });
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
await rm(temporaryScreenshots, { recursive: true, force: true });
if (exitCode !== 0) throw new Error(`TASTE_DESIGN_LAB_VALIDATION_FAILED:${String(exitCode)}`);
console.log("TASTE_DESIGN_LAB_VALIDATION_PASS staticBoundary=true remoteAssets=false scrollHijack=false motionEvidence=true");
