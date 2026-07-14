import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { closeStorage, createNMinusOneFixture, initializeElectronStorage, RECOVERY_REQUIRED, writeSafeAggregate } from './m0-storage.mjs';

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-electron-storage-'));
let failures = 0;
function test(name, passed) { console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`); if (!passed) failures += 1; }

try {
  const cleanPath = join(root, 'clean', 'eyemate.sqlite');
  const clean = initializeElectronStorage(cleanPath);
  writeSafeAggregate(clean, {
    aggregateId: 'synthetic-aggregate-002', qualityRatio: 0.75, algorithmVersion: 'm0-fixture-v2', rawFrame: 'SYNTHETIC_FORBIDDEN_MARKER',
  });
  test('clean-install-ready', clean.state === 'READY' && !clean.migrated && existsSync(cleanPath));
  closeStorage(clean);

  const migrationPath = join(root, 'migration', 'eyemate.sqlite');
  createNMinusOneFixture(migrationPath);
  const migrated = initializeElectronStorage(migrationPath);
  const migrationRecord = migrated.database?.prepare('SELECT from_version, to_version, status, backup_ref FROM migration_record').get();
  test('n-minus-one-backup-transaction-integrity', migrated.state === 'READY' && migrated.migrated
    && existsSync(migrated.backupPath) && migrationRecord?.from_version === 1 && migrationRecord?.to_version === 2
    && migrationRecord?.status === 'SUCCEEDED');
  closeStorage(migrated);

  const failurePath = join(root, 'failure', 'eyemate.sqlite');
  createNMinusOneFixture(failurePath);
  const failure = initializeElectronStorage(failurePath, { forceFailure: true });
  let writeLocked = false;
  try { writeSafeAggregate(failure, { aggregateId: 'synthetic-aggregate-003', qualityRatio: 0.5, algorithmVersion: 'm0-fixture-v2' }); } catch (error) { writeLocked = error.message === RECOVERY_REQUIRED; }
  test('forced-failure-preserves-backup-and-locks-write', failure.state === RECOVERY_REQUIRED
    && failure.failureCode === 'FORCED_MIGRATION_FAILURE' && existsSync(failure.backupPath) && writeLocked);

  const bytes = Buffer.concat([readFileSync(cleanPath), readFileSync(migrationPath), readFileSync(failurePath)]).toString('utf8');
  test('no-forbidden-payload-in-synthetic-database', !/(?:raw[_-]?(?:frame|video|landmarks?)|\blandmarks?\b|SYNTHETIC_FORBIDDEN_MARKER)/i.test(bytes));
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (failures > 0) { console.error(`ELECTRON_STORAGE_FIXTURES_FAILED: ${failures}`); process.exitCode = 1; }
else console.log('ELECTRON_STORAGE_FIXTURES_PASSED: 4');
