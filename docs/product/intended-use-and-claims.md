# Intended Use and Claims Matrix

```yaml
decision_status: proposed
release_scope: m1-m5
owner: product-and-clinical-owner
review: { product: required, clinical: required, privacy: not-required }
last_reviewed: 2026-07-14
```

## Intended use

EyeMate hỗ trợ người trưởng thành sử dụng màn hình tự ghi nhận triệu chứng khó chịu ở mắt, theo dõi một số hành vi thị giác có thể quan sát bằng camera tùy chọn, nhận can thiệp hành vi và xem xu hướng. Ứng dụng có thể hướng dẫn người dùng cân nhắc đánh giá chuyên môn theo rule và nội dung đã được duyệt.

## Claims được phép sau review

| Loại | Câu được phép | Điều kiện |
|---|---|---|
| Measurement | “Camera ghi nhận khoảng cách thuộc vùng gần hơn vùng đã hiệu chuẩn.” | Quality đạt; thuật toán/version rõ |
| Missing data | “Điều kiện hiện tại chưa đủ để đo đáng tin cậy.” | Không suy thành bình thường |
| Pattern | “Các phiên gần đây cho thấy thời gian nhìn gần kéo dài thường lặp lại.” | Coverage/time window đủ theo spec |
| Action | “Thử rời tác vụ nhìn gần và đánh giá lại mức khó chịu sau khi nghỉ.” | Nội dung được duyệt; không gọi là điều trị |
| Trend | “Tỷ lệ thời gian ở vùng gần trong các phiên hợp lệ tăng so với tuần trước.” | Ghi missing days và coverage |
| Escalation | “Thông tin bạn cung cấp phù hợp với trường hợp nên cân nhắc đánh giá chuyên môn.” | Safety rule/content được duyệt |

## Claims bị cấm

- “Bạn bị khô mắt/cận thị/yếu cơ mắt/rối loạn điều tiết.”
- “Nguy cơ mắc bệnh là 84%.”
- “Camera xác nhận chớp mắt không hoàn toàn” trước validation phù hợp; dùng “proxy”.
- “VLI 68/100 là mức bệnh.”
- “Bạn còn X giờ nhìn màn hình an toàn.”
- “Hệ thống ngăn bệnh tiến triển.”
- “Báo cáo tương đương bệnh án/kết quả khám.”
- “Dữ liệu đã hoàn toàn ẩn danh” nếu chỉ hash/pseudonymize.

## Quy tắc nội dung

- Mỗi result hiển thị nguồn dữ liệu, missing data, confidence và version.
- Disclaimer không được dùng để hợp thức hóa một claim sai ở tiêu đề hoặc biểu đồ.
- Không dùng màu/sao/xác suất khiến product index bị hiểu là severity lâm sàng.
- Bản dịch nội dung safety phải được duyệt theo cả câu; không nối string động làm đổi nghĩa.
- Marketing, pitch, website và UI dùng cùng claim catalogue version.

## Review gate

Trước M1 pilot, clinical owner phải duyệt: intended use, Safety Gate question/rule/action, symptom wording, tên pattern, professional guidance và toàn bộ câu có thể bị hiểu là medical advice.

