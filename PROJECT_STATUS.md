# Project Status

Last updated: 2026-07-14
Current milestone: M1 — Personal Checkup MVP
Current batch: M1-A foundation
Current task: T-M1-010 — Tích hợp report và Privacy Center
Task state: IN_PROGRESS

Latest verified commit: `c3ee2d7`
Task base commit: `c3ee2d7`
Working tree: sạch sau batch implementation thứ hai.

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

Verification:

- command: `npm run verify:m1`
  result: PASS — lint, typecheck, 1 unit, 1 integration, architecture check, Electron acceptance smoke và build.
  evidence: `src/`, `tools/m1/`, `package.json`.

Remaining:

- T-M1-010 UI report/Privacy Center; T-M1-011 integration acceptance và release-like build.

Next exact action:

- Tích hợp các use case M1 hiện có vào preload/main/renderer; không mở camera thật.

Next exact command:

- `git diff --check`

Blockers requiring owner:

- NONE.

Acceptance:

- AC-M1-001: PASS — Electron smoke xác nhận preload bridge Local Only, context isolation và Node integration tắt.
- AC-M1-002 đến AC-M1-008: NOT_STARTED.

Important decisions:

- Electron là shell M1; ADR-004 camera runtime/model vẫn proposed.
- Dynamic WPR egress là UNKNOWN/DEFERRED_M0_LIMITATION; không chứng minh không egress.

Do not redo:

- Không làm lại M0 hoặc mở lại ADR-003.
- Không sửa `F:\dry-eye-app`.
