# Acceptance — M3 Personal Intelligence

- `AC-M3-001`: Typed aggregate input preserves source ID/type/version/timestamp/quality and rejects raw/unknown-as-zero input.
- `AC-M3-002`: Baseline reports EMPTY/LEARNING/READY/STALE/RESET from coverage/version/context; reset does not mutate historical report snapshots.
- `AC-M3-003`: Pattern emits PRESENT only with required evidence; otherwise returns INSUFFICIENT_DATA with missing evidence and expiry.
- `AC-M3-004`: VLI excludes missing components, renormalizes remaining weights, separates score/confidence, and abstains below coverage.
- `AC-M3-005`: Daily/weekly summaries preserve timezone, missing days and low-coverage semantics without interpolation.
- `AC-M3-006`: Electron flow renders report/evidence/limitations, previews local export, resets/deletes M3 records, and passes offline smoke.
- `AC-M3-007`: M1/M2 regression, privacy/architecture checks, internal MSIX smoke and clean worktree pass.
