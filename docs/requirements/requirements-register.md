# Requirements Register

## Enterprise Discovery Addendum

The following requirement ranges are `proposed` and `implementation_status: not-started`. They exist only to support M5 Enterprise Discovery review. They do not approve backend, production dashboard, authentication, SSO, tenant service, cloud sync, database work or M5 implementation.

| Prefix | Feature/source | Scope | Owner | Review chính |
|---|---|---|---|---|
| `ENT-TRUST-001..005` | Enterprise trust and deployment | M5 discovery | Product/IT/Security | Privacy/Security/Legal |
| `ENT-ENR-001..009` | Employee transparency and enrollment | M5 discovery | Product/Privacy | Privacy/Legal |
| `ENT-REL-001..005` | Privacy relay and aggregation | M5 discovery | Privacy/Data/Security | Privacy/Security/Legal |
| `ENT-INS-001..005` | Organizational insights | M5 discovery | Product/Data | Privacy/Product |
| `ENT-CAM-001..006` | Transparent campaigns | M5 discovery | Product/Privacy | Privacy/Legal |
| `ENT-RPT-001..005` | EyeMate Program Implementation & Participation Report | M5 discovery | Product/Legal | Privacy/Legal |
| `ENT-RBAC-001..005` | Enterprise RBAC and audit | M5 discovery | Security/Privacy | Security/Privacy |

Đây là inventory cấp cao, không thay thế nội dung feature spec. Trạng thái ban đầu là `proposed` trừ khi ghi khác.

| Prefix | Feature/source | Scope | Owner | Review chính |
|---|---|---|---|---|
| `FR-ONB-001..009` | Onboarding/consent | M1 | Product | Privacy |
| `SAFE-GATE-001..008` | Safety Gate | M1 | Clinical | Clinical/Product |
| `FR-CHK-001..009` | Symptom checkup | M1 | Product/Clinical | Clinical/Privacy |
| `FR-CAM-001..008` | Camera quality | M0–M2 | Measurement | Privacy/Security |
| `FR-DST-001..010` | Distance | M0–M2 | Measurement | Validation/Product |
| `FR-CMP-001..009` | Work Companion | M2 | Product | Privacy |
| `FR-BAS-001..008` | Baseline | M3 | Data/Product | Privacy |
| `FR-PAT-001..005` | Patterns | M3 | Domain/Product | Clinical |
| `FR-VLI-001..005` | VLI | M3 | Domain/Product | Clinical |
| `FR-RPT-001..008` | Reports/export | M1–M3 | Product | Clinical/Privacy |
| `FR-DAT-001..009` | User data management | M1–M4 | Privacy/Data | Privacy/Security |
| `PRIV-CON-001..007` | Consent/data flow | M1+ | Privacy | Privacy |
| `DATA-DEL-001..006` | Retention/deletion | M1+ | Privacy/Data | Privacy/Security |
| `INV-001..010` | Domain invariants | All | Domain | Product/Tech |
| `VAL-001..005` | Validation | M0–M3 | Validation | Clinical/Product |
| `REL-001..008` | Release/recovery | M0–M4 | Release | Security |

## Quy tắc coverage

- Requirement `confirmed` phải có ít nhất một acceptance hoặc automated invariant test trước khi `done`.
- Clinical/privacy review gate có thể là evidence thủ công nhưng phải ghi approver/version/date.
- Một acceptance có thể cover nhiều requirement; mapping phải explicit trong traceability.
- Requirement không áp dụng phải ghi rationale; không xóa khỏi register.

## Trạng thái implementation

Sau khi repository V2 được scaffold, thêm bảng machine-readable (YAML/CSV) với:

```text
requirement_id
decision_status
release_scope
implementation_status
owner
spec_path
acceptance_ids
test_paths
last_verified_commit
```

Không điền `test_paths` dự đoán trước khi codebase tồn tại.
