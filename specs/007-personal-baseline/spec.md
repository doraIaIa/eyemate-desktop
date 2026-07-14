# Feature 007 — Personal Baseline

```yaml
decision_status: proposed
release_scope: m3
owner: data-product-owner
review: { product: required, privacy: required }
```

## Outcome

So sánh người dùng với dữ liệu hợp lệ của chính họ trong context tương tự, đồng thời nói rõ khi baseline đang học, không đủ hoặc đã stale. Baseline là tham chiếu cá nhân, không phải chuẩn sức khỏe.

## Context đề xuất

Task type, time bucket, device geometry, camera profile, glasses/contact context nếu user cung cấp, và session mode. Chỉ tách context khi đủ dữ liệu; tránh nhóm quá nhỏ.

## Requirements

- `FR-BAS-001`: State gồm `LEARNING/READY/STALE/INSUFFICIENT/RESET`.
- `FR-BAS-002`: Readiness dựa trên số window/session hợp lệ, coverage và phân bố theo thời gian, không chỉ số ngày.
- `FR-BAS-003`: Chỉ update từ evidence quality đạt, context xác định và không bị user đánh dấu invalid.
- `FR-BAS-004`: Guardrail không cho near/break bất lợi lặp lại trở thành “tốt”.
- `FR-BAS-005`: Snapshot lưu source range, context definition, sample size, distribution, readiness, version và validity.
- `FR-BAS-006`: Device/algorithm/context definition đổi tạo stale/rebuild rule; không merge âm thầm.
- `FR-BAS-007`: User reset baseline độc lập và xem ảnh hưởng trước xác nhận.
- `FR-BAS-008`: Baseline update có rate limit/outlier policy và rollback snapshot.

## Open decision

Baseline readiness threshold phải chốt sau pilot; không hard-code `5–7 ngày` như bảo đảm đủ dữ liệu.

