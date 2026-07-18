# Enterprise Discovery Review

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
release_scope: m5-enterprise-discovery
implementation_status: not-started
baseline_head: 629916b07aa85bec46673d2908d498232e966c40
```

## 1. Executive Summary

M5 Enterprise Discovery has been opened as an independent track and normalized against project-owner decisions. The imported prototype and Discovery Pack define EyeMate Enterprise as a Workplace Visual Wellbeing Program Platform for Screen-Based Work. No M5 implementation, backend, tenant service, production dashboard, auth/SSO, database, cloud sync or app-code change occurred.

## 2. Baseline Repository State

- Repository: `F:\eyemate-desktop`
- Branch: `main`
- Baseline HEAD: `629916b07aa85bec46673d2908d498232e966c40`
- Upstream: `origin/main`
- Pre-flight working tree before original import: clean
- Final adversarial review pre-flight: existing unstaged M5 Discovery changes only
- M0-M4: `ENGINEERING_COMPLETE_WITH_LIMITATIONS`
- M5 implementation: `NOT_STARTED`

## 3. Enterprise Audit Findings

Current authoritative documents already allowed only post-MVP cohort aggregate Enterprise. The main gap was lack of Enterprise Discovery detail: role model, metric dictionary, privacy relay, threat model, campaign policy, EyeMate Program Implementation & Participation Report policy, research plan and proposed specs. Historical design/review files remain non-authoritative for M5.

Authority conflict handling:

- `docs/privacy/` remains authoritative for personal-product M0-M4 privacy.
- `docs/privacy-security/enterprise/` is authoritative only for M5 Enterprise Discovery privacy/security.
- `docs/product/enterprise/` is authoritative only for Enterprise Discovery product boundaries.
- `docs/research/enterprise/` is research planning only, not market validation evidence.
- `specs/015-*` through `specs/021-*` are proposed Discovery specs and do not authorize implementation.

## 4. Files Imported

Imported under `prototypes/enterprise-pilot/`:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `PROTOTYPE_SCOPE.md`
- `UI_INVENTORY.md`
- `CODEX_HANDOFF_NOTES.md`
- `sample-data.json`
- `manifest.json`

## 5. Files Created Or Modified

Created:

- `prototypes/README.md`
- `docs/privacy-security/README.md`
- `docs/product/enterprise/README.md`
- `docs/research/README.md`
- `docs/reviews/ENTERPRISE_DISCOVERY_AUDIT_REGISTER.md`
- `docs/product/enterprise/enterprise-product-brief.md`
- `docs/product/enterprise/enterprise-product-constitution.md`
- `docs/product/enterprise/enterprise-actors-and-permissions.md`
- `docs/product/enterprise/enterprise-user-journeys.md`
- `docs/product/enterprise/transparent-campaign-policy.md`
- `docs/product/enterprise/program-implementation-report-policy.md`
- `docs/product/enterprise/enterprise-trust-center-requirements.md`
- `docs/data/enterprise/enterprise-data-inventory.md`
- `docs/data/enterprise/enterprise-metric-dictionary.md`
- `docs/privacy-security/enterprise/enterprise-privacy-invariants.md`
- `docs/privacy-security/enterprise/enterprise-threat-model.md`
- `docs/privacy-security/enterprise/privacy-relay-contract.md`
- `docs/architecture/enterprise/three-plane-architecture.md`
- `docs/research/enterprise/design-partner-research-plan.md`
- `specs/020-program-implementation-report/README.md`
- `specs/015-enterprise-trust-and-deployment/spec.md`
- `specs/015-enterprise-trust-and-deployment/acceptance.md`
- `specs/016-employee-transparency-and-enrollment/spec.md`
- `specs/016-employee-transparency-and-enrollment/acceptance.md`
- `specs/017-privacy-relay-and-aggregation/spec.md`
- `specs/017-privacy-relay-and-aggregation/acceptance.md`
- `specs/018-organizational-insights/spec.md`
- `specs/018-organizational-insights/acceptance.md`
- `specs/019-transparent-campaigns/spec.md`
- `specs/019-transparent-campaigns/acceptance.md`
- `specs/020-program-implementation-report/spec.md`
- `specs/020-program-implementation-report/acceptance.md`
- `specs/021-enterprise-rbac-and-audit/spec.md`
- `specs/021-enterprise-rbac-and-audit/acceptance.md`

Modified:

- `PROJECT_STATUS.md`
- `docs/requirements/requirements-register.md`
- `docs/requirements/traceability.md`
- `prototypes/enterprise-pilot/index.html`
- `prototypes/enterprise-pilot/README.md`
- `prototypes/enterprise-pilot/PROTOTYPE_SCOPE.md`
- `prototypes/enterprise-pilot/UI_INVENTORY.md`
- `prototypes/enterprise-pilot/manifest.json`

## 6. Product Decisions Normalized

- Product category: EyeMate Enterprise is a Workplace Visual Wellbeing Program Platform for Screen-Based Work.
- Employer value: cohort program evidence, not individual monitoring.
- Terminology: break engagement, observed session, program participation, observed change, EyeMate Program Implementation & Participation Report, insufficient data, unknown, suppressed cohort.
- Replaced compliance certificate and legacy evidence-report naming with EyeMate Program Implementation & Participation Report policy.
- Aggregate contribution defaults OFF for Enterprise Pilot and is independent from camera permission.
- Campaign scope is limited to four approved templates with bounded configuration.
- Benchmarks, ROI calculator and certification claims are deferred.

## 7. Privacy Invariants

The privacy invariant pack converts forbidden employer features into enforceable invariants covering desktop client, local aggregation, relay, API, query layer, dashboard, export, logs, backup and support tooling.

## 8. Threats And Unresolved Risks

Unresolved risks include small-cohort re-identification, differencing, repeated queries, identity-to-insights join, manager abuse, campaign coercion, support access, export leakage, report forgery/replay, QR misuse and retention failure. These require owner, privacy, security and legal review before planning.

## 9. Metric Decisions

Defined metrics are enrollment coverage, monthly active participation, break engagement rate, long uninterrupted observed-session rate, campaign reach, data coverage, missing/unknown rate, employee helpfulness and app/version health.

No focus, fatigue, emotion, productivity or employee risk metric is defined.

## 10. Deferred Features

Deferred, not approved backlog: industry benchmark, ROI calculator, Bronze/Silver/Gold tiers, compliance certification, employer individual health dashboard, production SSO/SCIM, production customer analytics, public verification service production, differential privacy until justified and AI-generated management recommendations without validation.

## 11. Documentation Conflicts

No M0-M4 status was changed. `PROJECT_STATUS.md` now records M5 Discovery in review while implementation remains not started. Existing MASTER_SPEC and release scope remain high-level and were not expanded with implementation detail.

## 12. Research Hypotheses

The research plan tests whether HR/EHS, IT/Security, Privacy/Legal, employees and budget owners accept aggregate-only visual wellbeing evidence without individual monitoring. Technical planning requires at least 12 valid interviews, 2 qualified design partners, a buyer-validated job-to-be-done, no unresolved privacy principle blocker, stable pilot metrics and feasible threat controls.

## 13. Open Owner Decisions

Most boundary decisions are now recorded as approved-for-discovery. Remaining decisions are legal/privacy/security/research gates before technical planning or implementation.

## Final Adversarial Review Result

Severity before fix:

- BLOCKER: 0.
- HIGH: 5.
- MEDIUM: 6.
- LOW: 4.

Resolved defects:

- Prototype aggregate participation default was ON in `app.js`/`index.html`; changed to OFF.
- Prototype report screen still used `PROGRAM EVIDENCE REPORT`; changed to EyeMate Program Implementation & Participation Report terminology.
- Report QR semantics used `Report source`; changed to issuer/report ID/hash/issue-revocation state/methodology version alignment.
- Campaign spec did not carry all four approved templates and lacked a negative case for free-form medical/health claims; added both.
- Traceability mapped forced-camera and support-bypass invariants to wrong acceptance IDs; corrected.
- Prototype scope said `Enterprise Pilot MVP`; changed to Discovery Scope.
- Prototype handoff/readme wording implied backend/API enforcement design; softened to documentation-only future review.
- Metric dictionary used `Opted-in` wording that could be misread as lawful consent; changed to participation/legal-eligibility wording.
- Review inventory was stale after final fixes; refreshed.

Severity after fix:

- BLOCKER: 0.
- HIGH: 0.
- MEDIUM: 0.
- LOW: 2.

Remaining LOW items:

- Git reports line-ending warnings on touched markdown in `git diff --check`; no whitespace error is reported.
- Deprecated `program-evidence-report` appears only in migration/deprecated notes, not as customer-facing terminology.

## Project Owner Decision Record

Owner approval here only normalizes the Discovery boundary. It does not authorize production implementation.

| Decision ID | Approved wording | Scope | Status | Rationale | Consequence | Implementation permission | Review trigger |
|---|---|---|---|---|---|---|---|
| `PO-ENT-001` | EyeMate Enterprise is a Workplace Visual Wellbeing Program Platform for Screen-Based Work. | Product category | approved-for-discovery | Avoids monitoring/productivity positioning. | All docs/prototype use this category. | None | Any category/positioning change |
| `PO-ENT-002` | Personal Wellbeing, Enterprise Control, Privacy-Preserving Program Insights planes. | Architecture boundary | approved-for-discovery | Separates local personal data from admin and aggregate insights. | Specs must preserve separation. | None | Production ADR or architecture plan |
| `PO-ENT-003` | Forbidden employer features are non-overridable product invariants. | Product/privacy invariants | approved | Prevents tenant/admin exceptions. | Negative acceptance must trace invariants. | None | Any exception request |
| `PO-ENT-004` | Control Plane identity only for enrollment, license, deployment, app version, update health, support, RBAC and audit. | Control Plane | approved-for-discovery | Allows admin without attendance/work-time inference. | UI limited to coarse health buckets. | None | Technical design |
| `PO-ENT-005` | Aggregate contribution defaults OFF; transparency acknowledgement, participation choice and legal basis are distinct. | Employee participation | approved-for-discovery | Preserves employee autonomy and legal clarity. | Legal basis remains jurisdiction-dependent. | None | Legal review |
| `PO-ENT-006` | Cohort 20, contributors 15, suppress below 10 as proposed-pilot-default. | Privacy thresholds | proposed-pilot-default | Conservative starting point for testing. | Requires re-identification validation. | None | Threat-model validation |
| `PO-ENT-007` | Four campaign templates only with bounded settings. | Campaign scope | approved-for-discovery | Prevents coercive or hidden measurement. | Prototype/specs restrict campaign model. | None | New template request |
| `PO-ENT-008` | EyeMate Program Implementation & Participation Report / Báo cáo triển khai và mức độ tham gia chương trình EyeMate. | Customer-facing report | approved-for-discovery | Avoids compliance/medical overclaim. | Legacy report naming deprecated. | None | Report wording change |
| `PO-ENT-009` | Research gate requires 12 interviews and 2 qualified design partners before technical planning. | Research/design partner | approved-for-discovery | Prevents implementation before evidence. | Technical planning remains blocked. | None | Research completion |

## Change Inventory

Inventory includes tracked modified files and untracked Enterprise Discovery files before commit:

- Tracked modified files: 3.
- New files: 44.
- Total changed/new files in review package: 47.
- Total current lines across changed/new files: 2452.
- Total bytes across changed/new files: 163054.
- New directories: `docs/architecture/enterprise`, `docs/data/enterprise`, `docs/privacy-security`, `docs/privacy-security/enterprise`, `docs/product/enterprise`, `docs/research`, `docs/research/enterprise`, `prototypes`, `prototypes/enterprise-pilot`, `specs/015-enterprise-trust-and-deployment`, `specs/016-employee-transparency-and-enrollment`, `specs/017-privacy-relay-and-aggregation`, `specs/018-organizational-insights`, `specs/019-transparent-campaigns`, `specs/020-program-implementation-report`, `specs/021-enterprise-rbac-and-audit`.

Top 15 files by current line count:

| Lines | Bytes | Path |
|---:|---:|---|
| 414 | 21672 | `prototypes/enterprise-pilot/index.html` |
| 262 | 11920 | `prototypes/enterprise-pilot/styles.css` |
| 204 | 11132 | `prototypes/enterprise-pilot/app.js` |
| 209 | 17955 | `docs/reviews/ENTERPRISE_DISCOVERY_REVIEW.md` |
| 82 | 6064 | `docs/product/enterprise/enterprise-product-brief.md` |
| 78 | 6896 | `PROJECT_STATUS.md` |
| 68 | 3279 | `prototypes/enterprise-pilot/PROTOTYPE_SCOPE.md` |
| 65 | 5934 | `docs/requirements/traceability.md` |
| 58 | 2898 | `docs/research/enterprise/design-partner-research-plan.md` |
| 50 | 3368 | `docs/requirements/requirements-register.md` |
| 48 | 2593 | `docs/privacy-security/enterprise/privacy-relay-contract.md` |
| 41 | 2193 | `docs/product/enterprise/program-implementation-report-policy.md` |
| 40 | 984 | `prototypes/enterprise-pilot/sample-data.json` |
| 38 | 1730 | `prototypes/enterprise-pilot/UI_INVENTORY.md` |
| 38 | 1459 | `docs/product/enterprise/transparent-campaign-policy.md` |

Duplicate/near-duplicate document check:

- `docs/privacy/` and `docs/privacy-security/enterprise/` overlap in theme but not authority; index files now separate M0-M4 personal privacy from M5 Enterprise Discovery privacy/security.
- `program-evidence-report` naming has been renamed to `program-implementation-report` for the authoritative feature folder and policy file.
- No second authoritative Enterprise privacy invariant file is defined outside `docs/privacy-security/enterprise/enterprise-privacy-invariants.md`.

## 14. Validation Results

| Check | Result | Notes |
|---|---|---|
| Prototype required files | PASS | All 9 requested files exist under `prototypes/enterprise-pilot/`. |
| Prototype JavaScript syntax | PASS | `node --check prototypes\enterprise-pilot\app.js`. |
| Prototype manifest | PASS | Manifest-listed files match bytes and SHA-256; required `manifest.json` file is present. |
| No CDN/network in prototype | PASS | No `http://`, `https://`, `cdn`, `fetch(`, `XMLHttpRequest`, `WebSocket` or dynamic import match. |
| Markdown code fence balance | PASS | All repository markdown fences balanced in scanned files. |
| Markdown link integrity | PASS | Internal markdown links in scanned files resolve. |
| Duplicate Enterprise IDs | PASS | No duplicate `ENT-*` or `AC-ENT-*` definitions outside register/traceability references. |
| Application code modification | PASS | No tracked diff under `src`, `tools`, `package.json` or M0-M4 spec folders. |
| M0-M4 task modification | PASS | No tracked diff under M0-M4 task/spec folders. |
| `git diff --check` | PASS | Git reports only expected line-ending warnings for touched tracked markdown. |

