# ADR-004 — Camera runtime and local assets

- Status: proposed
- Decision status: tbd
- Date: 2026-07-14
- Owner: measurement-owner + tech-lead
- Related requirements: `FR-M0-002`, `FR-M0-003`, `FR-M0-004`, `PRIV-M0-001`, `SEC-M0-001`, `NFR-M0-001`, `AC-M0-001`–`AC-M0-007`, `AC-M0-014`, `AC-M0-015`, `FR-CAM-001`–`FR-CAM-008`
- Supersedes: none

## Context

M0 cần chứng minh camera chạy local/offline và asset model/WASM được đóng gói local trên cả shell candidate. Runtime/model cụ thể chưa được chọn; tài liệu cấm lưu raw frame/video/landmark và cấm fallback CDN. Distance/blink accuracy và numeric threshold không thuộc quyết định này.

## Decision status

- `confirmed`: raw frame/video/landmark RAM-only; quality gate trước estimator; offline core asset; rejected quality tạo unknown, không numeric result.
- `proposed`: một camera/runtime port chung về semantics với shell-specific adapter; asset có manifest/checksum/version; processing window aggregate trong RAM.
- `tbd`: MediaPipe/ONNX/runtime/model cụ thể, worker/process topology, GPU acceleration policy, asset license và distance estimator.

## Ownership, lifecycle và contract boundary

- Một `CameraSessionOwner` duy nhất trong candidate application layer sở hữu permission attempt, active stream/tracks, runtime/model handle và session token; UI chỉ gửi intent và render typed state.
- Lifecycle tối thiểu: `IDLE → REQUESTING_PERMISSION → STARTING → RUNNING → STOPPING → IDLE`, với nhánh `DENIED`, `BUSY`, `DISCONNECTED`, `LOW_QUALITY`, `DEVICE_CHANGED`, `ASSET_INVALID`, `FAILED_RECOVERABLE`.
- `stop`, `cancel`, disconnect, window close và process restart phải idempotent; cleanup track/worker/native model handle chạy kể cả khi aggregate/persistence thất bại.
- Adapter output chỉ được chứa typed status, reason codes, quality summary, safe aggregate và version metadata. Output contract KHÔNG ĐƯỢC chứa frame, video, landmark, pixel buffer, exact raw series hoặc path tới artifact raw.

## Decision drivers

- Permission/start/stop/retry/resource release và device-change handling.
- Chạy offline trên release-like package; không dev-server/CDN/cache dependency.
- Raw-data isolation khỏi persistence/log/crash/telemetry.
- Asset integrity, version, license, package size và CI reproducibility.
- Frame-processing p50/p95, CPU/RAM và runtime error trên device profiles.
- Khả năng abstain khi low quality, asset lỗi hoặc device thay đổi.
- Cùng observable contract trên Electron/Tauri.

## Options considered

### Option A — Web camera API + local WASM/model trong renderer/webview

- Ưu điểm cần kiểm chứng: đường camera gần Web API; có thể dùng cùng frontend contract.
- Nhược điểm cần đo: WebView/runtime variance, UI-thread contention, asset URL/package path và crash isolation.
- Rủi ro: frame vô tình qua devtools/log/serialization; asset fallback network; lifecycle background không nhất quán.
- Bằng chứng/POC: camera scenario, offline trace, leak scan và performance samples.

### Option B — Native camera/model adapter qua shell bridge

- Ưu điểm cần kiểm chứng: lifecycle/native control và process isolation có thể rõ hơn.
- Nhược điểm cần đo: bridge copy overhead, native dependency/MSIX complexity, implementation chênh giữa shell.
- Rủi ro: frame serialize qua IPC; native library license/architecture mismatch; CI khó tái lập.
- Bằng chứng/POC: cùng acceptance, bridge payload inspection, package/SBOM và benchmark.

### Option C — Hybrid: Web camera capture, isolated worker/native estimator

- Ưu điểm cần kiểm chứng: tách UI, có thể cân bằng portability và isolation.
- Nhược điểm cần đo: thêm boundary/copy/lifecycle complexity.
- Rủi ro: raw payload vượt trust boundary không cần thiết; cleanup khó khi crash/device change.
- Bằng chứng/POC: topology diagram, payload allowlist, failure injection và measurements.

## Decision

Chưa chọn runtime/topology/model. M0 sẽ đánh giá các option khả thi trong từng shell nhưng mọi candidate PHẢI tuân thủ contract:

