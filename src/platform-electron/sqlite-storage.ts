import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, parse, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CameraConsentRecord, CameraConsentRepository, OnboardingProgress, OnboardingProgressRepository, OnboardingStage } from "../user-data/ports.js";
import type { DataInventoryItem, UserPreferences } from "../shared/preload-contract.js";
import type { SensitiveDataCodec } from "./storage-crypto.js";
import { validateCameraCalibrationRecord, type CameraCalibrationRecord } from "../camera/calibration-service.js";

export const STORAGE_SCHEMA_VERSION = 12;
export const RECOVERY_REQUIRED = "MIGRATION_RECOVERY_REQUIRED";

export type StorageOpenResult =
  | { readonly state: "READY"; readonly storage: LocalSqliteStorage; readonly migrated: boolean }
  | { readonly state: typeof RECOVERY_REQUIRED; readonly failureCode: string; readonly backupCreated: boolean };

export interface OpenStorageOptions {
  readonly forceMigrationFailure?: boolean;
  readonly forceEncryptionMigrationFailure?: boolean;
  readonly sensitiveDataCodec?: SensitiveDataCodec;
}

export interface PersistedSession { readonly sessionId: string; readonly modeId: string; readonly state: string; readonly elapsedActiveMs: number; readonly updatedAt: string; }
export interface PersistedNudge { readonly nudgeId: string; readonly sessionId: string; readonly decision: string; readonly reason: string; readonly policyVersion: string; readonly createdAt: string; readonly action?: string | null; readonly deliveryState?: "EMITTED" | "ABSTAINED"; }
export type NudgeResponse = "AUTO_CORRECTED" | "ACCEPTED" | "SNOOZED" | "DISMISSED" | "IGNORED" | "UNKNOWN";
export interface PersistedSummary { readonly summaryId: string; readonly sessionId: string; readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string; readonly summaryJson?: string; }
export interface M3StoredRecord { readonly id: string; readonly kind: "SOURCE" | "BASELINE" | "PATTERN" | "DAILY" | "WEEKLY" | "REPORT"; readonly createdAt: string; readonly payloadJson: string; }
export const DEFAULT_USER_PREFERENCES: UserPreferences = Object.freeze({ defaultMode: "TIMER_ONLY", soundEnabled: false, breakReminderEnabled: true, quietHoursEnabled: false, quietStartMinute: 1320, quietEndMinute: 420, reducedMotion: false });

function validateUserPreferences(value: UserPreferences): UserPreferences {
  if (value.defaultMode !== "TIMER_ONLY" || typeof value.soundEnabled !== "boolean" || typeof value.breakReminderEnabled !== "boolean"
    || typeof value.quietHoursEnabled !== "boolean" || typeof value.reducedMotion !== "boolean"
    || !Number.isInteger(value.quietStartMinute) || value.quietStartMinute < 0 || value.quietStartMinute >= 1440
    || !Number.isInteger(value.quietEndMinute) || value.quietEndMinute < 0 || value.quietEndMinute >= 1440
    || value.quietStartMinute === value.quietEndMinute) throw new Error("INVALID_USER_PREFERENCES");
  return Object.freeze({ ...value });
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

function createV5Schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS work_session (session_id TEXT PRIMARY KEY, mode_id TEXT NOT NULL, state TEXT NOT NULL, elapsed_active_ms INTEGER NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS companion_nudge (nudge_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, decision TEXT NOT NULL, reason TEXT NOT NULL, policy_version TEXT NOT NULL, created_at TEXT NOT NULL, response TEXT, response_at TEXT);
    CREATE TABLE IF NOT EXISTS session_summary (summary_id TEXT PRIMARY KEY, session_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, elapsed_active_ms INTEGER NOT NULL, created_at TEXT NOT NULL);
  `);
}

function createV6Schema(database: DatabaseSync): void {
  const columns = database.prepare("PRAGMA table_info(companion_nudge)").all() as unknown as readonly { name: string }[];
  if (!columns.some((column) => column.name === "response")) database.exec("ALTER TABLE companion_nudge ADD COLUMN response TEXT;");
  if (!columns.some((column) => column.name === "response_at")) database.exec("ALTER TABLE companion_nudge ADD COLUMN response_at TEXT;");
}

function createV7Schema(database: DatabaseSync): void {
  const columns = database.prepare("PRAGMA table_info(session_summary)").all() as unknown as readonly { name: string }[];
  if (!columns.some((column) => column.name === "summary_json")) database.exec("ALTER TABLE session_summary ADD COLUMN summary_json TEXT;");
}

function createV8Schema(database: DatabaseSync): void {
  const columns = database.prepare("PRAGMA table_info(companion_nudge)").all() as unknown as readonly { name: string }[];
  if (!columns.some((column) => column.name === "action")) database.exec("ALTER TABLE companion_nudge ADD COLUMN action TEXT;");
  if (!columns.some((column) => column.name === "delivery_state")) database.exec("ALTER TABLE companion_nudge ADD COLUMN delivery_state TEXT;");
}

function createV9Schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS m3_record (record_id TEXT PRIMARY KEY, kind TEXT NOT NULL, created_at TEXT NOT NULL, payload_json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS m3_record_kind_created ON m3_record(kind, created_at);
  `);
}

