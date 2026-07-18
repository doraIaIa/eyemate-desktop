# Enterprise Privacy Invariants

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
owner_decision_status: approved
release_scope: m5-enterprise-discovery
implementation_status: not-started
product_owner_approval: required
privacy_review: required
security_review: required
legal_review: required
research_validation: required
```

Override policy for all invariants: no business, support, manager or executive role may override these controls to view individual wellbeing data. Tenant configuration, contract tier and admin role cannot weaken these invariants. Any proposed change requires project owner, privacy, legal and security approval plus new acceptance.

| ID | Statement | Rationale | Enforcement layer | Negative acceptance | Evidence requirement |
|---|---|---|---|---|---|
| `ENT-PRIV-001` | Employer must never access camera stream, raw frame, video or landmark. | Prevent surveillance and biometric leakage. | Desktop, relay, API, logs, backup, support | Request for camera stream is denied and audited. | Static scan and query denial test. |
| `ENT-PRIV-002` | Employer must never access symptom answers or personal reports. | Protect sensitive wellbeing data. | Desktop, relay, API, dashboard, export | Individual symptom/report query returns forbidden. | API/export negative acceptance. |
| `ENT-PRIV-003` | Blink and distance timelines for one person are forbidden. | Timelines enable behavior surveillance. | Local aggregation, relay, API, dashboard | Exact timeline payload rejected. | Payload validation test. |
| `ENT-PRIV-004` | Personal baseline remains local and employee-controlled. | Baseline is personal context. | Desktop, storage, relay | Baseline export to employer is impossible. | Data-flow review. |
| `ENT-PRIV-005` | No focus, fatigue, emotion, productivity or health score. | Avoid prohibited inference. | Metric dictionary, API, dashboard, export | Metric name/query is rejected. | Terminology scan. |
| `ENT-PRIV-006` | No real-time employee presence or "who is working" view. | Prevent attendance monitoring. | Relay, query, dashboard | Real-time presence endpoint absent/rejected. | Architecture review. |
| `ENT-PRIV-007` | No individual break history or opt-out visibility to employer. | Protect autonomy. | Desktop, relay, insights, dashboard | Employer cannot list opt-outs or skipped reminders. | Query denial test. |
| `ENT-PRIV-008` | No manager drill-down to employee. | Prevent manager abuse. | RBAC, query layer, dashboard | Manager drill-down denied. | RBAC negative test. |
| `ENT-PRIV-009` | No ranking, leaderboard or individual risk view. | Prevent coercion and discrimination. | UI, API, export | Leaderboard config rejected. | UI/spec scan. |
| `ENT-PRIV-010` | Enterprise policy cannot force camera on. | Preserve consent and local control. | Desktop, policy parser, Control Plane | Camera force policy rejected. | Policy validation test. |
| `ENT-PRIV-011` | Wellbeing data must not be used for performance review, discipline, termination or compensation. | Maintain purpose limitation. | Contract, Trust Center, audit | Report purpose cannot include employment action. | Legal/privacy review. |
| `ENT-PRIV-012` | Identity must not join directly with Insights Plane. | Reduce re-identification risk. | Relay, data warehouse, query layer | Identity-to-insights join denied. | Schema/query review. |
| `ENT-PRIV-013` | Small cohorts must be suppressed. | Prevent re-identification. | Relay, query, dashboard, export | Cohort below threshold returns suppressed cohort. | Suppression tests. |
| `ENT-PRIV-014` | UNKNOWN must not become zero, normal or success. | Preserve data truth. | Aggregation, metric, report | Unknown remains unknown in export. | Metric fixtures. |
| `ENT-PRIV-015` | Support tooling cannot bypass privacy gate. | Support is a common abuse vector. | Support tooling, logs, audit | Support cannot export personal wellbeing payload. | Support negative test. |
