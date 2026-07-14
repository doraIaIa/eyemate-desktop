# Traceability Matrix

## M1 critical flows

| Flow | Requirements | Acceptance | Evidence cần có |
|---|---|---|---|
| First run không camera | `FR-ONB-*`, `PRIV-CON-*` | `AC-ONB-001..007` | UI acceptance + consent persistence |
| Safety stop | `SAFE-GATE-*` | `AC-SAF-001..006` | Clinical approval + rule/content tests |
| Survey-only checkup | `FR-CHK-*` | `AC-CHK-001..007` | Acceptance + report snapshot fixture |
| Camera low quality | `FR-CAM-*` | `AC-CAM-001..006` | Integration + forbidden-field scan |
| Distance zone | `FR-DST-*`, `VAL-*` | `AC-DST-001..008` | Benchmark report + state tests |
| Checkup report/export | `FR-RPT-*` | `AC-RPT-*` | Golden snapshot/PDF content checks |
| User control/delete | `FR-DAT-*`, `DATA-DEL-*` | `AC-DAT-*` | DB integration + recovery fixture |

## Cross-cutting invariants

| Invariant | Áp dụng | Verification |
|---|---|---|
| Missing không thành zero | Checkup, camera, distance, baseline, VLI, report | Property/unit + acceptance fixture |
| Raw frame RAM-only | Camera, distance, diagnostics | Static scan + integration instrumentation |
| Old report semantics immutable | Reports, migration, release | Golden files qua multi-version update |
| Camera optional | Onboarding, checkup, companion | Camera-denied acceptance suite |
| No forbidden claims | Safety, pattern, VLI, reports, marketing | Versioned content catalogue + content scan + review |
| Consent purpose-bound | Camera, telemetry, export/share | Consent state integration tests |

## Cập nhật

Traceability được cập nhật trong cùng change set khi requirement/acceptance/test thay đổi. CI về sau nên kiểm tra:

- không có requirement ID trùng;
- mọi confirmed M1 requirement có acceptance mapping;
- link/path tồn tại;
- deprecated requirement không bị test mới tham chiếu;
- content/schema/algorithm version không thiếu trong fixture liên quan.

