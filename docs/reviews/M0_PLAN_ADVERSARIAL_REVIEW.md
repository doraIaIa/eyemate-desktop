# M0 Plan Adversarial Review

```yaml
decision_status: confirmed
release_scope: m0
owner: technical-lead-review
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
review_scope: documentation-only
```

## Kết luận

**CONDITIONALLY READY cho T-M0-001 ở chế độ read-only; không READY để viết code.**

Sau khi sửa, không còn BLOCKER trong bộ tài liệu M0. Tuy nhiên source V1 chưa được cung cấp và người dùng chưa xác nhận chính thức rằng V1 không tồn tại. T-M0-001 chỉ được bắt đầu sau khi người dùng cung cấp đường dẫn V1 thật hoặc xác nhận `V1_NOT_PROVIDED`. Không thực hiện T-M0-001 trong change set review này.

## Phạm vi và bằng chứng đã đọc

- Đã đọc toàn bộ nguồn chuẩn tắc được yêu cầu: root documents, `AGENTS.template.md`, `docs/product`, `docs/domain`, `docs/data`, `docs/privacy`, `docs/safety`, `docs/architecture`, `docs/validation`, `docs/operations`, `docs/requirements`, bốn feature specs liên quan và toàn bộ `specs/000-m0-architecture-poc`.
- Repo V2 quan sát được tại `F:\eyemate-desktop` chỉ có tài liệu; không có application source, manifest, lockfile, CI, test hoặc build/package command.
- Đã tìm source EyeMate V1 trong workspace hiện tại và cấp gốc ổ F; không tìm thấy. Chuỗi `V1_SOURCE_PATH` là placeholder, không phải đường dẫn đọc được.
- Không cài dependency, không chạy migration/build/test, không đổi `AGENTS.template.md`, không viết application code.

## Tổng hợp mức độ trước và sau sửa

| Mức độ | Trước sửa | Đã sửa | Còn mở |
|---|---:|---:|---:|
| BLOCKER | 2 | 2 | 0 |
| HIGH | 8 | 8 | 0 |
| MEDIUM | 4 | 1 | 3 |
| LOW | 2 | 0 | 2 |

## Bảng phát hiện

