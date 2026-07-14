# Feature 008 — Pattern Engine and Visual Load Index

```yaml
decision_status: proposed
release_scope: m3
owner: domain-product-owner
review: { product: required, clinical: required }
```

## Outcome

Tổng hợp evidence thành pattern có giải thích và một product index về tải/hành vi thị giác, không tạo tên bệnh hoặc severity lâm sàng.

## Pattern contract

```text
patternId/version
scope/timeWindow
status: PRESENT | NOT_PRESENT | INSUFFICIENT
requiredEvidence
evidenceRefs
missingEvidence
confidence
actionKey/version
expiresAt
```

## Requirements

- `FR-PAT-001`: Mỗi pattern có required/optional evidence, missing behavior, abstention, scope và expiry.
- `FR-PAT-002`: Pattern name/content tuân Claims Matrix; không là diagnosis.
- `FR-PAT-003`: UI cho xem evidence, missing data và coverage.
- `FR-PAT-004`: Rule thay đổi tạo version mới; report cũ không tính lại âm thầm.
- `FR-PAT-005`: Pattern không persist vô hạn; refresh/expiry deterministic.
- `FR-VLI-001`: VLI là product index; score và confidence tách riêng.
- `FR-VLI-002`: `UNKNOWN/NOT_MEASURED` không đóng góp như zero load hoặc good behavior.
- `FR-VLI-003`: Weight/normalization/missing policy/range/rounding có version.
- `FR-VLI-004`: Không hiển thị VLI nếu coverage dưới gate; dùng insufficient result.
- `FR-VLI-005`: Không dùng VLI để kích hoạt Safety Gate hoặc kết luận bệnh.

## MVP strategy

Rule-based, versioned và deterministic. ML temporal chỉ được nghiên cứu sau dataset/label/protocol riêng và không thay đổi semantics mà không có model governance.

