# Enterprise Threat Model

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

| Threat | Asset | Actor | Precondition | Attack | Impact | Controls | Residual risk | Validation method | Owner |
|---|---|---|---|---|---|---|---|---|---|
| Small-cohort re-identification | Cohort aggregate | Manager/Admin | Small group filter | Infer employee state | Privacy harm | Minimum cohort, contributor threshold, suppression | Medium | Suppression fixtures | Privacy |
| Differencing attack | Aggregate cells | Wellbeing Admin | Repeated filters | Subtract cells to identify person | Re-identification | Anti-differencing, query budget, window lock | Medium | Differencing negative tests | Privacy/Security |
| Repeated query attack | Insights | Admin | Many queries over time | Narrow unknown group | Re-identification | Rate limit, audit, fixed windows | Medium | Query simulation | Security |
| Exact timestamp linkage | Contribution data | IT/Admin | Timestamp access | Link to known schedule | Behavioral surveillance | Bucketed windows, no exact timeline | Low/medium | Payload contract test | Data |
| Identity-to-insights join | Identity and aggregate | IT/Admin | Access to both planes | Join employee to wellbeing | Privacy breach | Plane separation, access controls | Medium | Schema/query review | Architecture |
| Manager abuse | Insights | Manager | Role granted wrongly | Drill down or pressure team | Coercion | No manager individual view, RBAC | Medium | RBAC test | Product |
| Wellbeing-admin abuse | Campaign/insights | Wellbeing Admin | Broad filters | Coerce opt-in or infer opt-out | Trust loss | Campaign transparency, opt-out hidden | Medium | Journey acceptance | Product/Privacy |
| IT-admin abuse | Device/control data | IT Admin | Device metadata access | Infer wellbeing from app use | Employee monitoring | No wellbeing in Control Plane | Medium | Data inventory review | IT/Security |
| Support-operator access | Logs/tickets | Support | Ticket access | View sensitive payload | Leakage | Scrubbed support metadata, audit | Low/medium | Support negative test | Support |
| Export leakage | Reports | Viewer/Admin | Export allowed | Share report beyond context | Re-identification or misclaim | Watermark, limitations, suppression | Medium | Export review | Product |
| Log leakage | Logs | System/support | Bad logging | Store personal data | Sensitive leak | Field allowlist, scans | Medium | Static/log scan | Security |
| Backup leakage | Backup | Operator | Backup access | Recover sensitive data | Privacy breach | Encryption, minimization, retention | Medium | Backup review | Security |
| Cross-tenant access | Enterprise data | External/admin | Tenant isolation bug | Read another org | Confidentiality breach | Tenant isolation design | Medium | Architecture test later | Architecture |
| Campaign coercion | Campaign | Employer | Power imbalance | Force participation | Employee harm | Preview, opt-out, no hidden measurement | Medium | Research/interview | Product/Legal |
| Hidden measurement | Desktop/campaign | Employer | Policy abuse | Measure without notice | Surveillance | Transparency notice, policy rejection | Low/medium | Policy acceptance | Privacy |
| Device reassignment | Local data | IT/Employee | Shared device | Next user sees data | Privacy harm | Local unlink/delete guidance | Medium | Journey review | IT/Product |
| Employee offboarding | Personal data | Employer | Employment ends | Demand personal transfer | Privacy harm | No transfer, unlink only | Low | Contract review | Legal |
| Organization termination | Aggregate/report | Org owner | Contract ends | Retain beyond policy | Compliance risk | Retention/deletion schedule | Medium | Retention review | Legal |
| Report forgery | Evidence report | External actor | Public artifact | Fake report | Trust harm | Report ID/hash/signing semantics | Medium | Verification spec | Security |
| Report replay | Evidence report | External actor | Old report exists | Present revoked report | Trust harm | Revocation state, issue date | Medium | Revocation test | Security |
| Forged QR verification | QR metadata | External actor | QR copied | False verification | Trust harm | QR verifies only hash/state/version | Medium | QR semantics review | Security |
| Retention failure | All enterprise data | System/admin | Deletion gap | Over-retain data | Legal/privacy risk | Retention inventory, audit | Medium | Retention tests later | Privacy/Legal |
