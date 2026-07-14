# Hướng dẫn tác nhân — EyeMate V2 M2

## Phạm vi và nguồn sự thật

- Repository V2: `F:\eyemate-desktop`.
- V1: `F:\dry-eye-app` chỉ đọc; không sửa, không commit, không sao chép mù quáng kiến trúc hay hành vi.
- Milestone hiện hành: **M2 — Work Companion MVP**. Electron là desktop shell đã được chấp nhận tại `ADR-003`; không mở lại Electron/Tauri nếu không có evidence mới nghiêm trọng.
- Dùng theo thứ tự: Git thực tế → `PROJECT_STATUS.md` → spec/acceptance/task hiện hành → code/test → `GOVERNANCE.md` → `MASTER_SPEC.md` → ADR accepted.
- Đọc `docs/` và `specs/` theo feature đang làm; không dùng chat hay V1 làm nguồn sự thật cho behavior V2.

## M3 extension

- Current milestone: **M3 — Personal Intelligence, Trends & Reports**. Read `specs/013-m3-personal-intelligence/` after `PROJECT_STATUS.md`.
- Continue M3 as a local-only vertical slice: typed aggregate source → baseline/pattern/VLI → daily/weekly report → preview/export → reset/delete → Electron smoke.
- Preserve M1/M2 snapshots. Legacy rows without safe aggregate provenance must remain `UNKNOWN`/partial; do not infer camera or symptom values.

## Resume và thực thi liên tục

1. Bắt đầu bằng `git status --short`, `git diff --stat`, `git diff --check`, `git log --oneline -10`, rồi đọc `PROJECT_STATUS.md` và task hiện hành.
2. Nếu có diff, review, xác định task sở hữu và tiếp tục task đó. Không reset, stash, discard hoặc ghi đè thay đổi không rõ nguồn gốc.
3. Mỗi task nhỏ: implement → test phù hợp → review diff → `git diff --check` → commit có chủ đích.
4. Sau task PASS, tự đọc task sẵn sàng theo dependency và tiếp tục ngay. Không chờ xác nhận commit thông thường, không báo cáo từng task.
5. Cập nhật `PROJECT_STATUS.md` theo batch, blocker hoặc milestone; gộp vào task commit khi phù hợp.
6. Checkpoint/report chỉ khi: tối đa 5–10 commit, blocker thật, xung đột safety/privacy/data, cần quyền owner, hoặc M1 hoàn tất.

## Quyền tự chủ M2

- Được tạo/sửa code, UI, test, fixture, harness, docs và dependency repo-local cần thiết trong V2; chạy npm install/build/test/package local; tạo SQLite fixture; chạy Electron local; commit nhỏ.
- Dependency mới phải có requirement, module owner, license, hành vi network, ảnh hưởng build và đường thay thế/gỡ bỏ được ghi trong task hoặc package metadata.
- Được triển khai camera mock/denied/unavailable; camera thật chỉ với action/consent rõ ràng và theo ADR-004.

## Phải dừng hỏi owner

- Sửa V1; cần Administrator hoặc system setting/toolchain ngoài phạm vi đã cho phép; signing/Store/public upload; cloud/account/telemetry; dữ liệu hoặc pilot người thật; clinical approval; thay đổi lớn consent/retention/data ownership; hoặc spec/acceptance/privacy/safety mâu thuẫn.
- Cũng dừng nếu cần camera thật mà chưa có quyền rõ ràng, hoặc evidence mâu thuẫn khiến không thể chọn hành vi an toàn.

## Kiến trúc M2

- Modular monolith + ports/adapters: `app-shell`, `onboarding-consent`, `safety`, `symptom-checkup`, `measurement-quality`, `camera`, `distance`, `reports`, `user-data`, `platform-electron`.
- Domain không import Electron, DOM, MediaPipe, ONNX hoặc SQLite. Renderer không gọi SQLite/camera SDK trực tiếp. Preload chỉ cung cấp API hẹp, typed và allowlist.
- Không event bus tổng quát, plugin system, microservice hoặc cloud abstraction.
- `contextIsolation` phải bật; `nodeIntegration` phải tắt.

## Invariant safety và privacy

- Local Only mặc định; không account, cloud, telemetry hay CDN cho asset bắt buộc.
- Không persistence/log/evidence raw frame, video, landmark, pixel buffer hoặc raw per-frame series; camera raw chỉ RAM.
- `UNKNOWN`, `NOT_MEASURED`, `INSUFFICIENT_DATA` không được biến thành bình thường/0/PASS.
- Không claim diagnosis, disease probability, treatment, camera xác nhận bệnh hoặc “không có vấn đề”.
- Camera denied/unavailable không chặn survey-only. Quality rejected phải abstain.
- Export cần preview; delete phải báo `DELETED`, `PARTIALLY_DELETED` hoặc `FAILED` trung thực.
- Chặn traversal, symlink/junction escape và Windows case collision ở mọi path nhận từ ngoài.

## Giới hạn đã biết

- Dynamic WPR egress/auto-update: `UNKNOWN / DEFERRED_M0_LIMITATION` do `0xc5585011`; không retry WPR/elevation/policy. Static scan không chứng minh “không egress”.
- ADR-004 vẫn proposed: chưa chọn runtime/model camera; không dùng CDN fallback.
- File-symlink integration M0: `SKIP (EPERM)`, phải chạy lại trước benchmark chính thức.

## Lệnh M2 chuẩn

Chỉ thêm lệnh vào đây sau khi tồn tại và đã chạy thành công trong `package.json`. Không bịa lệnh app/camera/package.

## Definition of Done M2

- Timer-only Work Companion end-to-end có session lifecycle/recovery, nudge policy/cooldown/quiet mode, Session Summary và delete coverage.
- Camera missing/unknown degrade trung thực; raw camera data không persistence/log/evidence.
- Canonical verify, Electron acceptance và staged internal MSIX smoke pass; V1 không đổi.
- Có thể là `ENGINEERING_COMPLETE_WITH_LIMITATIONS`, chưa `PUBLIC_READY` nếu camera thật, clinical, encryption, signing hoặc dynamic egress còn UNKNOWN/TBD.
