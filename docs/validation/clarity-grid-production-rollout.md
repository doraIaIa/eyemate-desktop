# EyeMate Clarity Grid — production UI rollout

Ngày triển khai: 2026-07-15
Phạm vi: App Shell và presentation layer production.
Trạng thái: `IMPLEMENTED_UNCOMMITTED_IN_MIXED_WORKTREE`.

## Approval và boundary

Owner xác nhận production rollout ngay sau khi được hỏi rõ về việc đưa Clarity Grid thành giao diện chính thức. `npm run dev` mở trực tiếp `#/home` bằng production shell mới; không cần DevTools Console.

Rollout chỉ thay presentation và renderer navigation. Không thay domain, IPC contract, camera lifecycle, privacy/safety semantics, questionnaire, persistence schema, network behavior hoặc dependency.

## Functional Preservation Matrix

| Route | Presentation production | Capability/hook được giữ | Nguồn dữ liệu thật | Invariant |
|---|---|---|---|---|
| `#/home` | Clarity asymmetric grid, Afterimage Trace, top navigation; không orb/sidebar dọc | Quick actions tới Companion, Checkup, Reports và Privacy | `getRuntimeInfo`, reports, summaries, M3 reports, work session, privacy summary | `NOT_MEASURED`/`INSUFFICIENT_DATA` không đổi thành 0 hoặc bình thường |
| `#/checkup` | Wizard sáng, hierarchy và focus state Clarity | Consent, survey-only, camera opt-in, calibration, measurement, result, export, repeat/cancel | Các handler/IPC checkup hiện hữu | Không sửa Wellness Check/questionnaire; camera-off vẫn hoạt động; không claim chẩn đoán mới |
| `#/companion` | Quiet mode, timer stage và mode rail | Start, pause/resume, recovery, nudge, finish/cancel, Session Summary | Work Session và User Preferences | Timer Only giữ nguyên; camera mode chưa xác minh vẫn disabled |
| `#/intelligence` | Evidence cards và baseline narrative | Refresh, reset baseline, mở Reports | M3 reports | Missing/confidence vẫn hiển thị trung thực |
| `#/reports` | Evidence journal tabs, chart/empty state và action hierarchy | Generate, tabs, preview Markdown/JSON/PDF, delete snapshots | M3 reports, survey reports, session summaries | Preview trước export; không tự gửi file |
| `#/privacy` | Privacy Center discoverable trong top navigation | Consent withdrawal, inventory, preview/export, reset baseline/calibration, delete hai bước | Privacy Summary và Data Inventory | Raw camera không persistence; delete báo kết quả thật |
| `#/settings` | Settings groups và autosave status | Reduced motion, reminders, sound, quiet hours, reset baseline, data management | User Preferences và Runtime Info | Các control chưa có contract thật vẫn disabled |

## Shell và interaction

- Bảy destination production: Hôm nay, Khám mắt, Đồng hành, Thấu hiểu, Báo cáo, Privacy Center, Cài đặt.
- ArrowLeft/ArrowRight di chuyển focus giữa các destination; focus ring luôn nhìn thấy.
- Nav label roll, page reveal, card lift, chart/trace reveal và click ripple chỉ dùng local CSS/DOM.
- Không custom cursor, scroll hijack, flashing, strobe, flicker, parallax hoặc animation vô hạn trong content production.
- `prefers-reduced-motion` và preference Reduced motion dừng motion không thiết yếu nhưng giữ chart/trace/progress ở representation tĩnh đầy đủ.
- Không remote font, icon, asset, CDN, telemetry hoặc dependency mới.

## Critique-driven Home refinement

Đợt refinement ngày 2026-07-15 xử lý trực tiếp bảy điểm yếu được review mà không đổi capability:

- Headline Home dùng local editorial display stack (`Palatino Linotype`/`Book Antiqua`/`Georgia`) với weight nhẹ hơn; body và data dùng font Windows local. Không tải DM Serif, Syne hay font từ mạng.
- Biểu đồ 12 bar số cố định đã được thay bằng SVG độ phủ evidence có năm nhóm: Phiên, Checkup, Blink, Khoảng cách và VLI. Mỗi bar có axis label, keyboard focus, native tooltip, trạng thái available/missing và mô tả provenance.
- Không thêm trend line hoặc delta badge giả. Lime chỉ xuất hiện khi evidence có thật; hatch/nét đứt biểu thị dữ liệu thiếu và không suy luận mức sức khỏe.
- Home có code-native evidence lens/optotype artwork. Đây là dấu vết evidence, không mô phỏng triệu chứng afterimage, retinal burn-in hoặc bóng ma thị giác.
- Phiên hôm nay có progress ring so với preset 25 phút. Khi chưa có phiên, ring dùng representation nét đứt và chữ `Chưa có`, không biến missing thành 0.
- Grid có card `Dấu vết tuần này` dùng `WeeklyDigest` thật để tạo anchor cột phải; ba metric vẫn giữ `NOT_MEASURED`/`INSUFFICIENT_DATA` trung thực.
- Brand subtitle đổi từ tên concept nội bộ `Clarity Grid` thành `Visual wellbeing`; top navigation giữ nguyên bảy destination và active state rõ hơn.

Reduced motion dừng line/bar reveal và giữ nguyên hình, nhãn, tooltip, trạng thái chart/ring. `prefers-reduced-transparency` chuyển topbar sang nền đặc.

## Evidence

- `ui-screenshots/clarity-production-home-1100x760.png`
- `ui-screenshots/clarity-production-home-1280x800.png`
- `ui-screenshots/clarity-production-checkup-entry-1100x760.png`
- `ui-screenshots/clarity-production-companion-ready-1100x760.png`
- `ui-screenshots/clarity-production-reports-1100x760.png`
- `ui-screenshots/clarity-production-privacy-1100x760.png`
- `ui-screenshots/clarity-production-settings-1100x760.png`
- `ui-screenshots/clarity-production-reduced-motion-1100x760.png`

## Verification command

`npm run acceptance:clarity-production` kiểm tra startup Home không cần Console, top navigation, bảy production route, semantic evidence chart, năm tooltip/focus target, session progress, weekly anchor, click feedback, reduced motion, không orb và các functional DOM hook chính.

Kết quả cuối:

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run unit`: PASS 70 tests.
- `npm run integration`: PASS 18 tests.
- `npm run architecture`, `privacy`, `accessibility`: PASS.
- `npm run acceptance`, `acceptance:m2`, `acceptance:m3`: PASS.
- `npm run acceptance:clarity-production`: PASS.
- `npm run acceptance:living-aurora`, `acceptance:taste-design-lab`: PASS với production Clarity shell.
- `git diff --check`: PASS.

Failure ngoài scope được giữ nguyên và không sửa:

- Trạng thái tại thời điểm rollout: `acceptance:ui` từng dừng ở `UI_WELLNESS_COPY_INVALID`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật copy/flow và suite hiện PASS.
- Trạng thái lịch sử: fixture từng tìm `clinical-osdi-12`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật fixture và `npm run test:pilot-contract` hiện PASS.

Backup trước rollout vẫn ở ngoài repository: `F:\eyemate-desktop-ui-backup-20260715-visual-gate-a`.

Không stage/commit vì worktree đang trộn thay đổi Wellness, Living Aurora và UI evidence do owner yêu cầu bảo toàn.
