# M0 Evidence Schema

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead + qa-owner
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
related: [VAL-M0-001, NFR-M0-001, NFR-M0-002, REL-M0-003, AC-M0-011, AC-M0-012, AC-M0-013]
```

## Run-directory initialization lifecycle

Trước measurement, initializer chỉ được tạo context theo `m0-run-initialization/0.1.0`; đây không phải run record `m0-benchmark-run/0.3.0` và không được đưa vào validator run-record. Context có `runId`, repository, candidate, device profile, workload/version, repetition, commit (`null` khi chưa biết), dirty-worktree, command ID, UTC initialization timestamp và relative `runRelative`. Nó tạo duy nhất `runs/<candidate>/<deviceProfileId>/<workloadId>/<runId>/` cùng `artifacts/`, `manifests/`, `reports/` rỗng. Không tạo run JSONL, artifact, manifest, report hoặc status measurement placeholder.

`INITIALIZED` chỉ là kết quả CLI initializer, không phải `executionStatus`/`validity`/`outcome`. Measurement sau này mới tạo run record có ba trạng thái theo contract hiện có.

## Định dạng đề xuất

Mỗi lần chạy ghi một UTF-8 JSON Lines record theo `schemaVersion: m0-benchmark-run/0.3.0`. Summary chỉ được sinh từ run records `VALID`; không sửa trực tiếp số liệu summary. Version `0.3.0-proposed` gộp contract QA (`0.2.0`) với privacy/security allowlist, pre-ingest và minimization; chưa có evidence cũ nào được phép nâng cấp ngầm.

## Run record tối thiểu

```json
{
  "schemaVersion": "m0-benchmark-run/0.3.0",
  "runId": "20260714T000000Z__candidate__DP-DEV__WL-001-v1__r01",
  "timestampUtc": "2026-07-14T00:00:00Z",
  "operator": { "role": "tech", "pseudonymousId": "operator-01" },
  "repository": "eyemate-desktop",
  "commit": "TBD",
  "dirtyWorktree": false,
  "shellCandidate": "electron|tauri",
  "shellRuntimeVersion": "TBD",
  "algorithmVersion": "TBD",
  "assetManifestVersion": "TBD",
  "deviceProfileId": "DP-DEV",
  "deviceSnapshotRef": "devices/TBD.json",
  "workloadId": "WL-001",
  "workloadVersion": "1.0.0",
  "repetition": 1,
  "plannedSlotId": "WL-001__DP-DEV__r01",
  "attemptId": "a01",
  "runPlanRef": "plans/TBD.json",
  "environment": { "networkMode": "BLOCKED", "powerMode": "TBD", "package": "TBD" },
  "command": "TBD_CANONICAL_COMMAND",
  "startedAtUtc": "TBD",
  "endedAtUtc": "TBD",
  "metricObservations": [],
  "errorReasonCodes": [],
  "unexpectedNetworkCalls": [],
  "artifactRefs": [],
  "privacyInspection": { "result": "NOT_RUN", "findingCount": null },
  "executionStatus": "ABORTED",
  "validity": "INVALID",
  "outcome": "NOT_EVALUATED",
  "invalidReason": "READINESS_ONLY_NO_RUN",
  "acceptanceEvaluations": [],
  "reviewer": null,
  "notes": "Schema example; không phải benchmark evidence."
}
```

Các field `TBD` trong ví dụ không được dùng trong record `VALID`. `operator` dùng role/pseudonymous ID, không lưu tên người dùng hệ điều hành.

## Validator tối thiểu M0

`tools/m0/validate-evidence-schema.mjs` là validator dependency-free đầu tiên của M0, chạy trực tiếp với Node.js và chỉ đọc JSONL. Nó kiểm tra cấu trúc run record `0.3.0`, trạng thái ba chiều, count/coverage metric, duplicate metric/artifact reference, command ID/path tương đối và forbidden field/path cơ bản. Đây chưa phải scanner toàn diện hoặc proof leakage runtime; scanner/scrubber/egress inspection tiếp tục là deliverable nhóm B.

```text
node tools/m0/validate-evidence-schema.mjs <run-record.jsonl>
node tools/m0/run-fixture-tests.mjs
```

Fixture trong `tools/m0/fixtures/` là synthetic và không phải benchmark evidence. Command đã được xác minh trên Node `v24.12.0`; không cần package manager hay dependency mới.

`command` trong record thật chỉ được chứa command ID hoặc argv đã chuẩn hóa theo allowlist; cấm raw shell command có home path, workspace path, username, token, key path hoặc secret. Raw stdout/stderr không tự động là evidence.

## Trạng thái run tách theo ba chiều

- `executionStatus`: `COMPLETED` hoặc `ABORTED`. `ABORTED` nghĩa là sequence dừng trước terminal marker; không tự nói run hợp lệ hay candidate fail.
- `validity`: `VALID` hoặc `INVALID`. `INVALID` nghĩa là protocol/provenance/comparability không đạt; run không được dùng trong performance aggregate.
- `outcome`: `PASSED`, `FAILED` hoặc `NOT_EVALUATED`. `FAILED` chỉ dùng khi run hoàn tất đủ evidence để đánh giá một correctness/acceptance rule và rule đó không đạt. Run `INVALID` hoặc `ABORTED` mặc định `NOT_EVALUATED`, trừ khi stop rule tạo một finding độc lập đủ bằng chứng như raw-data leakage; finding đó được ghi ở acceptance evaluation riêng, không biến performance sample thành valid.

Ba field không được gộp thành một enum. Mọi record còn phải có `plannedSlotId`, `attemptId`, `runPlanRef`; rerun tạo attempt mới, không sửa record cũ.

## Metric observation

Mỗi phần tử `metricObservations` phải có `metricId`, `value`, `unit`, `sampleCount`, `expectedSampleCount`, `droppedSampleCount`, `coverageRatio`, `aggregation`, `aggregationVersion`, `samplingInterval`, `samplingMethodVersion`, `tool`, `toolVersion`, `startedAtUtc`, `endedAtUtc`, `status`, `missingReason` và `artifactRef`. `status` là `OBSERVED`, `NOT_MEASURED` hoặc `ERROR`; không dùng `0` thay missing/error. `OBSERVED` yêu cầu value/unit và sample count hợp lệ; hai trạng thái còn lại yêu cầu `value: null`, `sampleCount: 0` và typed reason.

Mỗi workload attempt phải có observation cho toàn bộ `expectedMetricSet` trong run plan. Record metric thiếu hoàn toàn làm run `INVALID`; summary không được bỏ qua im lặng.

## Acceptance evaluation và audit trail

Mỗi phần tử `acceptanceEvaluations` gồm `acceptanceId`, `requirementIds`, `evaluatorVersion`, `result` (`PASS`, `FAIL`, `NOT_EVALUATED`, `NOT_COMPARABLE`), `reasonCode`, `runIds`, `artifactRefs` và `reviewerRole`. `PASS`/`FAIL` phải dẫn tới evidence checksum được; prose hoặc summary không có source runs chỉ được `NOT_EVALUATED`.

Run plan và summary phải lưu:

- danh sách đầy đủ `plannedSlotId`, tất cả attempts và trạng thái ba chiều;
- query/aggregation/outlier rule version đã khóa trước result;
- counts `PASSED`/`FAILED`/`INVALID`/`ABORTED`/`NOT_EVALUATED` theo candidate/workload;
- inclusive result và sensitivity analysis nếu rule outlier cho phép exclusion;
- requirement → acceptance → workload/task → run/artifact links.

Summary thiếu planned slot, thay thế failed attempt bằng rerun, hoặc chỉ chọn run có metric là `INVALID_SUMMARY` và kích hoạt `VAL-M0-STOP-011`.

## Layout và tên file đề xuất

```text
evidence/m0/<protocol-version>/
  plans/<run-plan-version>.json
  manifests/<commit>__<candidate>__build.json
  devices/<device-snapshot-id>.json
  runs/<candidate>/<deviceProfileId>/<workloadId>/<runId>.jsonl
  artifacts/<runId>/<allowlisted-technical-artifact>
  summaries/<summary-id>.json
  indexes/evidence-index.json
  checksums/SHA256SUMS
