import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const signTool = "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe";
const statusOnly = process.argv.includes("--status");
const artifact = process.argv.find((argument) => argument.endsWith(".msix"));
const thumbprint = process.env.EYEMATE_SIGNING_CERT_SHA1;

if (statusOnly) {
  console.log(JSON.stringify({ schemaVersion: "pilot-signing-interface/0.1.0", toolAvailable: existsSync(signTool), certificateConfigured: typeof thumbprint === "string" && /^[A-Fa-f0-9]{40}$/.test(thumbprint), status: "EXTERNAL_GATE" }));
} else {
  if (!existsSync(signTool)) throw new Error("SIGNTOOL_NOT_FOUND");
  if (!artifact) throw new Error("MSIX_PATH_REQUIRED");
  if (typeof thumbprint !== "string" || !/^[A-Fa-f0-9]{40}$/.test(thumbprint)) throw new Error("SIGNING_CERTIFICATE_NOT_CONFIGURED");
  const child = spawn(signTool, ["sign", "/fd", "SHA256", "/sha1", thumbprint, artifact], { shell: false, windowsHide: true, stdio: ["ignore", "inherit", "inherit"] });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  if (code !== 0) throw new Error(`SIGNING_FAILED_${code ?? 1}`);
  console.log("BETA_MSIX_SIGNED");
}
