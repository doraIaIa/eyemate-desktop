# Enterprise Data Inventory

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
release_scope: m5-enterprise-discovery
implementation_status: not-started
product_owner_approval: required
privacy_review: required
security_review: required
legal_review: required
research_validation: required
```

EyeMate Enterprise must not claim zero personal data because the Control Plane may process identity and device-management data for license and administration. Identity and device-management data must remain separated from wellbeing analytics.

Control Plane identity/device scope is limited to organization enrollment, seat/license allocation, deployment, app version, update health, support, RBAC and audit. Technical check-in must not be interpreted as employee attendance or work time.

| Entity | Example fields | Purpose | Review status | Owner | Processor | Source | Storage | Retention | Identifier | Sensitivity | Allowed roles | Export | Deletion | Cross-plane permission | Logging | Backup |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Organization data | org ID, name, contract state | Contract and program setup | Required | Organization Owner | Enterprise Control Plane | Admin input | Enterprise Control Plane | Contract plus legal hold | Organization ID | Business confidential | Organization Owner, IT Admin | Contract export | Contract termination flow | No direct Insights join | Admin event only | Allowed |
| Identity data | employee account, role, org membership | Organization enrollment, seat/license allocation and RBAC | Required | Organization | Identity provider | Enrollment/IdP | Control Plane | Employment/license period | Identity ID | Personal data | IT Admin, Organization Owner | Admin export | Offboarding | Must not join Insights directly | Scrubbed audit only | Allowed with controls |
| License data | seat, entitlement, rollout ring | Access management | Required | IT | Control Plane | Admin | Control Plane | Contract period | Seat ID | Low/medium | IT Admin | Yes | Contract termination | Control only | Yes | Allowed |
| Device/app management data | app version, rollout ring, update bucket | Deployment and update health | Required | IT | Control Plane | Desktop app | Control Plane | Operational window | Device token | Medium | IT Admin, Support Operator | Technical export | Device reset/offboarding | No wellbeing data, no attendance/work-time inference | Scrubbed | Allowed |
| Local personal wellbeing data | symptom, camera aggregate, baseline, report | Personal wellbeing | Existing personal review | Employee | Local desktop app | Employee app | Personal device | Until user deletes | Local IDs | Sensitive | Employee only | Employee export | Employee delete | No employer access | No raw/sensitive logs | Local backup only if user-controlled |
| Aggregate contribution data | windowed counts, unknown flags, participation token | Build cohort aggregates after employee enables participation | Required | Employee/Organization joint review | Privacy Relay | Local aggregate boundary | Relay transient | Short contribution window | Rotating token | Sensitive aggregate precursor | Relay service only | No direct export | Contribution deletion policy | No identity join; default OFF for pilot | Strict allowlist | Minimized |
| Cohort aggregate data | cohort, window, numerator, denominator, suppression | Organizational insights | Required | Organization with employee safeguards | Insights Plane | Relay aggregation | Insights Plane | Reporting period plus policy | Cohort cell ID | Aggregate sensitive | Wellbeing Admin, Executive Viewer | Aggregate export | Retention expiry/correction | Thresholded only | Query audit | Allowed with suppression |
| Campaign data | template, schedule, notice, bounds | Transparent program operation | Required | Wellbeing Admin | Control and Insights Plane | Admin + employee notice | Enterprise | Campaign plus retention | Campaign ID | Medium | Wellbeing Admin, Privacy Auditor | Campaign export | Campaign deletion | Aggregate only | Audit required | Allowed |
| Audit data | admin action, query denial, export, revocation | Accountability | Required | Privacy Auditor | Control Plane | System | Audit store | Policy/legal | Audit ID | High | Privacy Auditor | Audit export scrubbed | Legal retention | May reference IDs, not personal wellbeing payload | Required | Allowed |
| Report metadata | report ID, hash, issue/revoke state | Verify EyeMate Program Implementation & Participation Report | Required | Organization | Report service | Report generation | Report registry | Report retention | Report ID | Medium | Wellbeing Admin, Auditor, Viewer | Yes | Revocation/correction | No personal data | Required | Allowed |
| Support data | ticket, error code, app version, scrubbed logs | Technical support | Required | Support owner | Support tooling | Employee/admin ticket | Support system | Ticket policy | Ticket ID | Medium | Support Operator | Ticket export | Ticket deletion | No Insights join | Scrubbed only | Allowed |
