# Feature 002 — Safety Gate

```yaml
decision_status: proposed
release_scope: m1
owner: clinical-owner
review: { clinical: required, product: required }
```

## Problem

Self-check không phù hợp với mọi tình huống. App phải nhận biết bằng rule đã duyệt khi nên dừng và hướng người dùng tới đánh giá chuyên môn, không để model hoặc camera tạo lời khuyên y tế.

## In scope

Versioned questions, deterministic rule table, uncertain-answer path, approved guidance, stop/continue outcome và local provenance.

## Out of scope

Diagnosis, emergency service integration, LLM triage, treatment recommendation và clinician portal.

## Requirements

- `SAFE-GATE-001`: Chạy trước symptom scoring và camera measurement.
- `SAFE-GATE-002`: Rule/content có ID, version, owner, review/expiry date.
- `SAFE-GATE-003`: Model output không tạo/sửa/bỏ qua trigger.
- `SAFE-GATE-004`: Stop outcome không tạo wellness score/pattern thay thế.
- `SAFE-GATE-005`: `UNSURE` và `PREFER_NOT_TO_ANSWER` có branch được duyệt; không map `false`.
- `SAFE-GATE-006`: Rule/content unavailable hoặc incompatible tạo safe failure, không AI fallback.
- `SAFE-GATE-007`: Lưu trigger reason chỉ theo consent/retention; report snapshot giữ content/rule version.
- `SAFE-GATE-008`: UI không khẳng định bệnh hoặc bảo đảm không có vấn đề.

## Output

```text
CONTINUE_SELF_CHECK
STOP_WITH_PROFESSIONAL_GUIDANCE
RETRY_REQUIRED
UNAVAILABLE_SAFE_STOP
```

Chi tiết urgency và content catalogue thuộc `docs/safety/clinical-boundary-and-safety-gate.md`.

