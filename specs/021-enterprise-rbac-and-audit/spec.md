# Enterprise RBAC And Audit Spec

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

Define role separation, query audit and support access constraints for M5 Discovery. This spec does not implement auth, SSO or production RBAC.

## Requirements

- `ENT-RBAC-001`: Roles include Employee, IT Admin, Wellbeing Admin, Privacy Auditor, Organization Owner, Executive Viewer and Support Operator.
- `ENT-RBAC-002`: Role permissions must follow `docs/product/enterprise/enterprise-actors-and-permissions.md`.
- `ENT-RBAC-003`: All aggregate queries, denied queries, exports, report issue/correction/revocation and admin actions are audited.
- `ENT-RBAC-004`: Support Operator cannot bypass privacy gates.
- `ENT-RBAC-005`: Emergency access never grants individual wellbeing data.
