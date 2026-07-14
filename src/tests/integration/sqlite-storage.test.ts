import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  RECOVERY_REQUIRED,
  createV1StorageFixture,
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
    assert.deepEqual(result.storage.load(), { stage: "PRIVACY_SEEN", updatedAt: "2026-07-14T00:00:00.000Z" });
    result.storage.close();
  }
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});

test("migration N-1 tạo backup và giữ dữ liệu onboarding", () => {
  const databasePath = createFixturePath("migration");
  createV1StorageFixture(databasePath);
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  assert.equal(result.migrated, true);
  assert.equal(existsSync(`${databasePath}.backup-v1`), true);
  if (result.state === "READY") result.storage.close();
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

test("database path chặn installation resources và không chứa raw camera marker", () => {
  assert.throws(() => resolveDatabasePath("C:/application/resources"), /INVALID_USER_DATA_DIRECTORY/);
  const databasePath = createFixturePath("privacy");
  const result = openLocalSqliteStorage(databasePath);
  assert.equal(result.state, "READY");
  if (result.state === "READY") result.storage.close();
  assert.equal(/raw[_-]?(?:frame|video|landmarks?)|pixel[_-]?buffer/i.test(readFileSync(databasePath).toString("utf8")), false);
  rmSync(dirname(dirname(databasePath)), { recursive: true, force: true });
});
