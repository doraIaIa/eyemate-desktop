# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-003E — Local measurement-tool inventory
Task state: DONE

Git verification:

- Current task commit and working-tree state must be read from `git log --oneline -1` and `git status --short`; this file intentionally does not duplicate a commit hash.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed in current task:

- Local-only allowlist collector for Node, WPR, Xperf, Logman and Wevtutil.
- Scrubbed, scanner-checked and atomically written `resource-trace` inventory artifact.
- Inventory records availability and safely parsed version only; raw command output, executable paths, username and hostname are excluded.

Verification completed:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`: 7 PASS, including unsafe path and junction rejection with no outside write.
- Egress and auto-update remain `NOT_EVALUATED_OFFLINE_ONLY`; this task does not open network or camera.
- The full M0 regression suite and `git diff --check` are required immediately before commit.

Remaining M0 readiness work:

- Select and implement the next dependency-safe measurement readiness task after this commit; no camera, shell selection or benchmark run is started by this task.

Known limit:

- File-symlink integration in the manifest suite remains `SKIP (EPERM)` and must be rerun before an official benchmark.
