# Personal Home Visual Fidelity Review

Ngày review: 2026-07-18

## Phạm vi

Review này áp dụng cho màn **Hôm nay** và chế độ dữ liệu mẫu của personal desktop app. Enterprise Demo vẫn là track riêng và không bị thay đổi trong batch này.

## Visual Completeness Matrix

| Screen | Required visual element | Reference source | Implementation component | Asset | State | Validation method |
| --- | --- | --- | --- | --- | --- | --- |
| Hôm nay | EyeMate brand mark và wordmark | personal-app-brand-reference | `src/renderer/index.html` shell | inline brand mark hiện hữu | Done | Screenshot Home |
| Hôm nay | Navigation icons cho 7 route | visual fidelity constraint | `.primary-nav .nav-icon` | inline SVG nội bộ | Done | Screenshot Home, route count validation |
| Hôm nay | Hero mountain/sun artwork | personal-app-brand-reference | `productionHomeArtwork()` | inline SVG nội bộ | Done | Screenshot Home |
| Hôm nay | Overview score ring | personal-app-brand-reference | `.home-score-ring` | CSS/SVG nội bộ | Done | `acceptance:clarity-production` |
| Hôm nay | Trend micro-chart | personal-app-brand-reference | `homeTrendSparkline()` | SVG nội bộ | Done | Screenshot Home |
| Hôm nay | Companion meditation illustration | `companion-meditation-card.png` | `homeMeditationIllustration()` | `src/renderer/assets/illustrations/companion-meditation-card.png` | Done | Screenshot Home |
| Hôm nay | Companion CTA + play icon + settings control | visual fidelity constraint | `.home-companion-actions` | inline SVG nội bộ | Done | Screenshot Home |
| Hôm nay | Blink/distance micro bars | personal-app-brand-reference | `premiumMetricCard()` | CSS bars | Done | Screenshot Home |
| Hôm nay | VLI annotation | existing acceptance | `.home-vli-note` | text annotation | Done | `acceptance:clarity-production` |
| Hôm nay | Chú thích màu biểu đồ 7 ngày | owner review screenshot | `homeEvidenceLegend()` | CSS legend | Done | `CLARITY_PRODUCTION_PREMIUM_HOME_FIT_INVALID` guard |
| Hôm nay | Responsive fit cho card next-action | owner review screenshot | `.clarity-next-panel` grid areas | CSS grid | Done | Clock/title overlap guard |
| Hôm nay | Work metrics từ aggregate thật | owner review note | `StoredSessionSummaryListItem` + `homeWorkMetrics()` | IPC scrubbed aggregate | Done | `npm.cmd run typecheck`, preload validator |

## Asset Inventory

| Source file | Destination path | Type | Usage | Decorative/informative | Alt-text |
| --- | --- | --- | --- | --- | --- |
| `C:\Users\ADMIN\AppData\Local\Temp\codex-clipboard-1841c871-e530-4c85-b227-74f9f3dde7bf.png` | `src/renderer/assets/illustrations/companion-meditation-card.png` | PNG | Companion card illustration | Decorative, supports visual mood | Empty alt, hidden from assistive tech |

## Discrepancy Report

