# Project Status

Last updated: 2026-07-14
Current milestone: PILOT_READINESS
Current batch: External-gate handoff and release-candidate preparation
Current task: External-gate handoff
Task state: PILOT_READY_WITH_EXTERNAL_GATES

Latest implementation commit: `8fd7da6`
Task base commit: `d289d54`
Working tree expectation: clean after this status checkpoint; generated beta artifacts are ignored under `.pilot/`.

## Pilot Readiness Exit Record (2026-07-14)

- Status: `PILOT_READY_WITH_EXTERNAL_GATES`; this is an engineering package for internal synthetic use, not approval to enroll real participants and not `PUBLIC_READY`.
- Automated enabled slice: survey-only checkup, Timer Only companion and local aggregate Personal Intelligence. Markdown/JSON export remains enabled; PDF is intentionally deferred because it is not required for this beta.
- Encryption-at-rest: current SQLite plaintext is executable-test confirmed. ADR-005 keeps sensitive persistence `DISABLED`; no tamper/wrong-key/missing-key claim is made without an approved encryption and key-lifecycle design. Migration, interruption, backup/recovery, idempotent reset and physical plaintext purge tests pass.
- Camera: guided local harness and pure lifecycle tests cover consent, denied/unavailable/busy, low quality, calibration abstention and disconnect without persistence of frame/video/landmark. Real-camera execution is `NOT_RUN_EXTERNAL_GATE`; accuracy remains `UNKNOWN` pending device and ground truth.
- Clinical: OSDI-6 wording, scoring, severity and recommendation catalogue remain synthetic/internal and `DISABLED` pending Clinical/Product approval.
- Egress: the latest single WPR retry also failed at `wpr -start Network -filemode` with `0xc5585011`; status afterward was not recording and no ETL was created. Process-attributed local TCP observation sampled 21 times and observed zero external TCP connections (`NOT_OBSERVED_TCP_ONLY`), but UDP/DNS/packet coverage is absent, so dynamic egress remains `UNKNOWN/DEGRADED` and there is no no-egress claim.
- Release preparation: separate identity `EyeMate.Beta.Internal`, staged unsigned MSIX smoke, clean/update/skipped-version/rollback policy tests, CycloneDX SBOM, SHA-256 checksum, release manifest/notes, feature matrix, runbook and fail-closed signing interface are implemented. Certificate/Store identity remains `EXTERNAL_GATE`; no fake certificate and no publish action were used.
- Canonical verification: `npm run verify` PASS with 54 unit and 13 integration tests plus architecture, privacy, security, accessibility, Electron M1/M2/M3 and UI functional acceptance. `npm run pilot:contract`, `npm run test:pilot-contract`, `npm run pilot:sensitive-storage-gate`, `npm run test:camera-harness`, `npm run egress:observe:pilot`, `npm run pilot:signing-status`, `npm run pilot:release` and `npm run pilot:verify-bundle` pass with their documented external-gate states.
- V1 at `F:\dry-eye-app` was not modified.
- Handoff: `pilot/external-gate-checklist.json` is validated by `npm run pilot:external-gates` and shipped as `EXTERNAL_GATES.json` in the generated beta release bundle. It records evidence, approvers and recheck commands for every remaining external gate; validation of the checklist is not approval of a gate.

External gates before a real-person pilot:

- Security/Privacy approval plus authenticated encryption and key lifecycle evidence for sensitive persistence.
- Explicit real-camera run and approved ground-truth protocol for any accuracy-dependent capability.
- Clinical/Product approval for OSDI-6 content, scoring and recommendations.
- Real signing certificate/beta distribution identity and approved participant consent/incident ownership.
- Broader dynamic egress verification when host permissions or an approved measurement stack become available.

## Product Completion Exit Record (2026-07-14)

- Status: `PRODUCT_ENGINEERING_COMPLETE_WITH_LIMITATIONS`.
- Commit range: `0f28af3..fc42ec1`.
- Canonical verification: `npm run verify` PASS — 47 unit, 12 integration, architecture, privacy, security, accessibility, Electron M1/M2/M3 và UI functional acceptance.
- Package: `npm run build:msix:m1` PASS; unsigned internal MSIX 138,414,452 bytes; SHA-256 `B78E582739015F437CBD8ED913E1485660B7BD0E79CF47F1CF6AF027FEE30E8C`.
- UI evidence: Home, checkup result, active session, Personal Intelligence, Reports, Privacy và Settings ở 1024×768/1280×800; hai lần sinh liên tiếp có hash giống nhau.
- Functional closure: SQLite preferences/data inventory, N-1 migration, mutation timeout/retry, native export preview, report/baseline/data deletion, session cancel/recovery, quiet-hours policy và toàn bộ nudge responses đã được nối qua typed preload IPC.
- Safe enabled slice: survey-only checkup và Timer Only Work Companion, hoàn toàn local.
- Disabled/UNKNOWN: camera runtime/calibration/30-second measurement, clinically approved OSDI-6, PDF, encryption-at-rest, dynamic WPR egress, signing và public distribution.
- Không có tuyên bố `PUBLIC_READY`; không có dữ liệu camera raw, cloud, account hoặc telemetry được thêm.
- V1 không bị sửa; hai file untracked có sẵn trong V1 vẫn được bảo toàn.

