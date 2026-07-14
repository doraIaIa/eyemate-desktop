# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-005 — Tauri camera/local-asset spike
Task state: DONE (POC tối thiểu; limitation runtime được ghi riêng)

Git verification:

- Latest verified task commit: `b010d16`.
- Task base commit: `b010d16`.
- Working tree: Tauri candidate đã qua review; nguồn task chờ commit.
- Files currently modified: Tauri candidate, `.gitignore` và status record này.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed M0 evidence:

- Evidence pipeline and measurement tooling have fixture coverage.
- Electron `v37.10.3` camera-off candidate: local asset, explicit-consent/unavailable state and clean shutdown passed at `b010d16`.
- Rust stable user-level: `rustc/cargo 1.97.0` via rustup.
- Microsoft Visual Studio Build Tools 2022 `17.14.35` đã hoàn tất và chạy được; không cần reboot.
- Tauri `cargo check` và `cargo build` đã pass cục bộ với icon và shared asset nội bộ.
- Tauri smoke startup/shutdown trả exit `0` và không còn process `eyemate-m0-tauri`.

## Kiểm kê toolchain — bằng chứng M0 cục bộ

| Công cụ | Phiên bản đã quan sát | Đường dẫn an toàn hoặc kiểm chứng |
| --- | --- | --- |
| Rust compiler | `1.97.0` | Rustup cấp người dùng; không ghi đường dẫn để tránh identifier cá nhân. |
| Cargo | `1.97.0` | Rustup cấp người dùng; không ghi đường dẫn để tránh identifier cá nhân. |
| MSVC C/C++ compiler | `19.44.35228` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe` |
| Microsoft linker | `14.44.35228.0` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\link.exe` |
| Windows SDK libraries | `10.0.26100.0` | Đã xác nhận có `C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64\kernel32.lib`. |

Kiểm kê này không chứa tên người dùng, tên máy, số sê-ri, định danh thiết bị hoặc output command thô.

Deferred M0 limitation:

- Dynamic WPR egress/auto-update is `UNKNOWN / DEFERRED_M0_LIMITATION` after `wpr -start Network -filemode` failed `0xc5585011`; no elevation, policy change or retry is allowed.

T-M0-005 không còn blocker toolchain. Chưa có quyết định Electron/Tauri.

Known limit:

- Manifest file-symlink integration is `SKIP (EPERM)` and must rerun before an official benchmark.
- Tauri smoke emitted WebView2 teardown diagnostic `Chrome_WidgetWin_0` / `1412` despite exit `0` and no leftover process. Ảnh hưởng runtime/measurement là `UNKNOWN`; không dùng smoke này làm bằng chứng hiệu năng.
- `cargo fmt --check` là `UNKNOWN` vì Rust stable hiện chưa có component `rustfmt` (`cargo-fmt.exe` missing). Component này không chặn `cargo check`, `cargo build` hoặc smoke test và chưa được cài tự động.