1. Asset bắt buộc nằm trong package/local app resources, có version/checksum/license record.
2. Không mạng: runtime vẫn khởi động; asset thiếu/sai checksum thì fail closed, không tải fallback.
3. Raw frame/landmark không qua persistence/logger/telemetry/crash attachment; nếu phải qua bridge thì payload/lifetime phải được chứng minh và scan.
4. Quality rejected/device changed trả typed unknown/state; không numeric distance/blink.
5. Stop/cancel/disconnect giải phóng track/worker/native resource.
6. Logger/crash/telemetry chỉ nhận allowlisted error/metric contract; raw payload type không được truyền vào các sink này.

## Error taxonomy tối thiểu

| Code | Recoverability | Hành vi |
|---|---|---|
| `CAMERA_PERMISSION_DENIED` | User/OS action | Không tự prompt lại; POC không camera vẫn chạy |
| `CAMERA_BUSY` | Retryable | Dừng start attempt sạch, cho retry có idempotency |
| `CAMERA_DISCONNECTED` | Retryable | Partial/no-camera, cleanup resource, không measurement giả |
| `CAMERA_DEVICE_CHANGED` | User confirmation | Chặn profile cũ, yêu cầu confirm/recalibration placeholder |
| `CAMERA_LOW_QUALITY` | Retryable | Abstain và reason code, không numeric estimator output |
| `LOCAL_ASSET_MISSING` / `LOCAL_ASSET_INVALID` | Build/install recovery | Fail closed, cấm CDN fallback |
| `RUNTIME_INIT_FAILED` | Candidate-specific | Scrubbed diagnostic context, cleanup handle |
| `RESOURCE_CLEANUP_FAILED` | Operational | Fail acceptance, ghi owner/evidence không chứa raw data |

## Test seam và mock strategy

- Camera port phải nhận fake source có deterministic frames/quality metadata chỉ trong test; fixture không dùng dữ liệu người thật và không được commit raw capture.
- Permission/device lifecycle dùng fake OS adapter để phát denied, busy, disconnect, device-change và restart theo thứ tự xác định.
- Asset resolver dùng fake package root/manifest để thử offline, missing và checksum mismatch; test cấm network.
- Logger/storage/crash/telemetry dùng spy sink allowlist để assert adapter output không chứa raw type/payload.
- Ít nhất một package-level test dùng camera thật trên Windows 11; mock không thay thế acceptance phần cứng.

## Asset and data flow đề xuất

```text
packaged asset manifest → integrity/version check → runtime init
OS camera → in-memory capture → quality gate → optional estimator
→ RAM aggregate window → allowlisted safe aggregate → storage port
```

Không có cạnh từ raw capture tới file, DB, logger, telemetry hoặc network.

## Evidence gate trước khi đổi sang accepted

- Offline/asset corrupt tests (`AC-M0-001`, `AC-M0-014`) đạt trên release-like package.
- Denied/busy/low-quality/device-change/stop/restart scenarios đạt.
- Active disconnect, idempotent cancel và cleanup-failure injection đạt; adapter output contract scan không có raw field/type.
- Forbidden-field scan và network capture không có finding.
- Asset license/SBOM, checksum và package path được ghi.
- Performance/error evidence theo protocol M0.
- Runtime được chọn tương thích shell decision trong ADR-003; nếu phụ thuộc shell, rationale ghi rõ.

## Consequences

- Positive: local-first và privacy được kiểm chứng trước feature logic; runtime có thể thay qua adapter.
- Negative: cần fixture/failure injection và package-level test, không chỉ browser dev test.
- Follow-up: distance estimator và numeric output cần validation protocol riêng (`D-009`, `VAL-*`); encryption không thuộc ADR này.

## Revisit criteria

- Runtime/model license, vulnerability hoặc network behavior không còn phù hợp.
- Camera stability/performance không đạt budget đã duyệt trên device profile.
- Shell/platform update phá local asset path, worker/native bridge hoặc resource cleanup.
- Không xem lại để thêm ML thích ứng/cloud khi chưa có requirement, consent và validation.

## M0 review result

ADR-004 remains `proposed`. M0 selected Electron as desktop shell in ADR-003, but did not yet choose the camera runtime/model topology. The current evidence is camera-off/denied-state, storage, privacy sink, package and benchmark evidence only; it does not prove real camera permission/start/stop, busy, low-quality, device-change, active-disconnect, model/WASM asset checksum/license or frame-processing p50/p95 behavior.

For M1, implement the camera/runtime work behind the ADR-004 port contract in the Electron shell. Do not persist/log/evidence raw frame, video, landmark, pixel buffer or exact per-frame series. Do not use CDN fallback for required runtime/model assets.
