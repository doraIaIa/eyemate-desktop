# Organizational Insights Spec

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

Define organizational aggregate insights only. No individual dashboard, no manager drill-down and no real-time data.

## Requirements

- `ENT-INS-001`: Insights may show enrollment coverage, monthly active participation, break engagement, long observed-session rate, campaign reach, data coverage, missing/unknown, helpfulness and app/version health.
- `ENT-INS-002`: Insights must use weekly/monthly or campaign windows.
- `ENT-INS-003`: Insights must show methodology version, coverage and suppression state.
- `ENT-INS-004`: Insights must not provide focus, fatigue, emotion, productivity, health score or employee risk metric.
- `ENT-INS-005`: Insights must not show opt-out list or individual break history.
