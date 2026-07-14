# Technical Plan — M0 Architecture POC

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
```

## Existing system evidence

### Repository map đã xác minh

- Repo đích: `F:\eyemate-desktop`.
- Git: nhánh `main`, remote `origin` trỏ `https://github.com/doraIaIa/eyemate-desktop.git`; baseline tài liệu ở `e599169`, audit V1 ở `c51b4cd`.
- Tại thời điểm lập plan chưa có application source, package manifest, lockfile, CI workflow, test, build/package script hoặc canonical command.
- Bộ tài liệu thiết kế nguồn: `C:\Users\ADMIN\Downloads\EyeMate_V2_Documentation_Pack\EyeMate_V2_Documentation`.
- Source EyeMate V1 đã xác minh tại `F:\dry-eye-app`, Git root cùng đường dẫn, remote `QNSang/dry-eye-app`, branch `main`, commit `77ad32f1b519418d882d2d476f13206644536df9`.
- V1 worktree trước audit có hai file untracked tồn tại sẵn: `CHAPTER_4_EVIDENCE_REPORT.md` và `PROJECT_DOCUMENTATION.md`; không dùng làm runtime evidence và không sửa.
- Audit read-only T-M0-001 nằm tại `docs/audits/V1_REPOSITORY_MAP.md`, `V1_EVIDENCE_REGISTER.md` và `V1_M0_GAP_ANALYSIS.md`.
- Không đổi `AGENTS.template.md` thành `AGENTS.md`; repository map V1 đã có nhưng command build/test thật của V2 chưa được xác minh.

### Command đã chạy và giới hạn

- Đã xác minh: liệt kê file tài liệu, đọc UTF-8, kiểm tra repo Git/remote/status.
- Chưa thể xác minh: install, lint, typecheck, unit, integration, acceptance, dev, build, MSIX, signing, benchmark và CI reproducibility vì chưa có code/toolchain/workflow.
- Đã xác minh tĩnh V1: Electron/Vite/TypeScript entrypoints; getUserMedia lifecycle; MediaPipe/ONNX CDN paths và local model files; Dexie/IndexedDB schema; consent/localStorage; checkup/work-session flow; IPC/overlay/native bridge; package/test/CI gaps và duplicate/empty legacy candidates.
- Không chạy install, lint, typecheck, test, dev, build, package, migration, network trace hoặc hardware camera. Runtime correctness, Windows 11 behavior, MSIX, performance và leakage instrumentation vẫn UNKNOWN.

### Spec/plan mismatch cần giữ rõ

- `README.md` nói `plan.md` chỉ tạo sau khi đọc codebase thực tế. Codebase thực tế hiện là repo trống; plan này vì vậy chỉ định discovery/scaffold POC và không khẳng định module/file/command chưa tồn tại.
- `tasks.md` theo governance thường tạo sau khi plan được duyệt; người dùng yêu cầu tạo trong gói plan hiện tại. Các task là đề xuất, không được bắt đầu trước phê duyệt.
- V1 docs tuyên bố offline/zero-store, nhưng runtime code mặc định dùng MediaPipe/ONNX WASM CDN và emit raw landmarks. Tài liệu lịch sử V1 không ghi đè runtime evidence hoặc invariant V2.
- V1 camera/storage/consent/measurement xung đột M0: auto-approve media, quality không gate cứng, missing→zero, uncalibrated numeric distance, raw landmarks/blink history qua event, IndexedDB không backup/recovery và packaging/test/CI thiếu.
- Dòng blocker “Source V1/path thật” trước đây đã lỗi thời sau audit; change set readiness này được phép dọn vì source/commit và ba tài liệu `docs/audits/` đã xác minh.

### Phân loại mức độ chắc chắn

| Loại | Nội dung |
|---|---|
| Fact đã quan sát | Repo V2 chỉ có tài liệu; không có source/manifest/lockfile/CI/test; remote và nhánh đã xác minh; `AGENTS.md` không tồn tại. |
| Fact V1 đã quan sát | V1 ở `F:\dry-eye-app`; file/symbol/commit nằm trong `docs/audits/`. Electron hiện hữu không đồng nghĩa được chọn cho V2. |
| Fact chưa quan sát được | Runtime camera/network/leakage, clean build/test/package, Windows 11/MSIX/Store, performance, model accuracy và existing user database. Các mục này giữ UNKNOWN. |
| Assumption cần kiểm chứng | Windows 11 runner/camera có thể cấp; MSIX candidate có thể dùng test identity/certificate; một runtime local có license phù hợp. Assumption không cho phép chọn công nghệ. |
| Proposed design | Hai spike cùng workload, shared evidence contract/fixture, RAM-only window, SQLite fixture và CI matrix. Tên module/path vẫn đề xuất. |
| Open decision | `D-003`, `D-006`, `D-008`, `D-009`, `D-013`, runtime/model/license và việc reuse/migrate V1 hay chỉ dùng làm baseline lịch sử. |

