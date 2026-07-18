# Project Status

Last updated: 2026-07-18
Current milestone: FINAL_FEATURE_COMPLETION
Current batch: Functional UX audit — Home evidence, Work Companion và Personal Intelligence
Current task: hoàn thiện dữ liệu 7/30 ngày, diễn giải nhịp làm việc và persistence dẫn xuất
Task state: IMPLEMENTED_VERIFIED_WITH_ELECTRON_HOST_LIMITATION_UNCOMMITTED

Latest implementation commit: pending mixed-worktree review
Task base commit: `26c30d3`
Working tree expectation: mixed owner-preserved Wellness, Living Aurora và Clarity UI changes; không stage/commit toàn bộ.

## Functional UX audit — Checkup và Work Companion (2026-07-18)

- Status: `IMPLEMENTED_VERIFIED_WITH_ELECTRON_HOST_LIMITATION_UNCOMMITTED`.
- Work Companion có năm profile thật, bao gồm `CUSTOM` với thời gian tập trung 5–180 phút, nghỉ 1–60 phút và mốc nhắc được validation/lưu cục bộ. Home phản ánh đúng mode/preset thay vì hard-code Timer Only 25 phút.
- Monitor phiên tiếp tục lấy elapsed snapshot và xét cadence khi người dùng rời route Đồng hành; pause/resume, quiet hours, cooldown, snooze, âm thanh và phản hồi nudge vẫn dùng policy/IPC hiện hữu.
- Nút tạo dữ liệu tại Personal Intelligence gọi tạo report thật thay vì chỉ chuyển route. Các control Cài đặt chưa hỗ trợ lựa chọn được chuyển thành trạng thái rõ ràng, không còn select disabled gây kỳ vọng sai.
- Camera selector chuyển thiết bị ngay khi camera đang chạy, giữ đúng camera active và kiểm tra lại calibration theo device binding. Home đọc lại blink rate/distance zone aggregate từ payload đã mã hóa sau restart; không đưa raw frame/video/landmark qua IPC hoặc persistence.
- Home evidence lấy trực tiếp phiên/checkup/blink/distance mới nhất thay vì phụ thuộc report M3 cũ; lượt checkup camera hợp lệ không còn giữ sai badge 2/5. Weekly anchor đọc trực tiếp 7 ngày Session Summary hoàn tất.
- Personal Intelligence ưu tiên diễn giải người dùng: biểu đồ 7/30 ngày, tổng thời gian, trung bình ngày có phiên, trung bình/phiên, phiên dài nhất, khung giờ bắt đầu ước tính, ngày thường hoạt động nhiều, xu hướng với 7 ngày trước và tín hiệu phiên dài/khối lượng ghi nhận cao có ngưỡng công khai.
- Persistence M3 sửa cửa sổ tuần thành đúng 7 ngày kết thúc hôm nay; baseline gộp mọi Work Companion mode; aggregate dẫn xuất upsert theo ID; report cùng ngày được gom khi cập nhật. Inventory đếm thực thể logic, không cộng trùng lifecycle + Session Summary hoặc hàng M3 nội bộ.
- Verification: typecheck PASS; unit 111/111; integration 21/21; lint/architecture/privacy PASS; `git diff --check` PASS.
- `npm run acceptance:ui` build PASS nhưng Electron dừng trước assertion do host `GPU process isn't usable`, exit `2147483651`; UI acceptance runtime vẫn là host limitation, không được ghi PASS giả.

## Handoff checkpoint (2026-07-15)

- Target branch: `main` theo owner approval trực tiếp; backup nền `backup/pre-main-handoff-20260715-1838` trỏ `26c30d3`. Mục tiêu là bảo toàn và bàn giao, không phải public release.
- Production UI: Clarity Grid tại `#/home` và bảy route top-navigation. Living Aurora và Taste/Clarity reference vẫn là Design Lab dev-only.
- Hoàn thành engineering: EyeMate Wellness Questionnaire D-004, D-009 ratio-zone fail-closed, Settings calibration aggregate, unpackaged DevPanel, production UI rollout, Design Labs, circular timer và unsigned MSIX tooling.
- Blocker: real webcam trả `CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE`; clean-machine unsigned MSIX install chưa có external evidence; dynamic egress WPR vẫn `UNKNOWN` do host error `0xc5585011`.
- Sau cuộc thi: signing/public distribution, camera ground-truth/accuracy approval, dynamic TCP/UDP/DNS evidence, Security/Privacy external gates và mọi clinical validation.
- Tiếp tục chính xác: `npm ci`, `npm run verify`, `npm run acceptance:clarity-production`, `npm run acceptance:dev-panel`; chỉ chạy `npm run camera:measure:pilot` khi có webcam/lighting/operator protocol phù hợp.
- Inventory và hướng dẫn: `docs/handoff/CURRENT_WORKTREE_INVENTORY.md`, `docs/handoff/HANDOFF.md`, `docs/handoff/QUICK_START.md`.

