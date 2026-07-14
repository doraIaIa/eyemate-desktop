# Acceptance — Onboarding and Consent

- `AC-ONB-001`: Given người dùng mới, when chưa xem giới hạn, then checkup không bắt đầu và camera permission chưa được gọi.
- `AC-ONB-002`: Given người dùng chọn bỏ qua camera, when hoàn thành onboarding, then Home và survey-only checkup hoạt động offline.
- `AC-ONB-003`: Given camera consent chưa có, when pulse check đến hạn, then camera không mở và reason là `SKIPPED_NO_CONSENT`.
- `AC-ONB-004`: Given consent đã rút, when app restart, then trạng thái vẫn bị rút và không phát OS permission prompt.
- `AC-ONB-005`: Given textVersion camera thay đổi, when feature camera được mở, then app yêu cầu consent đúng scope trước permission/use.
- `AC-ONB-006`: Given ghi consent thất bại, when người dùng chọn bật camera, then camera không mở và UI cung cấp retry/continue-without-camera.
- `AC-ONB-007`: Given OS permission denied, when onboarding tiếp tục, then không dark pattern và có hướng dẫn hệ điều hành chính xác.

Test level: acceptance + integration consent persistence; privacy review bắt buộc trước M1 pilot.

