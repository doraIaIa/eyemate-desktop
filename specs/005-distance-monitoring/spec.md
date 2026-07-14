# Feature 005 — Personal Distance Monitoring

```yaml
decision_status: proposed
release_scope: m0-m2
owner: measurement-owner
review: { product: required, privacy: required }
```

## Outcome

Phân loại người dùng đang ở `NEAR/COMFORT/FAR/UNKNOWN` so với calibration và device geometry của chính họ. Chỉ hiển thị centimet khi validation gate cho phép.

## Definitions

- Eye-to-camera và eye-to-screen là hai đại lượng khác nhau.
- `DeviceGeometryProfile` gắn với camera, resolution, display association và geometry.
- Near episode là state theo thời gian, không phải một frame.

## Requirements

- `FR-DST-001`: Calibration gắn device/profile/version/quality và last-known-good.
- `FR-DST-002`: M0 benchmark ít nhất iris-depth và personalized inter-eye/hybrid option trước khi chọn.
- `FR-DST-003`: Pose/lighting/visibility/profile invalid trả `UNKNOWN`, không output kém.
- `FR-DST-004`: Pipeline có outlier rejection, smoothing, hysteresis, dwell và valid-sample ratio; config có unit/version.
- `FR-DST-005`: Chuyển `UNKNOWN` không được giả định near episode đã recovery.
- `FR-DST-006`: Comfort zone tách personal preference khỏi ergonomic guardrail; vi phạm lặp lại không tự hạ guardrail.
- `FR-DST-007`: Đổi camera/resolution/display/geometry invalidate hoặc yêu cầu xác nhận profile.
- `FR-DST-008`: Người dùng reset calibration, tắt monitoring và xóa distance history độc lập.
- `FR-DST-009`: Nếu benchmark số cm không đạt, UI chỉ zone/range và limitation.
- `FR-DST-010`: Raw series không lưu; window/session aggregate theo retention.

## Validation gate đề xuất

Đo MAE/median/p95, zone accuracy, calibration success, unknown rate, false-near alert, latency và stability theo webcam/pose/glasses/lighting. Mục tiêu cuối không được khóa trước benchmark.

