# Data Contract

```yaml
decision_status: proposed
release_scope: m0-m4
owner: data-owner
review: { product: required, privacy: required, security: required }
```

## Ba tầng dữ liệu

| Tầng | Ví dụ | Persistence mặc định |
|---|---|---|
| Raw sensor | frame, landmarks, EAR sample, pose sample | RAM only; không log, không crash attachment |
| Measurement window | quality ratio, distance distribution, blink proxy aggregate | Local ngắn hạn theo retention |
| Session/report | summary, evidence refs, action, version | Local lâu hơn theo user control |

## Entity tối thiểu

| Entity | Khóa/quan hệ | Trường bắt buộc |
|---|---|---|
| `ConsentRecord` | `consentId` | purpose, scope, textVersion, status, decidedAt |
| `DeviceGeometryProfile` | device/display tuple | cameraIdHash, resolution, displayIdHash, geometry, version, validity |
| `CalibrationProfile` | geometry profile | anchors, residual, method, quality, algorithmVersion, createdAt, staleReason |
| `MeasurementWindow` | session | start/end, coverage, quality, typed metrics, algorithmVersion |
| `WorkSession` | user-local | type, start/end, status, context, coverage, summaryVersion |
| `SymptomCheckup` | checkup | answers, questionnaireVersion, safetyOutcome, sourceCoverage |
| `BaselineSnapshot` | context | sufficientData, distribution, sourceWindowRange, version, staleAt |
| `PatternResult` | scope/window | ruleId/version, evidenceRefs, missing, confidence, expiresAt |
| `ReportSnapshot` | source records | schemaVersion, renderedSemanticsVersion, evidenceRefs, createdAt |
| `MigrationRecord` | schema change | from/to, status, backupRef, started/finished, failureCode |

## Typed missing data

Không dùng `null` cho mọi trường hợp. Contract phải phân biệt:

```text
value
status
reasonCode
quality
algorithmVersion
measuredAt
```

`status` quyết định value có hợp lệ không. `reasonCode` dùng enum versioned, không dùng free text làm logic.

## Semantics

- Đơn vị nằm trong field hoặc schema, ví dụ `distanceMm`, `durationMs`, `ratePerMinute`.
- Floating score ghi range và rounding policy.
- Event time và ingestion time tách riêng nếu khác nhau.
- ID nội bộ ngẫu nhiên; email không phải health-data key.
- Organization aggregate dùng miền ID khác dữ liệu cá nhân.
- Event consumer idempotent qua event ID hoặc idempotency key.
- Breaking change cần schema version, migration và compatibility window.

## Event rule

Event là fact đã xảy ra, tên quá khứ và versioned, ví dụ `NearEpisodeConfirmed.v1`. Không dùng event như command `HandleNear`. Chỉ tạo event khi có ít nhất một consumer thực tế hoặc cần retry/audit; không xây event bus tổng quát trong M1.