| ID vấn đề | Mức độ | File và section | Mô tả | Hậu quả nếu không sửa | Cách sửa | Requirement/acceptance ảnh hưởng | Trạng thái |
|---|---|---|---|---|---|---|---|
| `M0-REV-001` | BLOCKER | `plan.md` — toàn tài liệu | Không có bảng requirement → acceptance → task → evidence. | Requirement/acceptance bị bỏ quên; không thể review coverage. | Thêm bảng traceability cho toàn bộ ID M0 và chặn M1–M5 scope creep. | Toàn bộ `*-M0-*`, `AC-M0-*` | Đã sửa |
| `M0-REV-002` | BLOCKER | `tasks.md` — T-M0-001 | T-001 phụ thuộc V1 nhưng không có nhánh kết quả khi source không tồn tại, thiếu stop condition và phạm vi chỉ đọc chưa đủ chặt. | Có thể dựng V2 theo giả định hoặc vô tình sửa/chạy V1. | Định nghĩa `V1_NOT_PROVIDED`, root/path/commit evidence, do-not-modify, command read-only và stop condition. | `VAL-M0-001`, `AC-M0-013` | Đã sửa; chờ user xác nhận path/absence |
| `M0-REV-003` | HIGH | `acceptance.md` — scenarios | Clean startup và camera bị rút khi đang chạy chưa có acceptance riêng. | Happy path che lỗi lifecycle/restart/resource leak. | Thêm `AC-M0-016`, `AC-M0-017`. | `FR-M0-002`, `NFR-M0-001`, `REL-M0-002` | Đã sửa |
| `M0-REV-004` | HIGH | `acceptance.md` — `AC-M0-007` | Raw-data leakage bị gộp DB/log/crash/telemetry/temp trong một scenario. | Một sink có thể không được kiểm tra nhưng acceptance vẫn bị hiểu là đạt. | Tách DB/backup (`AC-M0-018`) và log/crash/telemetry/temp (`AC-M0-019`). | `DATA-M0-001`, `PRIV-M0-001`, `SEC-M0-001` | Đã sửa |
| `M0-REV-005` | HIGH | `plan.md` — Existing evidence/Proposed design | Fact, fact chưa quan sát, assumption, proposal và decision chưa được tách thành bảng rõ. | Assumption dễ bị dùng như codebase evidence. | Thêm bảng phân loại mức độ chắc chắn và giữ path/module đề xuất là proposed. | `VAL-M0-001`, `D-003` | Đã sửa |
| `M0-REV-006` | HIGH | `plan.md` — Rollout | Chưa có lifecycle/retention/cleanup rõ cho candidate, package, certificate, DB và evidence. | POC để lại process/package/data hoặc xóa mất evidence ADR. | Thêm artifact lifecycle table, `REL-M0-005`, `AC-M0-021`, T-M0-012. | `REL-M0-005`, `AC-M0-021` | Đã sửa |
| `M0-REV-007` | HIGH | ADR-003 — Decision drivers | Thiếu ma trận bắt buộc về Store constraints, debugging, maintenance, migration effort và V1 reuse theo file thật. | Chọn shell bằng nhận xét thiếu hoặc thiên lệch. | Thêm decision matrix với trạng thái PASS/FAIL/NOT_EVALUATED/NOT_APPLICABLE. | `FR-M0-001`, `REL-M0-001`–`004`, `VAL-M0-001` | Đã sửa |
| `M0-REV-008` | HIGH | ADR-004 — Decision | Camera ownership/lifecycle, adapter output prohibition, test seams và error taxonomy chưa đủ rõ. | Rò raw payload, cleanup không idempotent, test chỉ demo happy path. | Thêm owner/state machine, output allowlist, typed errors, mocks/spies và hardware acceptance. | `FR-M0-002`–`004`, `PRIV-M0-001`, `AC-M0-002`–`007`, `014`–`019` | Đã sửa |
| `M0-REV-009` | HIGH | `tasks.md` — toàn tài liệu | Task thiếu do-not-modify/stop condition; camera và storage gộp cho hai shell; scaffold quá rộng. | PR khó review, scope creep và so sánh không công bằng. | Chia 12 task outcome nhỏ; tách candidate camera/storage/package/measurement/cleanup. | Toàn bộ M0 | Đã sửa |
| `M0-REV-010` | HIGH | `spec.md`, ADR-003 | Windows chỉ nói chung; thiếu Windows 11/Store feasibility requirement và acceptance. | MSIX demo có thể không phản ánh Store/OS constraint. | Thêm `NFR-M0-003`, `REL-M0-004`, `AC-M0-020`, T-M0-009. | Các ID vừa nêu | Đã sửa |
| `M0-REV-011` | MEDIUM | `spec.md` — `VAL-M0-001` | Cụm “raw data” có thể bị hiểu là raw camera data, mâu thuẫn privacy invariant. | Reviewer hiểu sai artifact được phép lưu. | Đổi thành raw benchmark samples kỹ thuật, nêu rõ không phải raw sensor. | `VAL-M0-001`, `PRIV-M0-001` | Đã sửa |
| `M0-REV-012` | MEDIUM | Repo/V1 evidence | Chưa có đường dẫn source V1 thật hoặc xác nhận không có V1. | Không thể chấm reuse/migration effort; ADR-003 còn `NOT_EVALUATED`. | Owner cung cấp path/commit hoặc xác nhận `V1_NOT_PROVIDED`. | `D-003`, `VAL-M0-001`, `AC-M0-013` | Còn mở — repository owner |
| `M0-REV-013` | MEDIUM | `spec.md` metadata | Tài liệu có `decision_status: proposed` ở cấp file; từng requirement chưa có field status máy đọc riêng. | Automation sau này khó phân biệt confirmed/proposed theo từng ID. | Sau scaffold, bổ sung requirements register machine-readable theo `docs/requirements/requirements-register.md`. | Toàn bộ M0 | Còn mở — Tech + Governance; không chặn T-001 |
| `M0-REV-014` | MEDIUM | `plan.md`/tasks — command | Verification command vẫn là placeholder vì repo không có manifest. | Không thể chứng minh DoD hoặc tạo `AGENTS.md`. | T-M0-003 tạo command registry và ghi command đã chạy thật; trước đó cấm báo verified. | Toàn bộ acceptance implementation | Còn mở — Tech; không chặn T-001 read-only |
| `M0-REV-015` | LOW | Các tài liệu M0 | Một số thuật ngữ Anh–Việt như “safe aggregate”, “fixture”, “sink” chưa có glossary M0. | Tăng chi phí đọc, không đổi behavior. | Chuẩn hóa khi glossary cập nhật; giữ code token/enum bằng tiếng Anh. | Không trực tiếp | Còn mở — Documentation owner |
| `M0-REV-016` | LOW | `docs/requirements/requirements-register.md` | Register cấp cao chưa liệt kê dải ID M0 mới. | Inventory tổng thể chưa phản ánh M0, dù traceability cục bộ đã đủ. | Cập nhật cùng change set governance sau khi plan được duyệt. | Toàn bộ M0 | Còn mở — Governance owner |

