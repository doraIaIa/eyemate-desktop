# ADR-005 — Sensitive persistence pilot gate

```yaml
decision_status: confirmed
release_scope: m4
owner: tech-owner
review: { security: required, privacy: required, product: required }
```

## Decision

EyeMate does not claim encryption at rest in the current Electron/SQLite build. Until an approved authenticated-encryption implementation has a key lifecycle, migration/recovery and tamper evidence, builds are restricted to **internal synthetic engineering** and cannot be presented as a sensitive-data pilot candidate.

## Rationale

The current SQLite adapter persists local onboarding, checkup and report data in plaintext. Adding a crypto scheme without an approved Windows key-protection strategy would create a false security claim. SQLCipher and field-level authenticated encryption remain options requiring a security-approved ADR revision and executable migration tests.

## Required gate before sensitive pilot

- authenticated encryption using maintained primitives; no custom crypto;
- key creation, protection, loss/corruption and rotation behavior;
- plaintext-to-encrypted migration with backup, interruption and rollback tests;
- tamper, wrong-key, delete/reset and log-leak tests;
- privacy/security review approval.

## Consequences

- `SENSITIVE_PILOT = DISABLED`.
- Internal unsigned MSIX is for synthetic engineering only.
- Clinical, signing, real-camera accuracy and dynamic-egress gates remain independent external limitations.

## Pilot-readiness evaluation (2026-07-14)

- Executable plaintext scan confirms the current SQLite file contains the synthetic canary; encryption is therefore `NOT_IMPLEMENTED`, not `PASS`.
- The feature matrix validator keeps `sensitive-persistence` fail-closed as `DISABLED`.
- Existing schema migration, interrupted migration, backup/recovery, idempotent reset and physical-delete tests pass. Physical deletion enables SQLite secure-delete, checkpoints/truncates WAL, vacuums free pages and removes the migration backup.
- Tamper, wrong-key, missing-key and plaintext-to-encrypted migration cases are not applicable evidence while no approved encryption implementation exists; they remain an external Security/Privacy gate rather than being reported as passing.
- No real-person or sensitive health data is permitted in the internal beta package under this decision.
