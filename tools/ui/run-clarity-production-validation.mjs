import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rendererSource = await readFile(path.join(root, "src", "renderer", "app.ts"), "utf8");
const indexSource = await readFile(path.join(root, "src", "renderer", "index.html"), "utf8");
const styles = await readFile(path.join(root, "src", "renderer", "styles.css"), "utf8");

if ((indexSource.match(/data-route=/g) ?? []).length !== 7) throw new Error("CLARITY_PRODUCTION_NAVIGATION_COUNT_INVALID");
for (const token of ["production-topbar", "clarity-home-grid", "productionEvidenceTrace", "production-evidence-bar", "clarity-session-ring", "clarity-home-artwork", "clarity-week-panel", "Visual wellbeing", "production-click-ripple", "prefers-reduced-motion", "prefers-reduced-transparency"]) {
  if (!`${rendererSource}\n${indexSource}\n${styles}`.includes(token)) throw new Error(`CLARITY_PRODUCTION_EVIDENCE_MISSING:${token}`);
}
for (const token of ["getRuntimeInfo", "runSurveyOnly", "startWorkSession", "generateM3Report", "getPrivacySummary", "getUserPreferences"]) {
  if (!rendererSource.includes(`window.eyeMate.${token}`)) throw new Error(`CLARITY_PRODUCTION_FUNCTIONAL_HOOK_MISSING:${token}`);
}
if (rendererSource.includes('class="vitals-orb"')) throw new Error("CLARITY_PRODUCTION_ORB_NOT_REMOVED");
if (rendererSource.includes("[34, 46, 42, 58, 52, 66, 78, 55, 48, 43, 51, 62]")) throw new Error("CLARITY_PRODUCTION_DECORATIVE_CHART_REGRESSION");
if (/https?:\/\/|@import/i.test(`${indexSource}\n${styles}`)) throw new Error("CLARITY_PRODUCTION_REMOTE_ASSET_FORBIDDEN");

const electron = process.platform === "win32" ? path.join(root, "node_modules", "electron", "dist", "electron.exe") : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-clarity-production-"));
const temporaryScreenshots = await mkdtemp(path.join(os.tmpdir(), "eyemate-clarity-production-screenshots-"));
const screenshots = process.env.EYEMATE_UPDATE_UI_EVIDENCE === "1" ? path.join(root, "docs", "validation", "ui-screenshots") : temporaryScreenshots;
await mkdir(screenshots, { recursive: true });
const child = spawn(electron, ["dist/main/main.js", "--clarity-production-validate", `--user-data-dir=${userData}`, `--ui-screenshot-dir=${screenshots}`], { cwd: root, shell: false, stdio: "inherit" });
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
await rm(userData, { recursive: true, force: true });
await rm(temporaryScreenshots, { recursive: true, force: true });
if (exitCode !== 0) throw new Error(`CLARITY_PRODUCTION_VALIDATION_FAILED:${String(exitCode)}`);
console.log("CLARITY_PRODUCTION_VALIDATION_PASS staticShell=true remoteAssets=false functionalHookScan=true");
