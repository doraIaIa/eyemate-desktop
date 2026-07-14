# M0 Progressive Assurance Decision

```yaml
decision_status: confirmed
release_scope: m0
owner: project-owner
review: { product: approved, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
related: [D-014, VAL-M0-001, NFR-M0-001, NFR-M0-002, PRIV-M0-001, SEC-M0-001]
```

## Quyết định `D-014`

M0 chuyển từ approval-gated readiness sang **progressive assurance**. Ba review đã commit là bằng chứng rủi ro lịch sử, không còn là điều kiện yêu cầu `APPROVED` trước khi xây chính harness, scanner, validator và fixture mà chúng yêu cầu. Quyết định này không làm yếu raw-data prohibition, consent, offline, fairness hoặc immediate-stop rule.

## Project-owner decisions cho POC đầu tiên

- Chỉ `DP-DEV` là profile bắt buộc; `DP-MIN`, `DP-TYP`, `DP-HIGH`, `DP-EDGE` hoãn đến trước external validity hoặc pilot.
- Mỗi workload dry-run ban đầu có ba planned repetitions; không xóa outlier hoặc thay run thất bại bằng rerun im lặng; báo riêng `VALID`, `INVALID`, `ABORTED`, `FAILED`.
- Chưa có performance pass/fail threshold trước baseline. Hai candidate phải dùng cùng machine, camera, resolution, power mode, local assets, workload version và measurement method.
- Measurement overhead được đo bằng control/no-op run trước benchmark so sánh; run đó không được dùng làm benchmark result.
- Provenance M0 gồm Git commit, dirty-worktree flag, SHA-256 manifest, UTC timestamp, workload/schema/tool version. Protected attestation và immutable storage hoãn đến trước external pilot/public release.
- Benchmark artifact local giữ tối đa 30 ngày hoặc xóa sớm theo yêu cầu người dùng. Đây là policy M0 tạm thời, không thay retention/deletion final của sản phẩm.
- KHÔNG ĐƯỢC lưu raw frame, video, raw landmark, exact per-frame series, symptom hoặc health data thật. Chỉ synthetic negative fixtures được phép.
- Scanner, scrubber, validator, negative fixtures, checksum-manifest generator, tool inventory và egress inspection là deliverable M0; không phải prerequisite có sẵn.

## Reclassification gate

| Nhóm | Điều kiện | Thời điểm phải đóng | Trạng thái hiện tại |
|---|---|---|---|
| A | Privacy/safety invariant, V1 read-only, artifact denylist, stop rule, fairness contract | Trước code | Đã có; vẫn là immediate stop |
| B | Validator/scanner/scrubber, synthetic negative fixtures, tool inventory, egress inspection, checksum manifest | Trong M0 implementation | T-M0-003 bắt đầu bằng validator + fixture |
| C | Timing, warm-up, repetitions cuối, variance, overhead tolerance, tool equivalence, workload dry-run | Trước benchmark chính thức | TBD có owner; không chặn tooling |
| D | Retention final, protected attestation, immutable storage, multi-device external validity | Trước pilot/public release | Hoãn có chủ đích |

## Review cadence

Không tạo thêm readiness/adversarial review trước mỗi task. Review milestone bằng Sol chỉ diễn ra sau khoảng 3–5 task nhỏ hoặc khi đã có harness, validator, scanner, fixture và dry-run artifact thật. Privacy/Security review lại trước camera/network benchmark thật.

