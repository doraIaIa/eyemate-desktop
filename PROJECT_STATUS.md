# Project Status

Last updated: 2026-07-18
Current branch: `main`
Current HEAD: `128a94269c84b658ac95fa5cb328d1e531e972c6`
Upstream: `origin/main`
Working tree at update time: `clean`
Latest implementation commit: `128a942 feat: strengthen checkup companion and personal insights`

## Current Project Phase

EyeMate is a local-first personal visual-wellbeing desktop application. M0 through M4 are complete at an engineering level with limitations; this does not mean `PUBLIC_READY`, signed release ready, or real-person pilot ready.

The current active decision point is:

1. Continue closing external validation and pilot gates for the personal product.
2. Or open a separate M5 Enterprise Discovery track without mixing it into the personal data plane.

M5 Enterprise has not started. Enterprise work must begin with discovery plus privacy/legal specification, not with a production backend or dashboard.

## Milestone Status

| Milestone | Status | Closing reference | Remaining limitations |
|---|---|---|---|
| M0 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `c41a22b` / `824fec6` | Real camera, dynamic egress, signed install |
| M1 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `d7c8892` | Clinical approval, real camera accuracy |
| M2 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `024bff9` / `128a942` | Camera companion validation |
| M3 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `2998fcb` / `5123da6` / `128a942` | Camera-derived VLI, stronger claims |
| M4 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `fcaeaca` | Signing, dynamic egress, real-device validation, pilot approval |
| M5 | `NOT_STARTED` | None | Discovery, legal/privacy, RBAC, cohort architecture |

Do not promote any milestone above `ENGINEERING_COMPLETE_WITH_LIMITATIONS` until the matching external gates have explicit evidence and owner approval.

## Implemented Capabilities

- Electron local-first desktop shell with typed preload/IPC boundary.
- SQLite local storage schema v12 with migration and recovery coverage.
- Five-question non-clinical EyeMate wellness checkup.
- Local report, preview, export and delete flows.
- Work Companion profiles and nudge policy, including `BALANCED`, `DEEP_FOCUS`, `HIGH_SUPPORT`, `TIMER_ONLY` and `CUSTOM`.
- Personal Intelligence with 7/30-day work rhythm summaries and local report aggregation.
- Privacy Center and local data inventory/delete controls.
- Camera measurement aggregate path with `rawDataPersisted=false`.
- Unsigned MSIX engineering tooling and local release evidence.

This list is an engineering inventory, not a marketing or clinical claim.

## Disabled, UNKNOWN Or Gated Capabilities

- Blink/distance accuracy: `DISABLED` or `UNKNOWN` until ground-truth protocol, dataset and thresholds are approved.
- Real-camera full validation: pending operator validation on suitable hardware and conditions.
- Camera-derived VLI: disabled until calibrated camera provenance is validated.
- Sensitive real-person pilot: gated by Security/Privacy approval.
- Dynamic egress verification: `UNKNOWN/DEGRADED`; prior WPR runs were blocked by host/tooling constraints.
- Signed/public MSIX: pending certificate, distribution identity and install/update/rollback evidence.
- Clinical diagnosis, treatment and OSDI clinical flow: disabled or outside intended use unless separately approved.
- Focus, fatigue and productivity monitoring: not implemented and not in current personal-product scope.
- M5 Enterprise: not started.

## External Gates Remaining

- Security/Privacy approval for sensitive persistence and pilot use.
- Real-camera operator validation.
- Ground-truth protocol, dataset and threshold for blink/distance.
- Clinical/Product approval for clinical content if any such content is enabled.
- Signing certificate and distribution identity.
- Install, update and rollback evidence.
- Dynamic TCP/UDP/DNS verification.
- Pilot/public release approval.
- Incident ownership and pilot operations owner.

## Enterprise Status

M5 is post-MVP. Enterprise implementation has not started.

There is no tenant, account, backend, RBAC, admin dashboard, cohort aggregation pipeline, employee health monitoring or individual employer view in the current repository.

Any Enterprise work must start as a separate Discovery track with privacy/legal boundaries, cohort threshold design, RBAC/audit requirements and re-identification controls. It must not expose personal symptom records, checkup reports, risk labels or individual health views to an employer.

## Evidence Pointers

- M0 exit: `docs/validation/m0-exit-record.md`
- Electron shell decision: `docs/architecture/adr/ADR-003-desktop-shell-selection.md`
- M4 exit: `docs/validation/m4-exit-record.md`
- Pilot feature matrix: `pilot/feature-matrix.json`
- External gate checklist: `pilot/external-gate-checklist.json`
- Latest implementation batch: `128a942 feat: strengthen checkup companion and personal insights`

## Continuity

Recommended next decision:

1. Continue resolving external validation gates for the personal product.
2. Or approve a separate M5 Enterprise Discovery track, explicitly isolated from the personal data plane.

Option 2 is not approved by this status document. This document only records that M5 is `NOT_STARTED`.

## Last Verified Repository State For This Status Sync

- Branch: `main`
- HEAD: `128a94269c84b658ac95fa5cb328d1e531e972c6`
- Upstream: `origin/main`
- Working tree: `clean`
- Scope changed: documentation status only
- Files intentionally changed by this sync: `PROJECT_STATUS.md`
