# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-005 — Tauri camera/local-asset spike
Task state: BLOCKED

Git verification:

- Latest verified task commit: `b010d16`.
- Task base commit: `b010d16`.
- Working tree: uncommitted `candidates/tauri/` is preserved; do not discard or commit it before a successful build.
- Files currently modified: `candidates/tauri/`.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed M0 evidence:

- Evidence pipeline and measurement tooling have fixture coverage.
- Electron `v37.10.3` camera-off candidate: local asset, explicit-consent/unavailable state and clean shutdown passed at `b010d16`.
- Rust stable user-level: `rustc/cargo 1.97.0` via rustup; no system-wide tool was installed.

Deferred M0 limitation:

- Dynamic WPR egress/auto-update is `UNKNOWN / DEFERRED_M0_LIMITATION` after `wpr -start Network -filemode` failed `0xc5585011`; no elevation, policy change or retry is allowed.

Blocker requiring owner:

- Tauri `cargo check` cannot find MSVC linker `link.exe`. Visual C++ Build Tools/Windows SDK installation is not authorized.

Next exact action:

- Decide whether to authorize MSVC Build Tools/Windows SDK, or retain Tauri as environment-blocked without selecting a shell.

Next exact command:

- `cargo check --manifest-path candidates/tauri/src-tauri/Cargo.toml`.

Known limit:

- Manifest file-symlink integration is `SKIP (EPERM)` and must rerun before an official benchmark.