Completed:

- M0 Architecture POC hoàn tất; Electron là desktop shell accepted tại ADR-003.
- T-M1-001: Electron + TypeScript scaffold, local renderer asset, BrowserWindow context isolation, Node integration tắt và preload bridge hẹp.
- T-M1-002: Lệnh `lint`, `typecheck`, `unit`, `integration`, `acceptance`, `architecture`, `build` và `verify:m1` đã chạy thực tế.
- T-M1-003: App shell điều hướng Home, Checkup, Reports, Privacy Center và Settings với state first-use/empty/offline.
- T-M1-004: SQLite local adapter có WAL, schema version, N-1 backup/migration, integrity check, recovery lock và repository onboarding typed.
- T-M1-005: State machine onboarding Local Only, consent camera có purpose/scope/version/time/decision, withdrawal persistence và camera-off/unavailable contract.
- T-M1-006: Safety Gate deterministic có rule/version, xử lý confirmed/uncertain/catalogue incompatible; catalogue chỉ là placeholder nội bộ chưa clinically approved.
- T-M1-007: Questionnaire synthetic versioned, survey-only report snapshot, missing/partial/cancel/recovery và safety-stop semantics.
- T-M1-008/009: Camera mock states và distance zone abstention; không có camera runtime/capture thật hay exact centimet.
- T-M1-010A: Export preview và deletion result typed đã có; chưa tích hợp UI/persistence hoàn chỉnh.
- Electron bridge/UI: Privacy summary Local Only và survey-only flow chạy qua main/preload/renderer; onboarding Local Only bắt buộc trước checkup.
- Release-like MSIX nội bộ unsigned build được bằng `npm run build:msix:m1`; không phải signing/Store readiness.
- T-M1-010/011: Report history, withdrawal/delete controls, canonical verification, privacy boundary scan và staged release-like MSIX smoke pass.
- UI/UX integration: custom Electron titlebar, fixed sidebar, hash router, Eye Vitals Orb, Home metrics, 5-step survey-only checkup, timer Work Companion, report tabs/charts, Privacy Center, Settings, native export dialog và responsive screenshots đã hoàn tất.
- UI functional acceptance click xuyên suốt navigation, Back/Forward/reload, checkup fallback, session timer/pause/resume/nudge/summary, report history, delete hai bước và settings autosave.

Verification:

- command: `npm run verify:m1`
  result: PASS — lint, typecheck, 18 unit, 7 integration, architecture, privacy boundary scan, Electron acceptance smoke và build.
  evidence: `src/`, `tools/m1/`, `package.json`.
- command: `npm run build:msix:m1`
  result: PASS — MakeAppx package và smoke từ staged release-like Electron app.

M2 exit verification: PASS — `npm run verify:m1`, `npm run acceptance:m2`, and `npm run build:msix:m1`; T-M2-001 through T-M2-006 complete.

M3 exit: `ENGINEERING_COMPLETE_WITH_LIMITATIONS`. Typed M1/M2 aggregate inputs flow through baseline, pattern abstention, VLI, timezone-aware daily/weekly summaries, immutable local report snapshots, Electron report UI, local Markdown/JSON export, reset and category/all-data deletion. Schema v8 migration and derived-record deletion are covered by integration tests.

Remaining:

- M4 is `ENGINEERING_COMPLETE_WITH_LIMITATIONS`; see `docs/validation/m4-exit-record.md`.
- Sensitive pilot data is DISABLED by ADR-005 until encryption/key lifecycle evidence exists.
- Real camera lifecycle and blink/distance accuracy remain UNKNOWN; timer-only/survey-only are the safe enabled modes.
- Dynamic egress remains UNKNOWN due to prior WPR host-policy failure; no retry without changed conditions.
- Signing, clinical approval and public distribution remain external gates.

Next exact action:

