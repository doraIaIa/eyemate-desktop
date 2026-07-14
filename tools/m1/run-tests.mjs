import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const suite = process.argv[2];
if (suite !== "unit" && suite !== "integration") {
  throw new Error("M1_TEST_SUITE_REQUIRED");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist/tests", suite);
const entries = await readdir(root, { recursive: true });
const testFiles = entries.filter((entry) => entry.endsWith(".test.js")).map((entry) => path.join(root, entry));
if (testFiles.length === 0) {
  throw new Error("M1_TEST_FILES_MISSING");
}

const child = spawn(process.execPath, ["--test", ...testFiles], { stdio: "inherit", shell: false });
child.once("exit", (code) => process.exitCode = code ?? 1);
