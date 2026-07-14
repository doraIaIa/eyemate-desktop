# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-003F — Measurement-harness overhead control dry-run
Task state: DONE

Git verification:

- Latest verified commit: `0c3363c`.
- Task base commit: `0c3363c`.
- Working tree: expected clean after this task commit.
- Files currently modified: NONE after commit.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed immediately before current task:

- Local-only allowlist collector for Node, WPR, Xperf, Logman and Wevtutil.
- Scrubbed, scanner-checked and atomically written `resource-trace` inventory artifact.
- Inventory records availability and safely parsed version only; raw command output, executable paths, username and hostname are excluded.

Verification already run for T-M0-003E:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`: 7 PASS, including unsafe path and junction rejection with no outside write.
- Egress and auto-update remain `NOT_EVALUATED_OFFLINE_ONLY`; this task does not open network or camera.
- Full M0 regression suite and `git diff --check` passed before commit `d98f4f9`.

Still remaining in M0:

- Egress/auto-update inspection and tool-output inspection remain required before camera/network benchmark.

Next exact action:

- Select the next local-only measurement-readiness task; do not invoke any candidate, camera or network.

Next exact command:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`.

Known limit:

- File-symlink integration in the manifest suite remains `SKIP (EPERM)` and must be rerun before an official benchmark.
