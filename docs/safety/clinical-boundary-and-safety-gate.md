# Clinical Boundary and Safety Gate

```yaml
decision_status: proposed
release_scope: m1+
owner: clinical-owner
review: { clinical: required, product: required }
```

## Boundary

EyeMate chỉ xử lý ba nhóm:

1. Self-reported symptom/context.
2. Behavioral proxy quan sát được trong điều kiện camera đủ chất lượng.
3. Xu hướng và pattern của dữ liệu trên theo thời gian.

EyeMate không suy ra bệnh, tổn thương, khúc xạ, nhãn áp, tear-film status hoặc hiệu quả điều trị.

## Safety Gate model

Safety Gate là decision table do chuyên gia duyệt, chạy trước scoring/camera inference. Model/LLM không tạo, sửa hoặc bỏ qua rule tại runtime.

Mỗi rule cần:

```text
ruleId
ruleVersion
questionVersion
triggerCondition
uncertainAnswerBehavior
stopOrContinue
approvedTitle
approvedBody
urgencyClass
recommendedAction
reviewOwner
reviewedAt
expiresAt
```

## Urgency class

Tên/câu chữ cuối phải được chuyên gia duyệt. Domain chỉ cần phân biệt:

- `SELF_CARE_CONTINUE`: không có trigger chặn; có thể tiếp tục self-check.
- `ROUTINE_PROFESSIONAL_CONSIDERATION`: nên cân nhắc đánh giá chuyên môn không khẩn cấp.
- `PROMPT_PROFESSIONAL_EVALUATION`: dừng phần suy luận wellness và hiển thị hướng dẫn đã duyệt.
- `URGENT_GUIDANCE`: chỉ dùng nếu clinical owner định nghĩa rule, wording và locale phù hợp.
- `UNCERTAIN`: câu trả lời không đủ; hỏi lại hoặc chọn đường an toàn được duyệt.

Không hiển thị tên bệnh hoặc lời bảo đảm “không sao”.

## Safety invariant

- `SAFE-001`: Safety Gate chạy trước symptom scoring và camera measurement.
- `SAFE-002`: Rule có version, owner, review date và expiry/review cadence.
- `SAFE-003`: Trigger không bị model confidence ghi đè.
- `SAFE-004`: Khi rule yêu cầu dừng, app không tạo VLI/risk/pattern như kết luận thay thế.
- `SAFE-005`: “Không chắc/không muốn trả lời” có behavior rõ, không mặc định `false`.
- `SAFE-006`: Trigger reason chỉ lưu khi consent/scope cho phép và retention đã công bố.
- `SAFE-007`: Nội dung dịch được duyệt nguyên câu và có snapshot version trong report nếu xuất.

## Content catalogue

Trước pilot phải có file catalogue riêng chứa nội dung đã duyệt. Không viết câu y tế trực tiếp rải rác trong code. UI tham chiếu content key + version; test đảm bảo không có content key thiếu.

## Failure behavior

- Catalogue/rule không load: dừng checkup một cách an toàn; không fallback sang AI-generated text.
- Version không tương thích: không đánh giá; hướng dẫn thử lại/cập nhật.
- Lưu trigger thất bại: vẫn hiển thị hướng dẫn; báo rõ checkup chưa được lưu.

