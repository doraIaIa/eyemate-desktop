# Project Status

Last updated: 2026-07-14
Current milestone: M0 — Architecture POC
Current task: T-M0-003I — Measurement-tool output admission gate
Task state: DONE

Git verification:

- Latest verified commit: `02530ff`.
- Task base commit: `02530ff`.
- Working tree: task T-M0-003I pending commit.
- Files currently modified: `PROJECT_STATUS.md`, `specs/000-m0-architecture-poc/tasks.md`, `tools/m0/`.
- V1 remains read-only at `F:\dry-eye-app`; required baseline commit is `77ad32f1b519418d882d2d476f13206644536df9`.

Completed measurement-readiness tooling:

- Local-only allowlist collector for Node, WPR, Xperf, Logman and Wevtutil.
- Scrubbed, scanner-checked and atomically written `resource-trace` inventory artifact.
- Inventory records availability and safely parsed version only; raw command output, executable paths, username and hostname are excluded.
- Static egress inspection passed for the current repo-local production `tools/m0` source set.
- Tool-output gate quarantines raw capture/dump extensions before opening them.

Verification already run for T-M0-003E:

- `node tools/m0/run-tool-inventory-fixture-tests.mjs`: 7 PASS, including unsafe path and junction rejection with no outside write.
- Egress and auto-update remain `NOT_EVALUATED_OFFLINE_ONLY`; this task does not open network or camera.
- Full M0 regression suite and `git diff --check` passed before commit `d98f4f9`.

Deferred M0 limitation:

- Dynamic WPR egress/auto-update verification is `UNKNOWN / DEFERRED_M0_LIMITATION` because `wpr -start Network -filemode` failed with `0xc5585011`; WPR remained `not recording`, no ETL was created and no elevation/policy/system-setting change or retry is permitted.
- This dynamic verification must be rerun before an external pilot/public release, or when the final measurement stack requires WPR.

Still remaining in M0:

- Continue only local/offline M0 tasks whose dependencies are ready; dynamic WPR egress verification remains an explicit M0 conclusion limitation.

Next exact action:

- Select the next local/offline candidate or measurement task that does not require a desktop-shell decision, camera, toolchain install or administrator permission.

Next exact command:

- `node tools/m0/run-static-egress-inspection-fixture-tests.mjs`.

Known limit:

- File-symlink integration in the manifest suite remains `SKIP (EPERM)` and must be rerun before an official benchmark.
