# Enterprise Metric Dictionary

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

All metrics are cohort aggregate metrics. No focus, fatigue, emotion, productivity or employee risk metric is defined.

Privacy thresholds are `proposed-pilot-default`, not production-approved:

- minimum eligible cohort: 20;
- minimum contributors: 15;
- suppress cells below: 10.

Reporting windows are fixed weekly, fixed monthly or bounded campaign windows. Arbitrary custom date ranges are not allowed for pilot. Filter dimensions are limited to approved cohort keys. Missing, unknown and suppressed states must never be converted into zero, normal or success.

| Metric ID | Name | Meaning | Numerator | Denominator | Eligibility | Exclusions | Minimum cohort | Minimum contributors | Window | Coverage and missing behavior | Version | Level | Prohibited interpretation | UI copy | Acceptance example |
|---|---|---|---|---|---|---|---:|---:|---|---|---|---|---|---|---|
| `ENT-MET-001` | enrollment coverage | Share of licensed users who completed transparency/enrollment. | Enrolled users | Licensed users | Active license in window | Offboarded, test accounts | 20 | 15 | Monthly | Missing identity state shown as unknown, not zero. | `1.0-proposed` | Org/cohort | Not employee compliance. | "Enrollment coverage" | 80 enrolled of 100 licensed = 80 percent if cohort passes. |
| `ENT-MET-002` | monthly active participation | Share of enrolled users with at least one eligible aggregate contribution. | Contributors | Enrolled users | Aggregate participation enabled or otherwise legally eligible after review | Opt-out hidden from employer | 20 | 15 | Monthly | Unknown contribution state counted as unknown bucket. | `1.0-proposed` | Cohort | Not work attendance and not proof of lawful consent. | "Monthly active participation" | 30 contributors of 50 enrolled = 60 percent. |
| `ENT-MET-003` | break engagement rate | Aggregate rate of observed break engagement after eligible reminders. | Accepted/snoozed/completed break responses | Eligible reminder opportunities | Local app reported aggregate | Individual break history excluded | 20 | 15 | Weekly/monthly | Unknown response remains unknown. | `1.0-proposed` | Cohort/campaign | Not employee compliance. | "Break engagement" | 120 engaged of 200 opportunities = 60 percent. |
| `ENT-MET-004` | long uninterrupted observed-session rate | Share of observed sessions above bounded duration threshold. | Long observed sessions | Eligible observed sessions | Timer/session aggregate only | Exact timeline, individual session excluded | 20 | 15 | Weekly/monthly | Missing session duration suppresses metric if coverage low. | `1.0-proposed` | Cohort | Not employee work time or productivity. | "Long observed-session rate" | 18 long of 90 observed sessions = 20 percent. |
| `ENT-MET-005` | campaign reach | Share of enrolled users who saw campaign notice. | Campaign notices shown | Enrolled users in target cohort | Campaign active | Opt-out identities not exposed | 20 | 15 | Campaign window | Unknown notice state remains unknown. | `1.0-proposed` | Campaign/cohort | Not compliance certificate. | "Campaign reach" | 70 notices shown of 100 eligible = 70 percent. |
| `ENT-MET-006` | data coverage | Degree to which aggregate cells have enough valid data. | Valid aggregate contributors/cells | Expected eligible contributors/cells | Thresholded cohorts | Suppressed cells excluded from value and shown separately | 20 | 15 | Weekly/monthly | Low coverage shows insufficient data. | `1.0-proposed` | Report | Not data quality guarantee. | "Data coverage" | 14 contributors below threshold returns suppressed. |
| `ENT-MET-007` | missing/unknown rate | Share of eligible aggregate inputs that were unknown or missing. | Unknown/missing aggregate inputs | Eligible aggregate inputs | Windowed aggregate | Raw reasons that identify user excluded | 20 | 15 | Weekly/monthly | Unknown remains unknown, never normal or zero. | `1.0-proposed` | Cohort | Not poor employee behavior. | "Missing/unknown rate" | 12 unknown of 100 inputs = 12 percent. |
| `ENT-MET-008` | employee helpfulness | Aggregate post-campaign helpfulness response. | Positive helpfulness responses | Submitted helpfulness responses | Voluntary survey | Non-response not negative | 20 | 15 | Campaign/month | Low responses suppress. | `1.0-proposed` | Campaign/cohort | Not medical effectiveness. | "Employee helpfulness" | 40 positive of 60 responses = 67 percent. |
| `ENT-MET-009` | app/version health | App deployment health by version/ring using coarse buckets only. | App instances in healthy/update buckets | Managed app instances | Managed devices | Personal wellbeing state and real-time online state excluded | 1 | 1 | Fixed daily technical rollup/monthly | Technical unknown shown separately; buckets are healthy within 24 hours, seen within 2-7 days, not seen for more than 7 days and update required. | `1.0-proposed` | Control Plane | Not wellbeing metric, attendance or work time. | "App/version health" | 95 healthy/update-known of 100 devices = 95 percent. |
