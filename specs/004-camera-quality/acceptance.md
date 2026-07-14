# Acceptance — Camera Quality

- `AC-CAM-001`: Given face/eyes không đủ visibility, when window kết thúc, then estimator nhận rejected/unknown và không có distance/blink numeric result.
- `AC-CAM-002`: Given camera đổi sau calibration, when measurement bắt đầu, then profile cũ bị chặn và UI yêu cầu confirm/recalibrate.
- `AC-CAM-003`: Given không mạng, when local assets hợp lệ, then camera quality và supported estimators khởi động không gọi CDN.
- `AC-CAM-004`: Given camera bị rút giữa window, then session tiếp tục ở partial/no-camera state; track/resource được giải phóng.
- `AC-CAM-005`: Automated scan/test xác nhận raw frame/landmark không đi vào DB/log/telemetry fixture.
- `AC-CAM-006`: Given quality có thể sửa, then UI hiển thị reason-specific guidance và retry không tạo duplicate window.

