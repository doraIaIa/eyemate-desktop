# Transparent Campaigns Spec

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

Define bounded, employee-visible enterprise campaigns. Campaigns are not hidden measurement, performance management or compliance enforcement.

Approved templates for Enterprise Discovery are limited to Healthy Break Month, 20-20-20 Awareness, New Employee Screen Setup and Peak Workload Recovery.

## Requirements

- `ENT-CAM-001`: Campaign must use approved templates and bounded settings.
- `ENT-CAM-002`: Employee preview and notice are required before campaign starts.
- `ENT-CAM-003`: Employee opt-out, pause/stop and quiet hours must be supported.
- `ENT-CAM-004`: Campaign metrics are aggregate only and small cohorts are suppressed.
- `ENT-CAM-005`: No camera coercion, hidden measurement, leaderboard, personal target or manager individual result.
- `ENT-CAM-006`: Campaign configuration must enforce quiet hours, frequency cap, one active campaign per cohort and no free-form medical or health claim.
