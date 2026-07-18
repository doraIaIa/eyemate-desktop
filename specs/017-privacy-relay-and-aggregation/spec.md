# Privacy Relay And Aggregation Spec

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

## Scope

Define logical Privacy-Preserving Program Insights Plane and relay constraints. This is not a production schema or API.

## Requirements

- `ENT-REL-001`: Relay accepts only allowed aggregate contribution fields from the local aggregation boundary.
- `ENT-REL-002`: Relay rejects identity, symptom, personal report, personal baseline, exact timeline, raw camera, blink timeline and distance timeline.
- `ENT-REL-003`: Initial proposed thresholds are cohort minimum 20, minimum contributors 15 and cell suppression below 10.
- `ENT-REL-004`: Small cohorts, differencing and repeated query attacks are blocked.
- `ENT-REL-005`: UNKNOWN is preserved and invalid payloads are rejected and audited.
