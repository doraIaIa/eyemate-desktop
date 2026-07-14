# Feature 010 — User Data Management

```yaml
decision_status: proposed
release_scope: m1-m4
owner: privacy-and-data-owner
review: { privacy: required, security: required, product: required }
```

## Outcome

Người dùng xem loại dữ liệu đang lưu, retention, consent, export và thực hiện reset/delete với kết quả trung thực và phục hồi an toàn.

## In scope

Data inventory UI, consent withdrawal, reset calibration, reset baseline, delete history/all, export selected data, migration/recovery status.

## Out of scope

Cloud account deletion, share-link revoke và enterprise subject request trước M5.

## Requirements

- `FR-DAT-001`: UI liệt kê entity category, purpose, retention, approximate records/period và local/cloud status.
- `FR-DAT-002`: Reset calibration, reset baseline, delete history và delete all là action khác nhau.
- `FR-DAT-003`: Destructive action có impact preview và confirmation; không dùng dark pattern.
- `FR-DAT-004`: Kết quả là `DELETED/PARTIALLY_DELETED/FAILED` với reason; không nói thành công khi file ngoài app còn tồn tại.
- `FR-DAT-005`: Consent withdrawal dừng collection tương lai độc lập với deletion dữ liệu cũ.
- `FR-DAT-006`: Delete/retry idempotent; crash không tạo database nửa xóa nửa giữ ngoài documented partial state.
- `FR-DAT-007`: Migration/recovery giữ backup theo policy và công bố khi data write bị khóa.
- `FR-DAT-008`: Export schema versioned, previewable và không tự upload.
- `FR-DAT-009`: Legacy data giữ provenance và có lựa chọn migrate/start fresh theo plan.

