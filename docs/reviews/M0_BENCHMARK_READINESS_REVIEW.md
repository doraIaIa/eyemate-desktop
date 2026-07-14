# M0 Benchmark Readiness Adversarial Review

```yaml
decision_status: confirmed
release_scope: m0
owner: technical-lead-review
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
review_scope: documentation-only
```

## Kết luận

**CONDITIONALLY READY để thực hiện hai lượt phê duyệt Tech và QA; NOT READY để bắt đầu T-M0-002 hoặc bất kỳ implementation/benchmark nào.**

Bộ tài liệu đã định nghĩa đủ khung profile, `WL-001`–`WL-020`, metric machine-readable, evidence provenance và stop rules. Không còn lỗi nội dung mức BLOCKER/HIGH do adversarial review phát hiện. Tuy nhiên toàn bộ approval hiện `NOT_REVIEWED`; cấu hình máy, tool, warm-up, duration, repetitions, allowed variance, retention và policy uninstall còn `TBD` có owner/gate. Không được giả chữ ký để chuyển `READY`.

## Phạm vi và phương pháp

- Đọc nguồn governance/architecture/validation/privacy/data/operations, ba audit V1, toàn bộ spec M0 và adversarial review trước.
- Review profile bị bịa; workload thiếu field/tái lập; metric không định nghĩa; evidence thiếu provenance; comparison bất công; privacy/raw artifact; stop rule; traceability; command giả định; task quá lớn; scope M1–M5.
- Không sửa `F:\dry-eye-app`, không install/build/test/benchmark/package/migration, không viết application code, không đổi ADR status hoặc chọn shell/runtime/encryption.

## Tổng hợp mức độ trước và sau sửa

| Mức độ | Trước sửa | Đã sửa | Còn mở |
|---|---:|---:|---:|
| BLOCKER | 0 | 0 | 0 |
| HIGH | 7 | 7 | 0 |
| MEDIUM | 5 | 0 | 5 |
| LOW | 2 | 0 | 2 |

Theo yêu cầu, chỉ BLOCKER/HIGH được sửa. MEDIUM/LOW được giữ minh bạch và không được biến thành verified fact.

## Findings đã sửa

| ID | Mức | Phát hiện trước sửa | Hậu quả | Sửa đã thực hiện |
|---|---|---|---|---|
| `M0-BRR-001` | HIGH | Workload dùng composite token không tồn tại như `MET-CPU-AVG/P95`, `MET-FRAME-P50/P95`. | Evidence không machine-readable, metric mapping mơ hồ. | Thay bằng từng metric ID chính xác. |
| `M0-BRR-002` | HIGH | `MET-RECOVERY` trộn MiB, handle count và enum trong một metric. | Khác đơn vị nhưng có thể bị tổng hợp sai. | Tách `MET-RESOURCE-MEM`, `MET-RESOURCE-HANDLE`, `MET-RESOURCE-STATUS`. |
| `M0-BRR-003` | HIGH | `WL-012` cho phép sleep/resume hoặc background/foreground mà không khóa variant. | Hai candidate có thể chạy scenario khác nhau. | Bắt buộc `workloadVariant` và method giống nhau trước run. |
| `M0-BRR-004` | HIGH | `WL-020` có policy uninstall/data `TBD` nhưng chưa cấm run valid. | Candidate có thể bị chấm theo policy hậu nghiệm. | Policy chưa duyệt thì `NOT_EVALUATED`, không run `VALID`. |
| `M0-BRR-005` | HIGH | Canary của leakage scan chưa nói rõ không phải dữ liệu camera raw. | Có nguy cơ tự tạo artifact bị cấm trong test. | Giới hạn canary thành symbolic text token synthetic, cấm frame/landmark/pixel/exact series. |
| `M0-BRR-006` | HIGH | “Tool làm thay đổi workload đáng kể” không có semantics trước result. | Có thể loại run tùy ý sau khi thấy số đo. | Stop rule yêu cầu method/tolerance khóa trước result; nếu chưa khóa, cấm run `VALID`. |
| `M0-BRR-007` | HIGH | Bảng traceability trong `plan.md` còn mapping task cũ/sai sau khi chia 12 task. | Acceptance/evidence có thể giao nhầm task. | Sửa mapping cho local assets, storage/privacy, MSIX/reproducibility và validation. |

## Findings còn mở

