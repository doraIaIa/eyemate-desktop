# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-003G — Fail-closed measurement-tool egress gate
Task state: BLOCKED

Git verification:

- Latest verified commit: `259d82e`.
- Task base commit: `259d82e`.
- Working tree: checkpoint update pending commit.
- Files currently modified: `PROJECT_STATUS.md`.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed immediately before current task:

- Local-only allowlist collector for Node, WPR, Xperf, Logman and Wevtutil.
- Scrubbed, scanner-checked and atomically written `resource-trace` inventory artifact.
- Inventory records availability and safely parsed version only; raw command output, executable paths, username and hostname are excluded.

Verification already run for T-M0-003E:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`: 7 PASS, including unsafe path and junction rejection with no outside write.
- Egress and auto-update remain `NOT_EVALUATED_OFFLINE_ONLY`; this task does not open network or camera.
- Full M0 regression suite and `git diff --check` passed before commit `d98f4f9`.

Blocker requiring user:

- Quyền bắt đầu/dừng WPR Network capture tạm thời để tạo evidence egress/auto-update. Capture sẽ tạo ETL ngoài evidence root, cần được inspect/scrub trước ingest và không mở camera.

Still remaining in M0:

- Egress/auto-update trace evidence remains required before camera/network benchmark; the fail-closed gate is implemented but is not that evidence.

Next exact action:

- Obtain authorization for a temporary WPR Network capture plan, then inspect/scrub its output outside the evidence root before any ingest.

Next exact command:

- `wpr -help start`.

Known limit:

- File-symlink integration in the manifest suite remains `SKIP (EPERM)` and must be rerun before an official benchmark.
