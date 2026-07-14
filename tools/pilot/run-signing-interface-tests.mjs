import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tool = path.join(root, "tools", "pilot", "sign-beta-msix.mjs");

async function run(args, env = {}) {
  const child = spawn(process.execPath, [tool, ...args], { cwd: root, shell: false, windowsHide: true, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (value) => { stdout += value; }); child.stderr.on("data", (value) => { stderr += value; });
  const code = await new Promise((resolve) => child.once("exit", resolve));
  return { code, stdout, stderr };
}

const status = await run(["--status"], { EYEMATE_SIGNING_CERT_SHA1: "not-a-thumbprint" });
if (status.code !== 0) throw new Error("SIGNING_STATUS_FAILED");
const document = JSON.parse(status.stdout);
if (document.schemaVersion !== "pilot-signing-interface/0.2.0" || document.certificateConfigured !== false || document.signatureVerificationAvailable !== document.toolAvailable) throw new Error("SIGNING_STATUS_CONTRACT_INVALID");

const directory = await mkdtemp(path.join(os.tmpdir(), "eyemate-signing-interface-"));
try {
  const outside = path.join(directory, "outside.msix");
  await writeFile(outside, "fixture", "utf8");
  const rejected = await run(["--verify", outside]);
  if (rejected.code === 0 || !rejected.stderr.includes("MSIX_PATH_OUTSIDE_BETA_ROOT")) throw new Error("SIGNING_PATH_BOUNDARY_FAILED");
} finally { await rm(directory, { recursive: true, force: true }); }

console.log(`SIGNING_INTERFACE_TEST_PASS tool=${document.toolAvailable ? "AVAILABLE" : "MISSING"} certificate=EXTERNAL_GATE pathBoundary=PASS`);
