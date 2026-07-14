import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, normalize, parse, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CameraConsentRecord, CameraConsentRepository, OnboardingProgress, OnboardingProgressRepository, OnboardingStage } from "../user-data/ports.js";

export const STORAGE_SCHEMA_VERSION = 4;
export const RECOVERY_REQUIRED = "MIGRATION_RECOVERY_REQUIRED";

export type StorageOpenResult =
  | { readonly state: "READY"; readonly storage: LocalSqliteStorage; readonly migrated: boolean }
  | { readonly state: typeof RECOVERY_REQUIRED; readonly failureCode: string; readonly backupCreated: boolean };

export interface OpenStorageOptions {
  readonly forceMigrationFailure?: boolean;
}

function ensureDatabasePath(databasePath: string): string {
  const normalized = normalize(resolve(databasePath));
  const root = parse(normalized).root;
  if (normalized === root || hasInstallationResourcesComponent(normalized) || !normalized.endsWith(".sqlite")) {
    throw new Error("INVALID_DATABASE_PATH");
  }
  return normalized;
}

function hasInstallationResourcesComponent(value: string): boolean {
  return value.split(/[\\/]+/).some((component) => component.toLowerCase() === "resources");
}

function createV1Schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      stage TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function createV2Schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migration_record (
      migration_id TEXT PRIMARY KEY,
      from_version INTEGER NOT NULL,
      to_version INTEGER NOT NULL,
      status TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );
  `);
}

function createV3Schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS camera_consent (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      purpose TEXT NOT NULL,
      scope TEXT NOT NULL,
      text_version TEXT NOT NULL,
      decision TEXT NOT NULL,
      decided_at TEXT NOT NULL
    );
  `);
}

function createV4Schema(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS checkup_report_snapshot (report_id TEXT PRIMARY KEY, status TEXT NOT NULL, source TEXT NOT NULL, camera_status TEXT NOT NULL, action TEXT NOT NULL, provenance_version TEXT NOT NULL, created_at TEXT NOT NULL);");
}

function getSchemaVersion(database: DatabaseSync): number {
  const result = database.prepare("PRAGMA user_version").get() as { user_version: number };
  return result.user_version;
}

function assertIntegrity(database: DatabaseSync): void {
  const result = database.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  if (result.integrity_check !== "ok") throw new Error("INTEGRITY_CHECK_FAILED");
}

function isOnboardingStage(value: string): value is OnboardingStage {
  return ["NOT_STARTED", "INTRO_SEEN", "PRIVACY_SEEN", "CAMERA_DECIDED", "COMPLETE"].includes(value);
}

