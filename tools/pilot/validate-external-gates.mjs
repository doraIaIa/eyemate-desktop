import { readFile } from "node:fs/promises";

const input = process.argv[2] ?? "pilot/external-gate-checklist.json";
const checklist = JSON.parse(await readFile(input, "utf8"));
if (checklist.schemaVersion !== "eyemate-external-gates/0.1.0") throw new Error("UNSUPPORTED_EXTERNAL_GATES_SCHEMA");
if (checklist.targetStatus !== "PILOT_READY" || !Array.isArray(checklist.gates) || checklist.gates.length === 0) throw new Error("INVALID_EXTERNAL_GATES_CHECKLIST");
const identifiers = new Set();
for (const gate of checklist.gates) {
  if (!/^[a-z0-9-]+$/.test(gate.id ?? "") || identifiers.has(gate.id)) throw new Error("INVALID_OR_DUPLICATE_GATE_ID");
  identifiers.add(gate.id);
  if (gate.state !== "EXTERNAL_GATE") throw new Error(`UNSAFE_GATE_STATE:${gate.id}`);
  if (!Array.isArray(gate.evidenceNeeded) || gate.evidenceNeeded.length === 0) throw new Error(`MISSING_EVIDENCE_REQUIREMENT:${gate.id}`);
  if (!Array.isArray(gate.approvers) || gate.approvers.length === 0) throw new Error(`MISSING_APPROVER:${gate.id}`);
  if (typeof gate.recheck !== "string" || !gate.recheck.startsWith("npm run ")) throw new Error(`INVALID_RECHECK_COMMAND:${gate.id}`);
}
console.log(`EXTERNAL_GATES_CHECKLIST_PASS open=${checklist.gates.length}`);