## Demo polish và unsigned MSIX — Task 4/5 (2026-07-15)

- Status: `IMPLEMENTED_VERIFIED_WITH_EXTERNAL_INSTALL_GATE_UNCOMMITTED`.
- Work Companion active có SVG circular timer semantic, preset 25 phút, progress và accessible timer label; lifecycle/control hiện hữu được giữ nguyên. Reduced motion bỏ transition nhưng không làm mất trạng thái.
- `npm run acceptance:ui` và `npm run acceptance:clarity-production` PASS sau thay đổi timer; production routes và functional controls tiếp tục được kiểm tra.
- `npm run build:demo` tạo `.m1/msix/eyemate-m1.msix` bằng MakeAppx pipeline hiện hữu, không thêm dependency hoặc network asset. Artifact có 155.228.494 byte, SHA-256 `0EB0DFCE586365F201027A65A0B549A76F627B4970E9E858E8A87B8AA2FA37BB`.
- Manifest khai báo `vi-vn` và `en-us`; `Get-AuthenticodeSignature` xác nhận `NotSigned`. Đây là engineering artifact, chưa phải public release/signing readiness.
- Clean-machine install, Unknown Publisher UX và real-webcam full demo vẫn là external gates chưa được chứng minh trên host hiện tại.
- Có helper `tools/m1/install-unsigned-demo-msix.ps1` không phụ thuộc Node.js cho Windows 11 (`Add-AppxPackage -AllowUnsigned`), với fail-closed OS/signature checks. “More info > Run anyway” không phải installation flow đúng của MSIX.

## Distance ratio/zone filtering — Task 2A (2026-07-15)

- Status: `IMPLEMENTED_VERIFIED_UNCOMMITTED`; D-009 `RATIO_ZONE_FAIL_CLOSED` được Validation Owner phê duyệt ngày 2026-07-15.
- V2 tiếp tục dùng calibration cá nhân và output `NEAR/COMFORT/FAR/UNKNOWN`; không thêm estimator centimet, fallback `K=8500` hoặc claim accuracy.
- Pipeline distance có rolling median 5 readings, loại spike lệch quá 25% so với median tham chiếu, hysteresis ratio và dwell ba readings trước khi công bố zone.
- `UNKNOWN`, quality rejection và outlier ngắt dwell; zone cũ chỉ được xác nhận lại sau ba readings hợp lệ. Đổi camera/resolution/device binding vẫn invalidate calibration.
- Near episode state yêu cầu ba aggregate hợp lệ liên tiếp; một aggregate khác zone reset candidate. Quiet mode/cooldown của Work Companion không bị thay đổi.
- Provenance nâng lên `eyemate-window/0.2.0`, `camera-quality/0.2.0+distance-ratio-filter/1.0.0`; raw frame/landmark/per-frame series vẫn chỉ ở RAM và không xuất hiện trong aggregate.
- Verification hiện tại: typecheck PASS; unit 80/80; integration 18/18; camera runtime PASS với `accuracy=UNKNOWN`; camera harness smoke PASS.

## Settings camera calibration — Task 2B (2026-07-15)

- Status: `ENGINEERING_COMPLETE_WITH_EXTERNAL_CAMERA_GATE_UNCOMMITTED`.
- Settings có flow ba bước: hướng dẫn + khoảng cách tham chiếu → thu sample hợp lệ trong RAM 5 giây → kết quả confidence + lưu/thử lại. Camera chỉ mở sau action và consent rõ ràng.
- Calibration core yêu cầu tối thiểu 30 sample hợp lệ, dùng median IOD, variance và coefficient of variation; confidence `HIGH/MEDIUM/LOW` là độ ổn định kỹ thuật, không phải xác suất sức khỏe.
- Chỉ aggregate record device-bound có version được persist; raw samples không nằm trong record. SQLite schema 12 lưu payload calibration mã hóa, hỗ trợ restart, reset độc lập, inventory và delete-all.
- Settings/Privacy làm calibration và reset discoverable; output chỉ nói zone/profile và khoảng cách tham chiếu do người dùng nhập, không claim khoảng cách centimet đo được.
- Canonical `npm run verify` PASS: unit 84/84, integration 19/19, architecture/privacy/security/accessibility, M1–M3 và UI acceptance.
- `npm run camera:measure:pilot`: FAIL `CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE`; real-webcam end-to-end/accuracy vẫn là external gate `UNKNOWN`, không hạ quality threshold hoặc giả PASS.

