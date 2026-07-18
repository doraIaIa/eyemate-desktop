# Project Status

Last updated: 2026-07-18
Current branch: `main`
Current HEAD: `629916b07aa85bec46673d2908d498232e966c40`
Upstream: `origin/main`
Working tree at update time: `M5 Enterprise Discovery changes pending review`
Latest implementation commit: `128a942 feat: strengthen checkup companion and personal insights`

## Current Project Phase

EyeMate is a local-first personal visual-wellbeing desktop application. M0 through M4 are complete at an engineering level with limitations; this does not mean `PUBLIC_READY`, signed release ready, or real-person pilot ready.

M5 Enterprise Discovery is `IN_REVIEW` as a separate non-implementation track. Owner decisions have been applied to normalize the Discovery boundary. M5 implementation remains `NOT_STARTED`; no backend, tenant service, cloud synchronization, production admin dashboard, authentication, SSO, production database or application-code change is approved by this status.

Enterprise Pilot Demo is available as a `DEVELOPMENT_ONLY_REVIEW_ARTIFACT` behind `npm run dev:enterprise-demo`. It is a packaged Electron demo window with synthetic in-memory data for owner review, not a production admin dashboard and not M5 implementation.

## Milestone Status

| Milestone | Status | Closing reference | Remaining limitations |
|---|---|---|---|
| M0 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `c41a22b` / `824fec6` | Real camera, dynamic egress, signed install |
| M1 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `d7c8892` | Clinical approval, real camera accuracy |
| M2 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `024bff9` / `128a942` | Camera companion validation |
| M3 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `2998fcb` / `5123da6` / `128a942` | Camera-derived VLI, stronger claims |
| M4 | `ENGINEERING_COMPLETE_WITH_LIMITATIONS` | `fcaeaca` | Signing, dynamic egress, real-device validation, pilot approval |
| M5 Discovery | `M5_DISCOVERY_IN_REVIEW_IMPLEMENTATION_NOT_STARTED` | `prototypes/enterprise-pilot/`, `docs/product/enterprise/`, `docs/data/enterprise/`, `docs/privacy-security/enterprise/`, `docs/architecture/enterprise/`, `docs/research/enterprise/`, `specs/015-*` to `specs/021-*` | Privacy/legal/security review, design-partner validation, technical planning decision |

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
- M5 Enterprise implementation: not started.

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

M5 is post-MVP. Enterprise Discovery is in review; Enterprise implementation has not started.

There is no production tenant service, account system, backend, production RBAC, production admin dashboard, production cohort aggregation pipeline, employee health monitoring or individual employer view in the current repository.

The imported enterprise prototype is a non-production discovery artifact using synthetic data. The Enterprise Discovery Pack records privacy/legal boundaries, cohort threshold design, RBAC/audit requirements and re-identification controls for owner review. It must not expose personal symptom records, checkup reports, risk labels or individual health views to an employer.

Approved-for-discovery owner decisions: product category wording, three-plane architecture boundary, non-overridable forbidden employer features, Control Plane identity scope, aggregate contribution default OFF, proposed-pilot-default privacy thresholds, four bounded campaign templates, EyeMate Program Implementation & Participation Report naming and design-partner criteria.

## Evidence Pointers

- M0 exit: `docs/validation/m0-exit-record.md`
- Electron shell decision: `docs/architecture/adr/ADR-003-desktop-shell-selection.md`
- M4 exit: `docs/validation/m4-exit-record.md`
- Pilot feature matrix: `pilot/feature-matrix.json`
- External gate checklist: `pilot/external-gate-checklist.json`
- Latest implementation batch: `629916b docs(status): synchronize project state at 128a942`
- Enterprise prototype: `prototypes/enterprise-pilot/`
- Enterprise Discovery Pack: `docs/product/enterprise/`, `docs/data/enterprise/`, `docs/privacy-security/enterprise/`, `docs/architecture/enterprise/`, `docs/research/enterprise/`
- Enterprise proposed specs: `specs/015-enterprise-trust-and-deployment/` through `specs/021-enterprise-rbac-and-audit/`
- Enterprise pilot demo: `docs/product/enterprise/enterprise-pilot-demo.md`, `npm run dev:enterprise-demo`, `npm run test:enterprise-demo`

## Continuity

Recommended next decision:

1. Review the M5 Enterprise Discovery Pack after owner-decision normalization and decide whether it is ready to commit as Discovery documentation.
2. Continue resolving external validation gates for the personal product independently.

This document does not approve M5 implementation or technical planning.

## Last Verified Repository State For This Status Sync

- Branch: `main`
- HEAD: `629916b07aa85bec46673d2908d498232e966c40`
- Upstream: `origin/main`
- Working tree: `M5 Enterprise Discovery changes pending review`
- Scope changed: M5 Enterprise Discovery documentation/prototype only
- Files intentionally changed by this sync: `PROJECT_STATUS.md`, Enterprise Discovery docs/specs/prototype
