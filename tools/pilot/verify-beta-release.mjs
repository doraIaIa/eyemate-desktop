import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanArtifactBytes } from "../m0/scan-evidence-artifact.mjs";
import { validatePilotContract } from "./validate-pilot-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const betaRoot = path.join(root, ".pilot", "beta");
const releaseRoot = path.join(betaRoot, "release");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const manifest = JSON.parse(await readFile(path.join(releaseRoot, "release-manifest.json"), "utf8"));
const matrix = JSON.parse(await readFile(path.join(releaseRoot, "feature-matrix.json"), "utf8"));
const artifact = await readFile(path.join(betaRoot, manifest.artifact?.fileName ?? ""));

if (manifest.schemaVersion !== "eyemate-beta-release/0.1.0") throw new Error("UNSUPPORTED_RELEASE_SCHEMA");
if (manifest.channel !== "beta-internal-unsigned" || manifest.packageIdentity !== "EyeMate.Beta.Internal") throw new Error("INVALID_BETA_IDENTITY");
if (manifest.signing?.status !== "EXTERNAL_GATE") throw new Error("UNVERIFIED_SIGNING_CLAIM");
if (artifact.byteLength !== manifest.artifact.bytes) throw new Error("ARTIFACT_SIZE_MISMATCH");
if (sha256(artifact) !== manifest.artifact.sha256) throw new Error("ARTIFACT_HASH_MISMATCH");
if (!validatePilotContract(matrix).ok) throw new Error("INVALID_RELEASE_FEATURE_MATRIX");

const checksum = await readFile(path.join(releaseRoot, "SHA256SUMS.txt"), "utf8");
if (checksum.trim() !== `${manifest.artifact.sha256}  ${manifest.artifact.fileName}`) throw new Error("CHECKSUM_FILE_MISMATCH");

for (const fileName of ["release-manifest.json", "sbom.cdx.json", "feature-matrix.json", "EXTERNAL_GATES.json", "RELEASE_NOTES.md", "PILOT_RUNBOOK.md", "SHA256SUMS.txt"]) {
  const bytes = await readFile(path.join(releaseRoot, fileName));
  const scan = scanArtifactBytes("package-build", bytes);
  if (!scan.ok) throw new Error(`RELEASE_ARTIFACT_REJECTED:${fileName}:${scan.code}`);
}

console.log(`PILOT_BETA_RELEASE_VERIFY_PASS bytes=${artifact.byteLength} sha256=${manifest.artifact.sha256}`);
