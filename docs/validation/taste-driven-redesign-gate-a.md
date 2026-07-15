# Taste-driven redesign: Visual Gate A

> **SUPERSEDED 2026-07-15:** Owner không duyệt visual direction tối màu “Nhật Ký Dư Ảnh”. Reference hiện hành tại cùng dev-only route là `Clarity Grid`; xem `docs/validation/clarity-grid-reference.md`. Nội dung bên dưới được giữ làm audit trail, không phải direction đang chờ duyệt.

Ngày dựng reference: 2026-07-15
Task base commit: `26c30d3`
Direction: **Nhật Ký Dư Ảnh**
Trạng thái: `WAITING_FOR_VISUAL_GATE_A_APPROVAL`
Phạm vi: Design Lab dev-only tại `#/design-lab/taste-direction`; chưa rollout production.

## Kết quả

- Design Lab chiếm toàn viewport bên dưới Electron titlebar và không có production sidebar.
- Top navigation có đủ `Hôm nay`, `Khám mắt`, `Đồng hành`, `Thấu hiểu`, `Báo cáo`, `Privacy Center`, `Cài đặt`.
- Home không dùng orb hoặc metric-card grid. Session, nhịp chớp mắt, khoảng cách và tải thị giác được trình bày thành evidence rows; `NOT_MEASURED` và `INSUFFICIENT_DATA` không bị biến thành 0 hoặc bình thường.
- Checkup result là evidence letter, phân biệt `Observation`, `Pattern`, `Missing`, `Confidence`, `Action`; questionnaire chỉ là neutral placeholder, không khóa OSDI-6 hoặc DEQ-5 và không thêm medical claim.
- Work Companion giữ quiet mode, timer, pause/complete/cancel và ba phản hồi nudge; trace không có ambient loop.
- Thấu hiểu/Báo cáo dùng narrative timeline nhưng vẫn truy được số, unit, confidence, version, preview và delete action.
- Privacy/Settings là destination có label đầy đủ; consent, inventory, export, reset, delete và preference groups vẫn nhìn thấy.
- Quay về `#/home` phục hồi production sidebar và route production hiện hữu.

## Navigation Migration Matrix

| Capability production hiện tại | Destination Design Lab | Cách thể hiện reference | Trạng thái |
|---|---|---|---|
| Tổng quan/Home | Hôm nay | Destination đầu tiên; greeting, quick actions và evidence gần nhất | `DEMO_ONLY` |
| Checkup | Khám mắt | Evidence letter trung tính, không chốt questionnaire | `DEMO_ONLY` |
| Work Companion | Đồng hành | Quiet focus stage, timer, controls và nudge | `DEMO_ONLY` |
| Personal Intelligence | Thấu hiểu | Evidence journal với provenance | `DEMO_ONLY` |
| Reports | Báo cáo | Narrative timeline, unit/confidence/version và report actions | `DEMO_ONLY` |
| Privacy | Privacy Center | Utility destination có label, consent/inventory/data actions | `DEMO_ONLY` |
| Settings | Cài đặt | Utility destination có label, preferences và policy-disabled controls | `DEMO_ONLY` |
| Production shell | Không di chuyển | Sidebar và route production giữ nguyên ngoài Design Lab | `UNCHANGED` |

Ma trận này chỉ chứng minh information architecture và visual hierarchy. Không control nào trong Design Lab gọi production handler hoặc được coi là migration đã duyệt.

## Afterimage Trace states

Afterimage Trace là phép ẩn dụ cho evidence, lịch sử và dấu vết hành vi. Nó không mô phỏng triệu chứng thị giác, retinal burn-in hoặc bóng ma thị giác; màu sắc/hình dạng không suy luận sức khỏe.