function createV10Schema(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS app_preferences (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), value_json TEXT NOT NULL, updated_at TEXT NOT NULL);");
}

function createV11Schema(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS wellness_checkup_payload (report_id TEXT PRIMARY KEY, questionnaire_version TEXT NOT NULL, score_version TEXT NOT NULL, payload_json TEXT NOT NULL, FOREIGN KEY(report_id) REFERENCES checkup_report_snapshot(report_id) ON DELETE CASCADE);");
}

function createV12Schema(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS camera_calibration (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);");
}

function getSchemaVersion(database: DatabaseSync): number {
  const result = database.prepare("PRAGMA user_version").get() as { user_version: number };
  return result.user_version;
}

function assertIntegrity(database: DatabaseSync): void {
  const result = database.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  if (result.integrity_check !== "ok") throw new Error("INTEGRITY_CHECK_FAILED");
}

function encryptedValue(codec: SensitiveDataCodec | undefined, value: string, context: string): string {
  return codec === undefined || codec.isEncrypted(value) ? value : codec.encrypt(value, context);
}

function decryptedValue(codec: SensitiveDataCodec | undefined, value: string, context: string): string {
  if (codec === undefined) {
    if (value.startsWith("eyemate:aes-256-gcm:")) throw new Error("PROTECTED_STORAGE_KEY_REQUIRED");
    return value;
  }
  return codec.isEncrypted(value) ? codec.decrypt(value, context) : value;
}

function migrateSensitivePayloads(database: DatabaseSync, databasePath: string, codec: SensitiveDataCodec, forceFailure: boolean): boolean {
  database.exec("CREATE TABLE IF NOT EXISTS sensitive_storage_state (singleton INTEGER PRIMARY KEY CHECK (singleton = 1), codec_version TEXT NOT NULL, key_check TEXT NOT NULL);");
  const state = database.prepare("SELECT codec_version, key_check FROM sensitive_storage_state WHERE singleton = 1").get() as { codec_version: string; key_check: string } | undefined;
  if (state) {
    if (state.codec_version !== codec.version || codec.decrypt(state.key_check, "storage:key-check") !== "EYEMATE_STORAGE_KEY_OK") throw new Error("SENSITIVE_STORAGE_KEY_INVALID");
    return false;
  }
  database.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  const backupPath = `${databasePath}.backup-encrypted`;
  const temporaryBackupPath = `${backupPath}.tmp-${process.pid}`;
  try {
    const encryptedBackup = codec.encrypt(readFileSync(databasePath).toString("base64"), "storage:migration-backup");
    writeFileSync(temporaryBackupPath, encryptedBackup, { encoding: "utf8", flag: "wx" });
    renameSync(temporaryBackupPath, backupPath);
  } catch (error) { rmSync(temporaryBackupPath, { force: true }); throw error; }
  database.exec("BEGIN IMMEDIATE;");
  try {
    for (const row of database.prepare("SELECT report_id, action FROM checkup_report_snapshot").all() as unknown as readonly { report_id: string; action: string }[]) {
      database.prepare("UPDATE checkup_report_snapshot SET action = ? WHERE report_id = ?").run(encryptedValue(codec, row.action, `checkup:${row.report_id}:action`), row.report_id);
    }
    for (const row of database.prepare("SELECT summary_id, summary_json FROM session_summary WHERE summary_json IS NOT NULL").all() as unknown as readonly { summary_id: string; summary_json: string }[]) {
      database.prepare("UPDATE session_summary SET summary_json = ? WHERE summary_id = ?").run(encryptedValue(codec, row.summary_json, `summary:${row.summary_id}:json`), row.summary_id);
    }
    for (const row of database.prepare("SELECT record_id, payload_json FROM m3_record").all() as unknown as readonly { record_id: string; payload_json: string }[]) {
      database.prepare("UPDATE m3_record SET payload_json = ? WHERE record_id = ?").run(encryptedValue(codec, row.payload_json, `m3:${row.record_id}:payload`), row.record_id);
    }
    for (const row of database.prepare("SELECT singleton, value_json FROM app_preferences").all() as unknown as readonly { singleton: number; value_json: string }[]) {
      database.prepare("UPDATE app_preferences SET value_json = ? WHERE singleton = ?").run(encryptedValue(codec, row.value_json, "preferences:singleton:value"), row.singleton);
    }
    for (const row of database.prepare("SELECT report_id, payload_json FROM wellness_checkup_payload").all() as unknown as readonly { report_id: string; payload_json: string }[]) {
      database.prepare("UPDATE wellness_checkup_payload SET payload_json = ? WHERE report_id = ?").run(encryptedValue(codec, row.payload_json, `wellness:${row.report_id}:payload`), row.report_id);
    }
    if (forceFailure) throw new Error("FORCED_ENCRYPTION_MIGRATION_FAILURE");
    database.prepare("INSERT INTO sensitive_storage_state VALUES (1, ?, ?)").run(codec.version, codec.encrypt("EYEMATE_STORAGE_KEY_OK", "storage:key-check"));
    database.exec("COMMIT;");
  } catch (error) { database.exec("ROLLBACK;"); throw error; }
  database.exec("PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA wal_checkpoint(TRUNCATE);");
  rmSync(`${databasePath}.backup-v1`, { force: true });
  rmSync(backupPath, { force: true });
  return true;
}

