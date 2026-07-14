# Acceptance — User Data Management

- `AC-DAT-001`: Given rút camera consent, then collection dừng ngay nhưng history cũ chỉ xóa khi user yêu cầu riêng.
- `AC-DAT-002`: Given reset calibration, then measurement mới yêu cầu calibration và report lịch sử vẫn đọc được.
- `AC-DAT-003`: Given delete all thành công, then DB không còn entity thuộc scope, pending telemetry/export job bị hủy và result `DELETED`.
- `AC-DAT-004`: Given export file ngoài app tồn tại, when delete app data, then UI không khẳng định file ngoài đã xóa.
- `AC-DAT-005`: Given crash/retry trong deletion, then operation idempotent và final inventory nhất quán.
- `AC-DAT-006`: Given migration failure, then backup nguyên, writes bị chặn và recovery UI không chạy database nửa migrated.
- `AC-DAT-007`: Given legacy record, then inventory/export ghi legacy schema/source.

