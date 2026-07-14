# M0 QA Readiness Review

```yaml
decision_status: confirmed
release_scope: m0
owner: qa-reviewer
review_role: qa
review_decision: changes_required
reviewed_baseline: 4b6bda0a5160a9b75da0164fb53356e6023c5c27
last_reviewed: 2026-07-14
review_scope: documentation-only
```

## Kết luận

**QA: `CHANGES_REQUIRED`. Không bắt đầu T-M0-002, T-M0-003, implementation hoặc benchmark.**

Readiness package đã có coverage rộng và các invariants đúng hướng, nhưng chưa tạo được evidence tái lập: profile/mapping máy thật, timing/repetition, measurement stack, variance/outlier parameter, overhead tolerance và validator vẫn chưa khóa hoặc chưa chạy. Vì vậy không có run nào hiện có thể mang trạng thái `VALID`, không có metric performance nào đủ điều kiện so sánh Electron/Tauri, và không có acceptance nào được đánh dấu `PASS`.

QA đã sửa năm HIGH ở mức contract tài liệu: tách `INVALID`/`ABORTED`/`FAILED`, chống survivorship/cherry-picking, bắt buộc metric completeness/missing semantics, thêm acceptance evaluation audit trail và làm stop event quan sát được. Không thay Tech decision, không phê duyệt thay Privacy/Security và không chọn shell/runtime/encryption.

## Phạm vi và phương pháp

- Đọc toàn bộ `spec.md`, `acceptance.md`, `plan.md`, `tasks.md`; ba audit V1; bốn readiness docs; `M0_BENCHMARK_READINESS_REVIEW.md`; `M0_TECH_REVIEW.md` tại commit `4b6bda0...`.
- Phản biện độc lập theo reproducibility, comparability và falsifiability; không mặc định Tech review đúng.
- Không mở camera, không install/build/test/benchmark/package/migration, không sửa V1 hoặc application code.
- Chỉ sửa finding BLOCKER/HIGH có thể đóng bằng contract tài liệu. Thông số cần empirical dry-run vẫn để mở, không bịa số.

## Tổng hợp mức độ trước và sau sửa

| Mức độ | Trước sửa | Đã sửa | Còn mở |
|---|---:|---:|---:|
| BLOCKER | 0 | 0 | 0 |
| HIGH | 10 | 5 | 5 |
| MEDIUM | 0 | 0 | 0 |
| LOW | 0 | 0 | 0 |

MEDIUM/LOW không được tạo trong lượt này vì scope chỉ yêu cầu hành động với BLOCKER/HIGH. Năm HIGH còn mở đều chặn QA approval và run `VALID`.

## Findings

