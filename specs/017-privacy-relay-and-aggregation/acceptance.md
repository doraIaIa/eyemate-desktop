# Privacy Relay And Aggregation Acceptance

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

## Positive Acceptance

- `AC-ENT-REL-001`: Given a valid aggregate contribution, when thresholds pass, then a cohort aggregate may be produced.
- `AC-ENT-REL-002`: Given coverage is insufficient, then output shows insufficient data or suppressed cohort.
- `AC-ENT-REL-003`: Given invalid payload, then relay rejects and audits without storing forbidden fields.

## Negative Acceptance

- `AC-ENT-REL-101`: Individual symptom query is rejected.
- `AC-ENT-REL-102`: Individual personal report is rejected.
- `AC-ENT-REL-103`: Small cohort is suppressed.
- `AC-ENT-REL-104`: Differencing query is rejected.
- `AC-ENT-REL-105`: Exact timeline is not sent.
- `AC-ENT-REL-106`: Export does not bypass privacy gate.
- `AC-ENT-REL-107`: Support tooling does not bypass privacy gate.
- `AC-ENT-REL-108`: Identity does not join directly with Insights Plane.
- `AC-ENT-REL-109`: Unknown does not become zero or normal.
