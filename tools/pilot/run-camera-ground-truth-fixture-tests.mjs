import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateGroundTruthEvidence } from "./validate-camera-ground-truth.mjs";

const valid = JSON.parse(await readFile(new URL("./fixtures/camera-ground-truth-valid.json", import.meta.url), "utf8"));
assert.deepEqual(validateGroundTruthEvidence(valid), { ok: true, state: "MEASURED_ZONE_ONLY", evaluable: 3, correct: 3, zoneAccuracy: 100 });
assert.equal(validateGroundTruthEvidence({ ...valid, observations: valid.observations.slice(0, 2) }).reason, "INSUFFICIENT_OBSERVATIONS");
assert.equal(validateGroundTruthEvidence({ ...valid, observations: [{ ...valid.observations[0], rawDataPersisted: true }, ...valid.observations.slice(1) ] }).reason, "RAW_DATA_POLICY_VIOLATION");
assert.deepEqual(validateGroundTruthEvidence({ ...valid, observations: valid.observations.map((item) => ({ ...item, observedZone: "UNKNOWN", qualityAccepted: false })) }), { ok: true, state: "UNKNOWN_NO_EVALUABLE_OBSERVATION", evaluable: 0, correct: 0, zoneAccuracy: null });
console.log("CAMERA_GROUND_TRUTH_FIXTURES_PASS 4/4");
