# Acceptance — Symptom Checkup

- `AC-CHK-001`: Given camera bị từ chối, when survey hợp lệ hoàn tất, then report được tạo với source `SURVEY_ONLY` và camera fields `NOT_MEASURED`.
- `AC-CHK-002`: Given câu bắt buộc không trả lời, when evidence không đủ, then report ghi missing data/insufficient; không điền `0`.
- `AC-CHK-003`: Given user cancel giữa flow, when mở history, then không có completed checkup; partial chỉ tồn tại nếu policy cho phép và được gắn trạng thái.
- `AC-CHK-004`: Given scoring/model lỗi, then UI nêu method unavailable; không silent heuristic fallback.
- `AC-CHK-005`: Given report được tạo, then snapshot chứa tất cả version và data source thực tế.
- `AC-CHK-006`: Content scan không tìm thấy disease probability/diagnosis claim bị cấm trong flow M1.
- `AC-CHK-007`: Given app restart giữa checkup, then user được resume từ checkpoint an toàn hoặc bỏ; không chạy lại Safety Gate âm thầm với answer cũ ngoài policy.

