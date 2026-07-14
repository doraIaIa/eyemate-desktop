use rusqlite::{params, Connection};
use std::{fs, path::{Path, PathBuf}};

pub const SCHEMA_VERSION: i64 = 2;
pub struct SafeAggregate<'a> {
  pub aggregate_id: &'a str,
  pub quality_ratio: f64,
  pub algorithm_version: &'a str,
}

pub enum Initialization {
  Ready { connection: Connection, migrated: bool, backup_path: Option<PathBuf> },
  RecoveryRequired { backup_path: Option<PathBuf>, failure_code: &'static str },
}

fn create_v1(connection: &Connection) -> rusqlite::Result<()> {
  connection.execute_batch(
    "CREATE TABLE IF NOT EXISTS safe_aggregate (
       aggregate_id TEXT PRIMARY KEY,
       quality_ratio REAL NOT NULL,
       algorithm_version TEXT NOT NULL
     );
     PRAGMA user_version = 1;",
  )
}

fn create_v2(connection: &Connection) -> rusqlite::Result<()> {
  connection.execute_batch(
    "CREATE TABLE IF NOT EXISTS migration_record (
       migration_id TEXT PRIMARY KEY,
       from_version INTEGER NOT NULL,
       to_version INTEGER NOT NULL,
       status TEXT NOT NULL,
       backup_ref TEXT,
       failure_code TEXT,
       finished_at TEXT NOT NULL
     );",
  )
}

fn integrity_ok(connection: &Connection) -> rusqlite::Result<bool> {
  Ok(connection.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))? == "ok")
}

pub fn create_n_minus_one_fixture(database_path: &Path) -> Result<(), String> {
  fs::create_dir_all(database_path.parent().ok_or("INVALID_DATABASE_PATH")?).map_err(|_| "DIRECTORY_CREATE_FAILED")?;
  let connection = Connection::open(database_path).map_err(|_| "DATABASE_OPEN_FAILED")?;
  create_v1(&connection).map_err(|_| "SCHEMA_CREATE_FAILED")?;
  connection.execute(
    "INSERT INTO safe_aggregate VALUES (?1, ?2, ?3)",
    params!["synthetic-aggregate-001", 0.9_f64, "m0-fixture-v1"],
  ).map_err(|_| "FIXTURE_INSERT_FAILED")?;
  Ok(())
}

pub fn initialize(database_path: &Path, force_failure: bool) -> Initialization {
  let parent = match database_path.parent() { Some(value) => value, None => return Initialization::RecoveryRequired { backup_path: None, failure_code: "INVALID_DATABASE_PATH" } };
  if fs::create_dir_all(parent).is_err() { return Initialization::RecoveryRequired { backup_path: None, failure_code: "DIRECTORY_CREATE_FAILED" }; }
  let is_new = !database_path.exists();
  let mut connection = match Connection::open(database_path) { Ok(value) => value, Err(_) => return Initialization::RecoveryRequired { backup_path: None, failure_code: "DATABASE_OPEN_FAILED" } };
  let version: i64 = match connection.query_row("PRAGMA user_version", [], |row| row.get(0)) { Ok(value) => value, Err(_) => return Initialization::RecoveryRequired { backup_path: None, failure_code: "VERSION_READ_FAILED" } };
  if is_new || version == 0 {
    let result = (|| -> rusqlite::Result<()> { let transaction = connection.transaction()?; create_v1(&transaction)?; create_v2(&transaction)?; transaction.execute_batch("PRAGMA user_version = 2; COMMIT;")?; Ok(()) })();
    return match result.and_then(|_| integrity_ok(&connection).and_then(|ok| if ok { Ok(()) } else { Err(rusqlite::Error::InvalidQuery) })) {
      Ok(()) => Initialization::Ready { connection, migrated: false, backup_path: None },
      Err(_) => Initialization::RecoveryRequired { backup_path: None, failure_code: "INITIALIZATION_FAILED" },
    };
  }
  if version == SCHEMA_VERSION {
    return if integrity_ok(&connection).unwrap_or(false) { Initialization::Ready { connection, migrated: false, backup_path: None } } else { Initialization::RecoveryRequired { backup_path: None, failure_code: "INTEGRITY_CHECK_FAILED" } };
  }
  if version != 1 { return Initialization::RecoveryRequired { backup_path: None, failure_code: "UNSUPPORTED_SCHEMA_VERSION" }; }
  let backup_path = database_path.with_extension("sqlite.backup-v1");
  if fs::copy(database_path, &backup_path).is_err() { return Initialization::RecoveryRequired { backup_path: None, failure_code: "BACKUP_FAILED" }; }
  let result = (|| -> rusqlite::Result<()> {
    let transaction = connection.transaction()?;
    create_v2(&transaction)?;
    if force_failure { return Err(rusqlite::Error::InvalidQuery); }
    transaction.execute_batch("PRAGMA user_version = 2; COMMIT;")?;
    Ok(())
  })();
  if result.is_err() { return Initialization::RecoveryRequired { backup_path: Some(backup_path), failure_code: "FORCED_MIGRATION_FAILURE" }; }
  if !integrity_ok(&connection).unwrap_or(false) { return Initialization::RecoveryRequired { backup_path: Some(backup_path), failure_code: "INTEGRITY_CHECK_FAILED" }; }
  if connection.execute("INSERT INTO migration_record VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)", params!["m0-migration-v1-v2", 1_i64, SCHEMA_VERSION, "SUCCEEDED", backup_path.to_string_lossy(), "2026-07-14T00:00:00.000Z"]).is_err() { return Initialization::RecoveryRequired { backup_path: Some(backup_path), failure_code: "MIGRATION_RECORD_FAILED" }; }
  Initialization::Ready { connection, migrated: true, backup_path: Some(backup_path) }
}

