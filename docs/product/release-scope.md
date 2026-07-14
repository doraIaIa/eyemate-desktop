# Release Scope and Exit Criteria

## Nguyên tắc

- Mỗi milestone phải tạo một lát cắt chạy được, kiểm chứng được.
- Feature chưa đạt validation được giữ sau flag hoặc xuất kết quả thận trọng hơn.
- Enterprise không được dùng để biện minh cho cloud/auth trong bản cá nhân.

| Mốc | Giá trị chứng minh | Bắt buộc | Không làm |
|---|---|---|---|
| M0 | Kiến trúc có thể đóng gói và đo camera local | POC shell, camera, assets, SQLite, MSIX, CI | UI đầy đủ |
| M1 | Checkup an toàn chạy offline | Onboarding, Safety, symptom, quality, distance zone, report, data control | ML thích ứng, cloud |
| M2 | Companion hữu ích trong pilot | Session, nudge, daily, export, beta recovery | Enterprise, monthly claims |
| M3 | Cá nhân hóa có guardrail | Baseline, pattern, VLI, weekly, adaptive timing | Model tự học threshold |
| M4 | Phát hành công khai đáng tin | Accessibility, performance, signed release, update/recovery | Mở rộng platform vội |
| M5 | Giá trị tổ chức không giám sát | Aggregate cohort, privacy relay, RBAC, audit | Individual health view |

## Scope change

Một feature chỉ được chuyển vào milestone sớm hơn khi:

1. Có problem và target user cụ thể.
2. Không làm trễ exit criteria hiện tại.
3. Privacy/safety/data impact đã đánh giá.
4. Acceptance và owner đã rõ.
5. Có thứ gì bị loại khỏi scope tương ứng hoặc có nguồn lực mới.

Không dùng “đã code gần xong” làm lý do thay đổi mục tiêu sản phẩm.

