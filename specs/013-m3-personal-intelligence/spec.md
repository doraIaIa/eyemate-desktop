# Feature 013 — M3 Personal Intelligence, Trends and Reports

```yaml
decision_status: proposed
release_scope: m3
owner: product-owner
review: { product: required, privacy: required, clinical: required }
```

## Outcome

Local-only, versioned personal analytics converts M1 survey-only and M2 timer-only records into explainable baseline, pattern, VLI, daily/weekly summaries and a previewable local professional summary. It is a wellness product feature, not diagnosis.

## Invariants

- Analytics accepts only typed aggregate/provenance records; never raw camera data or direct renderer SQLite access.
- Missing/unknown inputs remain explicit. They cannot become zero, normal, or a disease claim.
- Baseline is a behavioural reference only. Pattern results may abstain.
- VLI score and data confidence are separate and versioned.
- Historical reports keep their snapshot schema/rule semantics.
- Core flow works offline; export is local and requires preview/confirmation.

## Scope

- Canonical input, baseline, pattern/VLI, daily/weekly aggregation, report snapshot, local export preview/write, reset/delete.
- Timer-only and survey-only vertical slice; real camera values remain optional/UNKNOWN.

## Out of scope

Cloud, account, sharing, disease prediction, clinical recommendation, monthly trend, public release, raw camera persistence.