## Unpackaged DevPanel — Task 2C (2026-07-15)

- Status: `IMPLEMENTED_VERIFIED_UNCOMMITTED`.
- DevPanel chỉ được enable khi đồng thời app chưa packaged và main process nhận `--enable-dev-panel`; `npm run dev` truyền flag, mọi production/acceptance/package mặc định false.
- `Ctrl+Shift+D` mở/đóng panel, có badge `DEV MODE`; close/reset xóa toàn bộ overrides và sessionStorage marker. Restart không persist override.
- Force distance chỉ mô phỏng thông qua ratio của calibration hiện có; force EAR/blink rate tác động observation trong renderer dev path. Không thêm `K=8500` hoặc thay production distance semantics.
- Landmark overlay được vẽ trực tiếp trong camera runtime vào canvas RAM-only, không đưa landmark qua callback/IPC/storage/log. Raw-metric strip chỉ tồn tại khi dev toggle bật.
- Export debug log bị vô hiệu hóa bởi privacy boundary; `logLevel` chỉ là UI dev state và không tạo sink mới.
- `npm run acceptance:dev-panel`: PASS `shortcut=true resetOnClose=true sessionOnly=true productionDefault=false rawExport=false`.
- Canonical `npm run verify`: PASS với unit 87/87, integration 19/19, production UI xác nhận shortcut không tạo DevPanel khi flag false.

## EyeMate Symptom Check v1 (2026-07-15)

- Status: `IMPLEMENTED_VERIFIED_UNCOMMITTED`; decision `D-004/EYEMATE_WELLNESS_QUESTIONNAIRE` được Owner phê duyệt ngày 2026-07-15.
- Default Checkup dùng đúng 5 câu EyeMate tự phát triển, thời gian hồi tưởng 7 ngày, thang 0–3 và lựa chọn `UNKNOWN` ngoài scale để giữ missing trung thực. Không dẫn nguồn hoặc hiển thị DEQ-5/OSDI.
- Tổng điểm tự báo cáo chỉ xuất hiện khi đủ cả 5 câu, có miền 0–15 và ba nhóm hành động sản phẩm: duy trì thói quen hỗ trợ, thêm nhịp nghỉ/điều chỉnh, hoặc ưu tiên nghỉ/theo dõi lại. Không dùng severity label lâm sàng.
- Disclaimer non-diagnosis bắt buộc xuất hiện ở đầu flow, cuối kết quả và trong export; Safety Gate vẫn ưu tiên trước scoring.
- Checkup result tách tự báo cáo, camera quan sát được, dữ liệu thiếu, Safety Gate, action wellness có reason/evidence source và giới hạn đo. Markdown/JSON/PDF export dùng native Save dialog và chỉ xuất dữ liệu cục bộ đã lưu.
- Migration schema 11 thêm payload wellness được bảo vệ cùng snapshot; report legacy giữ nguyên provenance/semantics và không được đổi thành instrument khác. Delete/reset xóa payload cùng dữ liệu checkup.
- Task 1 verification: typecheck PASS; unit 73/73; integration 18/18; UI functional acceptance PASS; M1/M3 smoke PASS; pilot-contract fixtures 5/5 PASS.
- External release gates còn lại: camera accuracy/ground truth thật, dynamic DNS/UDP/packet egress coverage, signing/distribution identity và approval Security/Privacy nếu mở sensitive pilot.

## Final Feature Completion Exit Record (2026-07-14)

