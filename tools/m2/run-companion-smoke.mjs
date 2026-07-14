import { spawn } from "node:child_process";
import { resolve } from "node:path";

const electron = resolve("node_modules/electron/cli.js");
const child = spawn(process.execPath, [electron, "dist/main/main.js", "--m2-smoke"], { cwd: process.cwd(), stdio: "inherit", shell: false });
child.on("exit", (code) => process.exit(code ?? 1));
