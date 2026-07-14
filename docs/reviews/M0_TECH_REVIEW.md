# M0 Technical Readiness Review

```yaml
decision_status: confirmed
release_scope: m0
owner: tech-reviewer
review_role: tech
review_decision: changes_required
reviewed_baseline: 2cc3430e492795cccc68e58b82e5ada75eaa9315
last_reviewed: 2026-07-14
review_scope: documentation-and-read-only-inventory
```

## Kết luận

**Tech: `CHANGES_REQUIRED`. T-M0-002 và mọi implementation/benchmark vẫn chưa được bắt đầu.**

Hai mươi workload và 28 metric có hướng triển khai kỹ thuật khả thi, nhưng readiness chưa thể khóa: measurement stack/process-tree attribution chưa được chứng minh, Windows SDK/MSIX và Rust toolchain không có trên `DP-DEV`, timing/repetition/variance/overhead tolerance vẫn `TBD`, bốn target profile chưa có máy đại diện, và Privacy/Security chưa duyệt artifact. Không có căn cứ chọn Electron/Tauri.

Review đã sửa năm HIGH có thể sửa bằng tài liệu: traceability privacy/network, định nghĩa cold start, cấm persist exact per-frame series, backup nhất quán với SQLite WAL và reproducibility của signed MSIX. Một HIGH còn mở là measurement protocol chưa khóa/xác minh.

## Phạm vi và negative constraints

- Đọc đầy đủ governance/master spec, architecture/data/operations, audit V1, readiness package, hai adversarial review và toàn bộ spec M0.
- Chỉ kiểm kê `DP-DEV` bằng command read-only, field tối thiểu; không lấy username, serial number hoặc device instance ID.
- Không sửa `F:\dry-eye-app`; không install/build/test/benchmark/package/migration; không viết application code; không đổi ADR status; không chọn shell/runtime/encryption.
- Không phê duyệt thay QA hoặc Privacy/Security.

## Observed inventory `DP-DEV`

Quan sát lúc `2026-07-14T02:46:00Z`: Windows 11 Home `10.0.26200` build `26200`; Intel Core i5-13420H, 8 physical/12 logical cores; RAM 15.73 GiB; NVIDIA RTX 3050 6GB Laptop `32.0.15.9579` và Intel UHD `32.0.101.6733`; x64; NVMe SSD; C: trống 131.85 GiB, F: trống 423.51 GiB; một màn hình 1920×1080, scaling 100%; Integrated Camera driver `5.0.18.176`; Legion Balance Mode, AC power.

Camera resolution/FPS, controlled network mode, package identity/channel còn `TBD`. Camera không được mở. Máy này không tự đại diện `DP-MIN/TYP/HIGH/EDGE`; `WL-008` cần external webcam hoặc observed fixture phần cứng được QA duyệt. Command và field thực dùng đã ghi trong `m0-device-profiles.md`.

## Tool inventory và phương pháp đề xuất

| Nhóm | Có trên `DP-DEV` | Vắng/Chưa đủ | Kết luận Tech |
|---|---|---|---|
| Resource/ETW | `wpr`, `logman`, `typeperf`, `perfmon`, `Get-Counter` | `wpa`, `xperf`, `wpaexporter` | Chưa có pipeline phân tích/process-tree attribution; không được tạo run `VALID` |
| Network/event | `pktmon`, `tracerpt`, `wevtutil` | Firewall/capture protocol chưa duyệt | Đề xuất blocked outbound + capture metadata đã scrub; cần overhead/privacy dry-run |
| MSIX | Không | `signtool`, `makeappx`, `makepri`, `msixmgr` | `WL-013/014/019/020` bị chặn trên máy này |
| Accessibility | `inspect` | `uiautomationverify` | `WL-018` chỉ khả thi sau khi khóa tool/checklist |
| Candidate toolchain | Node 24.12, npm/pnpm, Git | `rustc`, `cargo` | Không được coi sự vắng Rust trên máy dev là điểm trừ Tauri; clean runner phải provision đối xứng |
| Runtime | WebView2 Runtime `150.0.4078.65` | Candidate runtime/model chưa chọn | Chỉ là observed fact, không phải evidence chọn shell |

