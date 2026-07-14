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
