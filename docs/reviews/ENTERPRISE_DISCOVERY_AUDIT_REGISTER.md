# Enterprise Discovery Audit Register

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
release_scope: m5-enterprise-discovery
implementation_status: not-started
```

| Path | Current statement | Authority | Status | Conflict | Proposed action | Rationale |
|---|---|---|---|---|---|---|
| `MASTER_SPEC.md` | Enterprise aggregate is M5/post-MVP, cohort-only with privacy threshold. | Product scope | KEEP | None | Keep, do not expand. | High-level boundary remains correct. |
| `MASTER_SPEC.md` | Enterprise must not receive personal record, symptom, report or risk. | Product invariant | KEEP | None | Trace into enterprise invariants. | Matches non-surveillance positioning. |
| `docs/product/release-scope.md` | M5 value is organizational without surveillance; no individual health view. | Release scope | KEEP | None | Trace to specs and negative acceptance. | Correct M5 boundary. |
| `docs/product/product-constitution.md` | EyeMate does not rank employee health or auto-send reports to organizations. | Product constitution | CLARIFY | Needs enterprise-specific wording. | Add enterprise invariant pack, leave original unchanged. | Personal constitution remains authoritative for existing product. |
| `docs/privacy/consent-and-data-flow.md` | Enterprise aggregate is post-MVP and requires separate legal/privacy design. | Privacy source | KEEP | None | Reference in relay contract. | Correctly blocks implementation. |
| `docs/privacy/threat-model.md` | Enterprise re-identification is high risk; no individual pipeline. | Security/privacy | KEEP | None | Expand in enterprise threat model. | Needs detailed M5 threat catalogue. |
| `specs/001-onboarding-consent/spec.md` | Enterprise enrollment out of scope for personal MVP. | Feature spec | KEEP | None | Do not modify. | Existing M1 scope remains unchanged. |
| `specs/006-work-companion/spec.md` | Productivity surveillance, employer visibility and keystroke tracking are out of scope. | Feature spec | KEEP | None | Mirror as enterprise negative acceptance. | Directly supports forbidden feature list. |
| `specs/010-user-data-management/spec.md` | Enterprise subject request is before M5, not current personal scope. | Feature spec | KEEP | None | Do not modify. | Enterprise data rights require separate design. |
| `PROJECT_STATUS.md` | M5 not started and may open as separate discovery track. | Status | UPDATE | Owner has now normalized Discovery decisions. | Update to M5 Discovery in review while implementation remains not started. | Status sync only. |
| `docs/privacy-security/README.md` | Defines Enterprise privacy/security authority. | Directory governance | KEEP | Avoids ambiguity with `docs/privacy/`. | Keep as M5 Enterprise Discovery index. | Prevents duplicate privacy authority. |
| `docs/product/enterprise/README.md` | Defines Enterprise product authority and approved-for-discovery category/report name. | Directory governance | KEEP | None | Keep as M5 Enterprise product index. | Prevents legacy report naming becoming source of truth. |
| `docs/research/README.md` | Defines research directory as planning only. | Directory governance | KEEP | None | Keep as research authority index. | Prevents prototype praise being treated as validation. |
| `docs/validation/taste-driven-redesign-gate-t0.md` | Mentions dashboard as UI concept in design critique. | Historical design evidence | HISTORICAL_ONLY | Could be confused with enterprise dashboard. | Do not edit; cite as historical only. | It is unrelated to M5 implementation. |
| `docs/reviews/M0_*` | Mentions M1-M5 scope creep and benchmark/certificate constraints. | Historical M0 review | HISTORICAL_ONLY | None | Keep as historical evidence. | Does not authorize enterprise implementation. |
| `README.md` | Do not add cloud/account/enterprise only because it may be needed. | Repository guidance | KEEP | None | Keep. | Current M5 discovery is owner-directed and still non-implementation. |

## Project Owner Decision Record

Owner approval here only normalizes the Discovery boundary. It does not authorize production implementation.

| Decision ID | Approved wording | Scope | Status | Rationale | Consequence | Implementation permission | Review trigger |
|---|---|---|---|---|---|---|---|
| `PO-ENT-001` | EyeMate Enterprise is a Workplace Visual Wellbeing Program Platform for Screen-Based Work. | Product category | approved-for-discovery | Avoid employee-monitoring or productivity-analytics framing. | Enterprise docs/prototype use the approved category. | None | Positioning change |
| `PO-ENT-002` | Personal Wellbeing Plane, Enterprise Control Plane, Privacy-Preserving Program Insights Plane. | Architecture boundary | approved-for-discovery | Separates personal data, admin data and aggregate insights. | Technical planning must preserve plane separation. | None | Production ADR |
| `PO-ENT-003` | Employer forbidden features are product invariants, not tenant options. | Privacy/product invariant | approved | Prevents contract/admin override. | Negative acceptance must reject prohibited features. | None | Exception request |
| `PO-ENT-004` | Control Plane identity is limited to enrollment, licensing, deployment, app health, support, RBAC and audit. | Control Plane | approved-for-discovery | Allows administration without attendance/work-time inference. | UI uses coarse health buckets only. | None | Control Plane design |
| `PO-ENT-005` | Aggregate contribution defaults OFF; transparency acknowledgement, participation choice and legal basis are distinct. | Employee participation | approved-for-discovery | Preserves employee control and jurisdictional legal review. | Legal basis remains open. | None | Legal review |
| `PO-ENT-006` | Cohort 20, contributors 15, suppress below 10 as proposed-pilot-default. | Thresholds | proposed-pilot-default | Provides conservative starting point. | Requires re-identification testing. | None | Threat-model validation |
| `PO-ENT-007` | Four approved campaign templates with bounded configuration. | Campaign | approved-for-discovery | Prevents coercion and hidden measurement. | Free-form campaign claims remain prohibited. | None | New template proposal |
| `PO-ENT-008` | EyeMate Program Implementation & Participation Report. | Customer-facing report | approved-for-discovery | Avoids compliance/medical overclaim. | Legacy report names deprecated. | None | Report claim change |
| `PO-ENT-009` | At least 12 valid interviews and 2 qualified design partners before technical planning. | Research gate | approved-for-discovery | Prevents premature build. | Implementation remains blocked. | None | Research completion |