Measurement method đề xuất, chưa khóa: external monotonic launcher + cùng ready marker cho startup; PID/descendant-aware PDH collector cho private working set/CPU/handle; in-app monotonic histogram cho frame latency; app markers + OS verification cho lifecycle; `pktmon` với outbound deny cho zero-network; Windows Event Log cho crash; Windows SDK trên clean runner cho MSIX. Collector phải đo overhead với cùng workload và không persist raw camera/per-frame series.

## Feasibility 20 workload

| Workload | Kết quả Tech |
|---|---|
| `WL-001/002` | Khả thi có điều kiện; cold dùng reboot/snapshot + stabilization, warm tách riêng; ready marker/timeout/reps `TBD` |
| `WL-003` | Khả thi sau process-tree collector/overhead dry-run |
| `WL-004/005` | Khả thi nếu asset bytes/checksum, camera config và histogram algorithm giống nhau; cấm exact per-frame series |
| `WL-006/007` | Khả thi sau khi khóa permission-reset và contention fixture tương đương |
| `WL-008` | Không chạy chính thức trên camera tích hợp; cần `DP-EDGE` external webcam |
| `WL-009` | Khả thi sau network block/capture scope và privilege được duyệt |
| `WL-010` | Khả thi với synthetic quality fixture không chứa người thật |
| `WL-011` | Khả thi; cycle/cooldown/leak rule còn `TBD` |
| `WL-012` | Khả thi; phải khóa đúng một variant và transition method |
| `WL-013/014` | Khả thi trên clean VM/runner sau Windows SDK, test identity/certificate và data-path policy |
| `WL-015` | Khả thi với cùng SQLite schema/durability/operation fixture |
| `WL-016` | Khả thi sau sửa: Online Backup API hoặc checkpoint/quiesce method versioned; cấm copy DB riêng khi WAL active |
| `WL-017` | Khả thi sau scanner/allowlist/incident isolation được Privacy/Security duyệt |
| `WL-018` | Khả thi có điều kiện; tool/checklist chưa khóa |
| `WL-019` | Khả thi trên hai clean runner; so normalized payload riêng signed MSIX checksum |
| `WL-020` | `NOT_EVALUATED` đến khi uninstall/user-data policy được duyệt |

## Measurability 28 metric

| Nhóm metric | IDs | Trạng thái |
|---|---|---|
| Startup | `MET-START-COLD/WARM` | Đo được sau ready marker, boot/stabilization và repetition lock |
| Process/resource | `MET-MEM-IDLE`, `MET-MEM-CAMERA`, `MET-CPU-AVG`, `MET-CPU-P95`, `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE` | Đo được có điều kiện bằng collector quy PID + descendants; normalization/interval/cooldown còn `TBD` |
| Frame | `MET-FRAME-P50/P95`, `MET-FPS`, `MET-DROP` | Đo được bằng histogram/count trong RAM; chỉ persist count/bucket/summary |
| Runtime/lifecycle | `MET-ASSET-LOAD`, `MET-NET-UNEXPECTED`, `MET-CAMERA-START/STOP`, `MET-RESOURCE-STATUS` | App markers khả thi; network/process verification chưa khóa |
| Quality | `MET-QUALITY-STATE` | Đo được từ typed contract/versioned fixture |
| Package | `MET-PACKAGE-SIZE`, `MET-INSTALL-LAUNCH`, `MET-BUILD-REPRO` | Khả thi trên clean runner; SDK hiện vắng |
| Data | `MET-DB-LATENCY`, `MET-MIGRATION-RESULT`, `MET-INTEGRITY-RESULT` | Khả thi với schema/fixture/injection/backup method giống nhau |
| Review/gate | `MET-A11Y-RESULT`, `MET-UNINSTALL-RESULT`, `MET-CRASH-ERROR`, `MET-RAW-LEAK` | Khả thi có điều kiện; tool/policy/scanner còn `TBD` |

Không metric nào có performance threshold. Missing/error không được điền `0`. Electron và Tauri phải dùng cùng observable contract, fixture, asset/model bytes, camera/resolution, machine/power/network, package target và metric semantics; tool implementation có thể khác chỉ khi owner chứng minh equivalence và overhead trong tolerance khóa trước result.

## Camera, package và storage review

