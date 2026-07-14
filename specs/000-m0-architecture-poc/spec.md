# Feature 000 — M0 Architecture POC

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
```

## Problem and target user

EyeMate V2 cần một desktop foundation chạy local-first trên Windows, nhưng chưa có bằng chứng đủ để chọn Electron hay Tauri, runtime camera/model, cách đóng gói SQLite, hoặc cơ chế mã hóa. M0 phục vụ đội kỹ thuật và release owner bằng một POC có số đo, không phải sản phẩm hoàn chỉnh cho người dùng cuối.

## Desired outcome

Một ma trận bằng chứng tái lập chứng minh hoặc bác bỏ từng phương án shell trên cùng workload: camera local/offline, asset model/WASM local, persistence aggregate tối thiểu, migration/backup/recovery, MSIX qua CI và đo startup/tài nguyên/lỗi runtime. Kết quả đủ để đề xuất ADR nhưng không tự chốt công nghệ khi gate chưa đạt.

## In scope

- Hai spike tối thiểu tương đương về workload cho Electron và Tauri.
- Camera permission/start/stop, camera denied/busy/disconnected, low quality và device change.
- Runtime/model/WASM cốt lõi được đóng gói local; kiểm thử khi chặn mạng.
- SQLite schema tối thiểu chỉ chứa dữ liệu tổng hợp giả lập, `MigrationRecord` và phiên bản schema.
- Migration N-1 tối thiểu, pre-migration backup, integrity check và recovery mode khi lỗi.
- Build/package Windows/MSIX tái lập trong CI từ lockfile và commit sạch.
- Đo cold/warm startup, idle/active RAM, CPU camera session, frame-processing p50/p95, runtime error count và kích thước artifact.
- Quét DB/log/telemetry/crash fixture để chứng minh không có raw frame/video/landmark.
- Báo cáo chi phí kế thừa V1 nếu source V1 được cung cấp sau.

## Out of scope

- UI hoàn chỉnh, onboarding hoàn chỉnh, clinical/safety content, symptom scoring hoặc claim y tế.
- Account, cloud, sync, telemetry upload, Enterprise, dashboard tổ chức.
- Federated learning, continual/adaptive ML, baseline/pattern/VLI hoàn chỉnh.
- Auto-update production, Store release công khai hoặc signing bằng production secret.
- Chốt SQLCipher/field encryption nếu chưa có POC về license, packaging, hiệu năng và recovery.
- Chọn Electron/Tauri dựa trên sở thích hoặc demo không cùng workload.

## Definitions and invariants

- `confirmed`: modular monolith + ports/adapters; Domain Core không phụ thuộc shell/camera/database (`ADR-001`, `INV-008`).
- `proposed`: SQLite local-first, WAL/transaction, backup/migration/recovery (`ADR-002`).
- `tbd`: desktop shell (`D-003`), encryption (`D-006`), performance budget/device profiles (`D-008`), distance quality goals (`D-009`).
- Raw frame, video và landmark chỉ tồn tại trong RAM trong luồng M0; không serialization vào DB, file tạm, log, telemetry hoặc crash attachment.
- `UNKNOWN_*`/`NOT_MEASURED` không được đổi thành `0` hoặc `NORMAL`.
- M0 không tạo clinical content và không xác nhận độ chính xác y tế.

## POC flow

```text
STARTING
  → ASSET_CHECK
  → CAMERA_PERMISSION
  → CAMERA_READY
  → QUALITY_ACCEPTED | QUALITY_REJECTED | CAMERA_UNAVAILABLE
  → AGGREGATE_WINDOW_IN_RAM
  → PERSIST_SAFE_AGGREGATE
  → STOPPED
