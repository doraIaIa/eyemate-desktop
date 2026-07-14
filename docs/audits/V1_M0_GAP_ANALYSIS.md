# EyeMate V1 → M0 Gap Analysis

```yaml
decision_status: confirmed
release_scope: m0
owner: tech-lead
source_commit: 77ad32f1b519418d882d2d476f13206644536df9
audit_mode: read-only
```

## Status vocabulary

`SATISFIED`, `PARTIAL`, `MISSING`, `CONFLICTING`, `UNKNOWN`. Static `SATISFIED` không thay acceptance runtime.

## Matrix

| V1 evidence | M0 requirement | Status | Ảnh hưởng POC | Task sau T-M0-001 |
|---|---|---|---|---|
| `E-002/003/024/025` | `FR-M0-001` | PARTIAL | Có Electron/native baseline; Tauri chưa có, reuse cost chưa rõ. | T-M0-002, 004/005, 011 |
| `E-004/006` | `FR-M0-002` | CONFLICTING | Có track cleanup nhưng auto-approve media; error/disconnect thiếu. | T-M0-004/005 |
| `E-011`–`014` | `FR-M0-003` | CONFLICTING | Quality không gate, missing→zero, uncalibrated numeric. | T-M0-004/005 |
| `E-007`–`009` | `FR-M0-004` | CONFLICTING | Local model có nhưng runtime mặc định dùng CDN. | T-M0-004/005/008 |
| `E-016/020` | `DATA-M0-001` | PARTIAL | Aggregate tables có; typed-missing/output contract sai. | T-M0-006/007/008 |
| `E-016`, `U-009` | `DATA-M0-002` | MISSING | Không backup/integrity/recovery; user DB unknown. | T-M0-006/007 |
| `E-010/015/018`, `U-003` | `PRIV-M0-001` | CONFLICTING | Landmark/history vượt boundary; leakage runtime unknown. | T-M0-008 |
| `E-007/008`, `U-002` | `SEC-M0-001` | CONFLICTING | CDN path chứng minh offline core chưa đạt. | T-M0-008 |
| Không harness; `U-001/004/006` | `NFR-M0-001` | MISSING | Không startup/RAM/CPU/p50/p95 evidence. | T-M0-002/010 |
| Chỉ Electron V1 | `NFR-M0-002` | MISSING | Không same-workload hai shell. | T-M0-002/004/005/010 |
| `E-025`, `U-001/005` | `NFR-M0-003` | UNKNOWN | Native Windows có, Windows 11/device evidence không. | T-M0-002/009 |
| `E-022/023` | `REL-M0-001` | MISSING | Packaging dependency/config/CI thiếu. | T-M0-003/009 |
| `E-003/007/008/016` | `REL-M0-002` | CONFLICTING | Prod path có nhưng offline/local asset/clean data path chưa đạt. | T-M0-006/007/009 |
| `E-002/022/023`, `U-004` | `REL-M0-003` | MISSING | Lockfile có; không build record/checksum/toolchain evidence. | T-M0-003/010 |
| `E-022/025`, `U-005` | `REL-M0-004` | MISSING | Không MSIX/Store/signing evidence; native API là constraint. | T-M0-009 |
| `.gitignore`/ignored artifacts | `REL-M0-005` | PARTIAL | Không cleanup manifest/retention/owner. | T-M0-012 |
| `E-001`–`027` | `VAL-M0-001` | PARTIAL | Repo evidence có; POC metrics/matrix chưa có. | T-M0-002–011 |
| `E-011`–`014`, `U-006` | `VAL-M0-002` | CONFLICTING | Numeric uncalibrated, threshold lệch, accuracy unknown. | T-M0-004/005/011 |

## BLOCKER/HIGH

| ID | Mức | Evidence | Phát hiện | Ảnh hưởng |
|---|---|---|---|---|
| `V1-GAP-001` | BLOCKER | `E-007/008` | Camera/ONNX runtime phụ thuộc CDN mặc định. | Không đạt offline/local assets nếu reuse nguyên trạng. |
| `V1-GAP-002` | BLOCKER | `E-010/015` | Landmarks/blink event series vượt adapter/event boundary. | Chặn privacy gate đến khi output/scans đạt. |
| `V1-GAP-003` | HIGH | `E-004/018` | Auto-approve media không gắn versioned product consent. | Denied/consent path không reuse. |
| `V1-GAP-004` | HIGH | `E-011`–`014` | Quality không gate; missing→zero; uncalibrated numeric; threshold lệch. | Chặn reuse measurement semantics. |
| `V1-GAP-005` | HIGH | `E-016/017` | Không migration/backup/recovery; reset bỏ workSessions. | Storage POC phải synthetic/greenfield. |
| `V1-GAP-006` | HIGH | `E-022/023` | Packaging config/dependency, tests và CI thiếu. | Không có release baseline tái sử dụng. |
| `V1-GAP-007` | HIGH | `E-019/020` | Heuristic/risk/diagnosis và missing camera zeros. | Clinical/data V1 không là source of truth. |
| `V1-GAP-008` | HIGH | `E-024/027` | Duplicate/empty legacy modules, thiếu tests. | Maintenance/reuse effort không chắc chắn. |

## Mismatch task/plan/codebase

- Plan cũ ghi V1 chưa có; nay xác nhận `F:\dry-eye-app`.
- V1 dùng Electron không thay `D-003`; Tauri comparison vẫn bắt buộc.
- Local model file không đồng nghĩa offline: resolver/WASM vẫn CDN.
- V1 docs tuyên bố zero-store/offline nhưng runtime code có CDN và landmark event output; code là audit evidence, docs chỉ lịch sử.
- Package scripts tồn tại nhưng task cấm chạy; command validity vẫn UNKNOWN.

Không mismatch nào thay đổi mục tiêu T-M0-001. Không tạo implementation task mới; gap đã ánh xạ T-M0-002–012.

## Completion

T-M0-001 hoàn thành ở mức audit read-only: root/commit/branch/worktree, repository/data/package/test maps và evidence types đã ghi. Không build/test/package/migration/install; không chọn shell/runtime/encryption; V1 không sửa.

T-M0-002 chưa thực hiện. Tech + QA phải duyệt device profiles, workload, evidence schema và stop rule trước khi bắt đầu.
