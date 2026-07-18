# Employee Transparency And Enrollment Spec

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

Define employee-facing enrollment, transparency acknowledgement, program participation choice, aggregate contribution pause/off, unlink and offboarding behavior. Personal Wellbeing Plane remains local.

## Requirements

- `ENT-ENR-001`: Employee must see what employer can and cannot access before aggregate contribution.
- `ENT-ENR-002`: Aggregate contribution defaults OFF for Enterprise Pilot and requires employee action after transparency notice.
- `ENT-ENR-003`: Employer must not see who enabled, disabled, paused, opted out, skipped reminders or ignored campaigns.
- `ENT-ENR-004`: Employee may unlink organization without transferring local personal history.
- `ENT-ENR-005`: Camera remains optional and cannot be required for enterprise enrollment.
- `ENT-ENR-006`: Personal app functionality continues when aggregate contribution is OFF.
- `ENT-ENR-007`: Camera permission is independent from aggregate contribution and cannot be forced by enterprise policy.
- `ENT-ENR-008`: Transparency acknowledgement, program participation choice and legal basis are distinct records.
- `ENT-ENR-009`: Legal basis is OWNER/LEGAL DECISION REQUIRED by jurisdiction and participation toggle must not be described as default lawful consent.
