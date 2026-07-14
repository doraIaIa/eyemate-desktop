import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const STORAGE_SCHEMA_VERSION = 2;
export const RECOVERY_REQUIRED = 'MIGRATION_RECOVERY_REQUIRED';

function createV1Schema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS safe_aggregate (
      aggregate_id TEXT PRIMARY KEY,
      quality_ratio REAL NOT NULL,
      algorithm_version TEXT NOT NULL
    );
    PRAGMA user_version = 1;
  `);
}

function createV2Schema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS migration_record (
      migration_id TEXT PRIMARY KEY,
      from_version INTEGER NOT NULL,
      to_version INTEGER NOT NULL,
      status TEXT NOT NULL,
      backup_ref TEXT,
      failure_code TEXT,
      finished_at TEXT NOT NULL
    );
  `);
}

function integrityOk(database) {
  return database.prepare('PRAGMA integrity_check').get().integrity_check === 'ok';
}

function migrationBackupPath(databasePath) {
  return `${databasePath}.backup-v1`;
}

export function createNMinusOneFixture(databasePath) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  try {
    createV1Schema(database);
    database.prepare('INSERT INTO safe_aggregate VALUES (?, ?, ?)').run('synthetic-aggregate-001', 0.9, 'm0-fixture-v1');
  } finally {
    database.close();
  }
}

export function initializeElectronStorage(databasePath, { forceFailure = false, now = () => '2026-07-14T00:00:00.000Z' } = {}) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const isNew = !existsSync(databasePath);
  const database = new DatabaseSync(databasePath);
  try {
    const version = database.prepare('PRAGMA user_version').get().user_version;
    if (isNew || version === 0) {
      database.exec('BEGIN IMMEDIATE');
      createV1Schema(database);
      createV2Schema(database);
      database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
      if (!integrityOk(database)) throw new Error('INTEGRITY_CHECK_FAILED');
      return { state: 'READY', migrated: false, backupPath: null, database };
    }
    if (version === STORAGE_SCHEMA_VERSION) {
      if (!integrityOk(database)) throw new Error('INTEGRITY_CHECK_FAILED');
      return { state: 'READY', migrated: false, backupPath: null, database };
    }
    if (version !== 1) throw new Error('UNSUPPORTED_SCHEMA_VERSION');

    const backupPath = migrationBackupPath(databasePath);
    copyFileSync(databasePath, backupPath, 0);
    try {
      database.exec('BEGIN IMMEDIATE');
      createV2Schema(database);
      if (forceFailure) throw new Error('FORCED_MIGRATION_FAILURE');
      database.exec(`PRAGMA user_version = ${STORAGE_SCHEMA_VERSION}; COMMIT;`);
      if (!integrityOk(database)) throw new Error('INTEGRITY_CHECK_FAILED');
      database.prepare('INSERT INTO migration_record VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        'm0-migration-v1-v2', 1, STORAGE_SCHEMA_VERSION, 'SUCCEEDED', backupPath, null, now(),
      );
      return { state: 'READY', migrated: true, backupPath, database };
    } catch (error) {
      try { database.exec('ROLLBACK'); } catch { /* transaction may not be active */ }
      database.close();
      return { state: RECOVERY_REQUIRED, migrated: false, backupPath, failureCode: error.message, database: null };
    }
  } catch (error) {
    database.close();
    return { state: RECOVERY_REQUIRED, migrated: false, backupPath: null, failureCode: error.message, database: null };
  }
}

export function writeSafeAggregate(storage, aggregate) {
  if (storage.state !== 'READY' || !storage.database) throw new Error(RECOVERY_REQUIRED);
  if (!aggregate || typeof aggregate.aggregateId !== 'string' || !Number.isFinite(aggregate.qualityRatio)
    || aggregate.qualityRatio < 0 || aggregate.qualityRatio > 1 || typeof aggregate.algorithmVersion !== 'string') {
    throw new Error('INVALID_SAFE_AGGREGATE');
  }
  storage.database.prepare('INSERT INTO safe_aggregate VALUES (?, ?, ?)').run(
    aggregate.aggregateId, aggregate.qualityRatio, aggregate.algorithmVersion,
  );
}

export function closeStorage(storage) {
  storage.database?.close();
}
