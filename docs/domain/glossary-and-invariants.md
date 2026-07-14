# Domain Glossary and Invariants

## Thuật ngữ chuẩn

| Thuật ngữ | Nghĩa chuẩn | Không đồng nghĩa |
|---|---|---|
| Evidence | Dữ liệu có nguồn, quality, time window và version | Kết luận y tế |
| Data confidence | Mức đầy đủ/chất lượng/ổn định của evidence | Xác suất bệnh |
| Measurement | Giá trị được tạo bởi estimator trên dữ liệu hợp lệ | Ground truth |
| Measurement window | Aggregate theo cửa sổ thời gian từ raw samples trong RAM | Frame log |
| Session summary | Aggregate của một phiên hoàn chỉnh/partial có coverage | Raw camera data |
| Pattern | Tổ hợp evidence thỏa rule có version và abstention | Diagnosis |
| Visual Load Index | Product index về hành vi/tải quan sát được | Chỉ số lâm sàng |
| Baseline | Phân bố tham chiếu cá nhân trong context và validity window | Chuẩn sức khỏe |
| Near episode | Khoảng thời gian thỏa state machine distance | Một frame gần |
| Incomplete-blink proxy | Tín hiệu thuật toán liên quan đến closure pattern | Xác nhận lâm sàng |
| `UNKNOWN` | Có thử đo nhưng quality/evidence không đủ | `NORMAL` |
| `NOT_MEASURED` | Không thực hiện measurement | `UNKNOWN` hoặc `0` |
| Legacy data | Dữ liệu V1 giữ provenance/semantics cũ | Dữ liệu V2 tương đương |

## Trạng thái measurement chuẩn

```text
NOT_REQUESTED
NOT_MEASURED
MEASURED
UNKNOWN_LOW_QUALITY
UNKNOWN_DEVICE_CHANGED
UNKNOWN_CALIBRATION_REQUIRED
FAILED_RECOVERABLE
FAILED_NON_RECOVERABLE
```

Feature spec có thể mở rộng nhưng không được đổi nghĩa các trạng thái này.

## Invariant

- `INV-001`: Missing/unknown/not-measured không được đưa vào phép tính như `0`.
- `INV-002`: Score và confidence được lưu/hiển thị riêng.
- `INV-003`: Derived value truy được về source entity và algorithm version.
- `INV-004`: Baseline không cập nhật từ window low-quality, user-marked-invalid hoặc context không rõ.
- `INV-005`: Baseline không tự hạ comfort/safety boundary chỉ vì hành vi bất lợi lặp lại.
- `INV-006`: Pattern có time window, expiry, required evidence, missing behavior và version.
- `INV-007`: Report cũ render theo semantics lúc tạo; không tính lại âm thầm bằng thuật toán mới.
- `INV-008`: Domain Core không phụ thuộc UI/framework/camera SDK/database.
- `INV-009`: Unit được ghi trong tên/schema, không dùng số không rõ đơn vị.
- `INV-010`: Timestamp lưu UTC; timezone dùng cho presentation và day boundary có version/context.

## Version bắt buộc

Questionnaire, scoring, safety rule, camera algorithm, distance calibration, baseline, pattern, VLI, report schema, consent text, retention policy và migration đều có version độc lập.

