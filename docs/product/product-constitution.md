# Product Constitution

```yaml
decision_status: proposed
release_scope: all
owner: product-owner
review: { product: required, clinical: required, privacy: required }
last_reviewed: 2026-07-14
```

## Sứ mệnh

Giúp người dùng màn hình hiểu và cải thiện thói quen thị giác bằng dữ liệu có giới hạn rõ, can thiệp nhỏ đúng lúc và quyền kiểm soát dữ liệu thực sự.

## Giá trị

1. **Safety before engagement:** không đổi độ an toàn lấy retention.
2. **Evidence before conclusion:** kết quả truy được về dữ liệu, quality và version.
3. **Abstention is valid:** không đo được là một kết quả hợp lệ.
4. **Personalization with guardrails:** cá nhân hóa timing/context, không hợp thức hóa hành vi bất lợi.
5. **Local-first ownership:** tính năng cá nhân cốt lõi không cần tài khoản hoặc Internet.
6. **Progressive complexity:** rule minh bạch trước ML; modular monolith trước distributed system.
7. **Testable behavior:** từ “tốt/nhanh/chính xác” phải được thay bằng acceptance hoặc metric.

## Non-goals

EyeMate không:

- chẩn đoán, điều trị, kê đơn hoặc thay thế khám mắt;
- đo khúc xạ, nhãn áp, võng mạc, tear film hay tổn thương bề mặt nhãn cầu;
- xếp hạng sức khỏe nhân viên;
- tự động gửi báo cáo cho bác sĩ, trường học hoặc doanh nghiệp;
- tự thay đổi scaling/display/system setting không có xác nhận;
- tối ưu thời gian nhìn màn hình bằng một “eye budget” chung;
- dùng dataset không đúng nhãn để đổi tên đầu ra thành mỏi mắt/khô mắt;
- triển khai cloud, federated learning hoặc continual ML trước khi có mục tiêu, consent, dataset và validation protocol.

## Nguyên tắc ra quyết định

Khi hai mục tiêu xung đột, ưu tiên theo thứ tự:

1. An toàn và claim đúng.
2. Privacy và quyền kiểm soát.
3. Data semantics và khả năng phục hồi.
4. Tính hữu ích cho người dùng.
5. Reliability/accessibility.
6. Performance.
7. Tốc độ phát triển và độ bóng UI.

Không dùng thứ tự này để ghi đè yêu cầu pháp lý hoặc clinical review.

