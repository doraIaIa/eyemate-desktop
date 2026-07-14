import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SCHEMA_VERSION = "eyemate-camera-ground-truth/0.1.0";
const ZONES = new Set(["NEAR", "COMFORT", "FAR", "UNKNOWN"]);

function expectedZone(referenceDistanceCm, actualDistanceCm) {
  const ratio = actualDistanceCm / referenceDistanceCm;
  if (ratio < 0.85) return "NEAR";
  if (ratio > 1.15) return "FAR";
  return "COMFORT";
}

export function validateGroundTruthEvidence(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "INVALID_ROOT" };
  if (value.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: "UNSUPPORTED_SCHEMA" };
  if (!Number.isFinite(value.calibrationReferenceCm) || value.calibrationReferenceCm < 20 || value.calibrationReferenceCm > 150) return { ok: false, reason: "INVALID_CALIBRATION_REFERENCE" };
  if (!Array.isArray(value.observations) || value.observations.length < 3) return { ok: false, reason: "INSUFFICIENT_OBSERVATIONS" };
  const identifiers = new Set();
  let evaluable = 0;
  let correct = 0;
  for (const observation of value.observations) {
    if (observation === null || typeof observation !== "object" || Array.isArray(observation)) return { ok: false, reason: "INVALID_OBSERVATION" };
    if (typeof observation.id !== "string" || !/^[a-z0-9-]{3,40}$/i.test(observation.id) || identifiers.has(observation.id)) return { ok: false, reason: "INVALID_OR_DUPLICATE_OBSERVATION_ID" };
    identifiers.add(observation.id);
    if (!Number.isFinite(observation.referenceDistanceCm) || observation.referenceDistanceCm < 20 || observation.referenceDistanceCm > 150 || !ZONES.has(observation.observedZone) || typeof observation.qualityAccepted !== "boolean") return { ok: false, reason: "INVALID_OBSERVATION_VALUE" };
    if (observation.rawDataPersisted !== false) return { ok: false, reason: "RAW_DATA_POLICY_VIOLATION" };
    if (!observation.qualityAccepted || observation.observedZone === "UNKNOWN") continue;
    evaluable += 1;
    if (observation.observedZone === expectedZone(value.calibrationReferenceCm, observation.referenceDistanceCm)) correct += 1;
  }
  if (evaluable === 0) return { ok: true, state: "UNKNOWN_NO_EVALUABLE_OBSERVATION", evaluable, correct, zoneAccuracy: null };
  return { ok: true, state: "MEASURED_ZONE_ONLY", evaluable, correct, zoneAccuracy: Math.round((correct / evaluable) * 1_000) / 10 };
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("USAGE: node validate-camera-ground-truth.mjs <aggregate-evidence.json>");
  let value;
  try { value = JSON.parse(await readFile(input, "utf8")); }
  catch { throw new Error("INVALID_EVIDENCE_JSON"); }
  const result = validateGroundTruthEvidence(value);
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
