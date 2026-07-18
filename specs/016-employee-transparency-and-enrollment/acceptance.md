# Employee Transparency And Enrollment Acceptance

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

- `AC-ENT-ENR-001`: Given first enterprise enrollment, when employee reviews notice, then the notice lists allowed aggregate fields and forbidden employer views.
- `AC-ENT-ENR-002`: Given an employee unlinks, then local personal reports stay local and employer receives only license state.
- `AC-ENT-ENR-003`: Given an employee exports data, then export is personal and employee-controlled.
- `AC-ENT-ENR-004`: Given aggregate contribution is not enabled, personal EyeMate still works locally.
- `AC-ENT-ENR-005`: Given employee has acknowledged transparency notice, participation remains OFF until the employee actively enables aggregate contribution.

## Negative Acceptance

- `AC-ENT-ENR-101`: Employee opt-out is not visible to employer.
- `AC-ENT-ENR-102`: Campaign cannot be hidden from employee.
- `AC-ENT-ENR-103`: Camera cannot be coerced by enrollment.
- `AC-ENT-ENR-104`: Unknown state does not become zero or normal.
- `AC-ENT-ENR-105`: Manager cannot drill down to employee enrollment behavior.
- `AC-ENT-ENR-106`: Employer cannot see which employee enabled, disabled or paused aggregate contribution.
- `AC-ENT-ENR-107`: Enterprise policy cannot force aggregate contribution ON.
- `AC-ENT-ENR-108`: Participation toggle is not presented as a universal legal-basis consent record.
