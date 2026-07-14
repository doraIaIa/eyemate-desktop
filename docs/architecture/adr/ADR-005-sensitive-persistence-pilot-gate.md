# ADR-005 — Sensitive persistence pilot gate

```yaml
decision_status: confirmed
implementation_status: proposed_pending_security_privacy_approval
release_scope: m4
owner: tech-owner
review: { security: required, privacy: required, product: required }
```

## Decision

EyeMate does not claim Security/Privacy approval for encryption at rest. The Electron/SQLite build now protects sensitive payload fields with authenticated encryption and a Windows-protected key, but builds remain restricted to **internal synthetic engineering** until the implementation and evidence are approved.

The gate and fail-closed restriction are **confirmed**. The implementation described below is **proposed** until Security and Privacy owners accept it.

## Rationale

The selected implementation uses Node's maintained AES-256-GCM primitive for sensitive payload fields and Electron `safeStorage` (Windows DPAPI in the target environment) for the random 256-bit master key. Record identity is authenticated as additional data. Metadata needed for SQLite lookup remains visible, so this is explicitly field-level protection rather than full-file SQLCipher.

## Required gate before sensitive pilot

- authenticated encryption using maintained primitives; no custom crypto;
- key creation, protection, loss/corruption and rotation behavior;
- plaintext-to-encrypted migration with backup, interruption and rollback tests;
- tamper, wrong-key, delete/reset and log-leak tests;
- privacy/security review approval.

## Consequences

- `SENSITIVE_PILOT = DISABLED_PENDING_SECURITY_PRIVACY_APPROVAL`.
- Internal unsigned MSIX is for synthetic engineering only.
- Clinical, signing, real-camera accuracy and dynamic-egress gates remain independent external limitations.

## Pilot-readiness evaluation (2026-07-14)

- Executable plaintext scan confirms synthetic sensitive payload canaries are not present in SQLite, WAL or encrypted migration backup after successful write/migration/delete.
- The feature matrix validator keeps `sensitive-persistence` fail-closed as `DISABLED`.
- Existing schema migration, interrupted migration, backup/recovery, idempotent reset and physical-delete tests pass. Physical deletion enables SQLite secure-delete, checkpoints/truncates WAL, vacuums free pages and removes the migration backup.
- Tamper, wrong-key, missing-key, restart, atomic key creation, plaintext-to-encrypted migration, interrupted migration, encrypted backup and delete/reset cases have executable coverage. These tests verify implementation behavior; they do not constitute Security/Privacy approval.
- No real-person or sensitive health data is permitted in the internal beta package under this decision.
