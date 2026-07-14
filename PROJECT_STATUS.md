# Project Status

Last updated: 2026-07-14
Current milestone: M1 — Personal Checkup MVP ENGINEERING_COMPLETE_WITH_LIMITATIONS
Current batch: M1 exit verification
Current task: M1 exit record
Task state: DONE_WITH_LIMITATIONS

Latest verified commit: `06ea21f`
Task base commit: `06ea21f`
Working tree: M1 exit record chờ commit.

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

Verification:

- command: `npm run verify:m1`
  result: PASS — lint, typecheck, 18 unit, 7 integration, architecture, privacy boundary scan, Electron acceptance smoke và build.
  evidence: `src/`, `tools/m1/`, `package.json`.
- command: `npm run build:msix:m1`
  result: PASS — MakeAppx package và smoke từ staged release-like Electron app.

Remaining:

- Không còn task M1 engineering bắt buộc.

Next exact action:

- Owner review M1 exit và quyết định M2; không mở M2 tự động.

Next exact command:

- `git diff --check`

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

Do not redo:

- Không làm lại M0 hoặc mở lại ADR-003.
- Không sửa `F:\dry-eye-app`.
- Không coi placeholder clinical/questionnaire, camera runtime thật, encryption, signing hay public release là PASS.
