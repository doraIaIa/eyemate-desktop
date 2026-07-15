# D-009 — Mục tiêu chất lượng và semantics khoảng cách

```yaml
decision_id: D-009
decision_status: confirmed
decision: RATIO_ZONE_FAIL_CLOSED
release_scope: m1-m2
owner: validation-owner
approved_by: Validation Owner
approved_date: 2026-07-15
review:
  product: required
  privacy: required
  validation: required
last_reviewed: 2026-07-15
```

## Quyết định

Validation Owner phê duyệt phương án `RATIO_ZONE_FAIL_CLOSED` cho Distance Monitoring của EyeMate V2. Phê duyệt cho phép triển khai median, outlier rejection, hysteresis và dwell có version; không cho phép hiển thị số centimet hoặc claim accuracy trước benchmark.

## Bằng chứng repository hiện tại

- V2 không có `DistanceEstimator`, hằng số `K = 8500`, EMA hoặc pipeline `distance_cm = K / iod_pixel_width`.
- `src/camera/measurement-window.ts` dùng calibration cá nhân theo camera/resolution và tỷ lệ inter-eye để phân loại `NEAR`, `COMFORT`, `FAR`.
- Pose, visibility, lighting hoặc geometry không đạt trả `UNKNOWN`; đổi device binding làm calibration không hợp lệ.
- `src/distance/distance-zone.ts` chỉ công bố zone sau calibration và các observation hợp lệ liên tiếp.
- Centimet chính xác chưa được validation và không được công bố trong UI production.

Vì vậy, snippet Task 2A trong completion prompt mô tả kiến trúc khác với V2 và không thể áp dụng nguyên văn mà không thay domain contract cùng safety boundary.

## Phương án được duyệt — Ratio/zone fail-closed

Giữ output production là `NEAR | COMFORT | FAR | UNKNOWN` và calibration cá nhân theo device profile.

Nếu được duyệt, implementation tiếp theo sẽ:

1. Thêm cấu hình versioned cho cửa sổ median, outlier rejection, hysteresis và dwell.
2. Không tái sử dụng observation `UNKNOWN` như sample hợp lệ hoặc trạng thái recovery.
3. Chỉ tạo near episode sau tối thiểu ba aggregate hợp lệ liên tiếp; một frame không tạo cảnh báo.
4. Giữ raw frame, landmark và raw per-frame series trong RAM; không persist hoặc export.
5. Invalidate calibration khi camera, resolution hoặc device binding thay đổi.
6. Không hiển thị centimet hoặc claim accuracy trước khi benchmark D-009 đạt.

### Acceptance tối thiểu

- Spike đơn lẻ không đổi zone hoặc phát near nudge.
- Pose/lighting/visibility không đạt chuyển `UNKNOWN`.
- `UNKNOWN` không được median-fill bằng giá trị trước đó.
- Đổi camera yêu cầu calibration lại.
- Ba aggregate NEAR hợp lệ liên tiếp mới đủ điều kiện tạo near episode; cooldown và quiet mode vẫn áp dụng độc lập.
- Thuật toán/config version xuất hiện trong aggregate và report provenance.

## Phương án B — Estimator centimet K/IOD

Chỉ cân nhắc sau một protocol benchmark riêng chứng minh:

- sai số MAE, median và p95 theo từng webcam/profile;
- độ chính xác zone tại các khoảng cách ground truth;
- false-near alert theo pose, ánh sáng, kính và chuyển động;
- stability/drift, unknown rate và calibration success;
- khác biệt eye-to-camera so với eye-to-screen được xử lý rõ.

Không được dùng fallback `K = 8500` để xuất centimet như một observation hợp lệ. Thiếu calibration hoặc device mismatch phải trả `UNKNOWN`.

## Bằng chứng cần để APPROVE

Validation Owner cần ghi rõ:

- phương án được chọn: `RATIO_ZONE_FAIL_CLOSED` hoặc `VALIDATED_NUMERIC_DISTANCE`;
- version cấu hình/thuật toán được duyệt;
- dataset/device profiles và ground-truth protocol;
- threshold pass/fail cho MAE, p95, zone accuracy, false-near, unknown rate và drift;
- phạm vi UI được phép hiển thị: zone hay centimet;
- người duyệt và ngày duyệt.

## Câu lệnh phê duyệt đề xuất

```text
APPROVE D-009 — RATIO_ZONE_FAIL_CLOSED
Approved by: Validation Owner
Date: YYYY-MM-DD
```

Phê duyệt này cho phép triển khai median/outlier/hysteresis/dwell trên pipeline V2 hiện có. Nó không phê duyệt numeric centimet, claim accuracy hoặc thay đổi privacy/safety semantics.

## Implementation evidence

- `src/distance/ratio-zone-filter.ts`: rolling median, outlier rejection, hysteresis và reconfirmation sau `UNKNOWN`.
- `src/distance/distance-zone.ts`: ba aggregate hợp lệ liên tiếp trước khi công bố zone/near episode.
- `src/camera/measurement-window.ts`: áp filter theo đúng thứ tự frame, giữ quality failure là missing và ghi algorithm/config provenance.
- Automated verification ngày 2026-07-15: typecheck PASS; unit 80/80; integration 18/18; camera runtime PASS (`accuracy=UNKNOWN`); camera harness smoke PASS.

Numeric centimet và accuracy claim tiếp tục bị chặn cho đến khi có benchmark threshold riêng được Validation Owner duyệt.
