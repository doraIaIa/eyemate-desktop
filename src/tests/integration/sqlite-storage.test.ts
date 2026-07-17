import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  RECOVERY_REQUIRED,
  createV1StorageFixture,
  createV9StorageFixture,
  openLocalSqliteStorage,
  resolveDatabasePath
} from "../../platform-electron/sqlite-storage.js";
import { createSensitiveDataCodec } from "../../platform-electron/storage-crypto.js";
import { createCameraCalibrationRecord } from "../../camera/calibration-service.js";

function createFixturePath(name: string): string {
  return join(mkdtempSync(join(tmpdir(), "eyemate-m1-storage-")), name, "eyemate.sqlite");
}

test("SQLite local tạo dữ liệu onboarding ngoài installation directory", () => {
  const databasePath = createFixturePath("clean");
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  if (result.state === "READY") {
    result.storage.save({ stage: "PRIVACY_SEEN", updatedAt: "2026-07-14T00:00:00.000Z" });
    result.storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "SKIPPED", decidedAt: "2026-07-14T00:00:00.000Z" });
    result.storage.saveSurveyOnlyReport({ reportId: "survey-only-0001", status: "COMPLETED", action: "REVIEW_YOUR_RESPONSES", provenanceVersion: "m1-report-0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
    assert.equal(result.storage.listSurveyOnlyReports().length, 1);
    assert.deepEqual(result.storage.load(), { stage: "PRIVACY_SEEN", updatedAt: "2026-07-14T00:00:00.000Z" });
    assert.equal(result.storage.loadCameraConsent()?.decision, "SKIPPED");
    result.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("Wellness Check lưu version và payload tự báo cáo, rồi xóa cùng local reset", () => {
  const databasePath = createFixturePath("wellness-payload");
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  if (result.state === "READY") {
    const payload = JSON.stringify({ questionnaireVersion: "eyemate-symptom-check/1.0.0", answers: { eye_discomfort: 2 }, total: 2, maximumScore: 15 });
    result.storage.saveSurveyOnlyReport({ reportId: "wellness-0001", status: "COMPLETED", action: "LOOK_AWAY_BREAK", provenanceVersion: "eyemate-symptom-check/1.0.0", createdAt: "2026-07-14T00:00:00.000Z", wellnessPayload: { questionnaireVersion: "eyemate-symptom-check/1.0.0", scoreVersion: "eyemate-symptom-check-total/1.0.0", payloadJson: payload } });
    assert.equal(result.storage.getWellnessCheckPayload("wellness-0001"), payload);
    assert.equal(result.storage.deleteAllLocalData(), "DELETED");
    assert.equal(result.storage.getWellnessCheckPayload("wellness-0001"), null);
    result.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("Integrated Checkup lưu camera status và assessment payload mà không lưu dữ liệu raw", () => {
  const databasePath = createFixturePath("integrated-checkup");
  const result = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: createSensitiveDataCodec(Buffer.alloc(32, 13)) });
  assert.equal(result.state, "READY");
  if (result.state === "READY") {
    const payload = JSON.stringify({ cameraEvidence: { status: "COMPLETED", rawDataPersisted: false }, assessment: { disclaimer: "WELLNESS_EDUCATION_NOT_DIAGNOSIS" } });
    result.storage.saveSurveyOnlyReport({ reportId: "integrated-0001", status: "COMPLETED", source: "INTEGRATED_CHECKUP", cameraStatus: "COMPLETED", action: "LOOK_AWAY_BREAK", provenanceVersion: "eyemate-symptom-check/1.0.0", createdAt: "2026-07-15T00:00:00.000Z", wellnessPayload: { questionnaireVersion: "eyemate-symptom-check/1.0.0", scoreVersion: "eyemate-symptom-check-total/1.0.0", payloadJson: payload } });
    const item = result.storage.listSurveyOnlyReports()[0];
    assert.equal(item?.source, "INTEGRATED_CHECKUP");
    assert.equal(item?.cameraStatus, "COMPLETED");
    assert.equal(result.storage.getWellnessCheckPayload("integrated-0001"), payload);
    result.storage.close();
  }
  assert.equal(/raw[_-]?(?:frame|video|landmarks?)|pixel[_-]?buffer/i.test(readFileSync(databasePath).toString("utf8")), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("migration cũ tạo backup và giữ dữ liệu onboarding", () => {
  const databasePath = createFixturePath("migration");
  createV1StorageFixture(databasePath);
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  assert.equal(result.migrated, true);
  assert.equal(existsSync(`${databasePath}.backup-v1`), true);
  if (result.state === "READY") result.storage.close();
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("migration N-1 từ schema 9 tạo preferences schema và backup", () => {
  const databasePath = createFixturePath("migration-v9");
  createV9StorageFixture(databasePath);
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  assert.equal(result.migrated, true);
  assert.equal(existsSync(`${databasePath}.backup-v1`), true);
  if (result.state === "READY") {
    assert.equal(result.storage.loadUserPreferences().defaultMode, "TIMER_ONLY");
    result.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("migration lỗi giữ backup và khóa truy cập storage", () => {
  const databasePath = createFixturePath("failure");
  createV1StorageFixture(databasePath);
  const result = openLocalSqliteStorage(databasePath, { forceMigrationFailure: true });
  assert.deepEqual(result, {
    state: RECOVERY_REQUIRED,
    failureCode: "FORCED_MIGRATION_FAILURE",
    backupCreated: true
  });
  assert.equal(existsSync(`${databasePath}.backup-v1`), true);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("rút camera consent được ghi lại sau restart", () => {
  const databasePath = createFixturePath("consent");
  const initial = openLocalSqliteStorage(databasePath);
  assert.equal(initial.state, "READY");
  if (initial.state === "READY") {
    initial.storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "GRANTED", decidedAt: "2026-07-14T00:00:00.000Z" });
    initial.storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "WITHDRAWN", decidedAt: "2026-07-14T00:01:00.000Z" });
    initial.storage.close();
  }
  const reopened = openLocalSqliteStorage(databasePath);
  assert.equal(reopened.state, "READY");
  if (reopened.state === "READY") {
    assert.equal(reopened.storage.loadCameraConsent()?.decision, "WITHDRAWN");
    reopened.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("calibration aggregate được mã hóa, persist qua restart và reset độc lập", () => {
  const databasePath = createFixturePath("camera-calibration");
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 7));
  const record = createCameraCalibrationRecord({
    deviceBinding: "c".repeat(64), width: 640, height: 480, referenceDistanceCm: 50,
    interEyeDistanceSamplesPx: Array(30).fill(100), calibratedAt: "2026-07-15T00:00:00.000Z"
  });
  const initial = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(initial.state, "READY");
  if (initial.state === "READY") {
    initial.storage.saveCameraCalibration(record);
    assert.deepEqual(initial.storage.loadCameraCalibration(), record);
    initial.storage.close();
  }
  const physical = readFileSync(databasePath);
  assert.equal(physical.includes(Buffer.from(record.profile.deviceBinding)), false);
  const reopened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(reopened.state, "READY");
  if (reopened.state === "READY") {
    assert.deepEqual(reopened.storage.loadCameraCalibration(), record);
    assert.equal(reopened.storage.deleteCameraCalibration(), "DELETED");
    assert.equal(reopened.storage.loadCameraCalibration(), null);
    reopened.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("delete all local data là idempotent và không khẳng định xóa export ngoài app", () => {
  const databasePath = createFixturePath("delete");
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  if (result.state === "READY") {
    result.storage.save({ stage: "COMPLETE", updatedAt: "2026-07-14T00:00:00.000Z" });
    assert.equal(result.storage.deleteAllLocalData(), "DELETED");
    assert.equal(result.storage.load(), null);
    assert.equal(result.storage.deleteAllLocalData(), "DELETED");
    result.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("database path chặn installation resources và không chứa raw camera marker", () => {
  assert.throws(() => resolveDatabasePath("C:/application/resources"), /INVALID_USER_DATA_DIRECTORY/);
  const databasePath = createFixturePath("privacy");
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  if (result.state === "READY") result.storage.close();
  assert.equal(/raw[_-]?(?:frame|video|landmarks?)|pixel[_-]?buffer/i.test(readFileSync(databasePath).toString("utf8")), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("preferences và data inventory persist qua restart rồi reset cùng delete all", () => {
  const databasePath = createFixturePath("preferences");
  const initial = openLocalSqliteStorage(databasePath);
  assert.equal(initial.state, "READY");
  if (initial.state === "READY") {
    initial.storage.saveUserPreferences({ defaultMode: "TIMER_ONLY", soundEnabled: true, breakReminderEnabled: false, quietHoursEnabled: true, quietStartMinute: 1320, quietEndMinute: 420, reducedMotion: true });
    assert.equal(initial.storage.getDataInventory().find((item) => item.category === "PREFERENCE")?.recordCount, 1);
    initial.storage.close();
  }
  const reopened = openLocalSqliteStorage(databasePath);
  assert.equal(reopened.state, "READY");
  if (reopened.state === "READY") {
    assert.equal(reopened.storage.loadUserPreferences().soundEnabled, true);
    assert.equal(reopened.storage.deleteAllLocalData(), "DELETED");
    assert.equal(reopened.storage.loadUserPreferences().soundEnabled, false);
    assert.equal(reopened.storage.getDataInventory().every((item) => item.recordCount === 0), true);
    reopened.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("delete all purge plaintext canary và migration backup", () => {
  const databasePath = createFixturePath("physical-purge");
  const canary = "SENSITIVE_PILOT_CANARY_7F8C2A";
  const initial = openLocalSqliteStorage(databasePath);
  assert.equal(initial.state, "READY");
  if (initial.state === "READY") {
    initial.storage.saveSurveyOnlyReport({ reportId: "purge-canary", status: "COMPLETED", action: canary, provenanceVersion: "purge/0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
    initial.storage.close();
  }
  copyFileSync(databasePath, `${databasePath}.backup-v1`);
  const reopened = openLocalSqliteStorage(databasePath);
  assert.equal(reopened.state, "READY");
  if (reopened.state === "READY") {
    assert.equal(reopened.storage.deleteAllLocalData(), "DELETED");
    reopened.storage.close();
  }
  assert.equal(existsSync(`${databasePath}.backup-v1`), false);
  const remaining = readdirSync(dirname(databasePath)).filter((name) => name.startsWith("eyemate.sqlite"));
  assert.equal(remaining.some((name) => readFileSync(join(dirname(databasePath), name)).includes(Buffer.from(canary))), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("protected storage mã hóa payload nhạy cảm, restart và delete không để plaintext", () => {
  const databasePath = createFixturePath("protected-roundtrip");
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 11));
  const canary = "SENSITIVE_PROTECTED_CANARY_91C2";
  const opened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(opened.state, "READY");
  if (opened.state === "READY") {
    opened.storage.saveSurveyOnlyReport({ reportId: "protected-report", status: "COMPLETED", action: canary, provenanceVersion: "protected/0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
    opened.storage.saveM3Record({ id: "protected-source", kind: "SOURCE", createdAt: "2026-07-14T00:00:00.000Z", payloadJson: JSON.stringify({ canary }) });
    opened.storage.close();
  }
  assert.equal(readdirSync(dirname(databasePath)).some((name) => readFileSync(join(dirname(databasePath), name)).includes(Buffer.from(canary))), false);
  const reopened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(reopened.state, "READY");
  if (reopened.state === "READY") {
    assert.equal(reopened.storage.listSurveyOnlyReports()[0]?.action, canary);
    assert.equal(JSON.parse(reopened.storage.listM3Records("SOURCE")[0]!.payloadJson).canary, canary);
    reopened.storage.deleteAllLocalData();
    reopened.storage.close();
  }
  assert.equal(readdirSync(dirname(databasePath)).some((name) => readFileSync(join(dirname(databasePath), name)).includes(Buffer.from(canary))), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("protected storage fail-closed với missing/wrong key và payload bị sửa", () => {
  const databasePath = createFixturePath("protected-tamper");
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 21));
  const opened = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(opened.state, "READY");
  if (opened.state === "READY") {
    opened.storage.saveSurveyOnlyReport({ reportId: "tampered-report", status: "COMPLETED", action: "CANARY", provenanceVersion: "protected/0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
    opened.storage.close();
  }
  assert.equal(openLocalSqliteStorage(databasePath).state, RECOVERY_REQUIRED);
  assert.equal(openLocalSqliteStorage(databasePath, { sensitiveDataCodec: createSensitiveDataCodec(Buffer.alloc(32, 22)) }).state, RECOVERY_REQUIRED);
  const database = new DatabaseSync(databasePath);
  const row = database.prepare("SELECT action FROM checkup_report_snapshot WHERE report_id = 'tampered-report'").get() as { action: string };
  database.prepare("UPDATE checkup_report_snapshot SET action = ? WHERE report_id = 'tampered-report'").run(`${row.action.slice(0, -1)}A`);
  database.close();
  const tampered = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(tampered.state, "READY");
  if (tampered.state === "READY") {
    assert.throws(() => tampered.storage.listSurveyOnlyReports(), /TAMPERED_OR_KEY_INVALID/);
    tampered.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("plaintext migration tạo backup đã mã hóa và interrupted migration không commit một phần", () => {
  const databasePath = createFixturePath("protected-migration");
  const canary = "LEGACY_PLAINTEXT_CANARY_44AF";
  const legacy = openLocalSqliteStorage(databasePath);
  assert.equal(legacy.state, "READY");
  if (legacy.state === "READY") {
    legacy.storage.saveSurveyOnlyReport({ reportId: "legacy-report", status: "COMPLETED", action: canary, provenanceVersion: "legacy/0.1.0", createdAt: "2026-07-14T00:00:00.000Z" });
    legacy.storage.close();
  }
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 31));
  const interrupted = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec, forceEncryptionMigrationFailure: true });
  assert.equal(interrupted.state, RECOVERY_REQUIRED);
  assert.equal(existsSync(`${databasePath}.backup-encrypted`), true);
  assert.equal(readFileSync(`${databasePath}.backup-encrypted`, "utf8").includes(canary), false);
  const migrated = openLocalSqliteStorage(databasePath, { sensitiveDataCodec: codec });
  assert.equal(migrated.state, "READY");
  if (migrated.state === "READY") {
    assert.equal(migrated.storage.listSurveyOnlyReports()[0]?.action, canary);
    migrated.storage.close();
  }
  assert.equal(readdirSync(dirname(databasePath)).some((name) => name !== "eyemate.sqlite.backup-encrypted" && readFileSync(join(dirname(databasePath), name)).includes(Buffer.from(canary))), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});
