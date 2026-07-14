import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const betaRoot = path.join(root, ".pilot", "beta");
const kitsBin = "C:\\Program Files (x86)\\Windows Kits\\10\\bin";
const statusOnly = process.argv.includes("--status");
const verifyOnly = process.argv.includes("--verify");
const artifactArgument = process.argv.find((argument) => argument.toLocaleLowerCase("en-US").endsWith(".msix"));
const thumbprint = process.env.EYEMATE_SIGNING_CERT_SHA1;

function resolveSignTool() {
  if (!existsSync(kitsBin)) return null;
  const candidates = readdirSync(kitsBin, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+\.\d+\.\d+\.\d+$/.test(entry.name))
    .map((entry) => path.join(kitsBin, entry.name, "x64", "signtool.exe"))
    .filter(existsSync)
    .sort((left, right) => right.localeCompare(left, "en-US", { numeric: true }));
  return candidates[0] ?? null;
}

function safeArtifactPath(argument) {
  if (!argument) throw new Error("MSIX_PATH_REQUIRED");
  const artifact = path.resolve(root, argument);
  const relative = path.relative(betaRoot, artifact);
  if (relative.startsWith("..") || path.isAbsolute(relative) || !existsSync(artifact)) throw new Error("MSIX_PATH_OUTSIDE_BETA_ROOT");
  return artifact;
}

async function runSignTool(signTool, args, failurePrefix) {
  const child = spawn(signTool, args, { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "ignore"] });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  if (code !== 0) throw new Error(`${failurePrefix}_${code ?? 1}`);
}

const signTool = resolveSignTool();
if (statusOnly) {
  const toolAvailable = signTool !== null;
  const certificateConfigured = typeof thumbprint === "string" && /^[A-Fa-f0-9]{40}$/.test(thumbprint);
  console.log(JSON.stringify({ schemaVersion: "pilot-signing-interface/0.2.0", toolAvailable, certificateConfigured, signatureVerificationAvailable: toolAvailable, status: toolAvailable ? "READY_FOR_EXTERNAL_CERTIFICATE" : "TOOLCHAIN_MISSING" }));
} else {
  if (!signTool) throw new Error("SIGNTOOL_NOT_FOUND");
  const artifact = safeArtifactPath(artifactArgument);
  if (verifyOnly) {
    await runSignTool(signTool, ["verify", "/pa", artifact], "SIGNATURE_VERIFICATION_FAILED");
    console.log("BETA_MSIX_SIGNATURE_VERIFIED");
  } else {
    if (typeof thumbprint !== "string" || !/^[A-Fa-f0-9]{40}$/.test(thumbprint)) throw new Error("SIGNING_CERTIFICATE_NOT_CONFIGURED");
    await runSignTool(signTool, ["sign", "/fd", "SHA256", "/sha1", thumbprint, artifact], "SIGNING_FAILED");
    await runSignTool(signTool, ["verify", "/pa", artifact], "POST_SIGN_VERIFICATION_FAILED");
    console.log("BETA_MSIX_SIGNED_AND_VERIFIED");
  }
}
