# Acceptance — Patterns and VLI

- `AC-PAT-001`: Given required evidence thiếu, then result `INSUFFICIENT` và liệt kê missing; không `NOT_PRESENT`.
- `AC-PAT-002`: Given cùng input/config/version, then rule output deterministic.
- `AC-PAT-003`: Given pattern hết hạn, then UI không trình bày như hiện tại trước refresh.
- `AC-PAT-004`: Given rule version mới, then report cũ vẫn render theo version cũ.
- `AC-VLI-001`: Given camera `NOT_MEASURED`, then không cộng distance/blink như zero/good.
- `AC-VLI-002`: Given coverage dưới gate, then VLI không hiển thị số và data confidence nêu lý do.
- `AC-VLI-003`: Content test xác nhận VLI không được gọi là disease/severity/clinical score.

