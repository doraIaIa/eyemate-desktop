# Feature 003 — Symptom Checkup

```yaml
decision_status: proposed
release_scope: m1
owner: product-and-clinical-owner
review: { clinical: required, product: required, privacy: required }
```

## Outcome

Người dùng hoàn thành một self-check có cấu trúc, dùng được khi không có camera và nhận report nêu evidence, missing data và action; không nhận chẩn đoán/xác suất bệnh.

## In scope

Core questionnaire, branching, task/context, optional camera choice, partial/insufficient result và checkup persistence.

## Out of scope

Multi-disease prediction, free-text clinical inference, treatment score và adaptive questionnaire bằng LLM.

## Requirements

- `FR-CHK-001`: Questionnaire/core/branch/scoring có version độc lập.
- `FR-CHK-002`: License, validated use và bản dịch phải được ghi trước khi đưa questionnaire vào release.
- `FR-CHK-003`: Raw structured answers tách derived value; không chỉ lưu tổng điểm.
- `FR-CHK-004`: Hỗ trợ `UNSURE/PREFER_NOT_TO_ANSWER` và missing semantics.
- `FR-CHK-005`: Camera là tùy chọn; survey-only tạo report ghi rõ source coverage.
- `FR-CHK-006`: Checkup bị dừng không được lưu như `COMPLETED`; dùng `CANCELLED/PARTIAL/SAFETY_STOP`.
- `FR-CHK-007`: Silent model fallback bị cấm; method/version/status phải quan sát được.
- `FR-CHK-008`: Output tuân Claims Matrix và không dùng disease probability.
- `FR-CHK-009`: Report snapshot giữ questionnaire/scoring/safety/algorithm/schema version.

## State

```text
INTRO → SAFETY_GATE → SYMPTOMS → CAMERA_CHOICE
→ SURVEY_ONLY_ANALYSIS | QUALITY_GATE → ANALYSIS
→ REPORT | INSUFFICIENT_REPORT
```

Mọi bước có cancel; crash recovery không tự hoàn tất checkup.

