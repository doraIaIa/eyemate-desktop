# Enterprise User Journeys

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

| Journey | Primary actor | Summary | Privacy gate |
|---|---|---|---|
| Organization onboarding | Organization Owner | Accept program scope, non-surveillance terms and admin role model. | No personal data imported. |
| Security/procurement review | IT/Security, Privacy/Legal | Review architecture, data inventory, threat model, SBOM and trust-center requirements. | Implementation blocked until review. |
| License provisioning | IT Admin | Allocate seats and rollout rings. | Control Plane only. |
| IT deployment | IT Admin | Deploy app/version and observe update health. | No wellbeing analytics. |
| Employee enrollment | Employee | See transparency notice, join organization license, keep aggregate contribution OFF until active choice. | Personal Plane remains local. |
| Employee transparency notice | Employee | Explain what employer can and cannot see. | Must list forbidden employer views. |
| Employee aggregate participation choice | Employee | Choose whether eligible aggregate contributions may be included; pause or turn off later. | Enabled/disabled/paused/opt-out identity must not be visible to employer. |
| Legal basis review | Privacy/Legal | Decide jurisdiction-specific legal basis separately from product participation choice. | OWNER/LEGAL DECISION REQUIRED before pilot. |
| Employee unlink | Employee | Remove organizational link without transferring personal history. | Employer receives license state only. |
| Device reassignment | IT Admin | Reassign device/license. | Local personal data not transferred. |
| Employee offboarding | Employee, IT Admin | End organization license and preserve personal deletion/export rights. | No wellbeing data transfer. |
| Monthly aggregate insights | Wellbeing Admin | View cohort aggregate if thresholds are met. | Suppress small cohorts and differencing. |
| Small cohort suppression | Query layer | Return suppressed cohort state. | No fallback to individual or exact timeline. |
| Campaign creation | Wellbeing Admin | Choose approved template and bounded schedule. | No hidden measurement, no camera coercion. |
| Employee campaign preview | Employee | See campaign purpose, window, aggregate fields and opt-out. | Preview before contribution. |
| Campaign opt-out | Employee | Decline contribution for campaign. | Employer cannot see who opted out. |
| Campaign pause/stop | Wellbeing Admin, Privacy Auditor | Pause or stop campaign for trust, incident or policy reason. | Future collection stops. |
| EyeMate Program Implementation & Participation Report | Wellbeing Admin | Generate methodology-bound aggregate report. | No compliance or health outcome claim. |
| Report correction/revocation | Privacy Auditor | Mark report corrected or revoked. | QR/state must show non-active. |
| Organization contract termination | Organization Owner | End enterprise relationship. | Retention/deletion schedule enforced. |
| Incident response | Privacy Auditor, Security | Investigate privacy/security issue. | Audit/support access cannot bypass privacy gate. |
