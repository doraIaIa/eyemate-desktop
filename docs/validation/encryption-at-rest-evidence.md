# Encryption-at-rest implementation evidence

Status: `IMPLEMENTED_PENDING_SECURITY_PRIVACY_APPROVAL`
Scope: sensitive SQLite payload fields and the local master-key lifecycle on Windows.

## Implemented boundary

- AES-256-GCM from `node:crypto`; a fresh 96-bit IV is generated for every write.
- Record/field identity is authenticated as AAD, so encrypted values cannot be moved between records without detection.
- A random 256-bit master key is wrapped by Electron `safeStorage`; on DP-DEV Windows this delegates to the operating-system protection mechanism.
- Key files are written atomically. Missing, corrupt or wrong keys fail closed.
- Existing plaintext payloads migrate transactionally. The pre-migration database is stored only as an authenticated encrypted backup; interrupted migration rolls back and retry completes migration.
- Successful migration checkpoints WAL, runs secure-delete/VACUUM and removes migration backups.
- Protected fields: checkup action payload, session-summary JSON, M3 payload JSON and preference JSON.

SQLite lookup metadata (record IDs, timestamps, status, kind and duration) is not encrypted. This is field-level protection, not full-file SQLCipher and not an approval claim.

## Executable evidence

Run:

```powershell
npm run unit
npm run integration
npm run pilot:sensitive-storage-gate
npm run acceptance
```

Coverage includes authenticated roundtrip, context binding, tamper, wrong key, missing key, unavailable OS protection, atomic key creation, restart, plaintext migration, forced interrupted migration, encrypted backup, retry recovery, plaintext scan and delete/reset.

Expected gate output:

```text
SENSITIVE_STORAGE_GATE_PASS state=DISABLED_PENDING_APPROVAL plaintext=NOT_OBSERVED implementation=VERIFIED
```

## Remaining external gate

Security and Privacy owners must review the field classification, metadata leakage, Windows key-recovery expectations and incident procedure. Until approval, `sensitive-persistence` remains `DISABLED` for real-person pilot data.
