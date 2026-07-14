import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePilotContract } from "./validate-pilot-contract.mjs";

const valid = JSON.parse(await readFile(new URL("../../pilot/feature-matrix.json", import.meta.url), "utf8"));
assert.deepEqual(validatePilotContract(valid), { ok: true, reason: "PILOT_CONTRACT_VALID" });

const unsafeEncryption = structuredClone(valid);
unsafeEncryption.features.find((feature) => feature.id === "sensitive-persistence").state = "ENABLED";
assert.equal(validatePilotContract(unsafeEncryption).reason, "EXTERNAL_GATE_ENABLED");

const unsafeClinical = structuredClone(valid);
unsafeClinical.features.find((feature) => feature.id === "clinical-osdi-12").gateClass = "AUTOMATED";
unsafeClinical.features.find((feature) => feature.id === "clinical-osdi-12").state = "ENABLED";
assert.match(validatePilotContract(unsafeClinical).reason, /^REQUIRED_DISABLED_/);

const duplicate = structuredClone(valid);
duplicate.features.push(structuredClone(duplicate.features[0]));
assert.equal(validatePilotContract(duplicate).reason, "DUPLICATE_FEATURE_ID");

const unsupported = { ...valid, schemaVersion: "eyemate-pilot-feature-matrix/9.9.9" };
assert.equal(validatePilotContract(unsupported).reason, "UNSUPPORTED_SCHEMA");
console.log("PILOT_CONTRACT_FIXTURES_PASS 5/5");
