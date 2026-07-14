import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openLocalSqliteStorage } from "../../dist/platform-electron/sqlite-storage.js";
import { createSensitiveDataCodec } from "../../dist/platform-electron/storage-crypto.js";

const matrix = JSON.parse(await readFile(new URL("../../pilot/feature-matrix.json", import.meta.url), "utf8"));
const sensitive = matrix.features.find((feature) => feature.id === "sensitive-persistence");
if (sensitive?.state !== "DISABLED") throw new Error("SENSITIVE_PERSISTENCE_MUST_REMAIN_DISABLED");
const directory = await mkdtemp(path.join(os.tmpdir(), "eyemate-sensitive-gate-"));
const databasePath = path.join(directory, "eyemate.sqlite");
const canary = "SENSITIVE_PILOT_CANARY_D14A9C";
try {
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 41));
  const opened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  if (opened.state !== "READY") throw new Error(`STORAGE_NOT_READY:${opened.failureCode}`);
  opened.storage.saveSurveyOnlyReport({ reportId: "sensitive-gate", status: "COMPLETED", action: canary, provenanceVersion: "pilot-gate/0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
  opened.storage.close();
  const files = await readdir(directory);
  const plaintextObserved = (await Promise.all(files.map(async (name) => (await readFile(path.join(directory, name))).includes(Buffer.from(canary))))).some(Boolean);
  if (plaintextObserved) throw new Error("SENSITIVE_PAYLOAD_PLAINTEXT_OBSERVED");
  const reopened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  if (reopened.state !== "READY" || reopened.storage.listSurveyOnlyReports()[0]?.action !== canary) throw new Error("SENSITIVE_STORAGE_ROUNDTRIP_FAILED");
  reopened.storage.close();
  console.log("SENSITIVE_STORAGE_GATE_PASS state=DISABLED_PENDING_APPROVAL plaintext=NOT_OBSERVED implementation=VERIFIED");
} finally {
  await rm(directory, { recursive: true, force: true });
}
