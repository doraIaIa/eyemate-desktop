# Enterprise Product Constitution

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

## Positioning

EyeMate Enterprise is a Workplace Visual Wellbeing Program Platform for Screen-Based Work.

EyeMate helps organizations deploy, operate and evaluate a visual wellbeing program using aggregate data, while personal health and wellbeing data remains under employee control.

## Permanent Non-Goals

EyeMate Enterprise must not become employee monitoring, workforce surveillance, attendance tracking, productivity analytics, focus tracking, fatigue detection, emotion recognition, employee health scoring or medical diagnosis.

## Employer Forbidden Features

Employer-facing products must not expose camera stream, raw frame, video, landmark, symptom answer, personal report, blink timeline, distance timeline, personal baseline, focus score, fatigue score, emotion inference, productivity score, real-time employee presence, individual break history, individual wellbeing/risk view, manager drill-down, employee ranking, leaderboard, opt-out identity, ignored reminder identity or skipped reminder identity.

EyeMate Enterprise data must not be used for performance review, discipline, firing, compensation or individual employment decision.

These forbidden features are product invariants. They cannot be overridden by tenant configuration, contract tier or administrator role.

## Required Product Boundary

The Personal Wellbeing Plane remains local and employee-controlled. The Enterprise Control Plane may manage organization, license, enrollment, app/device inventory, app version, update health, rollout ring, RBAC, audit and scrubbed support metadata. The Privacy-Preserving Program Insights Plane may show only thresholded cohort aggregates.

This constitution does not approve implementation. It is a proposed M5 Discovery artifact for owner review.