```

Tên `runId`: `<UTC-basic>__<candidate>__<deviceProfileId>__<workloadId>-v<version>__r<NN>`. Không chứa username, camera serial, participant ID hoặc dữ liệu sức khỏe.

## Artifact allowlist và pre-ingest gate

Chỉ các loại dưới đây được phép vào evidence tree. `artifactRefs` không phải quyền ghi tùy ý; loại chưa có trong bảng bị từ chối mặc định.

| Loại artifact | Nội dung được phép | Nội dung cấm/điều kiện |
|---|---|---|
| Run plan/run record/summary/index/checksum | ID pseudonymous, typed status, metric aggregate, version, refs/checksum | Không raw command/output, free-text chứa path/identifier, raw/exact camera series |
| Device snapshot | Field allowlist và bucket trong `m0-device-profiles.md` | Không hostname/user/SID/path/drive letter/serial/device instance/PnP/MAC/IP/SSID |
| Resource/performance trace | Timestamp monotonic, PID pseudonymous trong run, aggregate CPU/RAM/handle/count/bucket | Không memory dump, stack/command line/path/module path thô, ETW field ngoài allowlist |
| Network evidence | Timestamp bucket, process-role, direction, protocol, destination class/hash được duyệt, attempt count/result | Không payload/body, cookie/header/token, DNS payload, local IP/MAC/SSID; tool upload cũng là finding |
| Privacy scan report | Scanner/rule version, sink, symbolic canary/rule ID, finding count, checksum của artifact đã scan | Không chép finding payload cấm vào report |
| SQLite/migration evidence | Synthetic schema/fixture version, integrity/migration result, backup method/checksum | Không DB V1/người dùng; backup runtime chỉ synthetic và purge theo manifest |
| Package/build evidence | MSIX/checksum, normalized content manifest, SBOM, scrubbed build/sign result, public test-cert fingerprint/alias | Không private key/passphrase/token/provider URI/key path, production certificate hoặc cert subject cá nhân |
| Lifecycle/accessibility evidence | Typed state/rule/count và scrubbed control metadata | Không screenshot camera, screen recording hoặc UI text chứa PII/health content |

Pre-ingest bắt buộc: đóng/flushing collector → tạo staging ngoài evidence tree với quyền tối thiểu → kiểm tra type/size → allowlist field → scrub username/path/identifier/secret → forbidden raw-data scan → checksum → chỉ khi zero finding mới move/copy vào evidence tree. Scanner/scrubber lỗi hoặc loại artifact không biết làm run `INVALID` và artifact không được ingest.

Synthetic fixtures phải có generator/version/seed/provenance chứng minh không bắt nguồn từ người thật. Chỉ generator/config/expected typed result được commit hoặc giữ; raw pixel/landmark output của generator vẫn RAM-only và không phải evidence.

## Provenance, checksum và summary

- Build manifest liên kết commit, dirty flag, lockfile checksum, toolchain, package checksum, asset manifest và schema version.
- Mọi run/artifact/summary được SHA-256 và liệt kê trong `SHA256SUMS`; evidence index liên kết `runId → artifactRef → checksum`.
- Summary lưu query/aggregation version và danh sách run IDs/checksums đầu vào. Sau khi index được review, mọi sửa evidence tạo version mới; không thay file tại chỗ.
- Review phải tái tính checksum và đối chiếu summary với run records. Summary có checksum không khớp hoặc tham chiếu thiếu kích hoạt stop rule.
- Raw benchmark samples kỹ thuật là số đo CPU/RAM/time/error; không phải frame, landmark hay exact camera series.
- SHA-256 chỉ chứng minh integrity sau khi index được chốt, không tự chứng minh nguồn gốc hoặc chống người có quyền sửa đồng thời artifact và checksum. Trước evidence thật phải khóa cơ chế provenance/attestation hoặc protected immutable storage, reviewer role và quyền ghi/tái tính; trạng thái hiện tại là `TBD`.

## Retention đề xuất

| Artifact | Retention đề xuất | Owner | Ghi chú |
|---|---|---|---|
| Run record, device snapshot đã scrub, checksum/index | Tối đa 30 ngày từ run hoặc xóa sớm theo yêu cầu người dùng | Tech + QA | Chỉ local M0; không phải policy sản phẩm cuối |
| MSIX, manifest, SBOM, build logs đã scrub | Tối đa 30 ngày từ build hoặc xóa sớm theo yêu cầu người dùng | Release + Security | Không chứa secret |
| Performance trace đã scrub | Tối đa 30 ngày từ run hoặc xóa sớm theo yêu cầu người dùng | QA | Chỉ allowlisted metric |
| Invalid/aborted evidence | Tối đa 30 ngày cho reason/provenance đã scrub | QA + Privacy/Security | Không xóa dấu vết quyết định trước khi có retained index |

Policy M0 tạm thời là local-only, tối đa 30 ngày hoặc xóa sớm theo yêu cầu người dùng. Storage location, access role, deletion owner và purge-verification method là deliverable nhóm B: không thu evidence benchmark thật trước khi tooling đó tồn tại. Với incident chứa artifact cấm, evidence tree chỉ giữ metadata sự cố đã scrub; không tạo hoặc giữ bản gốc khi chưa có isolation/destruction control thực thi được.

## Artifact tuyệt đối không được lưu

- Raw camera frame/video/screenshot từ camera, landmark, pixel buffer, exact raw time series hoặc memory dump chứa chúng.
- Dữ liệu sức khỏe, survey/checkup thật, khuôn mặt/người thật hoặc participant identifier.
- Username, home path, camera serial/device instance ID, signing secret, token, key hoặc production certificate.
- Log/crash/temp chưa scrub; network payload có dữ liệu cấm; database người dùng V1.

Nếu công cụ sinh artifact cấm, dừng ngay, cô lập quyền truy cập, không đưa vào evidence tree và thực hiện stop/review theo `m0-stop-rules.md`.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | Tech | `CHANGES_REQUIRED` | 2026-07-14 | Chưa có validator, command registry, artifact scrubber hoặc checksum/index verification chạy được | Khi T-M0-003 được phép và command được xác minh trên clean checkout |
| `m0-evidence-schema.md` | `0.2.0-proposed` | Tech + QA | QA | `CHANGES_REQUIRED` | 2026-07-14 | Chưa có validator, canonical command hoặc artifact chứng minh planned-slot completeness, checksum/link và summary recomputation | Khi schema/traceability validator chạy được trên fixture positive/negative |
| `m0-evidence-schema.md` | `0.3.0-proposed` | Tech + QA | Privacy + Security | `CHANGES_REQUIRED` | 2026-07-14 | Positive allowlist/pre-ingest/minimization đã định nghĩa; retention/access/deletion, scrubber/scanner, provenance protection và negative fixtures chưa được khóa hoặc xác minh | Trước thu evidence thật hoặc chạy tool có thể sinh trace/log/dump |
