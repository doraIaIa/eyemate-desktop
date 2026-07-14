import { spawn } from "node:child_process";
import { resolve } from "node:path";
const child = spawn(process.execPath, [resolve("node_modules/electron/cli.js"), "dist/main/main.js", "--m3-smoke"], { cwd: process.cwd(), stdio: "inherit", shell: false });
child.on("exit", (code) => process.exit(code ?? 1));
