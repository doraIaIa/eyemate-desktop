# Acceptance — Safety Gate

- `AC-SAF-001`: Given rule trigger, when trả lời được xác nhận, then camera/scoring không chạy và guidance đúng rule/content version hiển thị.
- `AC-SAF-002`: Given không trigger, when gate hoàn tất, then flow chuyển Symptom Profile và outcome được ghi có version.
- `AC-SAF-003`: Given câu trả lời `UNSURE`, when rule yêu cầu đường thận trọng, then app không coi là negative.
- `AC-SAF-004`: Given rule catalogue thiếu/hỏng, when bắt đầu gate, then flow safe-stop; không gọi model hoặc sinh nội dung tự do.
- `AC-SAF-005`: Given trigger và local save bị từ chối, when guidance hiển thị, then hướng dẫn vẫn hoạt động nhưng app không tuyên bố đã lưu checkup.
- `AC-SAF-006`: Automated content test xác nhận UI chỉ dùng approved content keys/version cho Safety Gate.

Clinical sign-off là exit criterion; passing tests không thay thế clinical approval.