## Kiểm tra deliverable

| Deliverable | Tồn tại | Kết quả review |
|---|---:|---|
| `specs/000-m0-architecture-poc/spec.md` | Có | Đã bổ sung Windows 11/Store/cleanup requirements và loại mơ hồ “raw data” |
| `specs/000-m0-architecture-poc/acceptance.md` | Có | Đã phủ 21 scenario, gồm các nhóm bắt buộc |
| `specs/000-m0-architecture-poc/plan.md` | Có | Đã tách evidence/assumption/proposal/decision, artifact lifecycle và traceability |
| `specs/000-m0-architecture-poc/tasks.md` | Có | Đã chia task, thêm do-not-modify, verification, evidence và stop condition |
| ADR-003 | Có; `proposed/tbd` | Không chọn Electron/Tauri; ma trận evidence đầy đủ |
| ADR-004 | Có; `proposed/tbd` | Không chọn runtime/model; lifecycle/privacy/test seam rõ |

## Traceability audit

- Không phát hiện ID M0 mới trùng với ID nguồn.
- Mỗi requirement M0 có ít nhất một acceptance, task và expected evidence trong bảng `plan.md`.
- Mỗi `AC-M0-001`–`AC-M0-021` được gắn task trực tiếp hoặc qua requirement mapping; evidence register ghi trạng thái chưa xác minh.
- Không requirement M1–M5 được đưa vào implementation scope. `FR-CAM-*` và `FR-DST-*` chỉ cung cấp semantics/constraint cho POC.
- ADR-003 và ADR-004 vẫn `proposed/tbd`, đúng gate governance.

## Source V1

**Source V1 chưa được audit.** Không có file/module/config V1 nào để dẫn chứng. Artifact còn thiếu chính xác là một đường dẫn filesystem hoặc repository URL/ref thật thay cho placeholder `V1_SOURCE_PATH`, kèm quyền đọc và commit/ref nếu là Git repo. Khi thiếu artifact này, mọi tiêu chí reuse/migration trong ADR-003 phải là `NOT_EVALUATED`, không được cho điểm 0 hoặc suy đoán.

## T-M0-001 chính xác làm gì

T-M0-001 chỉ:

1. Xác minh root/path/commit và trạng thái read-only của repo V2/V1.
2. Lập repository map bằng file thật.
3. Nếu có V1, đọc `package.json`, lockfile, entrypoint/main/preload, camera pipeline, model/WASM path, storage, scripts, CI và tests; mỗi phát hiện dẫn file/module/config.
4. Nếu không có V1, ghi `V1_NOT_PROVIDED`, root đã tìm và artifact cần cung cấp.
5. Cập nhật evidence sections; không chạy command implementation.

T-M0-001 không:

- viết/scaffold application code;
- cài dependency, build/package, chạy test hoặc migration;
- sửa source V1;
- chọn Electron/Tauri/runtime/encryption;
- đổi `AGENTS.template.md` thành `AGENTS.md`;
- bắt đầu T-M0-002 hoặc bất kỳ POC implementation nào.

## Owner decisions còn mở

- Repository owner: cung cấp V1 path/ref hoặc xác nhận `V1_NOT_PROVIDED` trước T-M0-001.
- Tech + QA: device profiles, benchmark protocol và trọng số (`D-008`).
- Tech: shell (`D-003`) sau POC, không phải bây giờ.
- Security + Tech: encryption (`D-006`) sau feasibility evidence.
- Release/Security: Windows CI runner, MSIX identity/test certificate và artifact retention.
- Measurement/Validation: runtime/model/license và distance quality goal (`D-009`).

## Readiness rule

- Hiện tại: **CONDITIONALLY READY** cho T-M0-001 read-only vì còn quyết định path/absence V1 ảnh hưởng trực tiếp task.
- Nếu user cung cấp path V1 thật hoặc xác nhận `V1_NOT_PROVIDED`: T-M0-001 trở thành **READY** theo scope/acceptance/verification đã định nghĩa.
- Không có trạng thái nào trong review này cho phép bắt đầu application code.
