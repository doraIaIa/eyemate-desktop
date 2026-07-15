# D-004 - Questionnaire cho VietFuture 2026

```yaml
decision_status: APPROVED
decision: EYEMATE_WELLNESS_QUESTIONNAIRE
release_scope: m1
approved_by: Owner
approved_date: 2026-07-15
review:
  product: approved-by-owner
  clinical: not-a-clinical-instrument
  privacy: required
last_reviewed: 2026-07-15
```

## Quyết định

Completion prompt yêu cầu thay OSDI-12 bằng một questionnaire được gọi là `DEQ-5`, gồm năm câu trả lời theo thang 0-3, tổng 0-15 và bốn mức `Bình thường/Nhẹ/Trung bình/Nặng`.

Owner đã chọn đường B ngày 2026-07-15: triển khai `EyeMate Symptom Check` gồm năm câu tự phát triển, thang 0-3 và tổng 0-15. Questionnaire không dẫn nguồn DEQ-5/OSDI, không tự nhận là validated clinical tool và chỉ trả ba nhóm hành động phi lâm sàng.

## Bằng chứng mâu thuẫn

- Bài báo validation gốc: Chalmers RL, Begley CG, Caffery B, *Validation of the 5-Item Dry Eye Questionnaire (DEQ-5)*, 2010, DOI `10.1016/j.clae.2009.12.010`: https://pubmed.ncbi.nlm.nih.gov/20093066/
- Abstract của bài validation gốc mô tả năm thành phần là tần suất `watery eyes`, `discomfort`, `dryness` và cường độ cuối ngày của `discomfort`/`dryness`. Bộ câu trong completion prompt lại hỏi nhạy sáng, mờ mắt thoáng qua và khó chịu khi nhìn màn hình/đọc sách, nên không phải cùng item contract.
- Bài validation gốc đề xuất ngưỡng `>6` cho screening và `>12` để cân nhắc kiểm tra thêm Sjögren-related dry eye; không định nghĩa bốn severity band 0-3/4-6/7-10/11-15 như completion prompt.
- TFOS DEWS II Diagnostic Methodology dùng DEQ-5 như questionnaire sàng lọc với ngưỡng `>=6`, không dùng các band 0-3/4-6/7-10/11-15 trong completion prompt: https://tfosdewsreport.org/report-diagnostic_methodology/131_36/en/
- TFOS ghi biểu mẫu DEQ-5 được tái bản với sự cho phép của Indiana University. Vì vậy tuyên bố `public domain` trong completion prompt chưa được chứng minh.
- Các nguồn nghiên cứu mô tả tổng điểm DEQ-5 trên thang 0-22. Bộ năm câu 0-3 trong prompt chỉ có tối đa 15 điểm, nên không thể được coi là cùng scoring contract.

## Bằng chứng về bản dịch

- Bản dịch tiếng Thổ Nhĩ Kỳ được công bố năm 2024 dùng forward translation, backward translation, đánh giá chất lượng bản dịch, pilot trên 10 người và kiểm định reliability/validity: https://pubmed.ncbi.nlm.nih.gov/39294050/
- Bản chuyển ngữ cho dân số Mexico dùng quy trình MAPI, nhiều vòng dịch/chuyển ngữ và committee review trước validation: https://pubmed.ncbi.nlm.nih.gov/30644026/
- Do đó năm câu tiếng Việt trong completion prompt là wording chưa có provenance/validation. Chỉ thêm disclaimer không biến một bản dịch tự soạn thành bản DEQ-5 đã được phê duyệt.

## Xung đột safety

Các recommendation mẫu sau không được đưa vào code hiện tại:

- `Mắt bạn đang ổn` là lời bảo đảm bị cấm bởi Clinical Boundary.
- `Thử nhỏ nước mắt nhân tạo` là khuyến nghị điều trị trực tiếp và vượt intended use wellness hiện hành.
- Nhãn `normal/mild/moderate/severe` khiến product score dễ bị hiểu như clinical severity, trái Claims Matrix.

Disclaimer không hợp thức hóa được một clinical claim hoặc scoring contract sai.

## Hai đường hợp lệ

### A. DEQ-5 chính thức

Cần đủ các artifact sau trước implementation:

1. Bằng chứng license/quyền sử dụng và phân phối trong ứng dụng.
2. Nội dung item và scoring contract chính thức, bao gồm tổng điểm 0-22.
3. Bản dịch tiếng Việt có owner, version và approval.
4. Clinical decision về cách diễn giải. Không tự thêm severity band hoặc recommendation ngoài instrument.
5. Product/Clinical/Privacy approval có tên người duyệt và ngày duyệt.

### B. EyeMate Wellness Check nguyên bản

Có thể dùng questionnaire sản phẩm do EyeMate sở hữu, nhưng:

- không gọi là DEQ-5 hoặc clinical instrument;
- không dùng cutoff/severity của DEQ-5;
- output chỉ mô tả self-reported evidence, missing data và action wellness đã duyệt;
- vẫn cần Product/Clinical review cho wording và recommendation trước demo công khai.

## Trạng thái implementation

`IMPLEMENTED_VERIFIED_UNCOMMITTED`. Questionnaire `eyemate-symptom-check/1.0.0` có đúng năm câu owner-approved, thang 0–3, tổng 0–15, ba nhóm hành động phi lâm sàng, missing fail-closed và disclaimer ở đầu/cuối flow. Approval không áp dụng cho bất kỳ item, scoring, severity band hoặc recommendation nào dưới tên DEQ-5/OSDI.
