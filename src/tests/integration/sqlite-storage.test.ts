import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  RECOVERY_REQUIRED,
  createV1StorageFixture,
  createV9StorageFixture,
  openLocalSqliteStorage,
  resolveDatabasePath
} from "../../platform-electron/sqlite-storage.js";

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