- Status: `FEATURE_COMPLETE_WITH_EXTERNAL_GATES`. Tất cả phần còn thiếu có thể đóng bằng code đã được triển khai; không dùng `PUBLIC_READY` hoặc tự thay approval bên ngoài.
- Camera: model/WASM local, consent IPC, permission handler chỉ cho renderer local đã consent, device selection, start/stop/cleanup, quality gate, calibration binding, cửa sổ 30 giây, blink aggregate và distance zone fail-closed đã nối vào checkup. Real-device start/stop PASS; lượt full-measurement thực tế trả `QUALITY_NOT_ACCEPTABLE`, vì vậy accuracy/ground truth vẫn `UNKNOWN`.
- Privacy camera: raw frame, video, landmark và per-frame series chỉ ở RAM; aggregate không biến missing thành zero. Route change, window hidden, device change, disconnect và shutdown đều dừng track hoặc yêu cầu hiệu chỉnh lại.
- Sensitive storage: AES-256-GCM bảo vệ payload; record identity dùng AAD; master key ngẫu nhiên được Electron `safeStorage`/Windows user context bảo vệ. Tamper, wrong/missing key, restart, plaintext migration, interruption/retry, encrypted backup, physical plaintext scan và delete/reset PASS. Security/Privacy approval vẫn `PENDING`; real-person sensitive pilot tiếp tục `DISABLED`.
- Export: Markdown, JSON và PDF A4 nhiều trang chạy local qua preview + native Save dialog, atomic write, Unicode tiếng Việt, cancel/no-overwrite tests; không có cloud/CDN.
- Questionnaire: definition và scoring adapter versioned, stable IDs, missing-answer handling và feature gate đã có. Adapter OSDI 12 mục/thang 0–4 vẫn `DISABLED` vì thiếu approved content/license/translation/scoring và Clinical/Product evidence.
- Release: beta identity, MSIX, SBOM, checksum, release manifest, provenance, rollback policy, SignTool discovery, input boundary và post-sign verification đã sẵn sàng. `SIGNING=READY_FOR_EXTERNAL_CERTIFICATE`; không có certificate giả hoặc publish.
- Egress: process tree TCP và UDP-endpoint observation ghi 0 observation; DNS/remote-UDP/packet content không có coverage. Pktmon host-wide đã được thử có quyền Administrator cùng local workload, tạo ETL/TXT nhưng recorder/convert trả exit `1`; raw artifact bị xóa không inspection/commit. Kết luận duy nhất là `UNKNOWN_NO_TCP_OBSERVED`; WPR vẫn blocked `0xc5585011`, không có claim no-egress.
- Canonical verification: `npm run verify:pilot` PASS với 65 unit, 17 integration, architecture/privacy/security/accessibility, Electron M1–M3, UI acceptance, protected-storage gate, camera lifecycle smoke, PDF test, signing interface, MSIX build và release-bundle verification.
- V1 `F:\dry-eye-app` không bị sửa; hai file documentation untracked có sẵn được bảo toàn.

External gates còn lại: Security/Privacy approval; full operator camera/ground-truth protocol; Clinical/Product approval; authorized signing certificate/distribution identity; và Security-run dynamic network coverage cho DNS/UDP/packet khi môi trường cho phép.

## Pilot Readiness Exit Record (2026-07-14)

- Status: `PILOT_READY_WITH_EXTERNAL_GATES`; this is an engineering package for internal synthetic use, not approval to enroll real participants and not `PUBLIC_READY`.
- Automated enabled slice: survey-only checkup, Timer Only companion and local aggregate Personal Intelligence. Markdown/JSON export remains enabled; PDF is intentionally deferred because it is not required for this beta.
- Encryption-at-rest: current SQLite plaintext is executable-test confirmed. ADR-005 keeps sensitive persistence `DISABLED`; no tamper/wrong-key/missing-key claim is made without an approved encryption and key-lifecycle design. Migration, interruption, backup/recovery, idempotent reset and physical plaintext purge tests pass.
- Camera: guided local harness and pure lifecycle tests cover consent, denied/unavailable/busy, low quality, calibration abstention and disconnect without persistence of frame/video/landmark. Real-camera execution is `NOT_RUN_EXTERNAL_GATE`; accuracy remains `UNKNOWN` pending device and ground truth.
- Clinical: OSDI 12 mục wording, scoring, severity và recommendation catalogue remain unshipped and `DISABLED` pending Clinical/Product approval.
- Egress: the latest single WPR retry also failed at `wpr -start Network -filemode` with `0xc5585011`; status afterward was not recording and no ETL was created. Process-attributed local TCP observation sampled 21 times and observed zero external TCP connections (`NOT_OBSERVED_TCP_ONLY`), but UDP/DNS/packet coverage is absent, so dynamic egress remains `UNKNOWN/DEGRADED` and there is no no-egress claim.
- Release preparation: separate identity `EyeMate.Beta.Internal`, staged unsigned MSIX smoke, clean/update/skipped-version/rollback policy tests, CycloneDX SBOM, SHA-256 checksum, release manifest/notes, feature matrix, runbook and fail-closed signing interface are implemented. Certificate/Store identity remains `EXTERNAL_GATE`; no fake certificate and no publish action were used.
- Canonical verification: `npm run verify` PASS with 54 unit and 13 integration tests plus architecture, privacy, security, accessibility, Electron M1/M2/M3 and UI functional acceptance. `npm run pilot:contract`, `npm run test:pilot-contract`, `npm run pilot:sensitive-storage-gate`, `npm run test:camera-harness`, `npm run egress:observe:pilot`, `npm run pilot:signing-status`, `npm run pilot:release` and `npm run pilot:verify-bundle` pass with their documented external-gate states.
- V1 at `F:\dry-eye-app` was not modified.
- Handoff: `pilot/external-gate-checklist.json` is validated by `npm run pilot:external-gates` and shipped as `EXTERNAL_GATES.json` in the generated beta release bundle. It records evidence, approvers and recheck commands for every remaining external gate; validation of the checklist is not approval of a gate.