```

`CAMERA_PERMISSION_DENIED`, `CAMERA_BUSY`, `DEVICE_CHANGED`, `ASSET_INVALID` và `MIGRATION_RECOVERY_REQUIRED` là trạng thái quan sát được, có error code an toàn và không làm app ghi dữ liệu cấm.

## Requirements

- `FR-M0-001`: Mỗi shell candidate PHẢI chạy cùng camera workload và cùng bộ scenario đo lường trên Windows.
- `FR-M0-002`: Camera adapter PHẢI start/stop và giải phóng media resource; denied/busy/disconnected PHẢI có typed recoverable result.
- `FR-M0-003`: Quality gate PHẢI trả accepted/rejected/device-changed/unavailable; rejected KHÔNG ĐƯỢC tạo distance/blink numeric result.
- `FR-M0-004`: Core model/WASM asset PHẢI load từ package/local path khi mạng bị chặn và KHÔNG ĐƯỢC fallback CDN.
- `DATA-M0-001`: POC database CHỈ ĐƯỢC chứa schema/version, migration record và safe aggregate giả lập có provenance/version; KHÔNG ĐƯỢC chứa raw sensor data.
- `DATA-M0-002`: Migration tối thiểu PHẢI có preflight, backup versioned, transaction/atomic equivalent, integrity check và trạng thái failure khóa write.
- `PRIV-M0-001`: Frame/video/landmark KHÔNG ĐƯỢC xuất hiện trong DB, log, telemetry fixture, crash fixture hoặc file tạm sau session.
- `SEC-M0-001`: Dependency/runtime KHÔNG ĐƯỢC gửi network trong offline scenario; mọi network attempt phải được phát hiện trong bằng chứng test.
- `NFR-M0-001`: Harness PHẢI đo cold/warm startup, idle/active RAM, CPU camera session, frame-processing p50/p95 và runtime error count với metadata máy/build.
- `NFR-M0-002`: So sánh shell PHẢI dùng cùng fixture, thời lượng, camera/device profile và cách lấy mẫu; số đo không tương đương phải được ghi hạn chế.
- `NFR-M0-003`: Mỗi candidate PHẢI được kiểm tra trên Windows 11 theo device profile đã duyệt; khác biệt WebView/runtime/permission giữa máy PHẢI được ghi như evidence, không được làm phẳng thành một kết quả chung.
- `REL-M0-001`: Mỗi candidate PHẢI có build Windows/MSIX từ lockfile trong CI hoặc được ghi rõ là không đạt gate kèm log lỗi.
- `REL-M0-002`: Clean install PHẢI tạo data path ngoài installation directory và khởi động được với local assets khi offline.
- `REL-M0-003`: Build record PHẢI chứa commit, toolchain, lockfile, artifact checksum, schema version và command đã chạy.
- `REL-M0-004`: Mỗi candidate PHẢI có bằng chứng feasibility với Microsoft Store/MSIX constraints gồm package identity, capability declaration, restricted API, signing channel và data/migration behavior; M0 KHÔNG publish lên Store.
- `REL-M0-005`: Mỗi spike PHẢI có cleanup/rollback ghi rõ process/media/model resource, package/test certificate, database/backup và generated artifact nào bị xóa, giữ hoặc archive.
- `VAL-M0-001`: Quyết định shell chỉ được đề xuất sau khi ma trận bằng chứng và raw benchmark samples kỹ thuật (không phải raw sensor) được lưu cùng phương pháp đo; không chỉ dùng nhận xét định tính.
- `VAL-M0-002`: POC distance chỉ đánh giá khả năng tích hợp/quality/abstention; không chốt ngưỡng cm hoặc claim accuracy trước protocol benchmark.

## Data/privacy/safety impact

- Input runtime: frame camera và tín hiệu quality trong RAM.
- Output persisted: aggregate giả lập không nhận diện, quality/error code, version và measurement metadata không chứa raw identifier.
- Retention: dữ liệu POC dùng fixture không nhạy cảm; policy retention cuối vẫn `tbd` (`D-013`).
- Consent: M0 dùng môi trường/dev operator; không thay thế product consent hoặc OS permission.
- Safety: không Safety Gate, không symptom content, không clinical conclusion.

## Failure and edge cases

- OS permission denied/permanently denied; camera busy hoặc rút giữa session.
- Low light/occlusion/no face; device/resolution thay đổi.
- Asset thiếu/sai checksum; offline; dependency cố gọi mạng.
- Clean install không có DB; data directory không ghi được; disk-full preflight.
- Migration exception/integrity failure; backup không tạo được; app restart trong migration.
- Process crash; log/crash fixture chứa dữ liệu cấm; MSIX build không tái lập.
- Cleanup thất bại để lại camera/model process, package identity, test certificate, database hoặc artifact không có owner/retention.

## Metrics

- Outcome: mỗi candidate có pass/fail/evidence cho toàn bộ acceptance; ADR-003 và ADR-004 có đủ dữ liệu để review.
- Guardrail: zero raw-data leakage finding; zero silent CDN fallback; zero run tiếp tục trên DB nửa migrated.
- Performance budget: `tbd`; M0 thu baseline theo ít nhất các device profile được owner phê duyệt sau.

## Open decisions

- `D-003` — Electron/Tauri; owner: Tech; gate: hoàn thành ma trận M0.
- `D-006` — SQLCipher/field encryption; owner: Security + Tech; gate: spike packaging/license/performance/recovery riêng.
- `D-008` — Device profiles/performance budget; owner: Tech + QA; gate: trước benchmark chính thức.
- `D-009` — Distance/blink quality goals; owner: Validation; không chặn shell POC, chặn numeric output.
- `D-013` — Retention/deletion cuối; owner: Privacy + Product; không chốt schema production trong M0.
- V1 source path — `tbd`; owner: repository owner; chặn đánh giá chi phí migration V1.