export class LocalSqliteStorage implements OnboardingProgressRepository, CameraConsentRepository {
  readonly #database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.#database = database;
  }

  load(): OnboardingProgress | null {
    const row = this.#database.prepare("SELECT stage, updated_at FROM onboarding_progress WHERE singleton = 1").get() as
      | { stage: string; updated_at: string }
      | undefined;
    if (row === undefined) return null;
    if (!isOnboardingStage(row.stage)) throw new Error("INVALID_ONBOARDING_PROGRESS");
    return { stage: row.stage, updatedAt: row.updated_at };
  }

  save(progress: OnboardingProgress): void {
    if (!isOnboardingStage(progress.stage) || Number.isNaN(Date.parse(progress.updatedAt))) {
      throw new Error("INVALID_ONBOARDING_PROGRESS");
    }
    this.#database.prepare(`
      INSERT INTO onboarding_progress (singleton, stage, updated_at) VALUES (1, ?, ?)
      ON CONFLICT(singleton) DO UPDATE SET stage = excluded.stage, updated_at = excluded.updated_at
    `).run(progress.stage, progress.updatedAt);
  }

  loadCameraConsent(): CameraConsentRecord | null {
    const row = this.#database.prepare("SELECT purpose, scope, text_version, decision, decided_at FROM camera_consent WHERE singleton = 1").get() as
      | { purpose: string; scope: string; text_version: string; decision: string; decided_at: string }
      | undefined;
    if (row === undefined) return null;
    if (row.purpose !== "CAMERA_MEASUREMENT" || row.scope !== "LOCAL_CAMERA"
      || !["GRANTED", "SKIPPED", "WITHDRAWN"].includes(row.decision) || Number.isNaN(Date.parse(row.decided_at))) {
      throw new Error("INVALID_CAMERA_CONSENT_RECORD");
    }
    return { purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: row.text_version, decision: row.decision as CameraConsentRecord["decision"], decidedAt: row.decided_at };
  }

  saveCameraConsent(record: CameraConsentRecord): void {
    if (record.purpose !== "CAMERA_MEASUREMENT" || record.scope !== "LOCAL_CAMERA" || record.textVersion.length === 0
      || !["GRANTED", "SKIPPED", "WITHDRAWN"].includes(record.decision) || Number.isNaN(Date.parse(record.decidedAt))) {
      throw new Error("INVALID_CAMERA_CONSENT_RECORD");
    }
    this.#database.prepare(`
      INSERT INTO camera_consent (singleton, purpose, scope, text_version, decision, decided_at) VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(singleton) DO UPDATE SET text_version = excluded.text_version, decision = excluded.decision, decided_at = excluded.decided_at
    `).run(record.purpose, record.scope, record.textVersion, record.decision, record.decidedAt);
  }

  saveSurveyOnlyReport(snapshot: { readonly reportId: string; readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP"; readonly action: string; readonly provenanceVersion: string; readonly createdAt: string }): void {
    if (!/^[a-z0-9-]{8,64}$/i.test(snapshot.reportId) || Number.isNaN(Date.parse(snapshot.createdAt))) throw new Error("INVALID_REPORT_SNAPSHOT");
    this.#database.prepare("INSERT INTO checkup_report_snapshot VALUES (?, ?, 'SURVEY_ONLY', 'NOT_MEASURED', ?, ?, ?)").run(snapshot.reportId, snapshot.status, snapshot.action, snapshot.provenanceVersion, snapshot.createdAt);
  }

  close(): void {
    this.#database.close();
  }
}

export function resolveDatabasePath(userDataDirectory: string): string {
  const root = normalize(resolve(userDataDirectory));
  if (root === parse(root).root || hasInstallationResourcesComponent(root)) {
    throw new Error("INVALID_USER_DATA_DIRECTORY");
  }
  return join(root, "eyemate.sqlite");
}

export function createV1StorageFixture(databasePath: string): void {
  const safePath = ensureDatabasePath(databasePath);
  mkdirSync(dirname(safePath), { recursive: true });
  const database = new DatabaseSync(safePath);
  try {
    database.exec("PRAGMA journal_mode = WAL;");
    createV1Schema(database);
    database.exec("PRAGMA user_version = 1;");
  } finally {
    database.close();
  }
}

export function openLocalSqliteStorage(databasePath: string, options: OpenStorageOptions = {}): StorageOpenResult {
  const safePath = ensureDatabasePath(databasePath);
  mkdirSync(dirname(safePath), { recursive: true });
  const isNewDatabase = !existsSync(safePath);
  let database: DatabaseSync | null = null;
  let backupCreated = false;

  try {
    database = new DatabaseSync(safePath);
    database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    const version = getSchemaVersion(database);

    if (isNewDatabase || version === 0) {
      database.exec("BEGIN IMMEDIATE;");
      createV1Schema(database);
      createV2Schema(database);
      createV3Schema(database);
      createV4Schema(database);
      database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
      assertIntegrity(database);
      return { state: "READY", storage: new LocalSqliteStorage(database), migrated: false };
    }

    if (version === STORAGE_SCHEMA_VERSION) {
      assertIntegrity(database);
      return { state: "READY", storage: new LocalSqliteStorage(database), migrated: false };
    }

    if (version < 1 || version > 3) throw new Error("UNSUPPORTED_SCHEMA_VERSION");

    copyFileSync(safePath, `${safePath}.backup-v1`, 0);
    backupCreated = true;
    database.exec("BEGIN IMMEDIATE;");
    if (version === 1) createV2Schema(database);
    if (options.forceMigrationFailure === true) throw new Error("FORCED_MIGRATION_FAILURE");
    createV3Schema(database);
    createV4Schema(database);
    database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
    assertIntegrity(database);
    database.prepare("INSERT INTO migration_record VALUES (?, ?, ?, ?, ?)").run(
      `m1-v${version}-to-v${STORAGE_SCHEMA_VERSION}`, version, STORAGE_SCHEMA_VERSION, "SUCCEEDED", "2026-07-14T00:00:00.000Z"
    );
    return { state: "READY", storage: new LocalSqliteStorage(database), migrated: true };
  } catch (error) {
    try {
      database?.exec("ROLLBACK;");
    } catch {
      // Không có transaction đang hoạt động.
    }
    database?.close();
    return {
      state: RECOVERY_REQUIRED,
      failureCode: error instanceof Error ? error.message : "STORAGE_OPEN_FAILED",
      backupCreated
    };
  }
}