External gates before a real-person pilot:

- Security/Privacy approval plus authenticated encryption and key lifecycle evidence for sensitive persistence.
- Explicit real-camera run and approved ground-truth protocol for any accuracy-dependent capability.
- Clinical/Product approval for licensed OSDI 12-item content, Vietnamese translation, scoring and recommendations.
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
- Disabled/UNKNOWN: camera runtime/calibration/30-second measurement, clinically approved OSDI 12 mục, PDF, encryption-at-rest, dynamic WPR egress, signing và public distribution.
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

- Await clinical approval/runtime assets before enabling licensed OSDI 12 mục or real-camera measurement; current survey-only/timer-only UI remains the safe enabled product slice.

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
- Limitations: real camera/calibration/30-second measurement, clinically approved OSDI 12 mục, PDF generation and dynamic egress verification remain UNKNOWN/TBD; no UI claim upgrades them to PASS.
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

## Taste-driven redesign Gate T0 (2026-07-15)

- Task base commit: `26c30d3`; worktree Wellness Check và Living Aurora có sẵn được bảo toàn, không reset/stash/commit.
- Required skills loaded from `https://github.com/Leonxlnx/taste-skill` at ref `b17742737e796305d829b3ad39eda3add0d79060`:
  - `redesign-existing-projects` at `C:\Users\ADMIN\.codex\skills\redesign-existing-projects\SKILL.md`;
  - `design-taste-frontend` at `C:\Users\ADMIN\.codex\skills\design-taste-frontend\SKILL.md`.
- Gate T0 audit and three-direction score: `docs/validation/taste-driven-redesign-gate-t0.md`.
- Proposed direction: `Nhật Ký Dư Ảnh`, score `9.21/10`.
- No production renderer/CSS, domain, IPC, camera, privacy, safety or data semantics changed in Gate T0.
- Next exact action only after owner sends `APPROVE TASTE DIRECTION — BUILD DESIGN LAB`: build dev-only `#/design-lab/taste-direction`, preserve production UI, then stop at Visual Gate A.
- Current state: `WAITING_FOR_TASTE_PLAN_APPROVAL`.

## Taste-driven redesign Visual Gate A (2026-07-15)

- Owner approved `APPROVE TASTE DIRECTION — BUILD DESIGN LAB` for direction `Nhật Ký Dư Ảnh`; this is not production rollout approval.
- Dev-only reference route: `#/design-lab/taste-direction`.
- Delivered Home at 1100×760 and 1280×800, Checkup evidence letter, active Work Companion, evidence journal/report and reduced-motion reference.
- Design Lab uses a scoped full-viewport top-navigation shell; exact production routes/sidebar remain unchanged outside the lab.
- Afterimage Trace is evidence/history metaphor only, with text-independent `READY`, `NOT_MEASURED`, `INSUFFICIENT_DATA`, `STALE`, `LOW_QUALITY`, `PRIVACY` states and reduced-motion/reduced-transparency representations.
- No mascot variant was added. Mascot remains an open visual decision for Gate A; companion capability was not removed from architecture.
- No IPC, camera, database, storage, network, dependency, CDN, remote font/icon/asset, domain or data-semantics change was introduced.
- Evidence and Navigation Migration Matrix: `docs/validation/taste-driven-redesign-gate-a.md`.
- `npm run typecheck`: PASS.
- `npm run acceptance:taste-design-lab`: PASS with `noIpcCameraDatabaseNetwork=true keyboardFocus=true reducedMotion=true reducedTransparency=true productionUiUnchanged=true`.
- Pre-existing Wellness failures remain separate and untouched.
- No stage/commit because the worktree contains owner-preserved mixed Wellness and Living Aurora changes.
- Current state: `WAITING_FOR_VISUAL_GATE_A_APPROVAL`.