pub fn write_safe_aggregate(connection: &Connection, aggregate: SafeAggregate<'_>) -> Result<(), &'static str> {
  if !(0.0..=1.0).contains(&aggregate.quality_ratio) || !aggregate.quality_ratio.is_finite() { return Err("INVALID_SAFE_AGGREGATE"); }
  connection.execute("INSERT INTO safe_aggregate VALUES (?1, ?2, ?3)", params![aggregate.aggregate_id, aggregate.quality_ratio, aggregate.algorithm_version]).map_err(|_| "WRITE_FAILED")?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::{env, time::{SystemTime, UNIX_EPOCH}};

  fn fixture_path(name: &str) -> PathBuf {
    let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    env::temp_dir().join(format!("eyemate-m0-tauri-{name}-{unique}")).join("eyemate.sqlite")
  }

  #[test]
  fn clean_install_is_ready() {
    let path = fixture_path("clean");
    match initialize(&path, false) {
      Initialization::Ready { connection, migrated, backup_path } => {
        assert!(!migrated); assert!(backup_path.is_none());
        write_safe_aggregate(&connection, SafeAggregate { aggregate_id: "synthetic-aggregate-002", quality_ratio: 0.75, algorithm_version: "m0-fixture-v2" }).unwrap();
      }
      Initialization::RecoveryRequired { .. } => panic!("clean install must be ready"),
    }
    let _ = fs::remove_dir_all(path.parent().unwrap());
  }

  #[test]
  fn n_minus_one_migration_creates_backup_and_record() {
    let path = fixture_path("migration");
    create_n_minus_one_fixture(&path).unwrap();
    match initialize(&path, false) {
      Initialization::Ready { connection, migrated, backup_path } => {
        assert!(migrated); assert!(backup_path.as_ref().is_some_and(|value| value.exists()));
        let status: String = connection.query_row("SELECT status FROM migration_record", [], |row| row.get(0)).unwrap();
        assert_eq!(status, "SUCCEEDED");
      }
      Initialization::RecoveryRequired { .. } => panic!("migration must be ready"),
    }
    let _ = fs::remove_dir_all(path.parent().unwrap());
  }

  #[test]
  fn forced_failure_preserves_backup_and_returns_recovery() {
    let path = fixture_path("failure");
    create_n_minus_one_fixture(&path).unwrap();
    match initialize(&path, true) {
      Initialization::RecoveryRequired { backup_path, failure_code } => {
        assert_eq!(failure_code, "FORCED_MIGRATION_FAILURE");
        assert!(backup_path.as_ref().is_some_and(|value| value.exists()));
      }
      Initialization::Ready { .. } => panic!("forced migration must lock writes"),
    }
    let _ = fs::remove_dir_all(path.parent().unwrap());
  }
}