| ID | Mức | Phát hiện | Tác động | Hành động/điều kiện đóng | Trạng thái |
|---|---|---|---|---|---|
| `M0-QA-001` | HIGH | Evidence schema dùng `validity: ABORTED`; stop rules trộn `INVALID`, `ABORTED` và candidate failure. | Run dừng sớm có thể bị hiểu sai là fail kỹ thuật hoặc vẫn được aggregate. | Tách `executionStatus`, `validity`, `outcome`; định nghĩa `FAILED` chỉ khi evaluator có đủ evidence. | `FIXED_DOC` |
| `M0-QA-002` | HIGH | Không có planned-slot registry; rerun và summary có thể bỏ failed/invalid/aborted attempt. | Survivorship bias, cherry-picking và trung bình giả. | Thêm run plan version/checksum, immutable slot/attempt, denominator completeness, pair effect và cấm rerun thay record cũ. | `FIXED_DOC` |
| `M0-QA-003` | HIGH | Metric observation chưa có expected/dropped samples, coverage, aggregation version và rule khi metric record biến mất. | Missing có thể bị bỏ qua hoặc aggregate khác nhau giữa candidate. | Bắt buộc expected metric set, nullable/missing semantics, sample coverage và algorithm version. | `FIXED_DOC` |
| `M0-QA-004` | HIGH | Acceptance register chỉ nói evidence dự kiến, chưa có machine-readable PASS/FAIL/NOT_EVALUATED/NOT_COMPARABLE và source-run links. | Không thể tái tính pass/fail hoặc truy requirement đến artifact. | Thêm acceptance evaluation contract và requirement → acceptance → workload/task → run/artifact audit trail. | `FIXED_DOC` |
| `M0-QA-005` | HIGH | Stop rule chưa bắt buộc detector/version/timestamp/artifact/pair effect. | Reviewer có thể kích hoạt stop hồi tố bằng nhận xét định tính. | Thêm stop-event record quan sát được; thiếu method/artifact làm run invalid. | `FIXED_DOC` |
| `M0-QA-006` | HIGH | Warm-up, stabilization, timeout, duration, repetition, sampling interval và cooldown của workload vẫn `TBD`; warm launch “1 launch đề xuất” chưa khóa. | Không tái lập, cold/warm và sample window không so sánh được. | Tech + QA khóa run plan trước result và version/checksum; dry-run chỉ kiểm tra tool, không dùng làm benchmark. | `OPEN` |
| `M0-QA-007` | HIGH | Variance threshold, outlier rule và hard safety limit chưa có giá trị/version. | Có thể loại outlier hoặc dừng candidate sau khi xem result. | Khóa parameter/rule trước result; báo inclusive result và sensitivity analysis. Contract đã có, parameter thực vẫn thiếu. | `OPEN` |
| `M0-QA-008` | HIGH | `DP-MIN/TYP/HIGH/EDGE` chưa có cấu hình/máy mapping; `DP-DEV` thiếu camera resolution/FPS, controlled network, package identity và external camera cho disconnect. | Workload camera/package không có môi trường đại diện; candidate có thể chạy trên profile khác nhau. | Inventory/mapping observed machine có evidence/version/checksum; không thay thế âm thầm bằng `DP-DEV`. | `OPEN` |
| `M0-QA-009` | HIGH | Measurement stack/process-tree attribution, network capture, package SDK, tool equivalence và overhead tolerance chưa được dry-run. | CPU/RAM/network/package evidence chưa falsifiable; tool có thể tạo khác biệt candidate. | Overhead-only positive/negative dry-run, cùng method hoặc equivalence proof; khóa versions/tolerance. | `OPEN` |
| `M0-QA-010` | HIGH | Chưa có schema/link/checksum/summary validator; artifact allowlist, retention và incident isolation chưa được Privacy/Security duyệt. | Evidence chưa audit được và chưa được phép thu camera/network artifacts. | T-M0-003 chỉ sau gate; validator chạy trên fixtures; Privacy/Security approval riêng. | `OPEN` |

## Audit 20 workload