| State | Ý nghĩa dữ liệu | Representation tĩnh | Reduced motion/transparency |
|---|---|---|---|
| `READY` | Evidence đủ cho trạng thái tham chiếu | Hai contour gần trùng và text `READY` | Giữ nguyên shape/text; không interpolation |
| `NOT_MEASURED` | Chưa thực hiện phép đo | Một contour giảm hiện diện, text nêu chưa đo | Không đổi semantics |
| `INSUFFICIENT_DATA` | Có dữ liệu nhưng chưa đủ nhận xét | Contour nét đứt và text thiếu dữ liệu | Không dùng animation để truyền nghĩa |
| `STALE` | Evidence đã cũ | Hai contour lệch nhẹ, có text stale | Trạng thái vẫn đọc được khi motion bằng 0 |
| `LOW_QUALITY` | Evidence bị quality gate từ chối | Trace có break marker và text quality | Không flashing/flicker |
| `PRIVACY` | Chỉ hiển thị ranh giới local/privacy | Contour thu gọn trong boundary và text privacy | Nền chuyển thành surface đặc khi giảm transparency |

Transition chỉ dùng transform/opacity 160–220 ms khi đổi state; không có strobe, flicker, flashing, contrast jump hoặc ambient loop. Nội dung chữ độc lập với trace nên việc tắt toàn bộ animation không làm mất trạng thái.

## Mascot decision

- Reference chính không dùng mascot production và task này không tạo mascot variant.
- Khả năng companion không bị xóa khỏi architecture; reference thể hiện presence qua tone, quiet-mode feedback và trace.
- Mascot là open visual decision để đánh giá lại tại Visual Gate A, không phải quyết định loại bỏ vĩnh viễn.

## Technical boundary

- Renderer lab là module tĩnh, không tham chiếu typed preload, IPC, camera runtime, SQLite, storage, `fetch`, XHR, WebSocket hoặc network.
- Không thêm dependency, CDN, remote font, remote icon hoặc remote asset. Font dùng `Segoe UI Variable`/`Segoe UI` và fallback hệ thống.
- CSS được scope dưới `.taste-lab` và body class chỉ bật ở exact hash route.
- Demo controls chỉ cập nhật DOM/status text; không ghi dữ liệu.
- Production domain, IPC, camera, privacy, safety và data semantics không thay đổi.

## Evidence screenshots

- `ui-screenshots/taste-afterimage-home-1100x760.png`
- `ui-screenshots/taste-afterimage-home-1280x800.png`
- `ui-screenshots/taste-afterimage-checkup-result-1100x760.png`
- `ui-screenshots/taste-afterimage-companion-active-1100x760.png`
- `ui-screenshots/taste-afterimage-evidence-journal-1100x760.png`
- `ui-screenshots/taste-afterimage-reduced-motion-1100x760.png`

## Files thuộc task

- `src/renderer/taste-design-lab.ts`
- `src/renderer/taste-design-lab.css`
- `src/renderer/app.ts` — exact route seam và scoped body class.
- `src/renderer/index.html` — local stylesheet link.
- `src/main/main.ts` — validation flag/harness, không đổi production handler.
- `tools/m1/copy-assets.mjs`
- `tools/ui/run-taste-design-lab-validation.mjs`
- `package.json`
- `docs/validation/taste-driven-redesign-gate-a.md`
- sáu PNG evidence nêu trên.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run acceptance:taste-design-lab` | PASS — `noIpcCameraDatabaseNetwork=true keyboardFocus=true reducedMotion=true reducedTransparency=true productionUiUnchanged=true` |
| Static remote asset boundary trong acceptance | PASS — `remoteAssets=false` |
| `git diff --check` | PASS |

Acceptance kiểm tra exact hash route, bảy destination, Home capability/missing state, top navigation không bị titlebar cắt, ArrowLeft/ArrowRight và focus-visible, sáu trace state, reduced motion, reduced transparency, Checkup evidence letter, Companion controls, Reports provenance/actions, Privacy/Settings discoverability và production sidebar khi trở lại Home.

## Pre-existing failure ngoài scope

- Trạng thái tại Gate A: suite từng dừng ở `UI_WELLNESS_COPY_INVALID`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật copy/flow và `acceptance:ui` hiện PASS.
- Trạng thái lịch sử: fixture từng tìm `clinical-osdi-12`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật fixture và suite hiện PASS.
- Hai failure này không được chạy để tạo claim mới, không được sửa, revert hoặc gộp vào Design Lab.

Production UI unchanged. Không stage hoặc commit vì worktree đang trộn các luồng đã được owner yêu cầu bảo toàn.

`WAITING_FOR_VISUAL_GATE_A_APPROVAL`
