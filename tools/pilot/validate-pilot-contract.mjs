import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

export const PILOT_SCHEMA_VERSION = "eyemate-pilot-feature-matrix/0.1.0";
const STATES = new Set(["ENABLED", "DEGRADED", "DISABLED"]);
const GATE_CLASSES = new Set(["AUTOMATED", "REAL_DEVICE", "GROUND_TRUTH", "CLINICAL_APPROVAL", "SECURITY_PRIVACY_APPROVAL", "CERTIFICATE_STORE", "SYSTEM_PERMISSION"]);
const REQUIRED_DISABLED = new Set(["sensitive-persistence", "camera-lifecycle", "blink-distance-accuracy", "clinical-osdi-6", "signed-msix"]);

export function validatePilotContract(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "INVALID_ROOT" };
  if (value.schemaVersion !== PILOT_SCHEMA_VERSION) return { ok: false, reason: "UNSUPPORTED_SCHEMA" };
  if (value.channel !== "beta-internal-unsigned") return { ok: false, reason: "INVALID_CHANNEL" };
  if (value.targetStatus !== "PILOT_READY_WITH_EXTERNAL_GATES") return { ok: false, reason: "UNSAFE_TARGET_STATUS" };
  if (!Array.isArray(value.features) || value.features.length === 0) return { ok: false, reason: "FEATURES_REQUIRED" };
  const ids = new Set();
  for (const feature of value.features) {
    if (feature === null || typeof feature !== "object" || Array.isArray(feature)) return { ok: false, reason: "INVALID_FEATURE" };
    if (typeof feature.id !== "string" || !/^[a-z0-9-]+$/.test(feature.id)) return { ok: false, reason: "INVALID_FEATURE_ID" };
    if (ids.has(feature.id)) return { ok: false, reason: "DUPLICATE_FEATURE_ID" };
    ids.add(feature.id);
    if (!STATES.has(feature.state)) return { ok: false, reason: "INVALID_FEATURE_STATE" };
    if (!GATE_CLASSES.has(feature.gateClass)) return { ok: false, reason: "INVALID_GATE_CLASS" };
    if (typeof feature.reason !== "string" || feature.reason.trim().length < 12) return { ok: false, reason: "REASON_REQUIRED" };
    if (feature.gateClass !== "AUTOMATED" && feature.state === "ENABLED") return { ok: false, reason: "EXTERNAL_GATE_ENABLED" };
  }
  for (const id of REQUIRED_DISABLED) {
    const feature = value.features.find((candidate) => candidate.id === id);
    if (feature?.state !== "DISABLED") return { ok: false, reason: `REQUIRED_DISABLED_${id.toUpperCase().replaceAll("-", "_")}` };
  }
  return { ok: true, reason: "PILOT_CONTRACT_VALID" };
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("USAGE: node validate-pilot-contract.mjs <feature-matrix.json>");
  let value;
  try { value = JSON.parse(await readFile(input, "utf8")); } catch (error) { throw new Error(`INVALID_MATRIX_FILE:${error instanceof Error ? error.message : "UNKNOWN"}`); }
  const result = validatePilotContract(value);
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
