# VietFuture 2026 completion audit

Ngày audit: 2026-07-15

Nguồn objective: `goal-objective.md` từ Codex attachment

Worktree base: `26c30d3` với diff Wellness, Living Aurora và Clarity Grid chưa commit được bảo toàn

Trạng thái: `ENGINEERING_IMPLEMENTATION_COMPLETE_WITH_EXTERNAL_GATES`

## Kết luận

Completion prompt không thể được thực thi nguyên văn trên repository hiện tại. Owner đã giải quyết Task 1 bằng quyết định `EYEMATE_WELLNESS_QUESTIONNAIRE`; các task camera/egress/build vẫn phải theo kiến trúc và gate thật thay vì snippet giả định trong prompt.

Task 1 đã được triển khai và kiểm chứng độc lập. Task 2A đã được triển khai theo D-009 `RATIO_ZONE_FAIL_CLOSED` do Validation Owner phê duyệt ngày 2026-07-15; không áp kiến trúc centimet/K=8500 của prompt.

## Requirement audit

| Hạng mục | Trạng thái hiện tại | Bằng chứng authoritative | Kết luận |
|---|---|---|---|
| Task 1 - questionnaire decision | `IMPLEMENTED_VERIFIED` | `docs/product/questionnaire-decision-d004.md`; Owner approval 2026-07-15 | Chọn questionnaire riêng của EyeMate; không triển khai DEQ-5/OSDI hoặc clinical severity |
| EyeMate Symptom Check | `IMPLEMENTED_VERIFIED_UNCOMMITTED` | `src/symptom-checkup/wellness-check.ts`; 73 unit; 18 integration; UI/M1/M3 acceptance; pilot fixtures | Đúng 5 câu, thang 0–3, tổng 0–15, ba nhóm hành động, disclaimer đầu/cuối, `UNKNOWN` → `INSUFFICIENT_DATA` |
| Task 2A - constant 30/45/70 | `NOT_APPLICABLE_TO_CURRENT_PIPELINE` | `src/camera/measurement-window.ts`, `src/distance/distance-zone.ts`, `docs/product/distance-decision-d009.md` | V2 không có `distance_cm = 8500 / iodPx`, `DistanceEstimator` hoặc các magic number nêu trong prompt; pipeline dùng personalized inter-eye ratio và zone |
| Task 2A - head pose | `IMPLEMENTED_FAIL_CLOSED` | `src/renderer/camera-runtime.ts`, `qualityReason`, `docs/product/distance-decision-d009.md` | Pose không đạt tiếp tục abstain `POSE_UNSTABLE`; D-009 không phê duyệt yaw correction hoặc numeric centimet |
| Task 2A - median/filter/dwell | `IMPLEMENTED_VERIFIED` | `src/distance/ratio-zone-filter.ts`, `src/distance/distance-zone.ts`, `src/camera/measurement-window.ts`; 80 unit; 18 integration; camera runtime/harness | Rolling median, outlier rejection, ratio hysteresis, UNKNOWN reconfirmation và ba-readings/ba-aggregate dwell đã được triển khai có version; accuracy vẫn `UNKNOWN` |
| Task 3 - egress 0xc5585011 | `FALSE_PREMISE` | `tools/pilot/observe-tcp-egress.mjs`, `.pilot/egress/tcp-observation.json`, AGENTS limitation | Không có localhost server gây lỗi. WPR failure là host-policy/tooling limitation; prompt bind `127.0.0.1` không sửa được. Dynamic egress vẫn `UNKNOWN`, không được claim PASS |
| Task 2B - Settings calibration | `ENGINEERING_COMPLETE_WITH_EXTERNAL_CAMERA_GATE` | `src/camera/calibration-service.ts`, Settings flow trong `src/renderer/app.ts`, SQLite schema 12, preload/IPC, 84 unit, 19 integration, UI acceptance | Flow 3 bước thu 5 giây, median/variance/CV/confidence, encrypted device-bound persistence và reset độc lập đã có. Không lưu raw samples hoặc claim numeric distance. Real webcam command trả `CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE`, nên hardware E2E/accuracy vẫn `UNKNOWN` |
| Task 2C - DevPanel | `IMPLEMENTED_VERIFIED` | `src/renderer/dev-panel.ts`, `src/camera/dev-overrides.ts`, main runtime gate, `acceptance:dev-panel` | Ctrl+Shift+D, session-only override/reset, force distance/EAR/blink, RAM-only landmark overlay và raw metrics đã có. Chỉ unpackaged + explicit flag; production default false. Debug export bị tắt theo privacy boundary |
| Task 4A - font | `IMPLEMENTED_WITH_SAFE_ALTERNATIVE` | Clarity Home CSS | Dùng font local Windows; không thêm Google Fonts vì runtime CDN bị cấm bởi objective và repository invariant |
| Task 4B - chart | `IMPLEMENTED_FOR_AVAILABLE_DATA` | semantic evidence chart trên production Home | Có SVG axis, tooltip, keyboard focus, available/missing. Không tạo blink trend/baseline/delta vì chưa có history camera hợp lệ |
| Task 4C - circular timer | `IMPLEMENTED_VERIFIED` | Home session ring và Work Companion active SVG timer; `acceptance:ui`, `acceptance:clarity-production` | Timer active có preset 25 phút, progress, role/label semantic và reduced-motion representation; controls/lifecycle được giữ nguyên |
| Task 4D - disclaimer | `IMPLEMENTED_FOR_CHECKUP` | Checkup step 1 và result; persisted/export report | Disclaimer bắt buộc xuất hiện đầu/cuối flow và trong export; không hợp thức hóa clinical claim |
| Task 5 - unsigned MSIX | `IMPLEMENTED_VERIFIED_UNSIGNED_WITH_EXTERNAL_INSTALL_GATE` | `.m1/msix/eyemate-m1.msix`; `build:demo`; manifest stage; Authenticode + SHA-256 inspection | MakeAppx artifact mới có 155.228.494 byte, SHA-256 `0EB0DFCE586365F201027A65A0B549A76F627B4970E9E858E8A87B8AA2FA37BB`, resources `vi-vn`/`en-us`, status `NotSigned`. Chưa có clean-machine install/Unknown Publisher evidence |
| Task 5 - NSIS backup trong snippet objective | `NOT_IMPLEMENTED` | `package.json`, executable discovery trên host | Repository không có `electron-builder`, `makensis.exe` hoặc NSIS pipeline. Không thêm dependency/network tool chỉ để mô phỏng backup installer; deliverable được owner gọi tên và phê duyệt là unsigned MSIX |
| Demo E2E | `AUTOMATED_PASS_WITH_HARDWARE_LIMITATION` | canonical `npm run verify`; `acceptance:ui`; M1/M2/M3 Electron smoke | Automated production flow và domain suites pass. Real-camera segment chưa thể được gọi là full hardware E2E vì quality gate không đạt |
| DevPanel E2E | `IMPLEMENTED_VERIFIED` | `npm run acceptance:dev-panel` | Shortcut, session-only reset, production default false, RAM-only overlay/raw metrics và no debug export đều pass |
| Real webcam calibration E2E | `EXTERNAL/HARDWARE_GATE` | `npm run camera:measure:pilot` ngày 2026-07-15 trả `CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE`; accuracy `UNKNOWN` | Cần webcam/lighting/pose đạt quality gate và operator protocol; automated core/storage/UI checks không thay thế hardware evidence |

