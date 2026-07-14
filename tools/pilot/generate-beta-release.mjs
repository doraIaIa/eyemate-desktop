import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePilotContract } from "./validate-pilot-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, ".pilot", "beta", "release");
const artifact = path.join(root, ".pilot", "beta", "eyemate-beta.msix");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const worktree = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
if (worktree) throw new Error("DIRTY_WORKTREE_RELEASE_PROVENANCE_REFUSED");
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
const matrix = JSON.parse(await readFile(path.join(root, "pilot", "feature-matrix.json"), "utf8"));
const contract = validatePilotContract(matrix);
if (!contract.ok) throw new Error(`PILOT_CONTRACT_${contract.reason}`);
const artifactBytes = await readFile(artifact);
const dependencies = Object.entries(lock.packages ?? {}).filter(([key]) => key.startsWith("node_modules/")).map(([key, value]) => ({ type: "library", name: key.slice("node_modules/".length), version: value.version ?? "UNKNOWN", licenses: value.license ? [{ license: { id: value.license } }] : [] })).sort((a, b) => a.name.localeCompare(b.name));
const sbom = { bomFormat: "CycloneDX", specVersion: "1.5", version: 1, metadata: { component: { type: "application", name: packageJson.name, version: packageJson.version } }, components: dependencies };
const manifest = {
  schemaVersion: "eyemate-beta-release/0.1.0", channel: "beta-internal-unsigned", packageIdentity: "EyeMate.Beta.Internal", commit,
  application: { version: packageJson.version, msixVersion: "0.1.0.0" }, storage: { currentSchema: 10, readableSchema: { min: 1, max: 10 }, rollback: "PRE_MIGRATION_BACKUP_REQUIRED_FOR_OLDER_BINARY" },
  artifact: { fileName: "eyemate-beta.msix", bytes: artifactBytes.byteLength, sha256: sha256(artifactBytes) }, signing: { status: "READY_FOR_EXTERNAL_CERTIFICATE", interface: "tools/pilot/sign-beta-msix.mjs", verificationCommand: "node tools/pilot/sign-beta-msix.mjs --verify .pilot/beta/eyemate-beta.msix" },
  verification: ["npm run verify", "npm run test:camera-runtime", "npm run test:pdf-export", "npm run pilot:sensitive-storage-gate", "npm run egress:observe:pilot", "npm run build:msix:beta"], featureMatrixSchema: matrix.schemaVersion,
  limitations: matrix.features.filter((feature) => feature.state !== "ENABLED").map((feature) => ({ id: feature.id, state: feature.state, gateClass: feature.gateClass }))
};
const notes = `# EyeMate ${packageJson.version} · Internal Beta\n\n- Local-only survey/checkup, Timer Only companion và Personal Intelligence.\n- Camera runtime local và cửa sổ đo 30 giây đã có; accuracy-dependent use vẫn khóa đến khi có ground truth.\n- Sensitive payload encryption đã implement nhưng chờ Security/Privacy approval.\n- OSDI-6 clinical và signing vẫn bị khóa bởi external gate.\n- Markdown/JSON/PDF export cần preview; delete không bao gồm file export ngoài app-data.\n- Không có cloud, account hoặc telemetry. Đây là unsigned engineering beta, không phải public release.\n`;
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(output, "sbom.cdx.json"), `${JSON.stringify(sbom, null, 2)}\n`);
await writeFile(path.join(output, "SHA256SUMS.txt"), `${manifest.artifact.sha256}  ${manifest.artifact.fileName}\n`);
await writeFile(path.join(output, "RELEASE_NOTES.md"), notes);
await writeFile(path.join(output, "feature-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`);
await copyFile(path.join(root, "docs", "operations", "internal-beta-pilot.md"), path.join(output, "PILOT_RUNBOOK.md"));
await copyFile(path.join(root, "pilot", "external-gate-checklist.json"), path.join(output, "EXTERNAL_GATES.json"));
console.log(`PILOT_BETA_RELEASE_PASS ${manifest.artifact.sha256}`);