| Workload | QA review về precondition/sequence/duration/repetition/cleanup/invalid |
|---|---|
| `WL-001` | Sequence cold dùng reboot/snapshot hợp lý; stabilization marker, timeout, reps và exact cache policy chưa khóa nên chưa tái lập. |
| `WL-002` | Tách warm khỏi cold đúng; “1 launch đề xuất”, close semantics, timeout và reps chưa khóa. |
| `WL-003` | Camera-never-requested rõ; stabilization/window/interval/process-tree/background allowlist còn thiếu. |
| `WL-004` | Camera/asset/consent/network precondition rõ; hold duration, model warm-up, reps, camera config và release detector chưa khóa. |
| `WL-005` | Fixed-window và histogram tránh raw series; synthetic quality fixture, boundaries, duration/reps và sample completeness chưa khóa. |
| `WL-006` | Denied sequence có terminal result; permission reset method, timeout, reps và no-reprompt observation chưa khóa. |
| `WL-007` | Busy/retry sequence đúng; contention fixture/driver semantics, timeout và reps chưa khóa. |
| `WL-008` | Disconnect/reconnect sequence có thể bác bỏ lifecycle; thiếu external-camera observed profile, scripted marker tolerance và reps. |
| `WL-009` | Offline/cache intent đúng; blocker/capture scope, cache reset method, asset warm-up và reps chưa khóa. |
| `WL-010` | Abstention/no-numeric là pass rule rõ; low-quality fixture/method, window và reps chưa khóa. |
| `WL-011` | Có cycle/resource checks; N, fixed window, cooldown, leak trend và reps chưa khóa. |
| `WL-012` | Đã bắt buộc một variant; transition method, idle/camera subvariant, timing/reps và resume marker chưa khóa. |
| `WL-013` | Clean snapshot/install/offline launch rõ; snapshot image, identity/certificate, install timeout và reps chưa khóa. |
| `WL-014` | Prior-version/data fixture và rollback rõ; exact versions/schema/path policy, reps và update failure cases chưa khóa. |
| `WL-015` | Synthetic records/reopen/read đúng; schema/durability/operation count, timing/reps và DB warm-up chưa khóa. |
| `WL-016` | Backup/WAL/failure/recovery sequence đã được Tech sửa đúng; injection points, backup method/version và reps chưa khóa. |
| `WL-017` | Cross-sink scan và symbolic canary đúng; source workload set, scanner coverage, allowlist và Privacy/Security approval còn thiếu. |
| `WL-018` | Scripted accessibility actions tương đương; exact control tree/checklist/tool, unsupported semantics và reps chưa khóa. |
| `WL-019` | Hai clean build và payload/signing layer tách đúng; runner image/toolchain/sign policy và nondeterminism normalizer chưa khóa. |
| `WL-020` | Đã cấm `VALID` khi policy `TBD`; uninstall/data policy, snapshot/reps và retained-data expectation chưa duyệt. |

Kết luận workload: 20/20 có purpose và sequence ở mức proposal; 0/20 đủ field để tạo run `VALID` ở thời điểm review.

## Audit 28 metric

| Nhóm | IDs | Unit/aggregation/missing audit |
|---|---|---|
| Startup | `MET-START-COLD`, `MET-START-WARM` | Unit ms rõ; source marker/tool/timeout/reps còn TBD; cold/warm không được trộn. |
| Memory/CPU | `MET-MEM-IDLE`, `MET-MEM-CAMERA`, `MET-CPU-AVG`, `MET-CPU-P95` | MiB/% rõ; process tree, core normalization, interval/window/coverage còn TBD. |
| Frame | `MET-FRAME-P50`, `MET-FRAME-P95`, `MET-FPS`, `MET-DROP` | Unit/formula có hướng; histogram/percentile/expected-FPS version và sample coverage chưa khóa; exact series bị cấm. |
| Asset/network/camera | `MET-ASSET-LOAD`, `MET-NET-UNEXPECTED`, `MET-CAMERA-START`, `MET-CAMERA-STOP` | Unit/count rõ; aggregate asset rule, capture scope, readiness/release marker và tool còn TBD. |
| Resource/quality | `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`, `MET-QUALITY-STATE` | MiB/count/enum tách đúng; cooldown, attribution, detector và fixture version còn TBD. |
| Package/build | `MET-PACKAGE-SIZE`, `MET-INSTALL-LAUNCH`, `MET-BUILD-REPRO` | Bytes/boolean/enum rõ; runner/tool/signing normalizer và repetition policy chưa khóa. |
| Data | `MET-DB-LATENCY`, `MET-MIGRATION-RESULT`, `MET-INTEGRITY-RESULT` | ms/op/enum rõ; operation fixture, injection set, DB tool/version và durability còn TBD. |
| Gate/review | `MET-A11Y-RESULT`, `MET-UNINSTALL-RESULT`, `MET-CRASH-ERROR`, `MET-RAW-LEAK` | Count/enum rõ; checklist/policy/log/scanner scope còn TBD và Privacy/Security chưa duyệt. |

