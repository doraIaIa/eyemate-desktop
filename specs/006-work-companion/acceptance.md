# Acceptance — Work Companion

- `AC-CMP-001`: Given camera consent denied, when start session, then timer/session chạy và camera metrics là `NOT_MEASURED`.
- `AC-CMP-002`: Given near episode đủ confidence/dwell, when cooldown cho phép, then một nudge có reason/action/version được tạo.
- `AC-CMP-003`: Given quality unknown, then không phát high-severity distance nudge.
- `AC-CMP-004`: Given quiet mode, when policy muốn nudge không khẩn, then nudge hoãn/ghi suppressed theo policy.
- `AC-CMP-005`: Given summary event retry/restart, then chỉ một summary được lưu và một UI completion được hiển thị.
- `AC-CMP-006`: Given user disable distance nudges, then distance measurement có thể tiếp tục theo consent nhưng không phát nudge loại đó; UI thể hiện rõ.
- `AC-CMP-007`: Given crash giữa session, then recovery không giả định break/compliance trong thời gian mất dữ liệu.