## M0 Benchmark Readiness Package

| Điều kiện | Nguồn | Trạng thái | Gate còn lại |
|---|---|---|---|
| Device profiles | `docs/validation/m0-device-profiles.md` | `PROPOSED`; năm target profile có schema, owner và gate; cấu hình/máy thật còn `TBD` | Tech + QA duyệt target; gán observed machine trước run liên quan |
| Benchmark workloads và metrics | `docs/validation/m0-benchmark-workloads.md` | `PROPOSED`; `WL-001`–`WL-020` và metric catalogue đã định nghĩa | Khóa tool, warm-up, duration, repetition, allowed variance trước benchmark |
| Evidence schema | `docs/validation/m0-evidence-schema.md` | `PROPOSED`; JSONL/layout/provenance/checksum/retention/forbidden artifacts đã định nghĩa | Tech + QA + Privacy/Security duyệt; validator command vẫn chưa tồn tại |
| Stop rules | `docs/validation/m0-stop-rules.md` | `PROPOSED`; safety/privacy/validity/technical/resource/decision stops đã định nghĩa | Tech + QA + Privacy/Security duyệt ở lượt riêng |

T-M0-001 đã đạt acceptance ở chế độ audit read-only. Readiness package chưa phải T-M0-002 và không tạo application code. T-M0-002 chỉ được bắt đầu khi bốn tài liệu trên được review theo bảng approval, không còn `CHANGES_REQUIRED`, và tất cả field cần cho dry-run đã có owner/deadline.

### Progressive assurance — `D-014`

Project owner đã xác nhận `docs/validation/m0-progressive-assurance.md`: review hiện tại là historical evidence, không chặn implementation nhóm B. Invariant/privacy/stop/fairness nhóm A vẫn bắt buộc trước code; group B phải được xây/test trong M0; group C khóa trước benchmark chính thức; group D hoãn đến pilot/public release. `T-M0-002` đã đủ ở phần documentation và unlock `T-M0-003` chỉ cho tooling non-camera, dependency-free.

## Proposed design

### Nguyên tắc

- Giữ quyết định `confirmed` của ADR-001: modular monolith + ports/adapters.
- Tạo hai candidate tách biệt nhưng dùng chung contract workload, fixture, benchmark protocol và evidence schema.
- Không chia sẻ shell-specific implementation để tránh che giấu chi phí thật; chỉ chia sẻ interface/fixtures không phụ thuộc framework.
- Candidate không vượt M0: một cửa sổ POC tối thiểu, camera status, quality state, nút start/stop/retry và diagnostics local đã scrub.

### Logical components dự kiến

```text
m0-contracts/        typed status, evidence schema, benchmark protocol
m0-fixtures/         migration N-1/failure, corrupt asset, forbidden tokens
candidates/electron shell + camera/runtime/storage adapters
candidates/tauri     shell + camera/runtime/storage adapters
ci/                  matrix build Windows/MSIX và evidence capture
evidence/            generated, không chứa raw sensor; không commit nếu nhạy cảm
```

Tên thư mục là đề xuất và chỉ được khóa sau task repository scaffold. Domain/test contracts không import Electron, Tauri, MediaPipe, ONNX hoặc SQLite binding.

### Data flow

```text
OS camera → shell camera adapter → quality gate → RAM-only window
→ safe aggregate mapper → storage port → SQLite transaction
```

- Frame/landmark không đi qua storage/logging interface.
- Safe aggregate dùng allowlist schema và version; unknown state không có numeric value.
- Migration chạy trước normal writes: preflight → backup → transaction → integrity check → unlock; mọi failure → recovery/read-only.

### Error/retry behavior

- Permission denied: typed non-crashing state; không tự prompt lại.
- Busy/disconnected: recoverable state, retry có idempotency guard.
- Low quality: abstain, reason code; không numeric output.
- Device change: invalidate/block profile association; không reuse silent.
- Asset invalid/offline: local error; cấm network fallback.
- Migration failure: khóa write, giữ backup, recovery evidence; không retry vô hạn.

## Shell comparison protocol

