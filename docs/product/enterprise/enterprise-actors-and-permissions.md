# Enterprise Actors And Permissions

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

| Role | Purpose | Allowed data | Allowed actions | Forbidden data | Export | Audit | Separation of duties | Emergency access |
|---|---|---|---|---|---|---|---|---|
| Employee | Use personal app and understand program transparency. | Own local personal data, own enrollment state, campaign notice. | Choose aggregate participation, pause/turn off contribution, unlink, export personal report, delete local data. | Other employees, cohort raw cells, admin audit. | Own personal export only. | Employee-visible transparency/action log. | Cannot administer organization. | No employer emergency access to personal wellbeing data. |
| IT Admin | Manage deployment and app health. | License, device/app inventory, app version, update health, rollout ring, scrubbed support metadata. | Provision license, assign rollout ring, inspect app health. | Symptom data, personal reports, aggregate wellbeing metrics. | Technical inventory export. | Required for admin action. | Cannot view Insights Plane. | Break-glass limited to technical metadata, audited. |
| Wellbeing Admin | Run transparent wellbeing program. | Cohort aggregate, campaign aggregate, coverage, suppressed states. | Create approved campaign, view aggregate insights, request EyeMate Program Implementation & Participation Report. | Individual wellbeing, opt-out identity, personal reports. | Aggregate reports only. | Query and export audit required. | Cannot change license identity binding. | No emergency access to individual data. |
| Privacy Auditor | Verify controls and investigate misuse. | Audit logs, policy config, suppression decisions, denied query records. | Review audit, revoke report, require correction, approve exception policy. | Raw personal wellbeing payload. | Audit export with scrubbed identifiers. | All access audited. | Cannot run campaigns. | Emergency access only to audit records, not wellbeing data. |
| Organization Owner | Contract and high-level program ownership. | Contract/license state, aggregate program status, approved reports. | Assign admin roles, approve pilot scope, terminate organization. | Individual wellbeing, symptom answers, personal baseline. | Contract/report metadata. | Role changes audited. | Cannot bypass privacy gate. | No individual wellbeing break-glass. |
| Executive Viewer | View high-level outcomes. | Monthly cohort aggregate if thresholds met, EyeMate Program Implementation & Participation Report. | View approved reports. | Filters that identify small groups, individual drill-down. | Approved report export only. | View/export audit. | Read-only. | None. |
| Support Operator | Resolve technical support issues. | Scrubbed app version, error code, device class, ticket metadata. | Support ticket notes, request logs from employee-controlled flow. | Personal wellbeing data, raw logs with personal data, identity-to-insights joins. | Ticket export only. | All ticket access audited. | Cannot query Insights Plane. | Temporary support access must be approved and time-boxed. |

Manager role is intentionally excluded from individual wellbeing visibility. A manager may only receive thresholded aggregate reports if explicitly assigned an allowed enterprise role and if the query passes privacy gates.
