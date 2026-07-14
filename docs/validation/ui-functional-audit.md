# Audit renderer và control — UI/UX integration

Ngày audit: 2026-07-14  
Baseline: `fcaeaca`

## Kiến trúc hiện tại

- Framework: TypeScript + DOM thuần trong Electron; không có UI framework.
- Entrypoint: `src/renderer/index.html` → `src/renderer/app.ts`.
- Điều hướng: `src/app-shell/navigation.ts`; các nút chỉ thay tiêu đề/nội dung, không cập nhật URL và không tách view.
- Stylesheet/design system: CSS inline trong `index.html`, màu hardcode, chưa có token/theme.
- IPC: renderer chỉ đi qua typed preload. `contextIsolation` bật, `nodeIntegration` tắt.

## Ma trận route, control và trạng thái

| Khu vực/control | Trạng thái baseline | Handler/use case thật | Kết luận tích hợp |
|---|---:|---|---|
| Sidebar: Home/Checkup/Reports/Privacy/Settings | 🟡 | Chỉ gọi `renderScreen`, không có router | Thay bằng hash route độc lập |
| Home metrics/orb/quick actions | 🔴 | Chưa có | Dùng aggregate đã lưu; camera-off hiển thị `—` |
| Onboarding không camera | 🟢 | `onboarding:complete-without-camera` | Giữ trong wizard |
| Survey response + Safety Gate | 🟢 | `checkup:run-survey-only` | Giữ contract survey-only hiện có |
| OSDI 12 mục/camera calibration/đo 30 giây | ⚫ | Không có nội dung được cấp quyền hoặc phê duyệt clinical | Không giả lập clinical; adapter kỹ thuật vẫn tắt |
| Session start/pause/resume/finish/cancel | 🟢 | `work-session:*` | Tách thành Work Companion route |
| Mode camera | 🔴 | Domain chỉ có timer policy; không có capture | Disabled có giải thích; Timer Only là mode khả dụng |
| Nudge request/accept/snooze/dismiss | 🟢 | `work-session:request-break-nudge`, `respond-nudge` | Hiển thị tuần tự, dismiss sau action |
| Survey/session history | 🟢 | `reports:list-survey-only`, `work-session:list-summaries` | Đưa vào Reports/History |
| Generate/list M3 report | 🟢 | `m3:generate-report`, `m3:list-reports` | Dùng cho Personal Intelligence |
| Professional Summary preview | 🟢 | `m3:preview-professional-summary` | Modal preview |
| Export M3 | 🟡 | IPC thật nhưng UI yêu cầu nhập full path | Thay bằng native save dialog, không lộ path hệ thống |
| Reset baseline/delete M3 category | 🟢 | `m3:reset-baseline`, `m3:delete-category` | Confirm dialog rõ ràng |
| Rút consent camera | 🟢 | `privacy:withdraw-camera-consent` | Giữ ở Privacy |
| Xóa toàn bộ dữ liệu | 🟡 | IPC thật, chỉ một confirm hệ thống | Thay bằng confirm hai bước |
| Settings | 🔴 | Chưa có control/handler | Chỉ lưu preference UI local; capability chưa có bị disabled |
| Loading/error/empty/timeout | 🟡 | Có text ban đầu, chưa có timeout/retry/skeleton | Tạo component state dùng chung |

## Phát hiện chính

- Tất cả module đang cùng tồn tại trong một `<main>` nên route giả và content bị dồn trên một trang.
- Không có loading nào bị treo do handler hiện tại, nhưng mọi IPC đều thiếu timeout/retry và lỗi có thể trở thành promise rejection không xử lý.
- Camera runtime, raw EAR/distance, OSDI 12 mục, PDF và 30-day analytics chưa có contract thật. Không được đánh dấu PASS hay tạo dữ liệu giả.
- Export path hiện phơi bày đường dẫn đầy đủ trong renderer; cần native dialog ở main process.
- Dynamic egress vẫn `UNKNOWN`; Privacy UI không được tuyên bố đã chứng minh “không có kết nối”.

Quy tắc hoàn thiện: mỗi control sau tích hợp phải là wired qua use case thật, disabled có tooltip/lý do, hoặc hidden.

## Re-audit theo Product Completion objective

| Phạm vi | Kết quả sau tích hợp | Bằng chứng |
|---|---|---|
| Home | 🟢 Phiên gần nhất, trạng thái consent và missing-data guidance đã nối dữ liệu cục bộ | UI acceptance + ảnh 1024/1280 |
| Checkup | 🟢 Survey-only đi hết wizard, cancel rõ ràng và chống double-submit | `UI_CHECKUP_*` |
| Work Companion | 🟢 Start/pause/resume/finish/cancel/recovery và ba phản hồi nudge chạy qua IPC | `UI_SESSION_*`, `UI_NUDGE_*` |
| Personal Intelligence | 🟢 Có route riêng, baseline/VLI/pattern/missing evidence và reset | `UI_INTELLIGENCE_*`, `UI_BASELINE_RESET_*` |
| Reports | 🟢 Bốn tab, preview Markdown/JSON, export native dialog và xóa snapshot; preview không tạo record ẩn | `UI_REPORT_*`, `UI_WEEK_TAB_*`, `UI_MONTH_TAB_*` |
| Privacy | 🟢 Consent, inventory thật, preview/export, reset và xóa hai bước | `UI_DATA_INVENTORY_*`, `UI_DELETE_*` |
| Settings | 🟢 SQLite/IPC persistence, quiet-hours nối nudge policy, reduced motion và âm báo local | `UI_SETTINGS_*`, `UI_QUIET_HOURS_*` |
| Async state | 🟢 Route/mutation có timeout, retry, disable-on-submit; native save dialog không bị timeout giả | unit `async-operation` + UI acceptance |
| Acceptance | 🟢 Navigation, Back/Forward/reload, controls và restart persistence được click qua Electron thật | `npm run acceptance:ui` |

## Final feature completion re-audit

- Camera checkup đã wired qua consent → local media permission → device → quality → calibration → measurement aggregate; survey-only vẫn là fallback. Camera mode Work Companion tiếp tục disabled vì chưa có ground-truth accuracy.
- PDF đã wired qua preview, native Save dialog, Electron `printToPDF` local và atomic writer; Markdown/JSON không regression.
- Sensitive payload encryption hoạt động dưới storage adapter; UI chỉ nói implementation đã có và vẫn chờ Security/Privacy approval.
- Questionnaire synthetic dùng registry/adapter versioned; adapter OSDI 12 mục vẫn disabled, không có câu hỏi/bản dịch hoặc placeholder giả approved.
- Mọi route/control còn lại tiếp tục PASS qua `npm run acceptance:ui`; control chưa đủ external evidence được disabled kèm lý do thay vì handler rỗng.
- Dynamic egress vẫn `UNKNOWN`; Privacy UI không tuyên bố no-egress.