| Driver | Evidence bắt buộc | Không được thay bằng |
|---|---|---|
| Camera stability | Scenario pass rate, start/stop/retry, runtime errors | Demo một lần |
| Local assets/offline | Packaged path, checksum, blocked-network trace | Dev server cache |
| SQLite/recovery | N-1 + forced-failure fixture, integrity output | Happy-path CRUD |
| MSIX/CI | Clean runner command, artifact/checksum/toolchain | Local unsigned bundle |
| Startup/resources | Raw cold/warm/RAM/CPU/p50/p95 samples | “Cảm giác nhẹ” |
| Accessibility/native needs | Keyboard/focus feasibility và native API gaps M0 | Framework marketing |
| V1 migration cost | Repository audit và spike estimate | Giả định; hiện bị chặn |
| Supply chain | Lockfile, SBOM/license/network review | Số dependency đơn thuần |
| Store/signing/update | Manifest capabilities, restricted APIs, identity/channel, test-signing và migration behavior | Tài liệu marketing hoặc publish thật |
| Debugging | Release-like crash/error reproduction, source-map/symbol feasibility và log scrubbing | Devtools thuận tiện |
| Maintenance | Toolchain count, security update path, owner skill/risk và candidate-specific code | “Team quen framework” |

Trọng số và device profiles phải được Tech + QA duyệt trước benchmark; chưa có trọng số mặc định.

### Fair-comparison lock

- Hai candidate dùng cùng UI workload tối thiểu, MediaPipe/ONNX/WASM asset, camera/resolution, Windows observed machine, power/network mode, storage fixture, package target, duration/repetition và metric collector.
- Evidence trực tiếp phải cùng metric/method/unit; evidence V1 và feature không tương đương chỉ mang tính mô tả.
- Không cộng metric khác đơn vị. Decision weights, nếu dùng, phải được duyệt và checksum trước khi xem result.
- Bất kỳ sai khác workload/asset/config hoặc method kích hoạt `VAL-M0-STOP-006`/`008`; run không được normalize hậu nghiệm.

## Files

### Add trong change set lập kế hoạch này

- `specs/000-m0-architecture-poc/spec.md`
- `specs/000-m0-architecture-poc/acceptance.md`
- `specs/000-m0-architecture-poc/plan.md`
- `specs/000-m0-architecture-poc/tasks.md`
- `docs/architecture/adr/ADR-003-desktop-shell-selection.md`
- `docs/architecture/adr/ADR-004-camera-runtime-and-local-assets.md`

### Modify

- Không sửa behavior/spec chuẩn tắc khác trong M0 planning.

### Do not modify

- Không đổi tên `AGENTS.template.md`.
- Không sửa claim/safety/retention/encryption thành `confirmed`.
- Không tạo application code trước khi plan được duyệt.

## Contract/data changes dự kiến

- POC evidence schema: candidate/build/machine/scenario/metric/value/unit/sample method/result/artifact link.
- SQLite schema tối thiểu: schema version + `MigrationRecord` + safe aggregate fixture; chưa phải production data contract.
- Error taxonomy tối thiểu: permission denied, busy, disconnected, low quality, device changed, asset invalid, migration recovery required.
- Compatibility: fixture N-1 và clean install; N-2 chỉ thêm khi support matrix được quyết định.
- Rollback: previous candidate binary + pre-migration backup; không downgrade trên schema không tương thích.

## POC artifact lifecycle và cleanup

| Artifact/resource | Giữ lại | Cleanup/rollback |
|---|---|---|
| Source candidate + lockfile + CI config | Giữ đến ADR review; candidate thua archive read-only hoặc xóa theo change được duyệt | Không duy trì song song sau ADR accepted |
| Benchmark raw samples kỹ thuật + summary | Giữ cùng commit/toolchain/device metadata; không chứa raw sensor | Purge theo review retention; owner: Tech + QA |
| MSIX/checksum/SBOM/manifest | Giữ artifact phục vụ evidence theo CI retention được duyệt | Uninstall test package; gỡ test identity/certificate theo runbook |
| SQLite fixture + pre-migration backup | Giữ fixture synthetic/versioned | Xóa database runtime tạm; restore backup khi rollback test |
| Camera track/worker/native model process | Không giữ | Stop/cancel/disconnect/crash cleanup; post-test scan không còn process/capture |
| Log/crash/network traces đã scrub | Giữ khi cần chứng minh acceptance | Xóa trace không scrub; raw sensor finding lập issue và cô lập artifact |

Mỗi candidate phải có cleanup manifest. Cleanup không được xóa evidence cần cho ADR trước khi checksum/index được ghi.

## Privacy/security/safety

