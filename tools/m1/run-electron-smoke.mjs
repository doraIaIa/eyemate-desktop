import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const electronBinary = process.platform === "win32"
  ? path.join(root, "node_modules", "electron", "dist", "electron.exe")
  : path.join(root, "node_modules", "electron", "dist", "electron");
const child = spawn(electronBinary, [path.join(root, "dist", "main", "main.js"), "--m1-smoke"], {
  stdio: "inherit",
  shell: false,
  env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" }
});
child.once("exit", (code) => process.exitCode = code ?? 1);