- Camera/runtime: lifecycle và fail-closed asset contract trong ADR-004 đủ làm thiết kế POC; runtime/model/topology/license vẫn `TBD`. Asset manifest phải ghi bytes/checksum/license/package resolver; cấm dev-server/CDN/cache. Stop/cancel/disconnect phải release track, worker/model và descendant process.
- MSIX/Store: cần clean Windows 11 VM/runner, package identity/test certificate/channel, manifest capabilities/restricted API review và data path ngoài install directory. Không publish Store. Signed hash không phải phép thử reproducibility duy nhất vì timestamp/signing metadata có thể làm đổi bytes.
- SQLite: WAL/transaction khả thi ở cả shell nhưng binding chưa chọn. Backup phải nhất quán với WAL; migration khóa normal writes, integrity-check backup trước write, failure giữ backup và recovery/read-only state. Encryption vẫn ngoài quyết định này.

## Findings

| ID | Severity | File/section | Evidence | Impact | Remediation | Owner | Close condition | Status |
|---|---|---|---|---|---|---|---|---|
| `M0-TECH-001` | HIGH | `plan.md` traceability | `PRIV-M0-001`/`SEC-M0-001` chỉ map `T-M0-007` dù gate chung là `T-M0-008` | Có thể bỏ scan Electron hoặc giao sai task | Map cả hai sang `T-M0-008` | Tech | Traceability khớp task registry | FIXED |
| `M0-TECH-002` | HIGH | `m0-benchmark-workloads.md` `WL-001` | “clear OS/app caches” không có method và dễ khác candidate | Cold-start không tái lập | Dùng reboot/snapshot + stabilization; cấm purge tùy ý | Tech + QA | Boot/snapshot/method/reps khóa | FIXED_DOC; parameters TBD |
| `M0-TECH-003` | HIGH | `WL-005`, `MET-FRAME-*` | Per-frame samples có thể xung đột cấm exact camera series | Evidence vi phạm privacy contract | Online histogram; persist count/bucket/summary | Tech + Privacy | Schema/implementation scan chứng minh không exact series | FIXED_DOC |
| `M0-TECH-004` | HIGH | `WL-016`, stop rule 005 | Copy fixture chưa đảm bảo DB/WAL nhất quán | Backup có thể pass giả hoặc recovery corrupt | Online Backup API hoặc checkpoint/quiesce versioned | Data + Tech | Failure fixtures + integrity đạt | FIXED_DOC |
| `M0-TECH-005` | HIGH | `WL-019`, `MET-BUILD-REPRO`, stop rule 010 | Exact signed MSIX checksum bị ảnh hưởng timestamp/signing metadata | Loại candidate sai | So normalized payload riêng; signed checksum làm provenance | Release + Security | Hai clean payload match hoặc nondeterminism chẩn đoán | FIXED_DOC |
| `M0-TECH-006` | HIGH | Bốn readiness docs — approval/TBD | Tool/method, timing, repetition, variance và overhead tolerance chưa khóa; required tools còn vắng | Không có run `VALID`, không fair comparison | Provision clean tools, chạy overhead-only dry-run, khóa protocol trước result; QA review riêng | Tech + QA | Approval Tech/QA, protocol checksum/version, tool equivalence và overhead tolerance được ghi | OPEN |

## Thông số khóa và còn `TBD`

- Đã khóa về semantics: `WL-001`–`WL-020`, 28 metric IDs, JSONL schema `0.1.0`, 16 stop rules, zero raw leakage/zero unexpected network, cùng workload/fixture và không scoring hậu nghiệm.
- Chưa khóa: warm-up, stabilization, timeout, duration, repetitions, sample interval, process-tree attribution, percentile/histogram boundaries, cycle/cooldown, variance/outlier rule, overhead tolerance, thermal hard limit, tool versions, CI image, MSIX identity/certificate và uninstall policy.
- Không được dùng baseline result để chọn các thông số trên. Cần overhead/dry-run chỉ để xác minh tool và phải tách khỏi benchmark result.

## Điều kiện review lại

Tech chỉ chuyển `APPROVED` sau khi `M0-TECH-006` đóng. Sau đó QA phải review độc lập; Privacy/Security vẫn `NOT_REVIEWED` cho artifact allowlist, trace, retention, incident isolation và signing. T-M0-002, T-M0-003 và code vẫn chưa được phép bắt đầu trong review này.