function assertStorageProtectionAvailable(database: DatabaseSync, codec: SensitiveDataCodec | undefined): void {
  const table = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sensitive_storage_state'").get();
  if (table && codec === undefined) {
    const state = database.prepare("SELECT singleton FROM sensitive_storage_state WHERE singleton = 1").get();
    if (state) throw new Error("PROTECTED_STORAGE_KEY_REQUIRED");
  }
}

function isOnboardingStage(value: string): value is OnboardingStage {
  return ["NOT_STARTED", "INTRO_SEEN", "PRIVACY_SEEN", "CAMERA_DECIDED", "COMPLETE"].includes(value);
}

export class LocalSqliteStorage implements OnboardingProgressRepository, CameraConsentRepository {
  readonly #database: DatabaseSync;
  readonly #databasePath: string;
  readonly #codec: SensitiveDataCodec | undefined;

  constructor(database: DatabaseSync, databasePath: string, codec?: SensitiveDataCodec) {
    this.#database = database;
    this.#databasePath = databasePath;
    this.#codec = codec;
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

  saveSurveyOnlyReport(snapshot: { readonly reportId: string; readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP"; readonly action: string; readonly provenanceVersion: string; readonly createdAt: string; readonly wellnessPayload?: { readonly questionnaireVersion: string; readonly scoreVersion: string; readonly payloadJson: string } }): void {
    if (!/^[a-z0-9-]{8,64}$/i.test(snapshot.reportId) || Number.isNaN(Date.parse(snapshot.createdAt))) throw new Error("INVALID_REPORT_SNAPSHOT");
    this.#database.prepare("INSERT INTO checkup_report_snapshot VALUES (?, ?, 'SURVEY_ONLY', 'NOT_MEASURED', ?, ?, ?)").run(snapshot.reportId, snapshot.status, encryptedValue(this.#codec, snapshot.action, `checkup:${snapshot.reportId}:action`), snapshot.provenanceVersion, snapshot.createdAt);
    if (snapshot.wellnessPayload !== undefined) {
      if (snapshot.wellnessPayload.questionnaireVersion.length === 0 || snapshot.wellnessPayload.scoreVersion.length === 0 || snapshot.wellnessPayload.payloadJson.length === 0 || snapshot.wellnessPayload.payloadJson.length > 100_000) throw new Error("INVALID_WELLNESS_PAYLOAD");
      JSON.parse(snapshot.wellnessPayload.payloadJson);
      this.#database.prepare("INSERT INTO wellness_checkup_payload VALUES (?, ?, ?, ?)").run(snapshot.reportId, snapshot.wellnessPayload.questionnaireVersion, snapshot.wellnessPayload.scoreVersion, encryptedValue(this.#codec, snapshot.wellnessPayload.payloadJson, `wellness:${snapshot.reportId}:payload`));
    }
  }

  saveSession(session: PersistedSession): void {
    if (!/^[a-z0-9-]{8,64}$/i.test(session.sessionId) || !Number.isSafeInteger(session.elapsedActiveMs) || session.elapsedActiveMs < 0 || Number.isNaN(Date.parse(session.updatedAt))) throw new Error("INVALID_SESSION_RECORD");
    this.#database.prepare("INSERT INTO work_session VALUES (?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET mode_id=excluded.mode_id, state=excluded.state, elapsed_active_ms=excluded.elapsed_active_ms, updated_at=excluded.updated_at").run(session.sessionId, session.modeId, session.state, session.elapsedActiveMs, session.updatedAt);
  }

  loadSession(sessionId: string): PersistedSession | null {
    const row = this.#database.prepare("SELECT session_id, mode_id, state, elapsed_active_ms, updated_at FROM work_session WHERE session_id = ?").get(sessionId) as Record<string, unknown> | undefined;
    return row ? { sessionId: String(row.session_id), modeId: String(row.mode_id), state: String(row.state), elapsedActiveMs: Number(row.elapsed_active_ms), updatedAt: String(row.updated_at) } : null;
  }

  loadLatestSession(): PersistedSession | null {
    const row = this.#database.prepare("SELECT session_id, mode_id, state, elapsed_active_ms, updated_at FROM work_session ORDER BY updated_at DESC LIMIT 1").get() as Record<string, unknown> | undefined;
    return row ? { sessionId: String(row.session_id), modeId: String(row.mode_id), state: String(row.state), elapsedActiveMs: Number(row.elapsed_active_ms), updatedAt: String(row.updated_at) } : null;
  }

  recordNudge(nudge: PersistedNudge): boolean {
    if (!/^[a-z0-9-]{8,64}$/i.test(nudge.nudgeId) || !/^[a-z0-9-]{8,64}$/i.test(nudge.sessionId) || Number.isNaN(Date.parse(nudge.createdAt))) throw new Error("INVALID_NUDGE_RECORD");
    const result = this.#database.prepare("INSERT OR IGNORE INTO companion_nudge (nudge_id, session_id, decision, reason, policy_version, created_at, action, delivery_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(nudge.nudgeId, nudge.sessionId, nudge.decision, nudge.reason, nudge.policyVersion, nudge.createdAt, nudge.action ?? null, nudge.deliveryState ?? "EMITTED");
    return Number(result.changes) === 1;
  }

  recordNudgeResponse(nudgeId: string, response: NudgeResponse, responseAt: string): boolean {
    if (!/^[a-z0-9-]{8,64}$/i.test(nudgeId) || Number.isNaN(Date.parse(responseAt))) throw new Error("INVALID_NUDGE_RESPONSE");
    if (!["AUTO_CORRECTED", "ACCEPTED", "SNOOZED", "DISMISSED", "IGNORED", "UNKNOWN"].includes(response)) throw new Error("INVALID_NUDGE_RESPONSE");
    const result = this.#database.prepare("UPDATE companion_nudge SET response = ?, response_at = ? WHERE nudge_id = ? AND response IS NULL").run(response, responseAt, nudgeId);
    return Number(result.changes) === 1;
  }

  countEmittedNudges(sessionId: string): number {
    if (!/^[a-z0-9-]{8,64}$/i.test(sessionId)) throw new Error("INVALID_SESSION_ID");
    const row = this.#database.prepare("SELECT COUNT(*) AS count FROM companion_nudge WHERE session_id = ? AND delivery_state = 'EMITTED'").get(sessionId) as { count: number };
    return Number(row.count);
  }

  saveSessionSummary(summary: PersistedSummary): boolean {
    if (!/^[a-z0-9-]{8,64}$/i.test(summary.summaryId) || !/^[a-z0-9-]{8,64}$/i.test(summary.sessionId) || !Number.isSafeInteger(summary.elapsedActiveMs) || summary.elapsedActiveMs < 0 || Number.isNaN(Date.parse(summary.createdAt))) throw new Error("INVALID_SESSION_SUMMARY");
    const protectedSummary = summary.summaryJson === undefined ? null : encryptedValue(this.#codec, summary.summaryJson, `summary:${summary.summaryId}:json`);
    try { this.#database.prepare("INSERT INTO session_summary (summary_id, session_id, status, elapsed_active_ms, created_at, summary_json) VALUES (?, ?, ?, ?, ?, ?)").run(summary.summaryId, summary.sessionId, summary.status, summary.elapsedActiveMs, summary.createdAt, protectedSummary); return true; } catch (error) { if (error instanceof Error && error.message.includes("UNIQUE")) return false; throw error; }
  }

  listSessionSummaries(): readonly PersistedSummary[] {
    return this.#database.prepare("SELECT summary_id, session_id, status, elapsed_active_ms, created_at, summary_json FROM session_summary ORDER BY created_at DESC").all().map((row) => { const value = row as Record<string, unknown>; const summaryId = String(value.summary_id); return { summaryId, sessionId: String(value.session_id), status: String(value.status), elapsedActiveMs: Number(value.elapsed_active_ms), createdAt: String(value.created_at), summaryJson: value.summary_json === null ? undefined : decryptedValue(this.#codec, String(value.summary_json), `summary:${summaryId}:json`) }; });
  }

  saveM3Record(record: M3StoredRecord): boolean {
    if (!/^[a-z0-9-]{4,100}$/i.test(record.id) || !["SOURCE", "BASELINE", "PATTERN", "DAILY", "WEEKLY", "REPORT"].includes(record.kind) || Number.isNaN(Date.parse(record.createdAt)) || record.payloadJson.length === 0 || record.payloadJson.length > 100_000) throw new Error("INVALID_M3_RECORD");
    try { JSON.parse(record.payloadJson); } catch { throw new Error("INVALID_M3_RECORD"); }
    const result = this.#database.prepare("INSERT OR IGNORE INTO m3_record VALUES (?, ?, ?, ?)").run(record.id, record.kind, record.createdAt, encryptedValue(this.#codec, record.payloadJson, `m3:${record.id}:payload`));
    return Number(result.changes) === 1;
  }

  listM3Records(kind: M3StoredRecord["kind"]): readonly M3StoredRecord[] {
    return this.#database.prepare("SELECT record_id, kind, created_at, payload_json FROM m3_record WHERE kind = ? ORDER BY created_at ASC").all(kind).map((row) => { const value = row as Record<string, unknown>; const id = String(value.record_id); return { id, kind: value.kind as M3StoredRecord["kind"], createdAt: String(value.created_at), payloadJson: decryptedValue(this.#codec, String(value.payload_json), `m3:${id}:payload`) }; });
  }

  loadUserPreferences(): UserPreferences {
    const row = this.#database.prepare("SELECT value_json FROM app_preferences WHERE singleton = 1").get() as { value_json: string } | undefined;
    if (row === undefined) return DEFAULT_USER_PREFERENCES;
    try { return validateUserPreferences(JSON.parse(decryptedValue(this.#codec, row.value_json, "preferences:singleton:value")) as UserPreferences); } catch { throw new Error("INVALID_USER_PREFERENCES_RECORD"); }
  }

  saveUserPreferences(preferences: UserPreferences): UserPreferences {
    const validated = validateUserPreferences(preferences);
    this.#database.prepare("INSERT INTO app_preferences VALUES (1, ?, ?) ON CONFLICT(singleton) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at").run(encryptedValue(this.#codec, JSON.stringify(validated), "preferences:singleton:value"), new Date().toISOString());
    return validated;
  }

  loadCameraCalibration(): CameraCalibrationRecord | null {
    const row = this.#database.prepare("SELECT payload_json FROM camera_calibration WHERE singleton = 1").get() as { payload_json: string } | undefined;
    if (row === undefined) return null;
    try {
      return validateCameraCalibrationRecord(JSON.parse(decryptedValue(this.#codec, row.payload_json, "calibration:singleton:payload")) as CameraCalibrationRecord);
    } catch { throw new Error("INVALID_CAMERA_CALIBRATION_RECORD"); }
  }

  saveCameraCalibration(record: CameraCalibrationRecord): CameraCalibrationRecord {
    const validated = validateCameraCalibrationRecord(record);
    const payload = encryptedValue(this.#codec, JSON.stringify(validated), "calibration:singleton:payload");
    this.#database.prepare("INSERT INTO camera_calibration VALUES (1, ?, ?) ON CONFLICT(singleton) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at").run(payload, new Date().toISOString());
    return validated;
  }

  deleteCameraCalibration(): "DELETED" {
    this.#database.exec("DELETE FROM camera_calibration;");
    return "DELETED";
  }

  getDataInventory(): readonly DataInventoryItem[] {
    const count = (table: string): number => Number((this.#database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count);
    return [
      { category: "CHECKUP", purpose: "Lưu snapshot checkup survey-only", recordCount: count("checkup_report_snapshot"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" },
      { category: "SESSION", purpose: "Khôi phục phiên và tạo Session Summary", recordCount: count("work_session") + count("session_summary"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" },
      { category: "NUDGE", purpose: "Giữ response và chống nudge trùng", recordCount: count("companion_nudge"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" },
      { category: "REPORT", purpose: "Giữ baseline, pattern và report dẫn xuất", recordCount: count("m3_record"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" },
      { category: "PREFERENCE", purpose: "Giữ cài đặt trải nghiệm", recordCount: count("app_preferences"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" }
      ,{ category: "CALIBRATION", purpose: "Giữ aggregate hiệu chỉnh gắn với camera", recordCount: count("camera_calibration"), retention: "UNTIL_USER_DELETES", location: "LOCAL_ONLY" }
    ];
  }

  deleteM3Records(kind?: M3StoredRecord["kind"]): "DELETED" {
    if (kind === undefined) this.#database.exec("DELETE FROM m3_record;");
    else this.#database.prepare("DELETE FROM m3_record WHERE kind = ?").run(kind);
    return "DELETED";
  }

  deleteM3Category(category: "BASELINE" | "PATTERN" | "SUMMARY" | "REPORT" | "ALL"): "DELETED" {
    if (category === "ALL") return this.deleteM3Records();
    if (category === "BASELINE") {
      this.deleteM3Records("BASELINE");
      return "DELETED";
    }
    if (category === "REPORT") {
      this.deleteM3Records("REPORT");
      return "DELETED";
    }
    this.#database.exec("BEGIN IMMEDIATE;");
    try {
      if (category === "PATTERN") this.#database.exec("DELETE FROM m3_record WHERE kind IN ('PATTERN', 'DAILY', 'WEEKLY', 'REPORT');");
      else this.#database.exec("DELETE FROM m3_record WHERE kind IN ('DAILY', 'WEEKLY', 'REPORT');");
      this.#database.exec("COMMIT;");
      return "DELETED";
    } catch (error) {
      this.#database.exec("ROLLBACK;");
      throw error;
    }
  }

  deleteAllLocalData(): "DELETED" {
    this.#database.exec("BEGIN IMMEDIATE; DELETE FROM camera_calibration; DELETE FROM app_preferences; DELETE FROM m3_record; DELETE FROM session_summary; DELETE FROM companion_nudge; DELETE FROM work_session; DELETE FROM checkup_report_snapshot; DELETE FROM camera_consent; DELETE FROM onboarding_progress; COMMIT;");
    this.#database.exec("PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA wal_checkpoint(TRUNCATE);");
    rmSync(`${this.#databasePath}.backup-v1`, { force: true });
    rmSync(`${this.#databasePath}.backup-encrypted`, { force: true });
    return "DELETED";
  }

  listSurveyOnlyReports(): readonly { readonly status: string; readonly action: string; readonly createdAt: string }[] {
    return this.#database.prepare("SELECT report_id, status, action, created_at FROM checkup_report_snapshot ORDER BY created_at DESC").all().map((row) => {
      const value = row as { report_id: string; status: string; action: string; created_at: string };
      return { status: value.status, action: decryptedValue(this.#codec, value.action, `checkup:${value.report_id}:action`), createdAt: value.created_at };
    });
  }

  getWellnessCheckPayload(reportId: string): string | null {
    if (!/^[a-z0-9-]{8,64}$/i.test(reportId)) throw new Error("INVALID_REPORT_ID");
    const row = this.#database.prepare("SELECT payload_json FROM wellness_checkup_payload WHERE report_id = ?").get(reportId) as { payload_json: string } | undefined;
    return row === undefined ? null : decryptedValue(this.#codec, row.payload_json, `wellness:${reportId}:payload`);
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

export function createV8StorageFixture(databasePath: string): void {
  const safePath = ensureDatabasePath(databasePath);
  mkdirSync(dirname(safePath), { recursive: true });
  const database = new DatabaseSync(safePath);
  try {
    createV1Schema(database);
    createV2Schema(database);
    createV3Schema(database);
    createV4Schema(database);
    createV5Schema(database);
    createV6Schema(database);
    createV7Schema(database);
    createV8Schema(database);
    database.exec("PRAGMA user_version = 8;");
  } finally {
    database.close();
  }
}

export function createV9StorageFixture(databasePath: string): void {
  const safePath = ensureDatabasePath(databasePath);
  mkdirSync(dirname(safePath), { recursive: true });
  const database = new DatabaseSync(safePath);
  try {
    createV1Schema(database);
    createV2Schema(database);
    createV3Schema(database);
    createV4Schema(database);
    createV5Schema(database);
    createV6Schema(database);
    createV7Schema(database);
    createV8Schema(database);
    createV9Schema(database);
    database.exec("PRAGMA user_version = 9;");
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
    database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;");
    const version = getSchemaVersion(database);

    if (isNewDatabase || version === 0) {
      database.exec("BEGIN IMMEDIATE;");
      createV1Schema(database);
      createV2Schema(database);
      createV3Schema(database);
      createV4Schema(database);
      createV5Schema(database);
      createV6Schema(database);
      createV7Schema(database);
      createV8Schema(database);
      createV9Schema(database);
      createV10Schema(database);
      createV11Schema(database);
      createV12Schema(database);
      database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
      if (options.sensitiveDataCodec) migrateSensitivePayloads(database, safePath, options.sensitiveDataCodec, options.forceEncryptionMigrationFailure === true);
      assertIntegrity(database);
      return { state: "READY", storage: new LocalSqliteStorage(database, safePath, options.sensitiveDataCodec), migrated: false };
    }

    if (version === STORAGE_SCHEMA_VERSION) {
      assertStorageProtectionAvailable(database, options.sensitiveDataCodec);
      const encryptionMigrated = options.sensitiveDataCodec ? migrateSensitivePayloads(database, safePath, options.sensitiveDataCodec, options.forceEncryptionMigrationFailure === true) : false;
      assertIntegrity(database);
      return { state: "READY", storage: new LocalSqliteStorage(database, safePath, options.sensitiveDataCodec), migrated: encryptionMigrated };
    }

    if (version < 1 || version > 11) throw new Error("UNSUPPORTED_SCHEMA_VERSION");

    copyFileSync(safePath, `${safePath}.backup-v1`, 0);
    backupCreated = true;
    database.exec("BEGIN IMMEDIATE;");
    if (version === 1) createV2Schema(database);
    if (options.forceMigrationFailure === true) throw new Error("FORCED_MIGRATION_FAILURE");
    createV3Schema(database);
    createV4Schema(database);
    createV5Schema(database);
    createV6Schema(database);
    createV7Schema(database);
    createV8Schema(database);
    createV9Schema(database);
    createV10Schema(database);
    createV11Schema(database);
    createV12Schema(database);
    database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
    assertIntegrity(database);
    database.prepare("INSERT INTO migration_record VALUES (?, ?, ?, ?, ?)").run(
      `m1-v${version}-to-v${STORAGE_SCHEMA_VERSION}`, version, STORAGE_SCHEMA_VERSION, "SUCCEEDED", "2026-07-14T00:00:00.000Z"
    );
    if (options.sensitiveDataCodec) migrateSensitivePayloads(database, safePath, options.sensitiveDataCodec, options.forceEncryptionMigrationFailure === true);
    return { state: "READY", storage: new LocalSqliteStorage(database, safePath, options.sensitiveDataCodec), migrated: true };
  } catch (error) {
    try {
      database?.exec("ROLLBACK;");
    } catch {
      // Không có transaction đang hoạt động.
    }
    database?.close();
    backupCreated ||= existsSync(`${safePath}.backup-encrypted`);
    return {
      state: RECOVERY_REQUIRED,
      failureCode: error instanceof Error ? error.message : "STORAGE_OPEN_FAILED",
      backupCreated
    };
  }
}
