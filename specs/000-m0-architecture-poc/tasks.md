# Tasks — M0 Architecture POC

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
```

## T-M0-003C — Benchmark evidence run-directory initializer

- Goal: khởi tạo atomically một run context `m0-run-initialization/0.1.0` và layout allowlist, không tạo measurement/artifact placeholder.
- Dependencies: T-M0-003B (`07d2f29`); Node standard library.
- Verification command: `node tools/m0/run-initializer-fixture-tests.mjs`.
- Out of scope: camera, benchmark, Git/inventory tự động, manifest artifact, task tiếp theo.

## T-M0-003D — Synthetic evidence pipeline integration

- Goal: chạy local-only chuỗi `initialize → validate → scan → manifest → verify` trên evidence synthetic.
- Dependencies: T-M0-003, T-M0-003A, T-M0-003B, T-M0-003C.
- Verification command: `node tools/m0/run-synthetic-pipeline.mjs`.
- Out of scope: camera, benchmark thật, measurement tooling hoặc candidate shell.

## T-M0-003E — Local measurement-tool inventory

- Goal: tạo artifact local-only đã scrub cho khả dụng/phiên bản của allowlist tool đo (`node`, `wpr`, `xperf`, `logman`, `wevtutil`) trước dry-run; không đo benchmark và không mở network/camera.
- Requirements/acceptance: `NFR-M0-001`, `NFR-M0-002`, `VAL-M0-001`, `PRIV-M0-001`.
- Dependencies: T-M0-003A và T-M0-003D hoàn thành.
- Verification command: `node tools/m0/run-tool-inventory-fixture-tests.mjs`.
- Expected evidence: artifact `resource-trace` schema-versioned, scanner-pass, không chứa raw command output, executable path, username hoặc hostname; egress/auto-update được ghi `NOT_EVALUATED_OFFLINE_ONLY`.
- Out of scope: capture trace, cài/đổi cấu hình tool, network probe, camera hoặc benchmark thật.
- Stop condition: tool cần shell/command tùy ý, output không scrub được, hoặc artifact ghi identifier/path máy.

## T-M0-003F — Measurement-harness overhead control dry-run

- Goal: chạy chính xác ba repetition no-op local-only để tạo evidence về overhead của measurement harness; đây không phải benchmark candidate, không tạo run `VALID` và không đặt threshold hiệu năng.
- Requirements/acceptance: `NFR-M0-001`, `NFR-M0-002`, `VAL-M0-001`, `VAL-M0-STOP-008`, `VAL-M0-STOP-012`.
- Dependencies: T-M0-003D và T-M0-003E hoàn thành.
- Verification command: `node tools/m0/run-measurement-control-dry-run-fixture-tests.mjs`.
- Expected evidence: report schema-versioned, ba attempt theo planned slot bất biến, provenance tool/collector, elapsed monotonic finite; scanner-pass và không chứa raw command output, path máy, camera hoặc network payload.
- Out of scope: Electron/Tauri, camera, process của candidate, network/egress probe, performance comparison, pass/fail budget hoặc outlier removal.
- Stop condition: worker không khởi tạo/cleanup được, attempt thiếu, output không qua scanner, hoặc evidence bị trình bày như benchmark result.

## T-M0-003G — Fail-closed measurement-tool egress gate

- Goal: chặn benchmark khi inventory tool chưa có evidence egress/auto-update; không suy diễn `PASS` từ `NOT_EVALUATED`.
- Dependencies: T-M0-003E.
- Verification command: `node tools/m0/run-tool-egress-gate-fixture-tests.mjs`.
- Expected evidence: `NOT_EVALUATED_OFFLINE_ONLY` bị từ chối bằng `BLOCKED_UNVERIFIED_EGRESS`; chỉ evidence đã được xác minh riêng mới qua gate.
- Out of scope: bắt đầu WPR/network capture, thay firewall/system setting, khẳng định tool không egress hoặc thay thế trace thật.

## T-M0-003B — SHA-256 manifest evidence artifact

- Goal: sinh và verify manifest SHA-256 deterministic cho artifact `artifacts/...` đã qua scanner, dùng relative path/type/size/hash/scanner version/schema version.
- Requirements/acceptance: `REL-M0-003`, `SEC-M0-001`, `VAL-M0-001`, `AC-M0-011`, `AC-M0-013`.
- Dependencies: T-M0-003 (`fc7ae96`) và T-M0-003A (`d0e51c6`); Node standard library.
- Do not modify: V1, camera/runtime, application candidate, dependency/OS setting, `AGENTS.template.md`/`AGENTS.md`.
- Out of scope: chữ ký số, immutable attestation, retention/purge, benchmark thật, scanner sink runtime hoặc task kế tiếp.
- Tests to add/update: deterministic generate/verify; modified/missing/duplicate/unsafe/scanner-rejected/unsupported-schema/strict-extra reject; fixture chỉ synthetic.
- Verification command: `node tools/m0/run-manifest-fixture-tests.mjs`.
- Expected evidence: manifest schema versioned, atomic write, reason/exit code tối thiểu và không có absolute/user/machine identifier.
- Stop condition: đọc/follow symlink ngoài evidence root, scanner không chạy trước hash, cần dependency/network hoặc manifest tuyên bố attestation.

> Chỉ thực hiện sau khi người dùng duyệt plan. Không task nào xây toàn bộ EyeMate V2. Command có dấu `<...>` là placeholder chưa xác minh và phải được thay bằng command thật sau khi manifest tồn tại.

## Thứ tự và dependency

```text
T-M0-001 → T-M0-002 → T-M0-003
T-M0-003 → T-M0-004 → T-M0-006
T-M0-003 → T-M0-005 → T-M0-007
{T-M0-006, T-M0-007} → T-M0-008 → T-M0-009 → T-M0-010 → T-M0-011 → T-M0-012
```

## T-M0-001 — Repository evidence preflight và audit V1 chỉ đọc

- Goal: xác minh repo V2 hiện trạng và audit source V1 nếu tìm thấy; nếu không, tạo kết quả `V1_NOT_PROVIDED` với phạm vi tìm kiếm và artifact thiếu.
- Requirements/acceptance: tiền điều kiện cho `VAL-M0-001`, `AC-M0-013` và ADR-003.
- Dependencies: plan được duyệt; quyền đọc các root được chỉ định. Không yêu cầu viết code.
- Files likely involved: chỉ đọc repo V2; V1 `package.json`, lockfile, Electron/main/preload, camera/runtime/assets, storage, build/package/CI/test nếu tồn tại; cập nhật `plan.md`, ADR-003 và evidence index.
- Do not modify: source V1, application code, `AGENTS.template.md`, Git history/remote, dependency hoặc OS configuration.
- Out of scope: scaffold V2, cài dependency, chạy build/migration, ước lượng migration không có file/module evidence.
- Tests to add/update: không.
- Verification command: `git status --short`, `git rev-parse --show-toplevel`, `rg --files`; mọi command manifest chỉ được liệt kê, không chạy. Command canonical hiện chưa thể xác minh.
- Expected evidence: root/path/commit, repository map, file-level V1 findings hoặc `V1_NOT_PROVIDED`, command inventory và risk register có dẫn chứng.
- Stop condition: dừng khi root/ownership không rõ, gặp secret/PHI/raw camera artifact, hoặc cần quyền ngoài read-only; không chuyển sang scaffold.
- Completion record: `COMPLETED` ở commit `c51b4cd`; evidence tại `docs/audits/`; V1 commit `77ad32f1b519418d882d2d476f13206644536df9`; không sửa source V1.

## T-M0-002 — Reclassify progressive-assurance gate

- Goal: ghi nhận `D-014` của project owner, giữ nhóm A trước code và chuyển nhóm B thành deliverable implementation; không tự đòi reviewer `APPROVED` cho tooling chưa tồn tại.
- Requirements/acceptance: `NFR-M0-001`–`NFR-M0-003`, `AC-M0-012`, `AC-M0-013`, `AC-M0-016`, `AC-M0-020`.
- Dependencies: T-M0-001 đã hoàn thành; readiness package và ba review lịch sử tồn tại; project-owner decision `D-014`.
- Files được phép sửa: `docs/validation/m0-progressive-assurance.md`, bốn file `docs/validation/m0-*.md`, và phần readiness/traceability của `plan.md`, `tasks.md`, `acceptance.md` nếu không đổi nghĩa requirement.
- Do not modify: source V1, application candidate, ADR status/choice, production budget, encryption, clinical/measurement threshold, `AGENTS.template.md`/`AGENTS.md`, Git remote/history.
- Workload/evidence/stop rules: `DP-DEV` cho POC đầu; `WL-001`–`WL-020`, `MET-*`, `VAL-M0-STOP-001`–`016`, schema `m0-benchmark-run/0.3.0-proposed`.
- Out of scope: candidate camera/storage/package benchmark; chọn shell/runtime/encryption; thu raw camera/health data thật.
- Tests to add/update: không có code trong T-M0-002; T-M0-003 tạo validator/fixture.
- Verification: `git diff --check`, `rg`/link review và decision record `D-014`.
- Expected evidence: `m0-progressive-assurance.md`, A/B/C/D mapping, owner decisions, và task code đầu tiên được unlock.
- Stop condition: invariant A bị nới lỏng, raw-data/real-person fixture xuất hiện, hoặc task sau đòi camera/dependency không thuộc scope.
- Rollback/cleanup: chỉ revert change set tài liệu qua commit mới nếu owner yêu cầu; không xóa audit/evidence; không có package/process/database được tạo trong task.
- Quyết định bị cấm: `D-003`, `D-006`, `D-009`, `D-013`, runtime/model/license, performance threshold và clinical content.

### Completion record

- `COMPLETED` ở change set progressive assurance theo quyết định project owner; không phải benchmark approval.
- Tech/QA/Privacy reviews giữ `CHANGES_REQUIRED` như evidence lịch sử và được review lại sau harness/fixture/dry-run artifact thật.

### Gate checklist trước benchmark chính thức

- [x] T-M0-001 audit read-only có path/commit/evidence.
- [x] Device/workload/metric/evidence/stop-rule proposal tồn tại.
- [x] Fair-comparison và raw-artifact prohibition được ghi.
- [ ] Tooling nhóm B có test/fixture và artifact thật.
- [ ] Timing, warm-up, repetition, variance, overhead tolerance và tool equivalence khóa trước result.
- [ ] Privacy/Security review lại scanner, artifact và egress thực thi được.
- [ ] DP-DEV fields run-critical hoàn tất; profile ngoài DP-DEV trước external validity/pilot.

## T-M0-003 — Validator evidence schema và fixture synthetic

- Goal: tạo đúng một outcome thực thi được: validator JSONL evidence `0.3.0` chạy dependency-free cùng fixture positive/negative synthetic.
- Requirements/acceptance: `REL-M0-003`, `VAL-M0-001`.
- Dependencies: T-M0-002 documentation completion; Node `v24.12.0` đã xác minh read-only; không cần package manager.
- Files likely involved: `tools/m0/validate-evidence-schema.mjs`, `tools/m0/run-fixture-tests.mjs`, `tools/m0/fixtures/`, `tools/m0/README.md`, schema/plan/task docs.
- Do not modify: `AGENTS.template.md`/`AGENTS.md`, V1, full Domain Core/UI, cloud/event bus/plugin system.
- Out of scope: camera/storage/MSIX/shell implementation, network capture, package manager, dependency mới.
- Tests to add/update: valid fixture phải pass; forbidden-field và invalid-metric fixture phải fail bằng reason code; không fixture nào chứa raw/real-person data.
- Verification command: `node tools/m0/run-fixture-tests.mjs`.
- Expected evidence: command output thật, validator/fixture source synthetic, documented error code và Git diff.
- Stop condition: fixture chứa dữ liệu cấm, validator cần dependency/network, hoặc output ghi raw/path/secret.

## T-M0-003A — Artifact allowlist và forbidden-content scanner

- Goal: tạo đúng một outcome thực thi được: scanner local-only từ chối artifact type không allowlist, binary/text chứa forbidden field/path/secret pattern và in reason code không echo input.
- Requirements/acceptance: `PRIV-M0-001`, `SEC-M0-001`, `VAL-M0-001`, `AC-M0-007`, `AC-M0-018`, `AC-M0-019`.
- Dependencies: T-M0-003 hoàn thành ở commit `fc7ae96`; dùng Node standard library đã xác minh.
- Files likely involved: `tools/m0/scan-evidence-artifact.mjs`, scanner fixture/runner, `tools/m0/README.md`, evidence schema/task docs.
- Do not modify: V1, application candidate, camera/runtime, `AGENTS.template.md`/`AGENTS.md`, dependency/OS setting.
- Out of scope: runtime sink scanner, network capture, binary package scanner, scrubber/purge implementation hoặc benchmark thật.
- Tests to add/update: safe allowlisted text pass; forbidden field/path/token và unknown artifact type reject; fixture source chỉ synthetic.
- Verification command: `node tools/m0/run-scanner-fixture-tests.mjs`.
- Expected evidence: executable scanner, fixture result và reason code; không lưu input artifact vào output.
- Stop condition: scanner cần network/dependency, fixture chứa raw/real-person data, hoặc scanner echo forbidden payload.

## T-M0-004 — Electron camera/local-asset spike

- Goal: Electron candidate đạt camera lifecycle, quality boundary và local-asset/offline contract, chưa thêm storage/package.
- Requirements/acceptance: `FR-M0-001`–`FR-M0-004`, `AC-M0-001`–`AC-M0-006`, `AC-M0-014`–`AC-M0-017`.
- Dependencies: T-M0-003; runtime/model license review.
- Files likely involved: Electron minimal shell, camera/runtime adapter, candidate tests.
- Do not modify: Tauri candidate, production UI, updater, clinical/domain feature, storage schema.
- Out of scope: SQLite/MSIX/benchmark cuối.
- Tests to add/update: denied/busy/active-disconnect/low-quality/device-change/stop/cancel/restart/offline/corrupt asset.
- Verification command: `<canonical> test:camera:m0 --candidate electron`; chưa thể xác minh.
- Expected evidence: release-like local run, scenario results, asset manifest/checksum và resource cleanup scan.
- Stop condition: raw payload đi qua sink/IPC không kiểm soát, network fallback, license không rõ hoặc resource không cleanup.

## T-M0-005 — Tauri camera/local-asset spike

- Goal: Tauri candidate đạt đúng contract/workload T-M0-004, chưa thêm storage/package.
- Requirements/acceptance: giống T-M0-004.
- Dependencies: T-M0-003; Rust/WebView2/runtime/license prerequisites.
- Files likely involved: Tauri minimal shell, camera/runtime adapter, candidate tests.
- Do not modify: Electron candidate, production UI, updater, clinical/domain feature, storage schema.
- Out of scope: tối ưu workload riêng, SQLite/MSIX/benchmark cuối.
- Tests to add/update: cùng fixture/scenario và sampling T-M0-004.
- Verification command: `<canonical> test:camera:m0 --candidate tauri`; chưa thể xác minh.
- Expected evidence: release-like local run, scenario results, asset manifest/checksum và resource cleanup scan.
- Stop condition: giống T-M0-004 hoặc WebView/runtime làm workload không còn tương đương.

## T-M0-006 — Electron SQLite migration/recovery spike

- Goal: Electron candidate chứng minh clean install, N-1 migration, backup, integrity và failure recovery.
- Requirements/acceptance: `DATA-M0-001`, `DATA-M0-002`, `REL-M0-002`, `AC-M0-008`–`AC-M0-010`, `AC-M0-018`.
- Dependencies: T-M0-004.
- Files likely involved: Electron storage adapter, synthetic schema/migrations/fixtures.
- Do not modify: production schema/retention/encryption decision hoặc Tauri adapter.
- Out of scope: SQLCipher/field-encryption selection.
- Tests to add/update: clean/N-1/forced failure/restart/permission/disk preflight và DB raw scan.
- Verification command: `<canonical> test:migration:m0 --candidate electron`; chưa thể xác minh.
- Expected evidence: DB integrity, backup/recovery record và schema/scan output.
- Stop condition: DB nửa migrated được mở write, backup không nguyên hoặc raw sensor tồn tại.

## T-M0-007 — Tauri SQLite migration/recovery spike

- Goal: Tauri candidate chạy cùng storage contract/fixture của T-M0-006.
- Requirements/acceptance: giống T-M0-006.
- Dependencies: T-M0-005.
- Files likely involved: Tauri storage adapter; shared synthetic schema/migration fixtures.
- Do not modify: production schema/retention/encryption decision hoặc Electron adapter.
- Out of scope: chọn encryption/storage production.
- Tests to add/update: cùng fixture T-M0-006.
- Verification command: `<canonical> test:migration:m0 --candidate tauri`; chưa thể xác minh.
- Expected evidence: DB integrity, backup/recovery record và schema/scan output.
- Stop condition: giống T-M0-006 hoặc fixture không còn tương đương.

## T-M0-008 — Privacy và network gates

- Goal: chứng minh riêng DB/backup và log/crash/telemetry/temp không chứa raw data, đồng thời không có network fallback.
- Requirements/acceptance: `PRIV-M0-001`, `SEC-M0-001`, `AC-M0-001`, `AC-M0-007`, `AC-M0-014`, `AC-M0-018`, `AC-M0-019`.
- Dependencies: T-M0-006 và T-M0-007.
- Files likely involved: forbidden-payload scanners, spy sinks, network-deny harness.
- Do not modify: telemetry upload/provider, retention/consent production.
- Out of scope: thu dữ liệu người thật hoặc upload diagnostics.
- Tests to add/update: binary/text/blob DB scan; log/crash/telemetry/temp/path scan; blocked-network capture.
- Verification command: `<canonical> test:privacy:m0 --candidate <name>`; chưa thể xác minh.
- Expected evidence: zero-finding reports tách theo sink và network trace.
- Stop condition: bất kỳ raw-data/network finding nào; cô lập artifact và mở issue trước bước package.

## T-M0-009 — MSIX, Windows 11 và Store feasibility

- Goal: tạo MSIX nội bộ cho từng candidate và đánh giá manifest/identity/capability/restricted API/signing/data behavior trên Windows 11; không publish.
- Requirements/acceptance: `REL-M0-001`, `REL-M0-002`, `REL-M0-004`, `NFR-M0-003`, `AC-M0-001`, `AC-M0-008`, `AC-M0-011`, `AC-M0-020`.
- Dependencies: T-M0-008; Windows CI runner và test certificate policy.
- Files likely involved: candidate package config, CI package job, Store feasibility checklist.
- Do not modify: production Store listing, production signing secret, updater channel.
- Out of scope: Store submission/publish hoặc auto-update.
- Tests to add/update: clean install/uninstall, manifest validation, package identity/data path.
- Verification command: `<canonical> build:<candidate>:msix`, `<canonical> verify:msix`; chưa thể xác minh.
- Expected evidence: MSIX/checksum/manifest/SBOM, Windows 11 result và Store constraints.
- Stop condition: cần production secret/publish, manifest vi phạm constraint hoặc clean install phá data invariant.

## T-M0-010 — Performance và reproducibility measurement

- Goal: build hai lần và đo startup, RAM/CPU, latency/error/artifact size theo protocol khóa sẵn.
- Requirements/acceptance: `NFR-M0-001`, `NFR-M0-002`, `REL-M0-001`, `REL-M0-003`, `AC-M0-011`, `AC-M0-012`, `AC-M0-016`.
- Dependencies: T-M0-009.
- Files likely involved: benchmark harness, CI evidence capture, artifact verifier.
- Do not modify: workload/trọng số sau khi thấy kết quả, production performance budget.
- Out of scope: tối ưu candidate trước baseline hoặc loại outlier không theo protocol.
- Tests to add/update: evidence schema, checksum/nondeterminism và sample completeness.
- Verification command: `<canonical> benchmark:m0`, `<canonical> verify:artifacts`; chưa thể xác minh.
- Expected evidence: raw technical samples, summary, toolchain/device metadata và nondeterminism report.
- Stop condition: workload khác nhau, metadata thiếu hoặc measurement method thay đổi giữa candidate.

## T-M0-011 — Decision matrix và ADR review

- Goal: tổng hợp evidence và chuyển ADR-003/004 sang accepted/rejected hoặc giữ proposed/tbd có blocker/owner.
- Requirements/acceptance: `VAL-M0-001`, `VAL-M0-002`, `AC-M0-013`.
- Dependencies: T-M0-010; Tech/QA/Privacy/Security/Release review.
- Files likely involved: ADR-003, ADR-004, evidence index/decision matrix.
- Do not modify: production scaffold, clinical threshold, encryption decision không có evidence.
- Out of scope: bắt đầu M1 hoặc duy trì hai candidate production.
- Tests to add/update: completeness/link/ID check.
- Verification command: `<canonical> verify:m0-evidence`; chưa thể xác minh.
- Expected evidence: từng tiêu chí PASS/FAIL/NOT_EVALUATED/NOT_APPLICABLE có link; review record.
- Stop condition: evidence thiếu/không tương đương, raw-data finding mở hoặc owner chưa duyệt; giữ ADR tbd.

## T-M0-012 — Cleanup, archive và M0 exit record

- Goal: dọn resource/package/data tạm, index artifact được giữ và ghi exit status; không bắt đầu production implementation.
- Requirements/acceptance: `REL-M0-005`, `AC-M0-021`.
- Dependencies: T-M0-011.
- Files likely involved: cleanup manifest/runbook, retained-artifact index, M0 exit record.
- Do not modify: evidence checksum/index trước archive, source V1, production branch/scaffold.
- Out of scope: triển khai candidate thắng hoặc T-M1.
- Tests to add/update: post-cleanup process/capture/package/temp scan.
- Verification command: `<canonical> cleanup:m0 --dry-run`, sau phê duyệt `<canonical> cleanup:m0`; chưa thể xác minh.
- Expected evidence: cleanup result, retained artifact owner/retention/checksum và final M0 status.
- Stop condition: cleanup có thể xóa evidence bắt buộc, certificate/package owner không rõ hoặc camera/model process còn chạy.

## Điều kiện bắt đầu T-M0-001

- Có thể bắt đầu ở chế độ read-only sau khi plan được duyệt và người dùng xác nhận một trong hai: cung cấp đường dẫn source V1 thật, hoặc xác nhận hiện không có source V1 để T-M0-001 ghi `V1_NOT_PROVIDED`.
- Không được dùng việc thiếu V1 để dựng cấu trúc V2 theo giả định.

## Điều kiện bắt đầu T-M0-002

- Hiện tại: `NOT READY` sau Tech và QA review độc lập; không được bắt đầu T-M0-002 hoặc implementation.
- Chỉ chuyển `READY` khi approval table cho Tech và QA là `APPROVED`, Privacy/Security không còn blocking comment, protocol version bị khóa trước result, và mọi field cần cho lần chạy kế tiếp không còn `TBD` vô chủ.
- Cùng một người có thể đội Product/Tech/QA nhưng phải review Tech và QA ở hai lượt độc lập; không giả chữ ký/chuyên gia. Clinical/privacy decision chưa có thẩm quyền vẫn `REQUIRED`/`NOT_REVIEWED`.
