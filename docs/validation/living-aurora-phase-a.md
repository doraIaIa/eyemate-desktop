# Living Aurora — Phase A audit và Visual Gate

Ngày: 2026-07-14  
Trạng thái: `PROPOSED / VISUAL_GATE_A`  
Phạm vi: reference screen và audit; chưa rollout UI production.

## Baseline và ranh giới

- Renderer: TypeScript DOM thuần, entrypoint `src/renderer/index.html` → `src/renderer/app.ts`; CSS tại `src/renderer/styles.css`.
- Router: hash route nội bộ; main/preload IPC typed, `contextIsolation: true`, `nodeIntegration: false`.
- Baseline screenshots đang có tại `docs/validation/ui-screenshots/`; viewport mục tiêu của Electron là 1100×760.
- Có diff chưa commit của Wellness Check v1 trước Phase A. Diff này được bảo toàn, không reset/stash/commit trong Gate A.
- Design Lab `#/design-lab/living-aurora` chỉ dùng demo data trong renderer; không gọi IPC, camera, database hoặc network.

## UI Capability Inventory

| Route/screen | Chức năng và control | Handler/use case thật | Data/state | Test hiện có | Vị trí Living Aurora |
|---|---|---|---|---|---|
| Home | Quick actions, metric, trạng thái consent/session | Hash routes; `getRuntimeInfo`, reports, sessions, privacy | `NOT_MEASURED`, missing/empty | `UI_HOME_*` | Hôm nay, hero + bento |
| Checkup | Consent, questionnaire, Safety Gate, camera fallback/calibration, result | onboarding/checkup IPC; local camera runtime | denied, busy, unavailable, low-quality, insufficient | `UI_CHECKUP_*`, camera suites | Khám mắt, guided journey |
| Companion | Start/pause/resume/end/cancel, nudge response | `work-session:*` | active, paused, recovery, quiet | `UI_SESSION_*`, `UI_NUDGE_*` | Đồng hành, focus canvas |
| Intelligence | Baseline, VLI, reset | `m3:*` | ready/stale/unknown/missing | `UI_INTELLIGENCE_*` | Thấu hiểu, evidence story |
| Reports | Tabs, preview/export/delete | reports + `m3:*` | empty/history/error | `UI_REPORT_*` | Báo cáo, narrative timeline |
| Privacy | Consent withdrawal, inventory, preview/export, delete 2 bước | privacy + data inventory IPC | local-only, partial/delete result | `UI_DATA_*`, `UI_DELETE_*` | Privacy Center, utility entry |
| Settings | Preferences, quiet hours, reduced motion | `settings:*` | saved/error/disabled policy | `UI_SETTINGS_*` | Cài đặt, utility entry |
| Global | modal, toast, loading/error/retry, titlebar | renderer local state | timeout/recoverable | UI acceptance | shared primitives |

Classification: controls above là `WIRED` khi được nêu IPC/use case; camera companion modes là `DISABLED_BY_POLICY`; không có `PLACEHOLDER` nào được đưa vào Design Lab. Các route/control hiện hữu không bị xóa trong Phase A.

## Navigation Migration Matrix

| Hiện tại | Living Aurora | Quy tắc |
|---|---|---|
| Tổng quan | Hôm nay | Primary top navigation |
| Khám mắt | Khám mắt | Primary top navigation |
| Đồng hành | Đồng hành | Primary top navigation |
| Thấu hiểu | Thấu hiểu | Primary top navigation |
| Báo cáo | Báo cáo | Primary/secondary navigation rõ ràng |
| Quyền riêng tư | Privacy Center | Utility shield/local-only entry + route thật |
| Cài đặt | Cài đặt | Persistent utility entry + route thật |
| `#/design-lab/living-aurora` | Design Lab | Dev-only visual reference, không nằm trong navigation production |

## Reference implementation

- Semantic color và motion token đề xuất nằm trong stylesheet, chưa thay token production hiện hữu.
- Lumi là SVG local prototype `ART_PLACEHOLDER`; state switcher: `IDLE`, `WELCOME`, `FOCUS`, `BREAK_SUGGESTED`, `CAMERA_OFF`, `PRIVACY`, `NO_DATA`, `ERROR_NEUTRAL`.
- Micro-interaction: nav hover/press, CTA state update, state switcher, bento lift, ambient aurora, mascot blink/float.
- Reduced motion switcher tắt aurora drift, mascot loop và transform transition trong lab. `prefers-reduced-motion` cũng tắt animation.
- Không thêm dependency, font remote, CDN, asset remote, raw camera data hoặc medical claim.

## Gate A limitations

- Đây là visual reference, chưa áp dụng Floating Top Navigation cho app production và chưa thay sidebar hiện hữu.
- Lumi là artwork prototype local, chưa phải asset production-ready.
- Chưa đo performance before/after vì production shell chưa đổi; chỉ xác minh Design Lab không gọi IPC/camera/DB.
- Không rollout route production trước khi owner gửi đúng approval phrase.

## Phase A.1 — approved changes to reference only

- `#/design-lab/living-aurora` bây giờ bypass sidebar và page wrapper production bằng class route-scoped `design-lab-active`; viewport chỉ còn Electron titlebar → Aurora top navigation → Aurora content. Sidebar production không bị sửa hoặc xóa.
- Top navigation reference có đủ Hôm nay, Khám mắt, Đồng hành, Thấu hiểu, Báo cáo; utility controls Local Only/Privacy và Cài đặt đều là button demo, đổi preview state mà không điều hướng sang route production.
- `25:00` được ghi rõ là preset/thời lượng dự kiến, không phải timer đang chạy. “Tải nhìn” đổi thành “Tải thị giác”. CTA thứ hai mô tả rõ preview privacy.
- Lumi `ART_PLACEHOLDER` có pose/face/accessory/glow khác nhau cho `IDLE`, `WELCOME`, `FOCUS`, `BREAK_SUGGESTED`, `CAMERA_OFF`, `PRIVACY`, `NO_DATA`, `ERROR_NEUTRAL`. Reduced motion tắt animation nhưng giữ dấu hiệu hình/text cho state.
- Evidence: `living-aurora-reference-1100x760.png`, `living-aurora-reference-1280x800.png`, `living-aurora-idle-1100x760.png`, `living-aurora-break_suggested-1100x760.png`, `living-aurora-privacy-1100x760.png`, `living-aurora-reduced-motion-1100x760.png`.
- Verification: `npm run typecheck` PASS; `npm run acceptance:living-aurora` PASS; static function-boundary scan PASS (không có `window.eyeMate`, `cameraRuntime` hoặc `fetch` trong `renderDesignLab`); `git diff --check` PASS.
- Trạng thái tại Phase A.1: suite từng dừng ở `UI_WELLNESS_COPY_INVALID`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật copy/flow và `acceptance:ui` hiện PASS.
