# EyeMate Clarity Grid — dev-only reference

Ngày dựng: 2026-07-15  
Route: `#/design-lab/taste-direction`  
Phạm vi ban đầu: visual reference dev-only. Sau review motion, owner đã xác nhận production rollout; xem `clarity-grid-production-rollout.md`.

## Quyết định visual

Owner từ chối Gate A tối màu “Nhật Ký Dư Ảnh” và yêu cầu bám trực tiếp bốn ảnh WEBP trong `docs/validation/ui-screenshots/`.

Clarity Grid học từ các mẫu:

- canvas sáng trắng–xám, typography đen lớn và nhiều khoảng thở;
- lime là accent duy nhất cho active state và next action;
- top navigation đầy đủ, không dùng production sidebar;
- modular asymmetric grid thay card grid đồng hạng;
- một panel tối có chủ đích ở Home làm điểm neo;
- micro-chart, date filter và report action có hierarchy rõ.

Không sao chép body scan, health score, risk zone, medical claim, dữ liệu người thật hoặc color-coded health inference. Tất cả số liệu là demo và missing state vẫn giữ `NOT_MEASURED`/`INSUFFICIENT_DATA`.

## Functional preservation trong reference

- Home: session, blink, distance, tải thị giác và ba quick action.
- Checkup: `Observation`, `Pattern`, `Missing`, `Confidence`, `Action`.
- Companion: quiet mode, timer, pause/complete/cancel và ba nudge response.
- Intelligence/Reports: coverage, unit, source, confidence, version, preview và delete.
- Privacy/Settings: consent, inventory, export, reset, delete và preference groups.
- Bảy destination có label đầy đủ; ArrowLeft/ArrowRight và focus-visible.
- Reduced motion và reduced transparency.
- Demo renderer không gọi IPC, camera, database, storage hoặc network.

## Motion refinement tham khảo QClay

Reference học nguyên tắc chuyển động từ [QClay](https://qclay.design/?ref=dribbble), không sao chép website hoặc cơ chế cuộn của họ:

- nhãn top navigation có two-line roll khi hover/focus;
- view cũ thoát ngắn rồi view mới reveal theo hierarchy và stagger;
- card nâng nhẹ, section mark đổi hướng và mũi tên phản hồi khi hover;
- button có directional fill và ripple một lần tại vị trí click;
- micro-chart, evidence trace, progress và report marker reveal bằng `transform`/`opacity`;
- Work Companion chỉ dùng entry motion một lần; timer active không có ambient loop;
- không custom cursor, scroll hijack, parallax, flashing, strobe, flicker, infinite marquee hoặc animation vô hạn.

Khi bật reduced motion hoặc khi hệ điều hành báo `prefers-reduced-motion: reduce`, animation và transition bị tắt nhưng label, text trạng thái, data, unit và action vẫn giữ nguyên. Reduced transparency loại bỏ blur và shadow không thiết yếu.

## Evidence

- `ui-screenshots/clarity-grid-home-1100x760.png`
- `ui-screenshots/clarity-grid-home-1280x800.png`
- `ui-screenshots/clarity-grid-checkup-result-1100x760.png`
- `ui-screenshots/clarity-grid-companion-active-1100x760.png`
- `ui-screenshots/clarity-grid-report-1100x760.png`
- `ui-screenshots/clarity-grid-reduced-motion-1100x760.png`

## Verification

- `npm run typecheck`: PASS.
- `npm run acceptance:taste-design-lab`: PASS với `motionProfile=true`, `clickFeedback=true`, `keyboardFocus=true`, `reducedMotion=true`, `reducedTransparency=true`, `noIpcCameraDatabaseNetwork=true`, `productionClarityShell=true`.
- `npm run acceptance:living-aurora`: PASS.
- `npm run architecture`: PASS.
- `npm run privacy`: PASS.
- `npm run accessibility`: PASS.
- `git diff --check`: PASS.

Các failure ngoài scope được giữ riêng, không sửa trong motion refinement:

- Trạng thái tại thời điểm reference: suite từng dừng ở `UI_WELLNESS_COPY_INVALID`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật copy/flow và `acceptance:ui` hiện PASS.
- Trạng thái lịch sử: fixture từng tìm `clinical-osdi-12`; Task 1 owner-approved ngày 2026-07-15 đã cập nhật fixture và `npm run test:pilot-contract` hiện PASS.

## Boundary tại thời điểm reference

- Reference không tự đổi production route/handler. Production rollout chỉ bắt đầu sau xác nhận riêng của owner.
- Không sửa Wellness Check hoặc questionnaire.
- Không dependency, remote font, CDN, telemetry hoặc network.
- UI trước redesign đã được backup ngoài repository tại `F:\eyemate-desktop-ui-backup-20260715-visual-gate-a`.

Trạng thái: `PROMOTED_TO_PRODUCTION_PRESENTATION`; reference route vẫn được giữ để đối chiếu visual.
