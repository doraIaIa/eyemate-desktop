# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-003G — Fail-closed measurement-tool egress gate
Task state: DONE

Git verification:

- Latest verified commit: `259d82e`.
- Task base commit: `259d82e`.
- Working tree: WPR blocker checkpoint pending commit.
- Files currently modified: `PROJECT_STATUS.md`, `specs/000-m0-architecture-poc/tasks.md`.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed immediately before current task:

- Local-only allowlist collector for Node, WPR, Xperf, Logman and Wevtutil.
- Scrubbed, scanner-checked and atomically written `resource-trace` inventory artifact.
- Inventory records availability and safely parsed version only; raw command output, executable paths, username and hostname are excluded.

Verification already run for T-M0-003E:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`: 7 PASS, including unsafe path and junction rejection with no outside write.
- Egress and auto-update remain `NOT_EVALUATED_OFFLINE_ONLY`; this task does not open network or camera.
- Full M0 regression suite and `git diff --check` passed before commit `d98f4f9`.

Recorded external blocker:

- `wpr -start Network -filemode` failed with `0xc5585011` (host policy/permission); WPR remained `not recording`, no ETL was created and the empty quarantine root was deleted.
- Dynamic WPR egress/auto-update verification is `UNKNOWN`; no elevation, policy change, system-setting change or retry is permitted.

Still remaining in M0:

- Static egress inspection and local/offline POC may continue. Dynamic WPR egress verification remains `UNKNOWN` before M0 conclusion.

Next exact action:

- Implement static egress inspection for repo-local M0 tooling; do not infer behavior of WPR or other system tools from source inspection.

Next exact command:

- `node tools/m0/run-static-egress-inspection-fixture-tests.mjs`.

Known limit:

- File-symlink integration in the manifest suite remains `SKIP (EPERM)` and must be rerun before an official benchmark.