| Element | Expected | Actual | Severity | Fix |
| --- | --- | --- | --- | --- |
| Companion illustration | Use owner-provided meditation asset, not recreated SVG/CSS | PNG is imported, copied by build, and visible in Home screenshot | Resolved | None |
| Navigation | Icons before labels | Inline SVG icons added for all 7 personal routes | Resolved | None |
| Hero type | Sans bold headline like reference | Override added to remove legacy Palatino italic | Resolved | None |
| Home screenshot evidence | Fresh Electron screenshot | `docs/validation/ui-screenshots/clarity-production-home-1280x800.png` updated | Resolved | None |
| Chart legend | Color labels absent/ambiguous | Added explicit legend: nghỉ mắt đã phản hồi, phút phiên, số phiên | Resolved | Acceptance now checks exact legend text |
| Window resize | 1120px breakpoint reused older grid and could make trend/action areas look clipped | Breakpoints now keep defined grid areas and reset screenshot scroll before capture | Resolved | Acceptance checks no horizontal overflow and no next-action clock/title overlap |
| Work metrics | Home mixed all-time count and placeholder-like break assumptions | Home now derives 7-day visible metrics from completed session summaries and displays honest unknown states | Resolved with limitation | App still does not measure OS-level screen time; label uses "Thời gian phiên" instead |
| Session count | Summary cũ thiếu duration vẫn làm số phiên tăng lên 65 | Chỉ summary `COMPLETED` có duration dương mới được tính là phiên hợp lệ; phần còn thiếu được ghi rõ | Resolved | `buildWorkRhythm()` và `homeWorkMetrics()` dùng cùng quy tắc |
| Habit days | UI tô N ngày đầu tuần thay vì đúng ngày có dữ liệu | Từng ngày đọc trực tiếp từ `WorkRhythmSummary.days` | Resolved | Demo và dữ liệu thật dùng cùng renderer |
| Home trend | Đường xu hướng cố định, không liên hệ dữ liệu hiển thị | Biểu đồ đọc phút phiên theo từng ngày và scale theo giá trị lớn nhất | Resolved | Missing giữ ở 0, không tạo đường giả |
| Personal demo | Chưa có dữ liệu đẹp nhưng tách biệt để chụp báo cáo | Có `SYNTHETIC_DEMO`, profile riêng, banner/badge rõ, Home/Thấu hiểu/Báo cáo nhất quán | Resolved | `npm.cmd run dev:personal-demo` |
| Demo report | Biểu đồ một điểm, nhiều khoảng trắng | Có xu hướng 7 ngày, tab 30 ngày, checkup aggregate và coverage synthetic | Resolved | Export/delete bị khóa trong demo |
| Enterprise Demo remake | Separate dark B2B dashboard redesign | Not started in this batch because prompt pre-flight expects clean tree | Owner decision | Run as separate clean-track task after Home review |

## Data Display Decisions

- Renderer receives `StoredSessionSummaryListItem`, not raw `summaryJson`.
- Main process parses encrypted/decrypted session summary locally and exposes only `interventionCount` and `acceptedBreakCount` aggregates needed for Home.
- Home "Thời gian phiên" uses completed local session duration in the current 7-day window. It intentionally does not claim OS screen time because EyeMate does not yet have a screen-time collector.
- Home "Số lần nghỉ mắt" counts accepted/auto-corrected break responses when available. If a summary has nudges but no accepted break response, UI shows "Chưa rõ" rather than inventing a number.
- The 7-day evidence chart uses zero-height bars for missing days instead of minimum fake bars.
- `Điểm nhịp chăm sóc mắt` chỉ hiển thị khi VLI có ít nhất 60% thành phần; điểm được đảo chiều từ visual-load index để số cao biểu thị tải thấp hơn. Độ phủ đơn thuần không còn tự tạo điểm đẹp.
- Personal Demo dùng snapshot trong renderer và profile Electron `.tmp/personal-demo-user-data` riêng. Nó không trộn với profile local thật.
- Các action cập nhật baseline/report và export/delete bị khóa ở các màn demo dùng số liệu synthetic.

## Validation

- `npm.cmd run typecheck`: PASS
- `npm.cmd run acceptance:clarity-production`: PASS
- `npm.cmd run test:personal-demo`: PASS
- `npm.cmd run unit`: PASS, 116 tests
- `npm.cmd run privacy`: PASS
- `git diff --check`: PASS

Additional guards added:

- `home-evidence-legend` must expose three color labels.
- Home stat label must be `Thời gian phiên`.
- Home route must not create horizontal overflow.
- Next-action clock must not overlap the title.

Screenshot evidence:

- `docs/validation/ui-screenshots/clarity-production-home-1280x800.png`
- `docs/validation/ui-screenshots/clarity-production-home-1100x760.png`

Không thêm dependency, backend, network, authentication hoặc enterprise production implementation. Personal Demo chỉ thêm profile local cô lập và snapshot synthetic trong bộ nhớ renderer.