- Thiết kế logger và persistence theo allowlist; raw frame type không được serializer chấp nhận.
- Quét forbidden token/content trên DB/log/temp/crash fixtures và kiểm tra network khi offline.
- Không upload diagnostics/telemetry; evidence benchmark chỉ chứa metric kỹ thuật và metadata máy thô được duyệt.
- Signing production, key store và encryption final bị chặn bởi `D-006`; M0 chỉ đánh giá feasibility.
- Không có clinical content hoặc medical claim trong candidate.

## Test strategy

- Unit: quality state mapping, missing semantics, safe aggregate allowlist, migration state machine.
- Integration: camera adapter→quality→RAM window; local asset load; SQLite transaction/migration/recovery.
- Acceptance: toàn bộ `AC-M0-001`–`AC-M0-021` trên release-like build.
- Architecture/security: dependency boundaries, forbidden-field scan, network trace, secret scan, SBOM/license review.
- Benchmark: warm-up và sampling protocol cố định; raw samples + summary; cùng workload giữa candidate.

## Verification commands dự kiến

Các command dưới đây là **placeholder theo capability**, chưa phải command canonical và không được báo là đã chạy:

```text
<package-manager> install --frozen-lockfile
<package-manager> run lint
<package-manager> run typecheck
<package-manager> run test:unit
<package-manager> run test:integration
<package-manager> run test:acceptance:m0
<package-manager> run test:privacy
<package-manager> run build:electron:msix
<package-manager> run build:tauri:msix
<package-manager> run benchmark:m0
<package-manager> run verify:artifacts
```

Task scaffold phải thay placeholder bằng command thật từ manifest/CI, chạy trên clean Windows runner và cập nhật plan trước khi tạo `AGENTS.md`.

Các command bổ sung dưới đây cũng là **đề xuất chưa xác minh**, không được báo đã chạy:

```text
<canonical> validate:m0-protocol
<canonical> validate:m0-evidence
<canonical> inventory:m0-device
```

## Rollout

- M0 chỉ phát hành Internal/dev-only, không phân phối người dùng.
- Không dùng production signing secret; nếu test signing cần certificate tạm có owner và cleanup.
- Evidence bundle liên kết commit và artifact; failure vẫn được lưu làm bằng chứng.
- Exit M0: review ADR-003/004, decision matrix, privacy/security scan, migration/recovery và CI artifact. Không đạt gate thì giữ `proposed`/`tbd`.

## Open blockers

- Device target/observed mappings, measurement tool, warm-up, duration, repetition và allowed variance (`D-008`).
- Tech/QA/Privacy/Security approval cho readiness package; hiện đều `NOT_REVIEWED`.
- Trọng số shell decision matrix (`D-003`) nếu dùng; phải duyệt trước khi xem result.
- Encryption option/gate (`D-006`).
- Windows CI runner, MSIX identity/test certificate và chính sách giữ artifact.
- Runtime/model candidate và license chưa được chọn; ADR-004 chỉ định cách thu bằng chứng.

## M0 traceability

