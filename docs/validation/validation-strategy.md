# Validation Strategy

```yaml
decision_status: proposed
owner: validation-owner
review: { clinical: required, product: required, privacy: required }
```

## Nguyên tắc

- Test software correctness không thay thế measurement validation.
- Pilot usability không chứng minh hiệu quả y tế.
- Average metric không đủ; báo distribution, failure/unknown và subgroup/device conditions.
- Không chọn threshold trên test set rồi báo chính test set là validation cuối.

## Test pyramid

### Unit

State machine, missing semantics, scoring/rule, hysteresis, dwell, baseline update, pattern expiry, content key, migration transform.

### Integration

Permission/consent, camera adapter→quality→estimator, session restart, DB transaction/migration, export, idempotent events, local assets/offline.

### Acceptance

Camera-off, denied, busy, low quality, device changed, `UNKNOWN`, Safety stop, partial checkup, delete/export, migration failure, old-report render.

### Architecture/security

Dependency boundary/cycle, forbidden logging fields, network allowlist, SBOM/license/vulnerability, tampered artifact, secret scan.

## Distance protocol

- Ground truth bằng phép đo vật lý có quy trình ghi sai số.
- Khoảng cách 40–80 cm và boundary quanh zone; nhiều webcam/resolution/display geometry.
- Điều kiện: ánh sáng, kính, pose, occlusion, camera ngoài, multi-monitor.
- Tách participants/conditions giữa tuning và final evaluation khi có thể.
- Metric: MAE, median, p95, zone confusion matrix, calibration success, unknown rate, false-near alert, latency, stability/drift.
- Chỉ hiển thị cm khi pre-registered gate đạt; nếu không dùng zone/range.

## Blink/proxy protocol

- Manual annotation protocol có ít nhất hai annotator cho subset; báo agreement.
- Metric event precision/recall/F1, rate error, incomplete-proxy confusion, valid-frame/unknown.
- Test kính, glare, pose, different eye shapes, frame drops.
- Không đổi tên proxy thành clinical measurement nếu chưa có validation phù hợp.

## Product pilot

M1/M2 pilot nhỏ đánh giá completion, time-to-result, comprehension, false-alert report, nudge burden, consent comprehension, delete/export success và willingness to continue. Báo dropout/missing, không chỉ người hoàn thành.

## Validation gates

- `VAL-001`: Protocol và metric được chốt trước final benchmark.
- `VAL-002`: Dataset provenance, consent, annotation và split được ghi.
- `VAL-003`: Release feature level (`off`, `internal`, `zone-only`, `numeric`) suy từ gate, không từ demo cảm tính.
- `VAL-004`: Known limitations đi vào UI/release notes.
- `VAL-005`: Algorithm/config version trong benchmark trùng build pilot.

