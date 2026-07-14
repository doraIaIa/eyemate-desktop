# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-011 — Decision matrix và ADR review
Task state: DONE (ADR-003 accepted Electron for M1 shell; ADR-004 remains proposed)

Git verification:

- Latest verified task commit before this batch: `5679369`.
- Working tree: T-M0-011 ADR/status pending commit.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed M0 evidence:

- Evidence pipeline and measurement tooling have fixture coverage.
- Electron `v37.10.3` camera-off candidate: local asset, explicit-consent/unavailable state and clean shutdown passed.
- Tauri camera-off candidate: local asset, explicit-consent/unavailable state and clean shutdown passed; Tauri smoke still has WebView2 teardown diagnostic limitation below.
- Electron SQLite fixture synthetic: clean install, N-1 backup/transaction/integrity and forced-failure write lock passed.
- Tauri SQLite fixture synthetic: clean install, N-1 backup/transaction/integrity and forced recovery passed.
- Privacy sink gate fixtures passed for SQLite/log/crash/telemetry/temp synthetic outputs.
- Static source inspection for `tools/m0` passed for current source set.
- T-M0-011 ADR review: ADR-003 accepted Electron as the M1 desktop shell based on M0 evidence; ADR-004 remains proposed because real camera/runtime/model asset evidence is still missing.
- T-M0-010 camera-off local performance/reproducibility report passed scanner type `resource-trace`:
  - Electron elapsed ms `3729/3593/3609`, peak working set `327729152` bytes, max process-tree count `4`, CPU delta observed `0`, normalized payload deterministic `true`, raw MSIX deterministic `false` due `MSIX_CONTAINER_OR_BLOCKMAP_METADATA`.
  - Tauri elapsed ms `4276/3991/3888`, peak working set `367284224` bytes, max process-tree count `8`, CPU delta observed `0`, normalized payload deterministic `true`, raw MSIX deterministic `false` due `MSIX_CONTAINER_OR_BLOCKMAP_METADATA`.
  - Report output is local ignored `.m0/perf/reports/m0-candidate-performance.json`; no raw frame/video/landmark, username, hostname, absolute path or network payload was written.
- T-M0-009 MSIX feasibility built both internal packages with Windows SDK `makeappx` and signed with the owner-approved CurrentUser test certificate:
  - Tauri package: `packages/eyemate-m0-tauri.msix`, byte size `3695279`, SHA-256 `ebcd0c8e11baa0f32737bb55e14a89fc5e14edac64d5d8b2c6b0a81bdb730c41`.
  - Electron package: `packages/eyemate-m0-electron.msix`, byte size `138364591`, SHA-256 `064d474c309cbf3d2f5891c1256f74eac36c86c3878d304c0e7b10b2213d3c60`.
  - Package summaries passed scanner type `package-build`; raw MSIX files and `.m0/` reports are local ignored build output and are not committed.

## Kiểm kê toolchain — bằng chứng M0 cục bộ

| Công cụ | Phiên bản đã quan sát | Đường dẫn an toàn hoặc kiểm chứng |
| --- | --- | --- |
| Rust compiler | `1.97.0` | Rustup cấp người dùng; không ghi đường dẫn để tránh identifier cá nhân. |
| Cargo | `1.97.0` | Rustup cấp người dùng; không ghi đường dẫn để tránh identifier cá nhân. |
| MSVC C/C++ compiler | `19.44.35228` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe` |
| Microsoft linker | `14.44.35228.0` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\link.exe` |
| Windows SDK libraries | `10.0.26100.0` | Đã xác nhận có `C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64\kernel32.lib`. |
| Windows SDK MakeAppx | `10.0.26100.0` | `C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe` |
| Windows SDK SignTool | `10.0.26100.0` | `C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe` |

Kiểm kê này không chứa tên người dùng, tên máy, số sê-ri, định danh thiết bị, cert thumbprint/private key hoặc output command thô.

Deferred M0 limitation:

- Dynamic WPR egress/auto-update is `UNKNOWN / DEFERRED_M0_LIMITATION` after `wpr -start Network -filemode` failed `0xc5585011`; no elevation, policy change or retry is allowed.
- MSIX signature trust verification is `UNTRUSTED_TEST_CERT_OR_POLICY` because the local test certificate was used only from CurrentUser signing store; Codex did not modify trust store/security policy. This is not production signing evidence and not Store readiness.

Known limits:

- Manifest file-symlink integration is `SKIP (EPERM)` and must rerun before an official benchmark.
- Tauri smoke emitted WebView2 teardown diagnostic `Chrome_WidgetWin_0` / `1412` despite exit `0` and no leftover process. Ảnh hưởng runtime/measurement là `UNKNOWN`; không dùng smoke này làm bằng chứng hiệu năng.
- `cargo fmt --check` là `UNKNOWN` vì Rust stable hiện chưa có component `rustfmt` (`cargo-fmt.exe` missing). Component này không chặn `cargo check`, `cargo build` hoặc smoke test và chưa được cài tự động.
- Clean install/uninstall of signed MSIX is `NOT_RUN` because installing/trusting a test package would require changing local package/trust state beyond package-build feasibility.

Next M0 action:

- T-M0-012 — Cleanup, archive và M0 exit record; dynamic WPR egress remains deferred/unknown.
