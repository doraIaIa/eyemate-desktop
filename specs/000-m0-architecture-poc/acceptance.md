# Acceptance — M0 Architecture POC

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
```

- `AC-M0-001`: Given package được cài sạch và mạng bị chặn, when khởi động candidate, then core shell mở, asset model/WASM load từ local package và không có request CDN/network ngoài allowlist rỗng của M0.
- `AC-M0-002`: Given camera được phép và không bị chiếm, when bắt đầu rồi dừng session, then camera hoạt động, safe aggregate được tạo, media resource được giải phóng và không còn capture sau stop.
- `AC-M0-003`: Given OS camera permission bị từ chối, when mở camera, then trả typed denied state, không crash, không lặp permission prompt và phần POC không camera vẫn mở được.
- `AC-M0-004`: Given camera đang bị ứng dụng khác chiếm, when bắt đầu session, then trả `CAMERA_BUSY` recoverable, cho retry và không tạo measurement giả.
- `AC-M0-005`: Given visibility/lighting/pose dưới quality gate, when window kết thúc, then kết quả là `UNKNOWN_LOW_QUALITY`/rejected, có reason code và không có distance/blink numeric result.
- `AC-M0-006`: Given camera, resolution hoặc display association thay đổi, when session tiếp theo bắt đầu, then trả `DEVICE_CHANGED`, profile cũ không được dùng âm thầm và POC yêu cầu xác nhận/recalibration placeholder.
- `AC-M0-007`: Given session camera hoàn chỉnh và cả failure scenarios, when quét DB, log, telemetry/crash fixture và app temp/data directory, then không tìm thấy raw frame, video, landmark hoặc exact raw series.
- `AC-M0-008`: Given clean install, when app khởi động, then data directory nằm ngoài installation directory, schema tối thiểu được tạo một lần và lần khởi động sau không tạo duplicate migration.
- `AC-M0-009`: Given fixture schema N-1 hợp lệ, when migrate, then backup versioned được tạo trước write, transaction hoàn tất, integrity check đạt và `MigrationRecord` ghi trạng thái thành công.
- `AC-M0-010`: Given migration cố ý thất bại hoặc integrity check lỗi, when app khởi động, then backup còn nguyên, writes bị khóa, recovery state được hiển thị và DB nửa migrated không được dùng.
- `AC-M0-011`: Given cùng commit và lockfile trên clean CI runner Windows, when chạy canonical build hai lần, then cả hai tạo MSIX và ghi checksum/toolchain; nếu checksum khác, nguồn nondeterminism được định danh hoặc gate bị đánh fail.
- `AC-M0-012`: Given release-like build của mỗi candidate, when chạy benchmark protocol, then thu cold/warm startup, idle/active RAM, CPU camera session, frame-processing p50/p95, runtime errors và artifact size cùng machine/build metadata.
- `AC-M0-013`: Given kết quả Electron và Tauri, when lập decision matrix, then mỗi trọng số/điểm có evidence link, cùng workload và hạn chế; không candidate nào được chọn chỉ vì sở thích.
- `AC-M0-014`: Given asset local thiếu hoặc sai checksum, when camera runtime khởi động, then fail độc lập với error code, không tải từ mạng và không tạo output đo giả.
- `AC-M0-015`: Given app/process restart sau camera failure, when mở lại, then camera resource không bị giữ, database không ở trạng thái write mơ hồ và runtime error được ghi bằng code không chứa dữ liệu cấm.
- `AC-M0-016`: Given release-like package đã cài và schema hiện hành hợp lệ, when cold start rồi warm start không bật camera, then shell đạt trạng thái ready không crash, không chạy migration lặp và ghi đủ timestamp/error evidence để tính startup.
- `AC-M0-017`: Given camera session đang chạy, when camera bị rút hoặc device disconnect, then capture dừng, window hiện tại chuyển partial/no-camera, track/model resource được giải phóng và retry không tạo session/window trùng.
- `AC-M0-018`: Given toàn bộ camera scenario đã chạy, when mở và quét SQLite/database backup/migration fixture, then không tồn tại raw frame, video, landmark hoặc exact raw series dưới dạng binary, text, blob hoặc serialized payload.
- `AC-M0-019`: Given toàn bộ camera và failure scenario đã chạy, when quét application log, crash report/attachment, telemetry fixture và temp directory, then không tồn tại raw frame, video, landmark, exact raw series hoặc filesystem path chứa tên người dùng.
- `AC-M0-020`: Given candidate MSIX configuration, when review trên Windows 11 và kiểm tra package manifest, then package identity, capabilities, restricted APIs, signing/test channel, Store constraint và data-directory behavior có pass/fail/evidence; không có publish action.
- `AC-M0-021`: Given một candidate spike kết thúc hoặc bị loại, when chạy checklist cleanup, then camera/model process dừng, test package/certificate và dữ liệu tạm được xử lý theo manifest, artifact giữ lại có owner/retention/checksum và không xóa evidence bắt buộc.

## Required coverage

- Offline/local assets: `AC-M0-001`, `AC-M0-014`.
- Camera happy path/denied/busy/low quality/device change: `AC-M0-002`–`AC-M0-006`.
- Camera bị rút/restart: `AC-M0-017`, `AC-M0-015`.
- Raw-data leakage: `AC-M0-007`, `AC-M0-018`, `AC-M0-019`.
- Clean install/migration/recovery: `AC-M0-008`–`AC-M0-010`.
- Reproducible MSIX/CI và measurement: `AC-M0-011`–`AC-M0-013`.
- Clean startup/Windows 11/Store feasibility/cleanup: `AC-M0-016`, `AC-M0-020`, `AC-M0-021`.

## Evidence register

| Acceptance | Test level | Evidence dự kiến | Trạng thái hiện tại |
|---|---|---|---|
| `AC-M0-001`–`AC-M0-006` | Integration/acceptance | Release-like candidate, network trace, camera scenario log đã scrub | Chưa thể xác minh — chưa có application code/canonical command |
| `AC-M0-007` | Privacy/security | Forbidden-field scan trên DB/log/temp/crash fixtures | Chưa thể xác minh |
| `AC-M0-008`–`AC-M0-010` | Integration/acceptance | Clean VM + N-1/failure fixtures + DB integrity output | Chưa thể xác minh |
| `AC-M0-011` | CI/release | Hai CI run, artifact checksum, toolchain manifest | Chưa thể xác minh |
| `AC-M0-012`–`AC-M0-013` | Benchmark/review | Raw measurement bundle + normalized decision matrix | Chưa thể xác minh |
| `AC-M0-014`–`AC-M0-015` | Integration/recovery | Corrupt-asset và restart fixtures | Chưa thể xác minh |
| `AC-M0-016`–`AC-M0-017` | Acceptance/integration | Cold/warm startup trace và active-disconnect fixture | Chưa thể xác minh |
| `AC-M0-018`–`AC-M0-019` | Privacy/security | DB/backup scan tách biệt log/crash/telemetry/temp scan | Chưa thể xác minh |
| `AC-M0-020` | Package/review | MSIX manifest và Windows 11/Store feasibility checklist | Chưa thể xác minh |
| `AC-M0-021` | Operations/review | Cleanup manifest, retained-artifact index và post-cleanup process scan | Chưa thể xác minh |

Không acceptance nào được đánh dấu đạt bằng prose hoặc demo thủ công đơn lẻ.

## Benchmark evidence clarification

- `AC-M0-011`–`AC-M0-013` và `AC-M0-016` chỉ có thể được đánh giá từ run record `VALID` theo `docs/validation/m0-evidence-schema.md` và workload/version trong `m0-benchmark-workloads.md`.
- Missing/error phải dùng typed status/reason; không điền `0`. Performance threshold và allowed variance vẫn `TBD` đến khi baseline/protocol được Tech + QA duyệt.
- `AC-M0-001`, `AC-M0-007`, `AC-M0-014`, `AC-M0-018`, `AC-M0-019` chịu immediate-stop khi có unexpected network hoặc raw-data finding; không được lấy performance result để bù gate privacy/offline.
- Sai khác candidate về workload, asset, camera/resolution, device/power/network, package target hoặc measurement method làm run không so sánh được; không đổi nghĩa acceptance bằng normalization hậu nghiệm.
- Mỗi acceptance được đánh giá bằng record versioned `PASS`, `FAIL`, `NOT_EVALUATED` hoặc `NOT_COMPARABLE` có requirement IDs, run IDs và artifact refs. `FAILED` chỉ là outcome của rule có đủ evidence; `INVALID` là lỗi validity và `ABORTED` là sequence dừng sớm.
- Summary phải bao phủ toàn bộ planned repetition slots, kể cả failed/invalid/aborted và mọi retry. Không được tính pass rate hoặc average chỉ từ run sống sót; outlier chỉ được phân tích theo rule khóa trước result và phải báo cả inclusive result.