### Clarity Grid visual revision (2026-07-15)

- Owner rejected the dark `Nhật Ký Dư Ảnh` visual and requested a new reference based directly on four local WEBP inspirations.
- The same dev-only route now renders `Clarity Grid`: light neutral canvas, lime single accent, top navigation and asymmetric modular data layout.
- Production UI, Wellness Check, IPC/domain/data semantics and dependencies remain unchanged; see `docs/validation/clarity-grid-reference.md`.
- Motion refinement học hierarchy/feedback từ QClay: rolling navigation label, staged view transition, card/button feedback, click ripple và chart/trace reveal.
- Không đưa vào custom cursor, scroll hijack, parallax, flashing/flicker hoặc animation vô hạn; Work Companion giữ quiet mode.
- Reduced motion và system `prefers-reduced-motion` tắt toàn bộ chuyển động không thiết yếu mà không làm mất state hoặc action.
- `npm run acceptance:taste-design-lab`, `acceptance:living-aurora`, `architecture`, `privacy`, `accessibility`, `typecheck` và `git diff --check`: PASS.
- Hai failure Wellness trước đó (`UI_WELLNESS_COPY_INVALID`, fixture `clinical-osdi-12`) được đóng trong Task 1 owner-approved; `acceptance:ui` và `test:pilot-contract` hiện PASS.
- Current state: `PROMOTED_TO_PRODUCTION_PRESENTATION`; reference route vẫn được giữ.

### Clarity Grid production rollout (2026-07-15)

- Owner xác nhận rollout production sau khi được hỏi rõ về việc đưa Clarity Grid thành giao diện chính thức.
- `npm run dev` nay mở trực tiếp production Home với Clarity Grid top navigation; không cần Console, không còn production orb hoặc sidebar dọc.
- Bảy route production giữ các DOM hook/IPC capability hiện hữu theo `docs/validation/clarity-grid-production-rollout.md`.
- Không sửa questionnaire/Wellness logic, domain, IPC contract, camera/privacy/safety/data semantics, dependency hoặc network behavior.
- Backup trước rollout: `F:\eyemate-desktop-ui-backup-20260715-visual-gate-a`.
- `npm run acceptance:clarity-production`: PASS với `routes=7 startupHome=true topNavigation=true noOrb=true keyboardFocus=true clickFeedback=true reducedMotion=true functionalHooksPreserved=true`.
- Lint, typecheck, unit 70, integration 18, architecture, privacy, accessibility, M1/M2/M3 acceptance và hai Design Lab acceptance đều PASS.
- Hai failure Wellness khi rollout được giữ nguyên tại thời điểm đó và đã được Task 1 owner-approved xử lý; cả hai suite hiện PASS.
- Chưa stage/commit vì worktree trộn Wellness, Living Aurora, Clarity Grid và owner-managed screenshots.
- Current state: `PRODUCTION_UI_ROLLOUT_IMPLEMENTED_UNCOMMITTED`.

### Clarity Grid Home critique refinement (2026-07-15)

- Đã xử lý review typography/chart/illustration/layout/session-context/lime/nav trên production Home mà không đổi route, hook hoặc semantics.
- Decorative fixed bar chart được thay bằng semantic SVG evidence coverage từ dữ liệu thật; không bịa trend line, delta hoặc confidence. Missing vẫn hiển thị hatch và `INSUFFICIENT_DATA`/`NOT_MEASURED`.
- Bổ sung local evidence artwork, progress ring theo preset 25 phút, metric glyph và card tuần làm anchor cột phải; subtitle concept đổi thành `Visual wellbeing`.
- Không remote font/icon/asset, dependency, IPC, camera, database, network hoặc Wellness change. Reduced motion/transparency giữ representation tĩnh đầy đủ.
- `npm run typecheck`, `npm run acceptance:clarity-production` và `git diff --check`: PASS tại checkpoint refinement.
- Chưa stage/commit do mixed worktree vẫn phải được bảo toàn.
