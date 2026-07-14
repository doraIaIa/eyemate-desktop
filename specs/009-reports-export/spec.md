# Feature 009 — Reports, Trends and Export

```yaml
decision_status: proposed
release_scope: m1-m3
owner: product-owner
review: { product: required, clinical: required, privacy: required }
```

## Report layers

- M1 Checkup Report.
- M2 Daily Summary và local Professional Summary export.
- M3 Weekly Digest; Monthly chỉ khi có đủ dữ liệu dài hạn.

## Required report structure

1. Summary không medical claim.
2. Evidence và data source/coverage.
3. Pattern/confidence/missing data.
4. Action plan nhỏ, đã duyệt.
5. Limitation và khi nào cân nhắc chuyên gia.
6. Version/provenance.

## Requirements

- `FR-RPT-001`: Report ghi source `SURVEY_ONLY/CAMERA_ASSISTED/MIXED` và coverage thực.
- `FR-RPT-002`: Report snapshot chứa schema, questionnaire, scoring, algorithm, pattern, content version.
- `FR-RPT-003`: Report cũ render theo snapshot semantics; không tính lại âm thầm.
- `FR-RPT-004`: Trend ghi missing days, valid coverage, timezone/day-boundary semantics.
- `FR-RPT-005`: Export có preview, field selection, destination confirmation và disclaimer.
- `FR-RPT-006`: App không tự gửi export; history chỉ ghi metadata an toàn.
- `FR-RPT-007`: PDF/print output ghi rõ không phải chẩn đoán/bệnh án.
- `FR-RPT-008`: Professional Summary ưu tiên dữ liệu người dùng chọn và thông tin hữu ích; không đổ raw time series.

## Edge cases

Legacy data, version không còn renderer, timezone đổi, missing weeks, partial checkup, export path unavailable và user cancel giữa export.