## Invariant phải giữ khi tiếp tục

- Không đưa bộ câu 0-3/tổng 15 ra UI dưới tên DEQ-5.
- Không thêm clinical severity, diagnosis, treatment recommendation hoặc lời bảo đảm.
- Không hiển thị centimet chính xác trước validation gate; zone/UNKNOWN là output an toàn.
- Không đổi `UNKNOWN`, `NOT_MEASURED`, `INSUFFICIENT_DATA` thành 0/normal.
- Không thêm Google Fonts/CDN/network runtime.
- Không sửa WPR host policy hoặc tuyên bố no-egress từ TCP-only observation.
- DevPanel phải bị loại khỏi production build và không export/log raw user data.
- Không sửa hoặc sao chép code từ `F:\dry-eye-app`.

## Quy trình cài artifact unsigned trên máy sạch

- [Microsoft Learn — Create an unsigned MSIX package](https://learn.microsoft.com/windows/msix/package/unsigned-package) xác nhận Windows 11 hỗ trợ cài package unsigned bằng `Add-AppxPackage -AllowUnsigned`; vì EyeMate chứa executable, operator nên mở PowerShell với quyền Administrator.
- Từ thư mục artifact/repository, chạy `powershell -NoProfile -ExecutionPolicy Bypass -File tools/m1/install-unsigned-demo-msix.ps1 -PackagePath <đường-dẫn-msix>`. Script tự chặn Windows build trước 22000 và package không ở trạng thái `NotSigned`.
- `npm run install:demo:unsigned` chỉ là shortcut khi đang ở repository; máy sạch không cần Node.js nếu gọi trực tiếp file PowerShell.
- Không dùng tiêu chí “More info > Run anyway” cho MSIX. Đây là kỳ vọng SmartScreen của executable installer và không chứng minh cài MSIX unsigned. Theo Microsoft Learn, sideload phổ biến vẫn nên dùng package ký/self-signed có trust step; Task 5 hiện cố ý giữ artifact unsigned theo approval.
- Host hiện tại không có `WindowsSandbox.exe`/`vmconnect.exe`; truy vấn Windows Sandbox feature yêu cầu elevation. Vì vậy clean-machine install vẫn là external evidence, không được đánh dấu PASS từ staged smoke.

## Quyết định owner đã cung cấp

Ngày 2026-07-15, Owner phê duyệt:

- `APPROVE EYEMATE WELLNESS QUESTIONNAIRE`
- Decision: `EYEMATE_WELLNESS_QUESTIONNAIRE`
- Không dẫn nguồn DEQ-5/OSDI, không claim validated clinical tool và không dùng severity label lâm sàng.

Task 1 và Task 2A không còn blocker implementation. Task 3 có premise sai: `0xc5585011` là WPR host-policy limitation, không phải localhost bind bug; dynamic egress vẫn phải giữ `UNKNOWN`.
