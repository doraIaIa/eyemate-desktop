# M4 Exit Record — Validation, Hardening & Internal Engineering Candidate

```yaml
decision_status: confirmed
release_scope: m4
owner: tech-owner
last_reviewed: 2026-07-14
```

## Status

`ENGINEERING_COMPLETE_WITH_LIMITATIONS` for local synthetic engineering only. This is neither `PILOT_READY` nor `PUBLIC_READY`.

## Verified engineering evidence

| Gate | Evidence | Result |
|---|---|---|
| Canonical regression | `npm run release:verify` | PASS |
| Security posture | `npm run security` | PASS |
| Accessibility static gate | `npm run accessibility` | PASS |
| Migration/recovery | SQLite integration fixtures | PASS |
| Internal package | MakeAppx staged smoke | PASS, unsigned |
| Provenance | `npm run release:provenance` | PASS, local SBOM/checksum/manifest |
| Runtime observation | `npm run performance:m4` | OBSERVED: camera-off smoke and MSIX size |

## Feature matrix

| Capability | State | Reason |
|---|---|---|
| Survey-only checkup / timer-only companion | ENABLED | Local acceptance evidence. |
| M3 baseline/report/export/delete | ENABLED | Typed local-only regression evidence. |
| Blink and numeric distance | DISABLED | No real-world accuracy protocol or dataset. |
| Camera-derived VLI | DISABLED | No validated calibrated provenance. |
| Sensitive-data pilot | DISABLED | ADR-005 encryption/key-lifecycle gate. |
| Internal unsigned MSIX | ENABLED | Engineering only; signing is external. |

## External limitations

- Real camera lifecycle and blink/distance accuracy: `UNKNOWN`.
- Dynamic egress: `UNKNOWN / DEFERRED_EXTERNAL_ENVIRONMENT` from prior WPR host-policy failure.
- Encryption at rest, signing certificate, clinical/questionnaire approval, real-world usability and longitudinal stability: external gates.
- Renderer sandbox remains disabled because the existing ESM preload bridge has not been migrated to a sandbox-compatible design; context isolation, nodeIntegration off, CSP and navigation guards are enforced.

## Preconditions before pilot/public distribution

Encryption evidence and approval, clinical approval, signed package, real-camera validation, dynamic privacy evidence, pilot owner/incident process, and owner approval are all required.
