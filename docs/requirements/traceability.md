# Traceability Matrix

## M5 Enterprise Discovery Traceability

These mappings are proposed and not implemented.

| Requirement range | Dictionary/policy source | Spec | Negative acceptance source |
|---|---|---|---|
| `ENT-TRUST-*` | `docs/product/enterprise/enterprise-trust-center-requirements.md` | `specs/015-enterprise-trust-and-deployment/spec.md` | `specs/015-enterprise-trust-and-deployment/acceptance.md` |
| `ENT-ENR-*` | `docs/product/enterprise/enterprise-user-journeys.md` | `specs/016-employee-transparency-and-enrollment/spec.md` | `specs/016-employee-transparency-and-enrollment/acceptance.md` |
| `ENT-REL-*` | `docs/privacy-security/enterprise/privacy-relay-contract.md` | `specs/017-privacy-relay-and-aggregation/spec.md` | `specs/017-privacy-relay-and-aggregation/acceptance.md` |
| `ENT-INS-*` | `docs/data/enterprise/enterprise-metric-dictionary.md` | `specs/018-organizational-insights/spec.md` | `specs/018-organizational-insights/acceptance.md` |
| `ENT-CAM-*` | `docs/product/enterprise/transparent-campaign-policy.md` | `specs/019-transparent-campaigns/spec.md` | `specs/019-transparent-campaigns/acceptance.md` |
| `ENT-RPT-*` | `docs/product/enterprise/program-implementation-report-policy.md` | `specs/020-program-implementation-report/spec.md` | `specs/020-program-implementation-report/acceptance.md` |
| `ENT-RBAC-*` | `docs/product/enterprise/enterprise-actors-and-permissions.md` | `specs/021-enterprise-rbac-and-audit/spec.md` | `specs/021-enterprise-rbac-and-audit/acceptance.md` |

| Prototype screen | Journey/spec trace |
|---|---|
| Employee transparency | Employee enrollment, transparency notice, aggregate participation choice, unlink; `ENT-ENR-*` |
| IT Admin | License provisioning, IT deployment, app/version health; `ENT-TRUST-*` |
| HR/EHS Insights | Monthly aggregate insights, small cohort suppression; `ENT-INS-*`, `ENT-REL-*` |
| Campaign | Campaign creation, preview, opt-out, pause/stop; `ENT-CAM-*` |
| EyeMate Program Implementation & Participation Report | EyeMate Program Implementation & Participation Report, correction/revocation, QR semantics; `ENT-RPT-*` |
| Privacy Audit | Query gate, denied queries, audit review; `ENT-RBAC-*`, `ENT-REL-*` |

Deferred scope remains deferred, not approved backlog: industry benchmark, ROI calculator, Bronze/Silver/Gold certificate, legal/ISO/HSE certification, individual health dashboard, production SSO/SCIM, production customer analytics, public QR verification service, differential privacy until justified, and AI-generated management recommendations without rule/validation.

### Enterprise Privacy Invariant Trace

| Invariant | Negative acceptance source |
|---|---|
| `ENT-PRIV-001` camera/raw frame/video/landmark forbidden | `AC-ENT-ENR-103`, `AC-ENT-REL-105`, `AC-ENT-CAM-102` |
| `ENT-PRIV-002` symptom/personal report forbidden | `AC-ENT-INS-101`, `AC-ENT-RPT-104`, `AC-ENT-RBAC-101` |
| `ENT-PRIV-003` blink/distance timeline forbidden | `AC-ENT-REL-105` |
| `ENT-PRIV-004` personal baseline local | `AC-ENT-ENR-002`, `AC-ENT-RBAC-101` |
| `ENT-PRIV-005` no focus/fatigue/productivity/health score | `AC-ENT-INS-103`, `AC-ENT-RPT-105` |
| `ENT-PRIV-006` no real-time presence | `AC-ENT-INS-104` |
| `ENT-PRIV-007` no individual break/opt-out visibility | `AC-ENT-ENR-101`, `AC-ENT-ENR-106`, `AC-ENT-CAM-105` |
| `ENT-PRIV-008` no manager drill-down | `AC-ENT-ENR-105`, `AC-ENT-INS-101`, `AC-ENT-RBAC-101` |
| `ENT-PRIV-009` no ranking/leaderboard | `AC-ENT-CAM-103`, `AC-ENT-CAM-104`, `AC-ENT-INS-103` |
| `ENT-PRIV-010` no forced camera | `AC-ENT-ENR-103`, `AC-ENT-CAM-102` |
| `ENT-PRIV-011` no performance/discipline/compensation use | `AC-ENT-CAM-107`, `AC-ENT-RPT-105` |
| `ENT-PRIV-012` no direct identity-to-insights join | `AC-ENT-TRUST-103`, `AC-ENT-REL-108`, `AC-ENT-RBAC-104` |
| `ENT-PRIV-013` small cohort suppression | `AC-ENT-REL-103` |
| `ENT-PRIV-014` UNKNOWN remains UNKNOWN | `AC-ENT-ENR-104`, `AC-ENT-REL-109` |
| `ENT-PRIV-015` support cannot bypass privacy gate | `AC-ENT-RBAC-102`, `AC-ENT-RPT-103` |

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
