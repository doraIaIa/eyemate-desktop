# ADR-003 — Desktop shell selection

- Status: proposed
- Decision status: tbd
- Date: 2026-07-14
- Owner: tech-lead
- Related requirements: `FR-M0-001`, `NFR-M0-001`, `NFR-M0-002`, `REL-M0-001`, `REL-M0-002`, `REL-M0-003`, `VAL-M0-001`, `AC-M0-011`, `AC-M0-012`, `AC-M0-013`
- Supersedes: none

## Context

EyeMate V2 cần desktop shell Windows local-first có camera ổn định, local model/WASM assets, SQLite/recovery, MSIX/CI và khả năng đo tài nguyên. `ADR-001` đã xác nhận modular monolith + ports/adapters; shell phải là adapter boundary, không chi phối Domain Core. Source V1 chưa được cung cấp nên chi phí migration và compatibility chưa có bằng chứng.

## Decision status

- `confirmed`: workload so sánh phải giữ domain/shell boundary của ADR-001 và raw sensor RAM-only.
- `proposed`: đánh giá Electron và Tauri bằng hai spike tương đương trong M0.
- `tbd`: lựa chọn shell, trọng số decision matrix, device profiles/performance budget và V1 migration cost.

## Decision drivers

- Camera permission, start/stop, denied/busy/disconnected/device-change và runtime stability.
- Core asset local/offline, không CDN fallback hoặc network ẩn.
- SQLite binding, migration/backup/recovery và data path Windows.
- MSIX/CI reproducibility, signing/update feasibility và supply-chain footprint.
- Cold/warm startup, idle/active RAM, CPU camera session, p50/p95 processing, runtime error và artifact size.
- Accessibility/keyboard/focus và overlay/native OS need nếu được chứng minh cần.
- Chi phí migrate V1 dựa trên audit thật.
- Team maintainability dựa trên code/CI evidence, không framework familiarity đơn thuần.
- Windows 11 và Microsoft Store: package identity, capability declaration, restricted APIs, WebView/runtime dependency, signing channel và data migration behavior.
- Debugging trên release-like build: khả năng tái hiện runtime crash/error, source map/symbol và diagnostics đã scrub.
- Maintenance/migration effort: toolchain, security update cadence, candidate-specific code, V1 reuse theo file/module thật và effort có assumption range.

## Options considered

### Option A — Electron

- Ưu điểm cần kiểm chứng: Chromium/runtime đồng nhất; hệ sinh thái web/camera và khả năng tái sử dụng V1 có thể cao nếu V1 là web-based.
- Nhược điểm cần đo: runtime/artifact/RAM footprint; native packaging/update/signing complexity; Node boundary và dependency surface.
- Rủi ro: dev-server/CDN path che giấu offline failure; IPC/preload làm rò dữ liệu nếu boundary sai.
- Bằng chứng/POC: `tbd` qua `AC-M0-001`–`AC-M0-015`.

### Option B — Tauri

- Ưu điểm cần kiểm chứng: artifact/runtime footprint có thể thấp hơn; Rust command boundary có thể hỗ trợ native/storage control.
- Nhược điểm cần đo: WebView2/camera variability; bridge/runtime/model integration; Rust + frontend build/CI complexity.
- Rủi ro: khác biệt WebView2 theo máy; plugin/native binding chưa đáp ứng camera/model/MSIX/recovery.
- Bằng chứng/POC: `tbd` qua cùng acceptance và workload Option A.

### Option C — Trì hoãn lựa chọn

- Ưu điểm: tránh quyết định khi gate hoặc V1 audit thiếu.
- Nhược điểm: chặn repository scaffold production sau M0.
- Dùng khi: cả hai candidate thiếu evidence, không đạt privacy/recovery/package gate hoặc số đo không so sánh được.

## Decision

Chưa chọn Electron hoặc Tauri. M0 PHẢI chạy decision matrix có evidence link, raw measurement và cùng workload. Candidate vi phạm `PRIV-M0-001`, không build MSIX trong CI, không chạy offline local assets hoặc chạy DB nửa migrated bị loại bất kể điểm performance.

## Decision matrix bắt buộc

| Tiêu chí | Evidence tối thiểu |
|---|---|
| Tái sử dụng/migration V1 | File/module/config V1 cụ thể, phần reuse/rewrite và effort range; nếu thiếu source thì `NOT_EVALUATED` |
| Camera/getUserMedia | Denied/busy/disconnect/device-change/start-stop pass rate và runtime errors |
| MediaPipe/ONNX/WASM local | Package path, checksum/license, offline và corrupt-asset result |
| Windows 11/MSIX/Store | Device/runtime profile, manifest capability/restricted API/identity/signing constraint |
| Package/startup/resource | Installer size, cold/warm startup, idle RAM, active CPU/RAM, p50/p95 latency |
| Accessibility/native/overlay | Keyboard/focus evidence, native API gap; overlay chỉ chấm nếu requirement được xác nhận |
| Update/migration/signing | N-1/recovery fixture, channel/identity, test-signing và secret boundary |
| CI reproducibility | Hai clean build, lockfile/toolchain, checksum/nondeterminism report |
| Debugging | Release-like error reproduction, source-map/symbol feasibility, scrubbed diagnostics |
| Maintenance risk | Toolchain/dependency owners, update path, candidate-specific surface và removal path |

Mỗi hàng dùng trạng thái `PASS`, `FAIL`, `NOT_EVALUATED` hoặc `NOT_APPLICABLE` kèm rationale; không dùng điểm số khi evidence thiếu.

## Evidence gate trước khi đổi sang accepted

- `AC-M0-001`–`AC-M0-021` có result cho cả hai candidate hoặc exception được owner phê duyệt.
- Device profile, sampling protocol và trọng số được khóa trước benchmark.
- V1 audit có path/commit hoặc ghi chính thức “không migrate V1” bởi owner.
- Privacy/security/release review chấp thuận evidence.
- Command canonical và commit/artifact checksum được ghi.
- Microsoft Store constraints được review mà không publish; debugging và maintenance evidence có owner.

## Consequences

- Positive: lựa chọn có thể audit, giảm rewrite theo sở thích.
- Negative: tốn hai spike ngắn và Windows CI capacity.
- Follow-up: sau khi accepted, scaffold production chỉ dùng candidate thắng; candidate còn lại được archive, không duy trì hai implementation song song.

## Revisit criteria

- Camera/runtime hoặc Windows packaging thay đổi làm acceptance quan trọng không còn đạt.
- Requirement native/overlay/accessibility mới đã được xác nhận và candidate đã chọn không đáp ứng.
- Dữ liệu production-like cho thấy performance/reliability vượt budget đã duyệt.
- Không xem lại chỉ vì framework mới phổ biến hơn.
