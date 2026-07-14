import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electron = process.platform === "win32"
  ? path.join(root, "node_modules", "electron", "dist", "electron.exe")
  : path.join(root, "node_modules", "electron", "dist", "electron");
const userData = await mkdtemp(path.join(os.tmpdir(), "eyemate-camera-runtime-"));

try {
  const child = spawn(electron, ["dist/main/main.js", "--camera-runtime-test", `--user-data-dir=${userData}`], {
    cwd: root,
    shell: false,
    stdio: "inherit",
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" }
  });
  const exitCode = await new Promise((resolve) => child.once("exit", resolve));
  if (exitCode !== 0) throw new Error(`CAMERA_RUNTIME_INTEGRATION_EXIT:${String(exitCode)}`);
} finally {
  await rm(userData, { recursive: true, force: true });
}
