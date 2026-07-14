# Hướng dẫn tác nhân — EyeMate V2 M0

## Phạm vi và nguồn sự thật

- Repository V2: `F:\eyemate-desktop`.
- V1: `F:\dry-eye-app` chỉ đọc; không sửa, không commit, không chạy thao tác phá huỷ. Baseline V1 được ghi trong `PROJECT_STATUS.md`.
- Mục tiêu hiện tại là **M0 — Architecture POC**, không mở M1.
- Đọc theo loại nội dung: feature behavior/acceptance từ `specs/`; data/privacy từ contract tương ứng; architecture/dependency từ ADR; build/release từ runbook/CI. Không lấy code cũ hay chat làm nguồn sự thật thay các tài liệu này.
- Không tự chọn Electron/Tauri, encryption, clinical content, threshold hiệu năng hoặc retention cuối khi chưa có evidence/owner decision.

## Resume protocol bắt buộc

1. Chạy `git status --short`, `git diff --stat`, `git diff --check`, `git log --oneline -10`.
2. Đọc `PROJECT_STATUS.md`.
3. Đọc task hiện hành trong `specs/000-m0-architecture-poc/tasks.md` cùng spec/acceptance liên quan.
4. Khi cần ngữ cảnh M0, đọc `MASTER_SPEC.md`, `GOVERNANCE.md` và `tools/m0/README.md`.
5. Nếu có diff: review toàn bộ, xác định task sở hữu, bảo toàn diff và tiếp tục task đó. Không reset, stash, checkout để xoá diff.
6. Chỉ làm một task nhỏ tại một thời điểm: implement → test → review diff → `git diff --check` → commit → cập nhật `PROJECT_STATUS.md`.
7. Nếu không có blocker, tự chọn task M0 kế tiếp có dependency sẵn sàng. Không tạo readiness/adversarial-review document mới trừ khi trực tiếp gỡ blocker.

## Ranh giới bất biến

- Không sửa V1; không mở M1.
- Không thêm cloud, account, telemetry, enterprise, federated/adaptive ML hoặc event-bus/plugin system.
- Không dùng CDN cho asset bắt buộc; hành vi phải local-first/offline khi M0 yêu cầu.
- Không persistence/log/evidence raw frame, video, raw landmark, dữ liệu sức khỏe thật, username, hostname, user path, serial, secret hoặc raw trace.
- Chỉ dùng fixture synthetic. `UNKNOWN`, `NOT_MEASURED` và `SKIP` không phải `PASS`.
- Artifact phải ở trong evidence root, qua scanner trước manifest; chặn traversal, path tuyệt đối/UNC/URI, symlink/junction escape và Windows case collision.
- Không tuyên bố SHA-256 là chữ ký số/immutable attestation.

## Limitation đã biết

- Dynamic WPR egress/auto-update: `UNKNOWN / DEFERRED_M0_LIMITATION`.
- `wpr -start Network -filemode` đã fail `0xc5585011`; WPR vẫn stopped, không có ETL.
- Không retry WPR, elevation, đổi policy/system setting hay cài tool mới. Chỉ chạy lại trước external pilot/public release, hoặc khi measurement stack cuối cùng yêu cầu WPR.
- Static inspection `tools/m0` chỉ là evidence của source set hiện tại, không chứng minh WPR/Windows/tool hệ thống không egress.
- File-symlink integration manifest có thể `SKIP (EPERM)`; phải chạy lại trước benchmark chính thức.

## Khi phải dừng để hỏi owner

- Cần administrator, toolchain global, cài dependency/tool mới hoặc đổi system/network setting.
- Cần camera thật, signing/Store/public release, network upload, hoặc chọn Electron/Tauri.
- Safety/privacy/data contract mâu thuẫn; có raw-data/secret finding; hoặc có thay đổi Git không rõ nguồn gốc.
- M0 hoàn thành và cần project owner review/decision.

## Command M0 đã tồn tại

```text
node tools/m0/validate-evidence-schema.mjs tools/m0/fixtures/valid-run.jsonl
node tools/m0/run-fixture-tests.mjs
node tools/m0/scan-evidence-artifact.mjs run-record tools/m0/fixtures/safe-artifact.json
node tools/m0/run-scanner-fixture-tests.mjs
node tools/m0/generate-evidence-manifest.mjs generate <evidence-root> lists/manifest-input.json manifests/m0-manifest.json
node tools/m0/generate-evidence-manifest.mjs verify <evidence-root> manifests/m0-manifest.json --strict
node tools/m0/run-manifest-fixture-tests.mjs
node tools/m0/initialize-run-directory.mjs init <evidence-root> '<metadata-json>' --dry-run
node tools/m0/run-initializer-fixture-tests.mjs
node tools/m0/collect-measurement-tool-inventory.mjs collect <evidence-root> artifacts/measurement-tool-inventory.json
node tools/m0/run-tool-inventory-fixture-tests.mjs
node tools/m0/run-measurement-control-dry-run-fixture-tests.mjs
node tools/m0/run-tool-egress-gate-fixture-tests.mjs
node tools/m0/run-static-egress-inspection-fixture-tests.mjs
node tools/m0/inspect-static-egress.mjs
node tools/m0/run-tool-output-admission-fixture-tests.mjs
```

Không bịa command build/app/camera/MSIX khi chưa có trong repository. Dùng `tools/m0/README.md` và `tasks.md` để xác minh command hiện hành.

## Checkpoint và Definition of Done M0

- Checkpoint ngắn trong `PROJECT_STATUS.md`: task/state, base commit, diff, command đã chạy/kết quả, limitation, next exact action/command.
- Trước commit: status, diff/stat/check, relevant positive/negative/regression tests và review file thay đổi. Stage đúng file task; không `git add .`.
- M0 chỉ DONE khi pipeline `initialize → validate → scan → manifest → verify` có evidence; measurement tooling/overhead có kiểm chứng; hai candidate có POC tương đương hoặc blocker có evidence; comparison/provenance hợp lệ; ADR-003 có recommendation dựa evidence; V1 sạch; limitation/UNKNOWN được ghi rõ.