| ID | Mức | Phát hiện | Owner/gate | Ảnh hưởng readiness |
|---|---|---|---|---|
| `M0-BRR-008` | MEDIUM | `DP-MIN`, `DP-TYP`, `DP-HIGH`, `DP-EDGE` chỉ là target `PROPOSED`; hardware cụ thể và observed mapping `TBD`. | Tech + QA; Product góp rationale DP-TYP; trước run liên quan | Không bịa profile; chặn benchmark, không chặn review package. |
| `M0-BRR-009` | MEDIUM | Tool, warm-up, duration, repetition, sample interval, allowed variance và overhead tolerance chưa có baseline. | Tech + QA; khóa trước result | Chặn run `VALID`; không được hard-code trong tài liệu này. |
| `M0-BRR-010` | MEDIUM | Retention evidence, CI runner, test identity/certificate và uninstall/user-data policy còn `TBD`. | Release + Security + Privacy | Chặn workload package/retention liên quan. |
| `M0-BRR-011` | MEDIUM | ADR-003 context vẫn nói V1 chưa được cung cấp, trong khi audit đã có. | Tech/ADR owner; change set ADR sau approval | Không làm mất audit; V1 chỉ baseline lịch sử. Không sửa vì ADR không nằm trong output được phép. |
| `M0-BRR-012` | MEDIUM | Canonical `validate:m0-protocol`, `validate:m0-evidence`, build/test/benchmark commands chưa tồn tại. | Tech; T-M0-003 sau khi được phép scaffold | Mọi command giữ “chưa xác minh”; chặn báo DoD, không tạo `AGENTS.md`. |
| `M0-BRR-013` | LOW | Một số thuật ngữ Anh–Việt còn lẫn (`fixture`, `sink`, `workload`). | Documentation owner | Không đổi semantics. |
| `M0-BRR-014` | LOW | Bảng workload rất rộng, có thể khó đọc trên màn hình hẹp. | Documentation owner | Không ảnh hưởng machine semantics/traceability. |

## Fair-comparison audit

| Kiểm tra | Kết quả |
|---|---|
| Cùng UI workload tối thiểu | Đã quy định; implementation chưa có |
| Cùng asset/algorithm/camera/resolution | Đã quy định bằng manifest/checksum/profile; giá trị còn `TBD` |
| Cùng machine/power/network/storage/package | Đã quy định; observed snapshot chưa có |
| Cùng duration/repetition/method/failure/cleanup | Đã quy định; thông số chưa được Tech + QA khóa |
| Direct vs descriptive evidence | Đã tách; V1 chỉ historical baseline |
| Feature không tương đương | Dùng `NOT_COMPARABLE`, không cho 0 |
| Arbitrary composite score | Bị cấm; weight phải duyệt/checksum trước result |

ADR-003 hiện đã chứa cùng nguyên tắc fair comparison và decision matrix; readiness package không sửa hoặc đổi status ADR.

## Approval register tổng hợp

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | Tech | `NOT_REVIEWED` | — | Target/observed mapping chưa duyệt | Tech review lượt 1 |
| `m0-device-profiles.md` | `0.1.0-proposed` | Tech | QA | `NOT_REVIEWED` | — | Coverage camera/driver/geometry chưa duyệt | QA review lượt 2 |
| `m0-benchmark-workloads.md` | `0.1.0-proposed` | Tech + QA | Tech | `NOT_REVIEWED` | — | Tool/timing/repetition còn TBD | Tech review lượt 1 |
| `m0-benchmark-workloads.md` | `0.1.0-proposed` | Tech + QA | QA | `NOT_REVIEWED` | — | Variance/invalid-run/sample count còn TBD | QA review lượt 2 |
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | Tech | `NOT_REVIEWED` | — | Validator/checksum command chưa có | Tech review lượt 1 |
| `m0-evidence-schema.md` | `0.1.0-proposed` | Tech + QA | QA | `NOT_REVIEWED` | — | Schema/link validation chưa chạy | QA review lượt 2 |
| `m0-stop-rules.md` | `0.1.0-proposed` | Tech + QA | Tech | `NOT_REVIEWED` | — | Cleanup/tool feasibility chưa duyệt | Tech review lượt 1 |
| `m0-stop-rules.md` | `0.1.0-proposed` | Tech + QA | QA | `NOT_REVIEWED` | — | Resume/invalid semantics chưa duyệt | QA review lượt 2 |
| Evidence/stop/privacy scope | `0.1.0-proposed` | Privacy + Security | Privacy + Security | `NOT_REVIEWED` | — | Artifact allowlist/retention/isolation cần thẩm quyền | Trước thu evidence thật |

Nếu dự án chỉ có một người, người đó phải ghi rõ đang đội hai vai và thực hiện Tech review rồi QA review ở hai lượt riêng. Không giả tên/chữ ký chuyên gia. Clinical không cần review cho benchmark kỹ thuật M0; mọi clinical content/decision vẫn ngoài scope và `REQUIRED` nếu phát sinh.

## T-M0-001 và negative constraints V1

- T-M0-001 đạt acceptance: path/commit/map/register/gap analysis có bằng chứng source; V1 không đổi.
- Hai BLOCKER V1 chỉ cấm reuse nguyên trạng: CDN runtime và raw landmark/blink series vượt boundary.
- Negative constraints đưa vào readiness: cấm missing→`0`, cấm auto-allow camera thay product consent, cấm uncalibrated numeric distance, cấm raw payload/hidden network và cấm reuse storage không recovery.

## Readiness rule

T-M0-002 chỉ chuyển `READY` khi đồng thời:

1. Tech review và QA review riêng đều `APPROVED`; Privacy/Security không còn blocking comment về evidence/stop rules.
2. Target profile/version và mapping plan được khóa; observed machine được gán trước workload tương ứng.
3. Tool/method/warm-up/duration/repetition/sample/variance/overhead tolerance được khóa trước khi xem result.
4. Evidence schema, artifact allowlist, checksum/provenance, retention và invalid-run rules được duyệt.
5. Không còn assumption được ghi như fact; mọi command chưa tồn tại vẫn ghi “chưa xác minh”.

Cho đến khi đủ năm điều kiện: **không thực hiện T-M0-002, T-M0-003 hoặc application code**.

