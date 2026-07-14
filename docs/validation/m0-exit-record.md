# M0 Exit Record

Date: 2026-07-14
Milestone: M0 — Architecture POC
Status: DONE_WITH_LIMITATIONS
Owner: tech-lead / project owner delegated Codex execution

## Decision

ADR-003 is `accepted`: use Electron as the EyeMate V2 desktop shell for the next implementation phase.

ADR-004 remains `proposed`: camera runtime/model/local asset topology still needs real camera/runtime evidence in M1.

## Retained committed evidence

- Evidence tooling: validator, scanner, manifest, initializer, synthetic pipeline, inventory, egress/static gates, output admission, run-plan validator.
- Candidates: Electron and Tauri camera-off POCs, storage migration/recovery fixtures, privacy sink fixtures.
- Packaging and measurement tooling: MSIX feasibility, camera-off performance/reproducibility harness, cleanup check.
- ADR/status evidence: `PROJECT_STATUS.md`, ADR-003 and ADR-004.

## Local output cleanup

- Cleanup command: `node tools/m0/run-m0-cleanup-check.mjs --apply`.
- Result: `.m0/` local ignored output removed, `m0FilesBefore=280`, `m0FilesAfter=0`.
- Process scan: `NO_REPO_CANDIDATE_PROCESS`.
- Certificate store action: `NOT_MODIFIED_CURRENT_USER_TEST_CERT_RETAINED`.
- V1 action: none.

## Known limitations before M1/pilot/release

- Dynamic WPR egress/auto-update verification is `UNKNOWN / DEFERRED_M0_LIMITATION` because `wpr -start Network -filemode` failed `0xc5585011`; do not claim dynamic no-egress.
- File-symlink integration remains `SKIP (EPERM)` and must rerun before official benchmark.
- Real camera lifecycle, busy/low-quality/device-change/active-disconnect and model/WASM asset checksum/license are not proven by M0.
- Signed MSIX install/uninstall/trust-store verification is `NOT_RUN`; test signing passed but trust store/security policy was not changed.
- Raw MSIX hash is nondeterministic; normalized payload hash was deterministic in M0.
- CPU delta in camera-off synthetic benchmark was observed as `0`; this is not a production performance budget.

## M1 entry guard

M1 may start with Electron shell scaffolding only if the invariants remain intact:

- no cloud/account/telemetry/enterprise/federated/adaptive ML;
- no persistence/log/evidence of raw frame, video, landmark, pixel buffer or exact per-frame series;
- no CDN fallback for required runtime/model assets;
- V1 remains read-only unless owner explicitly authorizes migration edits;
- camera work must use explicit user/test action and keep raw camera data RAM-only.