Keyword classification:

| Keyword family | Matches | Classification |
|---|---:|---|
| focus/fatigue/productivity score | Present | Explicit prohibition or negative acceptance. |
| employee monitoring/surveillance | Present | Explicit non-goal/prohibition. |
| compliance certificate | Present | Historical/prohibited term replaced by EyeMate Program Implementation & Participation Report. |
| individual health view | Present | Explicit prohibition. |
| real-time employee presence | Present | Explicit prohibition. |
| consent / opt-in | Present | Legal/research context or explicit distinction from participation choice; not treated as universal legal consent. |
| anonymous / anonymized | Absent in authoritative customer-facing source | No anonymity guarantee is made; privacy docs use thresholding/suppression language instead. |
| EyeMate Program Implementation & Participation Report | Present | Approved-for-discovery customer-facing report name. |

## 15. No Production Implementation Confirmation

No application source code, production database, backend, tenant service, auth, SSO, dashboard implementation, dependency installation, migration, package, commit or push occurred.

## 16. Recommended Next Step

Project owner should review the Enterprise Discovery Pack, resolve required decisions, then decide whether to authorize a technical planning phase. Do not create plan/tasks or implementation until then.

## Remaining Required Reviews And Decisions

| Decision | Current option | Alternatives | Benefits | Risks | Recommendation | Consequence of deferring |
|---|---|---|---|---|---|---|
| Legal basis by jurisdiction | OWNER/LEGAL DECISION REQUIRED | Treat participation as universal consent | Legal clarity | Slower enrollment design | Legal review before pilot | Enrollment cannot be finalized |
| Re-identification validation | Test thresholds 20/15/10 before pilot | Ship thresholds untested | Better privacy evidence | May force higher suppression | Run validation before technical planning | Relay contract remains provisional |
| Security architecture review | Review plane separation, audit, logs, backup and support tooling | Defer to implementation | Prevents unsafe design | More pre-work | Require before technical planning | Implementation remains blocked |
| Design-partner evidence | 12 interviews and 2 qualified design partners | Buyer-only validation | Balanced evidence | Slower PMF learning | Complete research gate | Technical planning remains blocked |
| Written pilot agreement or LOI | Required before implementation | Build before LOI | Prevents speculative enterprise build | Slower delivery | Require at least one written agreement | Implementation remains `NOT_STARTED` |
