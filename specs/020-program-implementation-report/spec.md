# EyeMate Program Implementation & Participation Report Spec

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

Define EyeMate Program Implementation & Participation Report. It is not a compliance certificate and does not claim legal/ISO/HSE compliance, medical effectiveness, health status or productivity improvement.

Vietnamese customer-facing name: **Báo cáo triển khai và mức độ tham gia chương trình EyeMate**.

## Requirements

- `ENT-RPT-001`: Report includes deployment period, activated seats, aggregate participation, aggregate engagement, data coverage, campaigns, voluntary employee feedback, methodology version, limitations, authenticity status, issue date and revocation state.
- `ENT-RPT-002`: Report inputs are thresholded cohort aggregates, campaign metadata, voluntary employee feedback aggregate, app/version health and report metadata only.
- `ENT-RPT-003`: QR verifies report ID, document hash, issuer, issue/revocation state and methodology version only.
- `ENT-RPT-004`: Corrections and revocations must be explicit.
- `ENT-RPT-005`: Export cannot reveal suppressed cells or individual data.
