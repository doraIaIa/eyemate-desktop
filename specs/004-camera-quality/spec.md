# Feature 004 — Camera and Measurement Quality

```yaml
decision_status: proposed
release_scope: m0-m2
owner: measurement-owner
review: { privacy: required, security: required }
```

## Problem

Camera metric không đáng tin khi ánh sáng, pose, visibility, device state hoặc frame stability kém. Quality phải là cổng trước estimator, không phải nhãn trang trí sau kết quả.

## Inputs

Frame timing, face/iris/eye visibility, lighting/exposure proxy, blur proxy, pose, occlusion, resolution/device profile và model runtime state.

## Output contract

```text
status: ACCEPTED | DEGRADED | REJECTED | DEVICE_CHANGED | UNAVAILABLE
validFrameRatio
qualitySignals[]
reasonCodes[]
confidence: 0..1
algorithmVersion
```

Confidence là data quality, không phải accuracy hoặc disease probability.

## Requirements

- `FR-CAM-001`: Mỗi estimator khai báo required quality signals và abstention behavior.
- `FR-CAM-002`: Rejected quality trả `UNKNOWN_*`, không xuất số “bình thường”.
- `FR-CAM-003`: UI cho lý do có thể sửa và retry, không đổ lỗi người dùng.
- `FR-CAM-004`: Device/resolution/display association thay đổi tạo `DEVICE_CHANGED` và không dùng profile cũ âm thầm.
- `FR-CAM-005`: Raw frame/landmark không persistence/log/telemetry mặc định.
- `FR-CAM-006`: Runtime/model/WASM cốt lõi load local và fail độc lập khi offline.
- `FR-CAM-007`: Stop/cancel dừng media track và giải phóng resource.
- `FR-CAM-008`: Measurement ghi quality/algorithm/device-profile version ở mức không lộ identifier thô.

## Edge cases

Camera busy/disconnected, lid close/sleep, multi-camera, resolution renegotiation, glasses/glare, partial face, head turn, multiple faces và app background.

