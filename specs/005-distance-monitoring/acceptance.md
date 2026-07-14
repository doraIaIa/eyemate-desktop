# Acceptance — Personal Distance Monitoring

- `AC-DST-001`: Given profile hợp lệ và quality đạt, when dwell/hysteresis xác nhận, then zone event phát đúng một lần với evidence/version.
- `AC-DST-002`: Given một frame gần đơn lẻ, then không tạo near episode.
- `AC-DST-003`: Given quality chuyển unknown giữa near episode, then episode mang interruption/coverage; không tự ghi recovered.
- `AC-DST-004`: Given camera/resolution/display đổi, then profile cũ không dùng âm thầm.
- `AC-DST-005`: Given calibration mới residual xấu hơn last-known-good, then profile cũ còn nguyên và user được retry/cancel.
- `AC-DST-006`: Given cm benchmark chưa đạt gate, then production UI không hiển thị số cm chính xác.
- `AC-DST-007`: Given reset calibration, then history/report cũ vẫn giữ version semantics nhưng measurement mới yêu cầu calibration.
- `AC-DST-008`: Benchmark report bao gồm zone confusion matrix, false alert và unknown rate, không chỉ MAE trung bình.

