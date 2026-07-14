# Feature 014 — M4 Validation, Hardening and Internal Pilot Candidate

```yaml
decision_status: proposed
release_scope: m4
owner: product-owner
review: { product: required, privacy: required, security: required, clinical: required }
```

## Outcome

M4 validates and hardens the existing local-only M0–M3 implementation. It does not add clinical claims, cloud services, a public release, or use data from another person.

## Feature gates

| Feature | Initial M4 state | Gate to enable |
|---|---|---|
| Survey-only and timer-only flows | ENABLED | Existing local acceptance remains green. |
| Camera-derived blink/distance | DISABLED | Lifecycle and quality gates pass; accuracy remains separately evidenced. |
| Numeric distance | DISABLED | Ground-truth accuracy protocol and approved threshold. |
| VLI camera components | DISABLED | Valid calibrated aggregate provenance. |
| Internal unsigned MSIX | ENABLED | Reproducible package and staged smoke. |
| Pilot with sensitive persisted data | DISABLED | ADR-005 gate requires approved encryption/key lifecycle evidence. |

## Invariants

- Raw frames, video, landmarks and per-frame biometrics never enter persistence, logs, exports or M4 evidence.
- Unknown, skipped and externally blocked checks remain explicit; they never become PASS.
- Every release artifact is local, checksummed and traceable to a commit.
- Camera validation uses an explicit local action and closes the device after each run.
- M4 can only claim engineering completion with limitations until clinical approval, signed distribution and real-world accuracy evidence exist.