| Requirement | Acceptance | Task | Expected evidence |
|---|---|---|---|
| `FR-M0-001` | `AC-M0-002`–`AC-M0-006`, `AC-M0-012`, `AC-M0-013`, `AC-M0-017` | `T-M0-004`, `T-M0-005`, `T-M0-010`, `T-M0-011` | Cùng scenario/workload, raw metric bundle, decision matrix |
| `FR-M0-002` | `AC-M0-002`–`AC-M0-004`, `AC-M0-015`, `AC-M0-017` | `T-M0-004`, `T-M0-005` | Lifecycle/error fixture và post-cleanup resource scan |
| `FR-M0-003` | `AC-M0-005`, `AC-M0-006`, `AC-M0-014`, `AC-M0-017` | `T-M0-004`, `T-M0-005` | Typed quality/device/asset results, no numeric output |
| `FR-M0-004` | `AC-M0-001`, `AC-M0-014` | `T-M0-004`, `T-M0-005`, `T-M0-008` | Packaged asset manifest/checksum và blocked-network trace |
| `DATA-M0-001` | `AC-M0-007`, `AC-M0-008`, `AC-M0-018` | `T-M0-006`, `T-M0-007`, `T-M0-008` | Schema dump và DB/backup forbidden-payload scan |
| `DATA-M0-002` | `AC-M0-009`, `AC-M0-010` | `T-M0-006`, `T-M0-007` | N-1/forced-failure fixture, backup và integrity output |
| `PRIV-M0-001` | `AC-M0-007`, `AC-M0-018`, `AC-M0-019` | `T-M0-008` | Tách DB/backup scan khỏi log/crash/telemetry/temp scan cho cả hai candidate |
| `SEC-M0-001` | `AC-M0-001`, `AC-M0-014`, `AC-M0-019` | `T-M0-008` | Network capture và sanitized diagnostics scan cho cả hai candidate |
| `NFR-M0-001` | `AC-M0-012`, `AC-M0-016` | `T-M0-002`, `T-M0-010` | Protocol, startup/RAM/CPU/latency raw samples |
| `NFR-M0-002` | `AC-M0-012`, `AC-M0-013` | `T-M0-002`, `T-M0-010`, `T-M0-011` | Locked workload/sampling và normalized matrix |
| `NFR-M0-003` | `AC-M0-012`, `AC-M0-020` | `T-M0-002`, `T-M0-009` | Windows 11 device/runtime evidence |
| `REL-M0-001` | `AC-M0-011`, `AC-M0-020` | `T-M0-009`, `T-M0-010` | Two clean CI builds, MSIX/checksum/manifest |
| `REL-M0-002` | `AC-M0-001`, `AC-M0-008`, `AC-M0-016` | `T-M0-006`, `T-M0-007`, `T-M0-009` | Clean-install data path, startup và local asset evidence |
| `REL-M0-003` | `AC-M0-011`, `AC-M0-012` | `T-M0-003`, `T-M0-010` | Build/toolchain/lockfile/schema record |
| `REL-M0-004` | `AC-M0-020` | `T-M0-009` | Store/MSIX feasibility checklist; no publish |
| `REL-M0-005` | `AC-M0-021` | `T-M0-012` | Cleanup manifest, retained-artifact index, process scan |
| `VAL-M0-001` | `AC-M0-011`–`AC-M0-013` | `T-M0-002`, `T-M0-010`, `T-M0-011` | Protocol + raw data + decision matrix |
| `VAL-M0-002` | `AC-M0-005`, `AC-M0-013` | `T-M0-004`, `T-M0-005`, `T-M0-011` | ADR ghi rõ integration-only và cấm numeric claim |

Không requirement M1–M5 nào được implement trong M0; `FR-CAM-*`/`FR-DST-*` chỉ là dependency semantics để thiết kế test POC, không mở rộng scope.

### Acceptance coverage index

| Acceptance | Task | Expected evidence |
|---|---|---|
| `AC-M0-001` | `T-M0-004`, `T-M0-005`, `T-M0-008`, `T-M0-009` | Offline release-like startup và zero-network trace |
| `AC-M0-002` | `T-M0-004`, `T-M0-005` | Camera happy-path lifecycle/resource scan |
| `AC-M0-003` | `T-M0-004`, `T-M0-005` | Permission-denied typed result |
| `AC-M0-004` | `T-M0-004`, `T-M0-005` | Busy/retry/idempotency result |
| `AC-M0-005` | `T-M0-004`, `T-M0-005` | Low-quality abstention/no-numeric output |
| `AC-M0-006` | `T-M0-004`, `T-M0-005` | Device-change/profile-block result |
| `AC-M0-007` | `T-M0-008` | Cross-sink forbidden-payload summary |
| `AC-M0-008` | `T-M0-006`, `T-M0-007`, `T-M0-009` | Clean install/schema/data-path result |
| `AC-M0-009` | `T-M0-006`, `T-M0-007` | N-1 migration/backup/integrity result |
| `AC-M0-010` | `T-M0-006`, `T-M0-007` | Forced-failure/read-only recovery result |
| `AC-M0-011` | `T-M0-009`, `T-M0-010` | Hai clean CI build/checksum/toolchain record |
| `AC-M0-012` | `T-M0-002`, `T-M0-010` | Startup/RAM/CPU/latency/error raw samples kỹ thuật |
| `AC-M0-013` | `T-M0-002`, `T-M0-011` | Normalized shell decision matrix |
| `AC-M0-014` | `T-M0-004`, `T-M0-005`, `T-M0-008` | Missing/corrupt asset và zero-fallback trace |
| `AC-M0-015` | `T-M0-004`, `T-M0-005` | Restart/resource/DB-safe-state result |
| `AC-M0-016` | `T-M0-002`, `T-M0-010` | Cold/warm clean startup trace |
| `AC-M0-017` | `T-M0-004`, `T-M0-005` | Active disconnect/partial-session/cleanup result |
| `AC-M0-018` | `T-M0-006`, `T-M0-007`, `T-M0-008` | DB/backup binary-text-blob scan |
| `AC-M0-019` | `T-M0-008` | Log/crash/telemetry/temp/path scan |
| `AC-M0-020` | `T-M0-002`, `T-M0-009` | Windows 11/MSIX/Store checklist |
| `AC-M0-021` | `T-M0-012` | Cleanup manifest và retained-artifact index |