Kết luận metric: 28/28 có ID và unit/enum cơ bản; 28/28 chưa có đủ locked tool/sampling/aggregation/run parameters để tạo comparison evidence. Contract missing đã được siết: metric không quan sát phải có record typed, không được biến thành `0` hoặc biến mất.

## Fairness, variance và selection bias

- Cùng workload/version, asset/algorithm bytes, camera/resolution/driver, observed machine, power/network, package/build, tool/method, timing và cleanup đã là điều kiện bắt buộc trên giấy.
- Fairness chưa được chứng minh vì các giá trị và tool versions chưa khóa. Không được coi hai candidate “cùng protocol” chỉ vì dùng cùng ID.
- Run plan mới yêu cầu immutable slot/attempt, all-slot summary và pair effect khi dừng sớm; do đó failed/invalid/aborted attempts không thể biến mất khỏi denominator.
- Variance/outlier structure đã an toàn hơn, nhưng parameter vẫn `TBD`; trước khi khóa parameter, mọi performance comparison là `NOT_EVALUATED`.
- Không average metric khác đơn vị; không composite score nếu weights chưa version/checksum trước result.

## Evidence auditability và acceptance

- Evidence schema có commit/dirty flag/build/device/workload/tool/artifact/checksum nhưng hiện chưa có validator/canonical command; khả năng tái tính vẫn chưa được chứng minh.
- Acceptance evaluation mới bắt buộc `PASS/FAIL/NOT_EVALUATED/NOT_COMPARABLE`, requirement IDs, evaluator version, run IDs và artifact refs. Không có source runs/checksum thì không được `PASS`.
- Traceability tĩnh bao phủ 17 M0 requirements, `AC-M0-001`–`021` và `T-M0-002`–`012`; privacy/network mapping về `T-M0-008` đã được Tech sửa. Dynamic link tới run/artifact vẫn chưa thể xác minh vì chưa có code/evidence.
- Các acceptance về offline, denied/busy/low quality/device change, leakage, clean install, migration failure, MSIX và performance đều có workload/task dự kiến; tất cả hiện `NOT_EVALUATED`.

## Stop rules và T-M0-002

- 16 stop rule có trigger/action/owner/effect; stop-event contract mới yêu cầu detector/version/timestamp/artifact/checksum/cleanup/pair effect.
- Rule dựa trên threshold/tolerance/tool chưa khóa không được kích hoạt hồi tố. Missing detector/evidence làm run invalid, không cho reviewer suy đoán candidate fail.
- T-M0-002 có đúng một outcome: readiness package được duyệt và khóa version. Expected evidence là approval table, protocol/run plan checksum, profile mapping, schema/stop-rule contract và review records; stop condition là bất kỳ owner/TBD/provenance/approval run-critical nào còn thiếu.
- Outcome này chưa đạt. Lượt QA này chỉ review và sửa readiness docs; không thực hiện T-M0-002.

## Approval và điều kiện review lại

QA giữ `CHANGES_REQUIRED` cho cả bốn readiness docs. Tech decision tại `M0_TECH_REVIEW.md` không thay đổi. Privacy/Security vẫn `NOT_REVIEWED` và phải tự duyệt artifact allowlist, retention, isolation, network trace và signing scope.

QA chỉ chuyển `APPROVED` sau khi đồng thời:

1. Profile/mapping và toàn bộ field run-critical được khóa bằng version/checksum trước result.
2. Measurement tools/process-tree/network/package methods được provision và qua positive/negative + overhead-only dry-run; tolerance được khóa.
3. Warm/cold markers, timing, repetition, order, variance/outlier và completeness rules có run plan không còn `TBD`.
4. Schema/link/checksum/summary validator tái tính được fixtures gồm pass, fail, invalid, aborted, missing metric và rerun.
5. Privacy/Security không còn blocking comment cho artifact/retention/incident isolation.

Cho đến khi đủ năm điều kiện: **T-M0-002 là `NOT READY`; không bắt đầu T-M0-003 hoặc application code.**

