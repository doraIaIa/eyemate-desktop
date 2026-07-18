# Privacy Relay Contract

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
contract_type: logical_only
```

This is a logical contract, not a production schema.

## Boundary

The local aggregation boundary sits on the employee-controlled client. Personal symptoms, camera frames, personal baseline, personal reports and exact timelines do not leave the Personal Wellbeing Plane.

## Allowed Contribution Fields

- Organization-scoped rotating contribution token.
- Reporting window ID.
- Cohort key approved for reporting.
- Aggregate participation flag.
- Aggregate break engagement count buckets.
- Long observed-session bucket count.
- Campaign notice/reach aggregate.
- Data coverage and missing/unknown counts.
- Employee helpfulness aggregate response bucket.
- App/version health signal when not wellbeing-derived.

## Forbidden Fields

Identity, email, employee ID, manager ID, symptom answer, personal report, personal baseline, raw camera data, landmark, blink timeline, distance timeline, exact timestamp, exact session timeline, opt-out identity, focus score, fatigue score, productivity score, health score.

## Proposed Thresholds

These thresholds are proposed and require re-identification/threat-model validation before pilot:

- Cohort minimum: 20.
- Minimum contributors: 15.
- Cell suppression below: 10.

## Controls

- Rotating contribution token must not be reversible by Insights Plane.
- Identity separation is mandatory between Control Plane and Insights Plane.
- Reporting windows are weekly/monthly or campaign-bounded, never real-time.
- Reporting windows are fixed weekly/monthly windows; arbitrary custom date ranges are forbidden for pilot.
- Filter dimensions are limited to approved cohort keys and campaign windows.
- Cell suppression applies before dashboard/export.
- Anti-differencing blocks repeated queries that isolate a small cell.
- Repeated-query protection prevents reconstruction across similar filters or windows.
- Rate limiting and audit apply to all aggregate queries.
- Contribution retention is minimized to aggregation window and deletion policy.
- UNKNOWN remains UNKNOWN; invalid payload is rejected and audited.
- Versioning covers contribution contract, metric dictionary and suppression logic.
- These thresholds do not guarantee anonymity; re-identification testing is required before pilot.
