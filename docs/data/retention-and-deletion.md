# Retention, Export and Deletion

```yaml
decision_status: proposed
owner: privacy-and-data-owner
review: { privacy: required, security: required, product: required }
```

## Retention mặc định đề xuất

| Dữ liệu | Mặc định | Lý do |
|---|---:|---|
| Raw frame/video | Không lưu | Không cần cho chức năng thường ngày |
| Raw landmarks/samples | Không lưu | Giảm rủi ro; aggregate trong RAM |
| Measurement windows | 7 ngày | Debug/trend ngắn hạn; cần user control |
| Session/checkup summaries | 12 tháng | Theo dõi dọc; có thể cấu hình/xóa |
| Calibration/device profile | Đến khi reset/stale + grace period | Cần vận hành distance |
| Baseline snapshots | Giữ current + version trước gần nhất | Recovery/audit semantics |
| Reports/exports | Do người dùng quản lý | File thuộc người dùng |
| Crash logs | 30 ngày tối đa, không health content | Support kỹ thuật |

Con số chỉ trở thành `confirmed` sau privacy review và usability pilot. UI phải cho người dùng xem chính sách hiện hành.

## Deletion semantics

- `DATA-DEL-001`: Delete trả `DELETED`, `PARTIALLY_DELETED` hoặc `FAILED` cùng reason code.
- `DATA-DEL-002`: Reset calibration không mặc định xóa checkup/report.
- `DATA-DEL-003`: Reset baseline không được xóa raw data vốn không tồn tại; phải nêu derived snapshots nào bị xóa.
- `DATA-DEL-004`: Delete all dừng collection, xóa local entities thuộc scope và vô hiệu hóa pending export/share.
- `DATA-DEL-005`: Nếu file export nằm ngoài app data directory, app không được tuyên bố đã xóa file đó; phải giải thích giới hạn.
- `DATA-DEL-006`: Backup/recovery copy có lifecycle và purge rule riêng, không tồn tại vô thời hạn.

## Export

Export phải có preview, field selection, schema/report version, generated-at, disclaimer và provenance. Export không tự gửi. File nhạy cảm phải cảnh báo trước khi lưu vào thư mục sync công cộng.

## Migration

Trước migration: kiểm tra dung lượng, tạo backup có version và khóa ghi phù hợp. Migration chạy transaction/atomic equivalent; sau đó integrity check. Failure đưa app vào recovery mode với backup nguyên vẹn, không tiếp tục trên database nửa cũ nửa mới.

