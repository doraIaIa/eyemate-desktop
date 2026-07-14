# M0 Evidence Schema

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead + qa-owner
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
related: [VAL-M0-001, NFR-M0-001, NFR-M0-002, REL-M0-003, AC-M0-011, AC-M0-012, AC-M0-013]
```

## Định dạng đề xuất

Mỗi lần chạy ghi một UTF-8 JSON Lines record theo `schemaVersion: m0-benchmark-run/0.1.0`. Đây là contract đề xuất, chưa có validator hay command canonical. Summary chỉ được sinh từ run records `VALID`; không sửa trực tiếp số liệu summary.

## Run record tối thiểu

```json
{
  "schemaVersion": "m0-benchmark-run/0.1.0",
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
  "environment": { "networkMode": "BLOCKED", "powerMode": "TBD", "package": "TBD" },
  "command": "TBD_CANONICAL_COMMAND",
  "startedAtUtc": "TBD",
  "endedAtUtc": "TBD",
  "metricObservations": [],
  "errorReasonCodes": [],
  "unexpectedNetworkCalls": [],
  "artifactRefs": [],
  "privacyInspection": { "result": "NOT_RUN", "findingCount": null },
  "validity": "ABORTED",
  "invalidReason": "READINESS_ONLY_NO_RUN",
  "reviewer": null,
  "notes": "Schema example; không phải benchmark evidence."
}
```

Các field `TBD` trong ví dụ không được dùng trong record `VALID`. `operator` dùng role/pseudonymous ID, không lưu tên người dùng hệ điều hành.

## Metric observation

Mỗi phần tử `metricObservations` phải có `metricId`, `value`, `unit`, `sampleCount`, `aggregation`, `samplingMethodVersion`, `tool`, `toolVersion`, `startedAtUtc`, `endedAtUtc`, `status`, `missingReason` và `artifactRef`. `status` là `OBSERVED`, `NOT_MEASURED` hoặc `ERROR`; không dùng `0` thay missing/error.

## Layout và tên file đề xuất

```text
evidence/m0/<protocol-version>/
  manifests/<commit>__<candidate>__build.json
  devices/<device-snapshot-id>.json
  runs/<candidate>/<deviceProfileId>/<workloadId>/<runId>.jsonl
  artifacts/<runId>/<allowlisted-technical-artifact>
  summaries/<summary-id>.json
  indexes/evidence-index.json
  checksums/SHA256SUMS
```

Tên `runId`: `<UTC-basic>__<candidate>__<deviceProfileId>__<workloadId>-v<version>__r<NN>`. Không chứa username, camera serial, participant ID hoặc dữ liệu sức khỏe.

## Provenance, checksum và summary

- Build manifest liên kết commit, dirty flag, lockfile checksum, toolchain, package checksum, asset manifest và schema version.
- Mọi run/artifact/summary được SHA-256 và liệt kê trong `SHA256SUMS`; evidence index liên kết `runId → artifactRef → checksum`.
- Summary lưu query/aggregation version và danh sách run IDs/checksums đầu vào. Sau khi index được review, mọi sửa evidence tạo version mới; không thay file tại chỗ.
- Review phải tái tính checksum và đối chiếu summary với run records. Summary có checksum không khớp hoặc tham chiếu thiếu kích hoạt stop rule.
- Raw benchmark samples kỹ thuật là số đo CPU/RAM/time/error; không phải frame, landmark hay exact camera series.

## Retention đề xuất

| Artifact | Retention đề xuất | Owner | Ghi chú |
|---|---|---|---|
| Run record, device snapshot đã scrub, checksum/index | Đến khi ADR-003/004 accepted và hết cửa sổ review; thời hạn cụ thể `TBD` | Tech + QA | Cần phê duyệt trước run |
| MSIX, manifest, SBOM, build logs đã scrub | Theo CI retention `TBD` | Release + Security | Không chứa secret |
| Performance trace đã scrub | Tối thiểu đến ADR review; thời hạn `TBD` | QA | Chỉ allowlisted metric |
| Invalid/aborted evidence | Giữ reason/provenance; artifact nguy hiểm bị cô lập | QA + Privacy/Security | Không xóa dấu vết quyết định |

## Artifact tuyệt đối không được lưu

- Raw camera frame/video/screenshot từ camera, landmark, pixel buffer, exact raw time series hoặc memory dump chứa chúng.
- Dữ liệu sức khỏe, survey/checkup thật, khuôn mặt/người thật hoặc participant identifier.
- Username, home path, camera serial/device instance ID, signing secret, token, key hoặc production certificate.
- Log/crash/temp chưa scrub; network payload có dữ liệu cấm; database người dùng V1.

Nếu công cụ sinh artifact cấm, dừng ngay, cô lập quyền truy cập, không đưa vào evidence tree và thực hiện stop/review theo `m0-stop-rules.md`.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | Tech | `NOT_REVIEWED` | — | Chưa chốt validator/tool/checksum command | Khi command registry được đề xuất |
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | QA | `NOT_REVIEWED` | — | Chưa chạy schema/link validation | Review riêng sau Tech |
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | Privacy + Security | `NOT_REVIEWED` | — | Cần duyệt artifact allowlist/retention | Trước thu evidence thật |

