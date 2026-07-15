# EyeMate V2 — Handoff

## Mục tiêu checkpoint

Checkpoint trên `main` bảo toàn trạng thái demo VietFuture ngày 2026-07-15 theo owner approval trực tiếp. Backup nền trước commit là `backup/pre-main-handoff-20260715-1838`. Đây là engineering handoff, không phải public release, clinical tool hoặc approval dùng dữ liệu participant.

## Kiến trúc

Electron modular monolith với typed preload/IPC. Main sở hữu SQLite và use-case adapters; renderer không gọi SQLite/MediaPipe trực tiếp; domain không import Electron/DOM. `contextIsolation` bật, `nodeIntegration` tắt. Dữ liệu local-only; raw frame/video/landmark/per-frame series không persistence/log/export.

Module chính: `symptom-checkup`, `camera`, `distance`, `measurement-quality`, `work-companion`, `personal-intelligence`, `reports`, `user-data`, `platform-electron`, `renderer`.

## UI và luồng demo

- Production: Clarity Grid, startup `#/home`, top navigation bảy destination.
- Design Lab: `#/design-lab/living-aurora` và `#/design-lab/taste-direction`; dev/reference only, demo controls không gọi production IPC.
- Flow automated: Home → EyeMate Symptom Check → camera optional/skip → result → Work Companion start/pause/nudge/end → Summary → Reports → Privacy export preview/delete hai bước.
- DevPanel: `npm run dev`, `Ctrl+Shift+D`; chỉ unpackaged, close reset overrides, production default false.

## Camera và calibration

D-009 phê duyệt ratio-zone fail-closed, không estimator centimet/K=8500. Calibration Settings thu IOD samples 5 giây trong RAM, lưu aggregate encrypted và device binding. `HIGH/MEDIUM/LOW` là stability confidence kỹ thuật, không sức khỏe. Real-camera measurement hiện `CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE`; không hạ threshold để demo.

## Test matrix tại checkpoint

| Suite | Trạng thái |
|---|---|
| TypeScript typecheck | PASS |
| Architecture/privacy/accessibility | PASS |
| Unit/integration | PASS (87/87; 19/19 tại checkpoint gần nhất) |
| M1/M2/M3 Electron smoke | PASS |
| Production UI E2E | PASS |
| Clarity production | PASS |
| Living Aurora/Taste Design Labs | PASS |
| DevPanel | PASS |
| Real-camera full measurement | ENVIRONMENT BLOCKED — quality not acceptable |
| Dynamic WPR egress | KNOWN FAILURE/UNKNOWN — host `0xc5585011` |
| Clean-machine MSIX install | NOT RUN — external Windows 11 machine/VM required |

## Known issues và quyết định mở

- Clean-machine unsigned MSIX installation evidence còn thiếu; dùng PowerShell `-AllowUnsigned`, không dùng kỳ vọng SmartScreen EXE.
- NSIS backup không tồn tại; repository không có electron-builder/makensis.
- Dynamic TCP/UDP/DNS egress evidence và signing/public distribution là external gates.
- Camera ground truth/accuracy chưa approved; output an toàn là zone/UNKNOWN.
- Mascot production là open visual decision; Living Aurora Lumi chỉ placeholder.
- Taste dark Afterimage direction đã superseded; giữ lại làm audit trail.
- Worktree checkpoint gom integration seams trong commit WIP có tên rõ nếu không thể tách hunk mà vẫn build.

## Developer tiếp theo

1. Đọc `AGENTS.md`, `PROJECT_STATUS.md`, file này và `CURRENT_WORKTREE_INVENTORY.md`.
2. Chạy `npm ci`, `npm run verify`, rồi các acceptance UI riêng.
3. Không dùng V1 để suy ra behavior; `F:\dry-eye-app` chỉ đọc.
4. Không đổi UNKNOWN/missing thành bình thường/0; không thêm clinical claim.
5. Với camera thật, dùng operator protocol và ghi result fail-closed. Không lưu raw evidence.
6. Khi sửa shared integration seam, cập nhật Functional Preservation Matrix và chạy toàn bộ UI acceptance.

## Build và artifact

`npm run build:demo` tạo unsigned MSIX ở `.m1/msix/` (ignored). `tools/m1/install-unsigned-demo-msix.ps1` hỗ trợ test trên Windows 11 sạch; việc chạy script là external install action và không được coi PASS nếu chưa có evidence từ máy đó.
