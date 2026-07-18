import { spawn } from "node:child_process";
import path from "node:path";

const electronCommand = process.platform === "win32" ? path.resolve("node_modules/electron/dist/electron.exe") : path.resolve("node_modules/.bin/electron");
const child = spawn(electronCommand, ["dist/main/main.js", "--enterprise-demo-validate"], {
  stdio: "inherit",
  shell: false
});

child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
