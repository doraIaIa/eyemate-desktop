# ADR-003 — Desktop shell selection

- Status: accepted
- Decision status: accepted
- Date: 2026-07-14
- Accepted in: M0 / T-M0-011
- Owner: tech-lead
- Related requirements: `FR-M0-001`, `NFR-M0-001`, `NFR-M0-002`, `REL-M0-001`, `REL-M0-002`, `REL-M0-003`, `VAL-M0-001`, `AC-M0-011`, `AC-M0-012`, `AC-M0-013`
- Supersedes: none

## Decision

Use **Electron** as the EyeMate V2 desktop shell for the next implementation phase.

This is an M0 architecture decision for the desktop shell boundary, not a production release approval and not a clinical/camera-runtime decision. ADR-004 still controls the camera runtime/local asset topology and remains proposed until real camera/runtime asset evidence exists.

## Scope of acceptance

`confirmed`:

- Electron and Tauri were both implemented as minimal camera-off candidates using the same shared local asset/state fixture.
- Both candidates passed synthetic state, migration/recovery, privacy sink, static egress, MSIX feasibility and camera-off benchmark gates.
- Electron is selected because it has lower observed camera-off startup/peak working-set evidence in the latest M0 run, lower migration risk from V1's Electron baseline, and no observed WebView2 teardown diagnostic in the current smoke path.
- Tauri remains technically viable and has a much smaller MSIX payload, but it carries Rust/MSVC toolchain complexity and the current M0 smoke path still has a WebView2 teardown diagnostic limitation.

`proposed`:

- M1 should keep shell-specific code behind ports/adapters and avoid importing Electron into Domain Core.
- Tauri candidate should be archived, not maintained as a parallel production shell, unless a revisit criterion below is triggered.

`tbd / limitation`:

- Real camera permission/start/stop, busy, low-quality, device-change and active-disconnect behavior has not been benchmarked in this ADR.
- Dynamic WPR egress/auto-update remains `UNKNOWN / DEFERRED_M0_LIMITATION` due host policy error `0xc5585011`.
- Signed MSIX trust/install/uninstall remains `NOT_RUN`; test certificate signing passed, but trust-store/security policy was not changed.
- CPU delta in camera-off synthetic benchmark was observed as `0`; this is not a production performance budget.
- Raw MSIX package hash is not deterministic; normalized payload hash is deterministic and nondeterminism is scoped to MSIX container/block-map metadata.

## Decision matrix

| Criterion | Electron | Tauri | Decision impact |
| --- | --- | --- | --- |
| Shared camera-off/local asset state | `PASS`: `npm run test:state:m0`, `npm run test:electron:m0` | `PASS`: Tauri smoke/test mode with shared asset | Tie; both can host the minimal M0 UI/state. |
| V1 migration/reuse | `PASS/PARTIAL`: V1 is Electron/Vite/TypeScript at commit `77ad32f1...`; reuse still requires contract rewrite | `NOT_EVALUATED`: no V1 Tauri baseline | Favors Electron for M1 delivery risk, without treating V1 behavior as source of truth. |
| SQLite migration/recovery | `PASS`: `npm run test:storage:electron:m0` | `PASS`: `cargo test ... m0_storage` | Tie; both passed synthetic clean/N-1/failure fixtures. |
| Privacy sink/static egress | `PASS`: privacy sink fixtures and static `tools/m0` inspection passed | `PASS`: same shared tooling gates passed | Tie; no raw frame/video/landmark persistence evidence in synthetic sinks. |
| MSIX feasibility | `PASS_WITH_LIMIT`: signed internal MSIX built, size `138364591` bytes; trust verify `UNTRUSTED_TEST_CERT_OR_POLICY` | `PASS_WITH_LIMIT`: signed internal MSIX built, size `3695279` bytes; trust verify `UNTRUSTED_TEST_CERT_OR_POLICY` | Strongly favors Tauri on package size, but both satisfy M0 package feasibility. |
| Package reproducibility | `PASS_WITH_LIMIT`: normalized payload deterministic; raw MSIX nondeterministic due container/block-map metadata | `PASS_WITH_LIMIT`: normalized payload deterministic; raw MSIX nondeterministic due container/block-map metadata | Tie; both need release pipeline handling for raw package nondeterminism. |
| Camera-off startup/RAM evidence | `PASS`: elapsed ms `3729/3593/3609`, peak working set `327729152` bytes | `PASS`: elapsed ms `4276/3991/3888`, peak working set `367284224` bytes | Favors Electron in current DP-DEV camera-off run. |
| Runtime diagnostics | `PASS`: no current smoke diagnostic captured in M0 Electron path | `LIMIT`: WebView2 teardown diagnostic `Chrome_WidgetWin_0` / `1412` observed earlier despite exit `0` | Favors Electron until Tauri diagnostic is explained or eliminated. |
| Toolchain/maintenance | `PASS_WITH_LIMIT`: npm/Electron dependency footprint and larger runtime | `PASS_WITH_LIMIT`: Rust/MSVC/Windows SDK requirements and Tauri/WebView2 variance | Slightly favors Electron for near-term M1 velocity; Tauri remains better on artifact footprint. |
| Store/publish readiness | `NOT_EVALUATED`: no Store submission, install/uninstall or production signing | `NOT_EVALUATED`: same | No candidate receives production release approval from M0. |

## Evidence used

- `a0f6d26` — T-M0-009 MSIX feasibility tooling.
- `4442393` — T-M0-010 camera-off performance/reproducibility benchmark.
- `PROJECT_STATUS.md` — current package hashes, benchmark summary and known limitations.
- `tools/m0/README.md` — canonical commands for MSIX and benchmark harness.
- `docs/audits/` — V1 read-only audit and migration risk baseline.

## Consequences

- M1 desktop foundation should build around Electron as the shell adapter.
- Domain Core, data contracts, privacy gates and camera/runtime ports must remain shell-independent.
- Tauri code remains useful archived evidence and can be removed or frozen during cleanup; it should not become a second production implementation without a new ADR.
- Electron package size/runtime footprint becomes an explicit M1 engineering risk, not a reason to keep dual-shell development alive.

## Revisit criteria

Reopen this ADR if one of these occurs:

- Electron fails real camera lifecycle, local asset, privacy sink or MSIX install gates that Tauri passes under the same workload.
- Tauri's WebView2 diagnostic is resolved and Tauri materially outperforms Electron on real camera workload while preserving privacy/release gates.
- Store/signing constraints reject Electron packaging but allow Tauri under the same policy.
- M1 discovers V1 migration reuse is negligible or harmful, removing Electron's migration advantage.
- A safety/privacy boundary conflict appears in Electron-specific IPC, preload, logging or crash behavior.
