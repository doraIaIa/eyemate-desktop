# Project Status

Last updated: 2026-07-14
Current milestone: M1 — Personal Checkup MVP
Current batch: M1-A foundation
Current task: T-M1-005 — Onboarding và consent
Task state: IN_PROGRESS

Latest verified commit: `c41a22b`
Task base commit: `c41a22b`
Working tree: M1-A foundation đã kiểm chứng, chờ commit có chủ đích.

Completed:

- M0 Architecture POC hoàn tất; Electron là desktop shell accepted tại ADR-003.
- T-M1-001: Electron + TypeScript scaffold, local renderer asset, BrowserWindow context isolation, Node integration tắt và preload bridge hẹp.
- T-M1-002: Lệnh `lint`, `typecheck`, `unit`, `integration`, `acceptance`, `architecture`, `build` và `verify:m1` đã chạy thực tế.
- T-M1-003: App shell điều hướng Home, Checkup, Reports, Privacy Center và Settings với state first-use/empty/offline.
- T-M1-004: SQLite local adapter có WAL, schema version, N-1 backup/migration, integrity check, recovery lock và repository onboarding typed.

Verification:

- command: `npm run verify:m1`
  result: PASS — lint, typecheck, 1 unit, 1 integration, architecture check, Electron acceptance smoke và build.
  evidence: `src/`, `tools/m1/`, `package.json`.

Remaining:

- T-M1-005 onboarding/Local Only/consent persistence, withdrawal và camera-off path.

Next exact action:

- Review và commit T-M1-004; triển khai onboarding/consent.

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
