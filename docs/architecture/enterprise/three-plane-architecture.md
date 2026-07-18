# Enterprise Three-Plane Architecture

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

## Purpose

This document records the Enterprise architecture boundary approved for Discovery. It is not a production ADR acceptance and is not an implementation plan.

## Personal Wellbeing Plane

Symptom, camera, personal baseline, personal history and personal report remain local and employee-controlled. Camera is optional. Employee can pause, unlink, export and delete. Leaving an organization does not transfer personal wellbeing data to employer.

## Enterprise Control Plane

Allowed scope: organization, license, enrollment, device/application inventory, app version, update health, rollout ring, RBAC, audit and scrubbed technical support metadata.

Identity and device-management data may exist for licensing and administration, but must stay separated from wellbeing analytics.

Technical check-in must not be used to infer employee attendance or work time. Pilot UI may show only coarse device/application health buckets:

- healthy within 24 hours;
- seen within 2-7 days;
- not seen for more than 7 days;
- update required.

Employer UI must not expose real-time online state.

## Privacy-Preserving Program Insights Plane

Allowed scope: weekly/monthly cohort aggregate, program participation, aggregate break engagement, long observed-session rate, campaign reach, data coverage, missing/unknown, employee helpfulness aggregate and app/version health.

Forbidden: exact event timeline, real-time data, individual drill-down, direct identity join and personal wellbeing data.

## Implementation Boundary

No backend, tenant service, cloud sync, authentication, SSO, production dashboard, production database or API is approved by this discovery artifact.
