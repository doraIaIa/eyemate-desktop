# Acceptance — Personal Baseline

- `AC-BAS-001`: Given sample count thấp dù đã qua 7 ngày, then state vẫn `LEARNING/INSUFFICIENT`.
- `AC-BAS-002`: Given low-quality/unknown windows, then chúng không cập nhật distribution.
- `AC-BAS-003`: Given hành vi near lặp lại, then ergonomic guardrail không tự dịch xuống.
- `AC-BAS-004`: Given device/algorithm version đổi theo stale rule, then baseline cũ không dùng âm thầm.
- `AC-BAS-005`: Given reset, then pattern phụ thuộc baseline chuyển insufficient/stale; report lịch sử giữ snapshot semantics.
- `AC-BAS-006`: Property test xác nhận missing input không trở thành zero và outlier policy deterministic theo version.