- Await clinical approval/runtime assets before enabling OSDI-6 or real-camera measurement; current survey-only/timer-only UI remains the safe enabled product slice.

Next exact command:

- `npm run verify`

Blockers requiring owner:

- NONE.

Acceptance:

- AC-M1-001: PASS — Electron smoke xác nhận preload bridge Local Only, context isolation và Node integration tắt.
- AC-M1-002: PASS — Local Only onboarding bắt buộc trước survey-only.
- AC-M1-003: PASS — camera mock off/denied/unavailable/busy/low-quality abstention; camera runtime thật UNKNOWN.
- AC-M1-004: PASS — Safety Gate deterministic/versioned chạy trước report; catalogue là placeholder nội bộ.
- AC-M1-005 đến AC-M1-007: PASS — survey-only, report provenance, local SQLite migration/recovery, export preview, withdrawal/delete controls.
- AC-M1-008: PASS_WITH_LIMITATIONS — offline local assets, static privacy scan và staged unsigned MSIX smoke pass; dynamic WPR egress UNKNOWN.

Important decisions:

- Electron là shell M1; ADR-004 camera runtime/model vẫn proposed.
- Dynamic WPR egress là UNKNOWN/DEFERRED_M0_LIMITATION; không chứng minh không egress.
- M1 ENGINEERING_COMPLETE không đồng nghĩa PUBLIC_READY.
- M2 dùng Electron timer-only; camera runtime thật vẫn proposed/UNKNOWN.

## UI/UX Integration Exit Record (2026-07-14)

- Status: `ENGINEERING_COMPLETE_WITH_LIMITATIONS` in `e5423ef..673fa68`.
- Verified: `npm run verify`, `npm run acceptance:ui`, `npm run build:msix:m1` and `git diff --check` PASS.
- Screenshots: Home, checkup result, active session, reports and privacy at 1024×768 and 1280×800 under `docs/validation/ui-screenshots/`.
- Wired: local onboarding/survey, work-session lifecycle, nudge response, local reports/history, native-dialog Markdown/JSON export, baseline reset, consent withdrawal and two-step local deletion.
- Disabled/abstained: camera modes/settings, raw EAR/blink/distance values and 30-day inference when evidence is unavailable.
- Limitations: real camera/calibration/30-second measurement, clinically approved OSDI-6, PDF generation and dynamic egress verification remain UNKNOWN/TBD; no UI claim upgrades them to PASS.
- V1 was not modified.

## M3 Exit Record (2026-07-14)

- Status: `ENGINEERING_COMPLETE_WITH_LIMITATIONS`.
- Verified: `npm run verify:m1` (43 unit, 10 integration, lint/typecheck/architecture/privacy/Electron M1 smoke), `npm run acceptance:m2`, `npm run acceptance:m3`, and `npm run build:msix:m1` all PASS.
- M3 evidence: typed source provenance; baseline coverage/reset/stale behavior; abstaining pattern; normalized VLI with separate confidence; timezone-aware daily/weekly aggregation; report snapshot/history; local Markdown/JSON export; category/all deletion; schema-v8 migration test.
- Safety/privacy: no raw camera frame/video/landmark persistence was added; renderer remains behind typed preload IPC; no cloud, account or telemetry was added.
- Limitations: real-camera metrics remain UNKNOWN; dynamic WPR egress/auto-update verification remains UNKNOWN due to host policy error `0xc5585011`; encryption-at-rest is TBD; package is unsigned internal MSIX; reports are product-behaviour analytics and not a diagnosis or medical record.
- V1 source was not modified. Its repository still contains unrelated pre-existing untracked documentation files.

Do not redo:

## M2 Exit Audit (2026-07-14)

- Status: `ENGINEERING_COMPLETE_WITH_LIMITATIONS`.
- `npm run acceptance:m2` PASS: Electron start/pause/resume, break nudge, response, finish, persisted summary.
- `npm run verify:m1` PASS: 30 unit tests, 8 integration tests, architecture/privacy/Electron acceptance.
- `npm run build:msix:m1` PASS: unsigned internal package smoke only.
- Worktree clean after `b14bf01`; V1 source was not modified (V1 repo has unrelated pre-existing untracked documentation files).
- Limitations: real camera UNKNOWN, dynamic WPR egress UNKNOWN (`0xc5585011`), encryption TBD, no public signing/release claim.

- Không làm lại M0 hoặc mở lại ADR-003.
- Không sửa `F:\dry-eye-app`.
- Không coi placeholder clinical/questionnaire, camera runtime thật, encryption, signing hay public release là PASS.
