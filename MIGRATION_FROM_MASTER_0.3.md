# Migration from `EYEMATE_V2_MASTER_SPEC.md` 0.3

## Trạng thái file cũ

Giữ nguyên làm historical discovery snapshot. Không xóa vì nó chứa rationale và checklist nguồn. Sau khi bộ tài liệu mới được duyệt, file cũ không còn authority cho behavior hiện hành.

## Các sửa đổi chính

1. Thay hierarchy tuyến tính bằng authority theo loại nội dung.
2. Tách `decision_status`, `release_scope` và `review` thành metadata độc lập.
3. Thu master thành bản đồ dự án; chi tiết chuyển sang nguồn có owner.
4. Thu nhỏ MVP thành M0–M5 với exit criteria.
5. Tách Safety Gate khỏi Symptom Checkup.
6. Tách Camera Quality khỏi Distance.
7. Tách Baseline khỏi Pattern/VLI.
8. Tách Reports/Export khỏi User Data Management.
9. Chuyển release/update khỏi feature người dùng sang operations.
10. Chuẩn hóa requirement taxonomy và acceptance IDs.
11. Cấm silent fallback, missing→zero và content safety rải trong code.
12. Chọn modular monolith; trì hoãn shell/encryption tới POC/ADR.

## Mapping nội dung

| Master 0.3 | Nguồn mới |
|---|---|
| 0, 23, 25 | `GOVERNANCE.md`, `README.md` |
| 1–5 | `MASTER_SPEC.md`, `docs/product/` |
| 6–8 | `specs/` |
| 9 | `docs/domain/` |
| 10–11 | `docs/data/` |
| 12 | `docs/architecture/` |
| 13 | `docs/privacy/` |
| 14 | `docs/architecture/quality-attributes.md`, `docs/operations/` |
| 15–16 | `docs/validation/` và feature specs |
| 17–19 | historical source + `MASTER_SPEC.md` roadmap |
| 20–22 | `MASTER_SPEC.md`, `docs/requirements/`, ADRs |
| 24 | `README.md` structure |

## Việc chưa được phép coi là đã chốt

- Tên thương mại.
- Electron/Tauri.
- Questionnaire/license/bản dịch.
- Clinical owner và Safety content.
- SQLCipher/field-level encryption.
- Baseline readiness.
- Performance và measurement thresholds.
- Retention cuối.

