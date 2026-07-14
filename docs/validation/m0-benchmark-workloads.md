# M0 Benchmark Workloads and Metrics

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead + qa-owner
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
related: [D-008, NFR-M0-001, NFR-M0-002, NFR-M0-003, VAL-M0-001, AC-M0-001, AC-M0-021]
```

## Protocol chung

Electron và Tauri PHẢI dùng cùng workload version, UI tối thiểu, source commit, asset/algorithm manifest, camera/resolution, fixture, Windows machine, power/network mode, package target, duration/repetition, measurement method, failure rule và cleanup. Evidence V1 chỉ là baseline lịch sử, không được trộn vào comparison trực tiếp. Feature không tương đương được ghi `NOT_COMPARABLE` và không chấm điểm.

Mọi workload kế thừa các field sau; override phải được khóa trước khi xem kết quả:

- `warmUp`: số lần/thời gian `TBD_BY_TECH_QA`; workload cold/clean dùng `NONE`.
- `duration` và `repetitions`: `TBD_BY_TECH_QA`; không tự chọn sau run.
- `allowedVariance`: `TBD_AFTER_BASELINE`; trước baseline chỉ kiểm tra completeness, privacy, correctness và comparability.
- `artifacts`: run JSONL, scrubbed tool output, checksums và artifact refs theo `m0-evidence-schema.md`.
- `privacy`: cấm raw frame/video/landmark/exact raw series, dữ liệu sức khỏe thật, username/serial/path cá nhân.
- `invalidRun`: thiếu provenance; sai device/power/network/asset/config; không đủ warm-up/duration/repetition; tool lỗi/overhead đáng kể; stop rule kích hoạt.
- `cleanup`: stop camera/model/process, đóng DB/tool, xóa package/data tạm theo manifest; không xóa evidence đã checksum.

Các ràng buộc Privacy/Security sau áp dụng cho toàn bộ catalogue, kể cả khi một row không lặp lại:

- Mọi workload có thể mở camera (`WL-004`–`WL-012`, `WL-017` khi gọi source run) phải có product-consent fixture `GRANTED` trước camera intent. OS permission không thay thế consent. `WL-006` chỉ mô phỏng OS denial sau khi product consent đã được grant; thiếu/withdrawn consent phải chứng minh camera chưa được request.
- Synthetic camera/quality fixture chỉ được sinh thủ tục trong RAM từ generator/version/seed đã duyệt, không bắt nguồn từ ảnh/video/landmark người thật và không được lưu pixel/landmark output. Evidence chỉ giữ generator manifest, seed không nhận dạng và expected typed state.
- Measurement/capture/scanner tool phải tắt auto-update, cloud sync, crash upload và usage telemetry; outbound của app, dependency **và tool** đều thuộc `MET-NET-UNEXPECTED`. Network evidence chỉ giữ metadata allowlisted, không capture payload/body, DNS content ngoài field cần thiết hoặc memory dump.
- Command/tool output, trace, log, screenshot và dump không tự động được xem là evidence. Chỉ artifact qua allowlist, scrubber, secret/identifier scan và checksum gate trong `m0-evidence-schema.md` mới được ingest.
- Workload package/signing chỉ dùng test identity/certificate. Cấm production private key, passphrase, provider URI, key path, token và certificate gắn danh tính cá nhân trong artifact.

## Run plan khóa trước kết quả

Trước khi chạy workload chính thức, Tech + QA PHẢI tạo một run plan có version/checksum và khóa các field: candidate, workload/version, device snapshot, camera/resolution/driver, asset/algorithm manifest, package/build, power/network mode, tool/version, warm-up, stabilization, timeout, duration, sampling interval, planned repetitions, thứ tự chạy, cooldown, expected metric set, variance/outlier rule và overhead tolerance. Khi một field run-critical còn `TBD`, workload không được tạo run `VALID`.

- Mỗi repetition có `plannedSlotId` bất biến. Run retry tạo `attemptId` mới liên kết slot cũ; không ghi đè hoặc thay thế attempt thất bại/invalid/aborted.
- Summary PHẢI kê đủ planned slots và số attempt theo `PASSED`, `FAILED`, `INVALID`, `ABORTED`, `NOT_EVALUATED`; không chỉ kê các run hoàn tất hoặc có số đẹp.
- Không được dừng sớm một candidate rồi tiếp tục candidate kia để cải thiện trung bình. Mọi early-stop phải ghi pair effect và phần workload chưa chạy của cả hai candidate.
- Outlier không bị xóa. Chỉ được tạo phân tích loại outlier khi rule/version đã khóa trước khi mở result; báo cáo đồng thời kết quả gồm tất cả run hợp lệ và sensitivity analysis loại theo rule, kèm run IDs.
- Average/median/p95 chỉ tổng hợp observation `OBSERVED` từ run có `validity=VALID`; mẫu `FAILED` vẫn thuộc mẫu hợp lệ nếu workload chạy đúng protocol và phải được phản ánh trong pass rate. `INVALID`/`ABORTED` không đi vào metric aggregate nhưng luôn nằm trong denominator completeness riêng.
- Không dùng rerun để biến `FAILED` thành `PASSED`; rerun là attempt mới và acceptance summary hiển thị cả hai.

## Workload catalogue

| ID | Purpose / preconditions / fixture | Exact sequence | Warm-up / duration / repetitions | Metrics | Pass/fail hoặc comparison rule | Artifacts / cleanup / invalid override |
|---|---|---|---|---|---|---|
| `WL-001` clean cold startup offline | Đo startup sạch; installed release-like package, Windows vừa boot theo image/version đã khóa, network blocked, local asset manifest | Khôi phục snapshot hoặc reboot → chờ OS stabilization theo marker/thời gian đã duyệt → xác nhận candidate chưa chạy từ lúc boot và process off → launch bằng canonical command → chờ ready marker → stop | `NONE`; đến ready/timeout `TBD`; reps `TBD` | `MET-START-COLD`, `MET-ASSET-LOAD`, `MET-NET-UNEXPECTED`, `MET-CRASH-ERROR` | Correctness: ready + zero unexpected network; performance chỉ comparison, threshold `TBD` | Startup trace + network trace; cấm purge cache tùy ý/khác candidate; invalid nếu boot/snapshot/process state không chuẩn |
| `WL-002` warm startup | Đo warm start; cùng package/schema/asset sau một launch hợp lệ | Close sạch → launch lại → ready marker → stop | Warm-up 1 launch đề xuất; duration/rep `TBD` | `MET-START-WARM`, `MET-CRASH-ERROR` | Cùng readiness marker/method; không so với cold như cùng metric | Trace đã scrub; invalid nếu migration/update chạy ngoài protocol |
| `WL-003` idle không camera | Baseline shell; package ready, camera never requested | Launch → chờ stabilization `TBD` → sample idle window → stop | Warm-up/stabilization/duration/reps `TBD` | `MET-MEM-IDLE`, `MET-CPU-AVG`, `MET-CPU-P95`, `MET-CRASH-ERROR` | So candidate trên cùng window; threshold `TBD` | Resource trace; invalid nếu camera/background update/network chạy |
| `WL-004` camera preview local asset | Chứng minh preview local; same camera/resolution/asset, consent fixture granted, network blocked | Launch → grant product consent fixture → start camera → wait ready → hold → stop → verify release | Warm-up model `TBD`; duration/reps `TBD` | `MET-CAMERA-START`, `MET-ASSET-LOAD`, `MET-MEM-CAMERA`, `MET-CPU-AVG`, `MET-CPU-P95`, `MET-FPS`, `MET-DROP`, `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`, `MET-NET-UNEXPECTED` | Zero network/raw leakage; lifecycle pass; performance comparison only | Resource/network/privacy traces; invalid nếu camera/config khác |
| `WL-005` camera measurement ổn định | Đo processing ổn định, không accuracy; quality-accepted synthetic condition | Start như WL-004 → quality accepted → process fixed window → cập nhật histogram/count kỹ thuật trong RAM → persist summary/histogram allowlisted, không persist per-frame series → stop | Warm-up/duration/reps `TBD` | `MET-FRAME-P50`, `MET-FRAME-P95`, `MET-FPS`, `MET-DROP`, `MET-MEM-CAMERA`, `MET-CPU-AVG`, `MET-CPU-P95`, `MET-CRASH-ERROR` | Cùng histogram boundaries/percentile algorithm và aggregate contract; numeric clinical/distance claim cấm; threshold `TBD` | Metric trace chỉ chứa count/bucket/summary, không exact per-frame series; invalid nếu quality/fixture không tương đương |
| `WL-006` camera permission denied | Typed denied path; OS/fake permission denial method giống nhau | Reset permission state → product consent fixture → request camera → deny → observe state → retry policy check → close | `NONE`; đến terminal state; reps `TBD` | `MET-CAMERA-START`, `MET-CRASH-ERROR` | `CAMERA_PERMISSION_DENIED`, no crash/re-prompt/measurement | Scrubbed state log; cleanup permission fixture; invalid nếu OS state không reset |
| `WL-007` camera busy | Recoverable busy; same contention fixture | Occupy camera with approved fixture → request → observe busy → release fixture → retry once → stop | `NONE`; timeout/reps `TBD` | `MET-CAMERA-START`, `MET-RESOURCE-STATUS`, `MET-CRASH-ERROR` | Typed `CAMERA_BUSY`, no fake measurement, retry idempotent | Contention evidence; invalid nếu other app/driver behavior không ghi |
| `WL-008` camera disconnected giữa session | Lifecycle khi rút camera; external camera/device fixture | Start → reach running → disconnect at scripted marker → observe partial/no-camera → reconnect/retry per protocol → stop | Warm-up to running; duration/reps `TBD` | `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`, `MET-CRASH-ERROR` | No capture/resource/session duplicate after disconnect | Lifecycle/resource trace; invalid nếu disconnect time không ghi |
| `WL-009` network blocked và CDN unavailable | Chứng minh core không phụ thuộc network/cache | Clear approved network/cache state → block network/DNS/CDN → launch → start camera/runtime → stop | `NONE` hoặc asset warm-up `TBD`; reps `TBD` | `MET-NET-UNEXPECTED`, `MET-ASSET-LOAD`, `MET-CRASH-ERROR` | Zero unexpected request; local asset load succeeds hoặc fail-closed nếu asset invalid | Network capture + asset checksum; invalid nếu blocker không active |
| `WL-010` low-quality input | Chứng minh abstention; approved non-personal/synthetic quality fixture hoặc controlled lighting/pose condition | Start → apply scripted low-quality condition → wait window → inspect typed result → stop | Warm-up/duration/reps `TBD` | `MET-QUALITY-STATE`, `MET-RAW-LEAK`, `MET-CRASH-ERROR` | `UNKNOWN_LOW_QUALITY`; no distance/blink numeric output | State/contract scan; invalid nếu condition không cùng method |
| `WL-011` repeated camera start/stop | Tìm leak tích lũy; same cycle count/cooldown | Launch → repeat start-ready-fixed-window-stop-resource-check N lần → final cooldown/sample → close | First cycle warm-up; N/duration/reps `TBD` | `MET-CAMERA-START`, `MET-CAMERA-STOP`, `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`, `MET-CRASH-ERROR` | No retained track/process; trend threshold `TBD_AFTER_BASELINE`; stop on accumulation evidence | Per-cycle safe metrics; cleanup all resource; invalid nếu cycle/cooldown lệch |
| `WL-012` sleep/resume hoặc background/foreground | Đánh giá lifecycle OS/app state; chọn chính xác một `workloadVariant` trước run: `SLEEP_RESUME` hoặc `BACKGROUND_FOREGROUND` | Start camera hoặc idle variant đã khóa → trigger scripted transition → resume/foreground → inspect state/resource → stop | Warm-up/duration/reps `TBD` | `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`, `MET-CRASH-ERROR` | Hai candidate phải dùng cùng variant/method; no silent capture/duplicate session | OS transition trace; invalid nếu variant/transition/tool khác candidate |
| `WL-013` clean package install | Chứng minh install sạch; clean VM/snapshot, candidate MSIX | Verify no package/data → install → verify identity/path → launch once offline → close | `NONE`; one install per clean snapshot; reps `TBD` | `MET-PACKAGE-SIZE`, `MET-INSTALL-LAUNCH`, `MET-NET-UNEXPECTED` | Install/launch succeeds; data outside install dir; threshold size `TBD` | MSIX/checksum/install log; uninstall/restore snapshot |
| `WL-014` package launch/update-data-path check | Feasibility identity/channel/data path; synthetic prior package/data fixture | Install prior test version → create synthetic data → install/update candidate → launch → verify identity/data/schema → close | `NONE`; reps `TBD` | `MET-INSTALL-LAUNCH`, `MET-MIGRATION-RESULT`, `MET-INTEGRITY-RESULT`, `MET-CRASH-ERROR` | No data path confusion/cross-channel; migration behavior per fixture | Manifest/path evidence scrubbed; rollback using snapshot/backup |
| `WL-015` local database create/read/write | Storage baseline với aggregate synthetic | Clean data dir → create schema → write fixed safe records → read/verify → close/reopen/read → cleanup | DB warm-up `TBD`; fixed operation count/duration/reps `TBD` | `MET-DB-LATENCY`, `MET-CRASH-ERROR`, integrity result | Exact data/operation fixture; correctness required; latency threshold `TBD` | DB operation summary/schema dump; scan raw leakage; delete runtime DB |
| `WL-016` migration failure/recovery simulation | Chứng minh backup/write lock/recovery; synthetic N-1 + injected failure | Khóa normal writes → tạo backup nhất quán bằng SQLite Online Backup API hoặc checkpoint/quiesce method đã duyệt bao phủ DB/WAL/SHM → verify backup checksum/integrity → launch migration → inject failure at locked point → verify backup/write lock → recover → integrity check | `NONE`; mỗi injection point reps `TBD` | `MET-MIGRATION-RESULT`, `MET-INTEGRITY-RESULT`, `MET-CRASH-ERROR` | Backup nhất quán còn nguyên, không half-migrated writes, recovery works; copy riêng file DB khi WAL active là invalid | Fixture/checksum/migration record và backup-method version; restore/delete temp DB |
| `WL-017` raw-data leakage inspection | Quét mọi sink sau camera/failure workloads; canary chỉ là token văn bản tổng hợp đã duyệt, không phải frame/landmark/pixel/exact series | Seed approved symbolic canary tokens vào test seams → run referenced workloads → scan DB/backup/log/crash/telemetry/temp/network artifacts → report by sink | Không warm-up; after workload set; reps tied to source runs | `MET-RAW-LEAK`, `MET-NET-UNEXPECTED` | Required zero findings; any finding immediate stop | Zero-finding report; artifact cấm phải cô lập, không retain raw |
| `WL-018` accessibility smoke test | So sánh keyboard/focus/label/reduced motion của UI tối thiểu | Launch → traverse all controls keyboard-only → inspect focus/name/role/state → enable high contrast/reduced motion if applicable → close | `NONE`; one scripted pass + reps `TBD` | `MET-A11Y-RESULT`, `MET-CRASH-ERROR` | Same UI actions; evidence descriptive, feature gaps marked non-equivalent | Checklist/scrubbed accessibility output; no screen capture chứa camera |
| `WL-019` MSIX build reproducibility | Hai clean build cùng commit/lockfile/toolchain; tách payload khỏi signing nondeterminism | Provision clean runner A/B → verify clean tree → restore lockfile deps → build unsigned/staged payload → tạo normalized content manifest/hash → package/sign theo cùng policy → checksum MSIX/manifest/SBOM → compare hai lớp | `NONE`; chính xác tối thiểu hai clean build; thêm reps `TBD` | `MET-BUILD-REPRO`, `MET-PACKAGE-SIZE`, `MET-CRASH-ERROR` | Cả hai build; payload normalized phải tương đương hoặc có nondeterminism được định danh; signed MSIX hash được ghi nhưng không bắt buộc bằng nhau khi signing timestamp/metadata đã chứng minh là nguồn khác biệt | Build/sign logs đã scrub, content manifests, checksums; cleanup runner/cert theo manifest |
| `WL-020` uninstall/user-data behavior | Xác minh uninstall và dữ liệu synthetic; required behavior policy phải được duyệt trước run `VALID` | Install → create synthetic data → uninstall → inspect package/process/data → reinstall nếu policy yêu cầu → record behavior | `NONE`; clean snapshot reps `TBD` | `MET-UNINSTALL-RESULT`, `MET-RESOURCE-STATUS`, `MET-CRASH-ERROR` | Policy còn `TBD` thì `NOT_EVALUATED`, không run `VALID`; sau approval, behavior phải khớp policy | Uninstall/data scan; do not delete retained evidence; restore snapshot |

## Metric catalogue

| Metric ID | Definition / unit | Sampling và aggregation | Source/tool | Missing/error semantics | Comparability constraints |
|---|---|---|---|---|---|
| `MET-START-COLD` | Launch command đến ready marker; ms | Monotonic timestamps; từng sample + median/p95 sau đủ reps | Tool `TBD` + app marker | `NOT_MEASURED`/`ERROR_*`, không 0 | Cùng cache/process/OS state và ready marker |
| `MET-START-WARM` | Warm launch đến ready; ms | Như cold, tập sample riêng | Tool `TBD` | Như trên | Không trộn cold/warm |
| `MET-MEM-IDLE` | RSS và private working set khi idle; MiB | Sample interval `TBD`; avg/p95/max | Windows tool `TBD` | Process missing là error | Cùng process-tree attribution/window |
| `MET-MEM-CAMERA` | RSS/private working set khi camera active; MiB | Sample window; avg/p95/max và delta so idle mô tả | Tool `TBD` | Camera not running là invalid | Cùng camera/asset/window |
| `MET-CPU-AVG` | CPU utilization trung bình; % normalized rule `TBD` | Fixed interval; arithmetic mean | Windows tool `TBD` | Missing samples invalid | Cùng core-normalization/process tree |
| `MET-CPU-P95` | P95 CPU utilization; % | Fixed interval; predeclared percentile method | Tool `TBD` | Missing samples invalid | Như CPU avg |
| `MET-FRAME-P50` | P50 processing time/frame; ms | Monotonic duration chỉ tồn tại per-frame trong RAM; cập nhật histogram boundaries/version đã khóa và persist count/bucket/P50, không exact series | Candidate instrumentation chung | Không frame = `NOT_MEASURED` | Cùng sampling point/fixture/histogram/percentile algorithm, không raw frame hoặc exact per-frame series |
| `MET-FRAME-P95` | P95 processing time/frame; ms | Như trên; persist count/bucket/P95 | Như trên | Như trên | Như trên |
| `MET-FPS` | Frames processed / active seconds; frames/s | Count + duration; avg và per-run | Instrumentation chung | Active time 0 = error | Cùng resolution/camera/window |
| `MET-DROP` | Expected minus processed frames / expected; % | Formula/version khóa trước run | Instrumentation + camera config | Expected unknown = `NOT_MEASURED` | Cùng expected-FPS semantics |
| `MET-ASSET-LOAD` | Integrity check/start load đến runtime ready; ms | Monotonic timestamps; per asset + aggregate rule `TBD` | App markers | Missing/invalid asset là typed error | Cùng asset bytes/checksum/cache state |
| `MET-NET-UNEXPECTED` | Request ngoài allowlist rỗng; count | Count distinct attempts + full safe metadata refs | Network capture tool `TBD` | Capture unavailable = invalid, không 0 | Cùng blocker/capture scope |
| `MET-CAMERA-START` | User/script intent đến camera ready/typed failure; ms | Monotonic per attempt; median/p95 | App markers | Failure giữ status/reason, value có thể missing | Cùng readiness/failure definition |
| `MET-CAMERA-STOP` | Stop intent đến capture/resource stopped; ms | Monotonic per attempt | App + OS resource tool `TBD` | Cleanup failure là error | Cùng resource definition |
| `MET-RESOURCE-MEM` | Private working set sau stop trừ baseline; MiB | Baseline + post-cooldown `TBD`; delta và trend theo cycle | OS tool `TBD` | Tool không attribute được = invalid | Cùng cooldown/process tree/tool overhead |
| `MET-RESOURCE-HANDLE` | Handle/resource count sau stop trừ baseline; count | Baseline + post-cooldown; delta và trend | OS/app tool `TBD` | Unsupported counter = `NOT_MEASURED` có reason | Cùng resource definition/tool |
| `MET-RESOURCE-STATUS` | Capture/model/process resource đã release; enum `RELEASED/RETAINED/ERROR` | Một observation tại cleanup marker | App + OS verification `TBD` | Không quan sát được = invalid | Cùng marker/resource allowlist |
| `MET-QUALITY-STATE` | Quality result; enum versioned | Một result/window, distribution theo run | App contract | Missing = `ERROR_MISSING_STATUS` | Cùng fixture/gate version; không numeric clinical output |
| `MET-PACKAGE-SIZE` | MSIX bytes; bytes/MiB display | Filesystem exact bytes; one per artifact | Filesystem/checksum | Artifact absent = error | Cùng package target/content/assets |
| `MET-INSTALL-LAUNCH` | Install và first launch result; boolean + reason code | Per clean snapshot; success rate after reps | MSIX/OS logs `TBD` | No run = not measured | Cùng identity/channel/VM baseline |
| `MET-BUILD-REPRO` | Clean build reproducibility; enum `PAYLOAD_MATCH/PAYLOAD_DIFF_DIAGNOSED/PAYLOAD_DIFF_UNEXPLAINED/ERROR` + normalized content diff và signed-artifact checksum | Tối thiểu hai clean build; so normalized payload/content manifest riêng với signed MSIX; ghi signing timestamp/metadata policy | CI/tool `TBD` | Thiếu một build/layer = error | Cùng commit/lockfile/toolchain/env/package/signing policy; không đòi signed checksum bằng nhau khi nondeterminism đã được định danh |
| `MET-DB-LATENCY` | Operation completion time; ms/op | Fixed operation fixture; p50/p95 by operation | Monotonic timer + DB result | Failed op separate error | Cùng schema/record count/durability mode |
| `MET-MIGRATION-RESULT` | Migration/recovery result; enum versioned | Một result per injection point | Migration record + harness | Missing record = error | Cùng N-1 fixture/injection point |
| `MET-INTEGRITY-RESULT` | DB/backup integrity result; enum `PASS/FAIL/ERROR` | Sau create/migrate/recover | DB integrity tool `TBD` | Tool unavailable = invalid | Cùng schema/tool/version |
| `MET-A11Y-RESULT` | Accessibility smoke checks; pass/fail count theo rule ID | Count by scripted rule; không tổng hợp thành shell score | Accessibility tool/checklist `TBD` | Unsupported check = `NOT_EVALUATED` | Cùng control tree/actions/tool |
| `MET-UNINSTALL-RESULT` | Uninstall/reinstall/data-retention behavior; enum + reason | Một result per clean snapshot | OS/package/data scan | Policy chưa duyệt = `NOT_EVALUATED` | Cùng package identity/policy/snapshot |
| `MET-CRASH-ERROR` | Crash và typed runtime error; count by code | Count per run and workload duration | Scrubbed app/OS logs | Log unavailable = invalid | Cùng error taxonomy/log scope |
| `MET-RAW-LEAK` | Forbidden raw-data findings; count by sink | Separate DB/backup/log/crash/telemetry/temp scan | Scanner/tool `TBD` | Scanner unavailable = invalid | Same canary/scan scope; required zero |

Không metric nào hiện có performance baseline hoặc pass threshold. Correctness/privacy invariants như zero raw leakage, zero unexpected network trong offline workload và typed failure đã đến từ acceptance, không phải threshold hiệu năng.

## Metric completeness và missing semantics

- Mỗi workload version PHẢI khai báo `expectedMetricSet`. Mỗi metric trong tập này phải có đúng một observation record cho mỗi attempt: `OBSERVED`, `NOT_MEASURED` hoặc `ERROR`; thiếu record làm run `INVALID` với `MISSING_METRIC_OBSERVATION`.
- `OBSERVED` yêu cầu `value`, `unit`, `sampleCount > 0`, `aggregation`, sampling window/method và artifact reference. `NOT_MEASURED`/`ERROR` yêu cầu `value=null`, `sampleCount=0` và typed `missingReason`; không được dùng `0`, chuỗi rỗng hoặc bỏ field.
- Metric dạng enum/boolean dùng `sampleCount=1` và aggregation `SINGLE_OBSERVATION`. Metric theo cửa sổ phải ghi expected/actual sample count, sampling interval, dropped sample count và coverage ratio; thiếu mẫu vượt rule đã khóa làm run `INVALID`, không tự nội suy.
- Aggregation/percentile/histogram algorithm, boundaries và unit conversion phải có version và giống nhau giữa candidate. Không đổi mean thành median, đổi process tree, đổi sampling interval hoặc đổi denominator sau khi xem kết quả.
- Khi summary tính pass rate, denominator là toàn bộ planned slots; các nhóm `FAILED`, `INVALID`, `ABORTED`, `NOT_EVALUATED` phải tách riêng. Không gọi trung bình của các run sống sót là kết quả workload.

## Fair comparison và decision matrix

- Evidence so sánh trực tiếp: cùng metric ID/method/tool, profile snapshot, workload/asset/config và package target.
- Evidence mô tả: V1 historical observations, Store feasibility, maintenance/toolchain risk, feature không tương đương.
- Không cộng metric khác đơn vị thành “điểm tổng”. Nếu dùng weights, Tech + QA phải duyệt version trước khi mở benchmark results.
- Kết quả thiếu hoặc không tương đương dùng `NOT_EVALUATED`/`NOT_COMPARABLE`, không dùng 0.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-benchmark-workloads.md` | `0.1.0-proposed` | Tech + QA | Tech | `CHANGES_REQUIRED` | 2026-07-14 | Measurement stack, warm-up, duration, repetitions, variance và overhead tolerance chưa khóa/xác minh | Sau tool provisioning + overhead dry-run được phê duyệt riêng; không dùng benchmark result |
| `m0-benchmark-workloads.md` | `0.2.0-proposed` | Tech + QA | QA | `CHANGES_REQUIRED` | 2026-07-14 | Warm-up/stabilization/timeout/duration/repetitions/sample interval, variance/outlier rule, tool equivalence và overhead tolerance chưa khóa | Sau protocol/tool dry-run tách khỏi benchmark và run plan có version/checksum |
| `m0-benchmark-workloads.md` | `0.3.0-proposed` | Tech + QA | Privacy + Security | `CHANGES_REQUIRED` | 2026-07-14 | Consent/tool-egress/synthetic-fixture contract đã siết nhưng tool config, payload-free capture, scrubber và negative fixtures chưa được dry-run/xác minh | Sau privacy/security dry-run chỉ với fixture synthetic và trước mọi camera/network benchmark |
