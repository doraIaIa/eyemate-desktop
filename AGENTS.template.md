# AGENTS.md template

> Chỉ đổi tên thành `AGENTS.md` sau khi repository V2 được scaffold và các command bên dưới đã chạy thật. Không điền command hoặc đường dẫn dự đoán.

## Project purpose

EyeMate là desktop app local-first hỗ trợ visual comfort/workload. Không chẩn đoán hoặc điều trị. Camera tùy chọn; raw frame không được lưu trong luồng mặc định.

## Source-of-truth map

- Product/claims: `docs/product/`
- Safety: `docs/safety/`
- Domain/data/privacy: `docs/domain/`, `docs/data/`, `docs/privacy/`
- Feature behavior/acceptance: `specs/<feature>/`
- Architecture decisions: `docs/architecture/adr/`
- Master map: `MASTER_SPEC.md`

## Repository map

<!-- Điền sau scaffold; chỉ ghi thư mục thực tế và trách nhiệm. -->

## Required commands

```bash
# Điền command đã chạy thật:
# install
# lint
# typecheck
# unit
# integration
# acceptance
# architecture checks
# build/package
```

## Architecture invariants

- Domain không import UI, desktop shell, camera SDK hoặc database.
- UI không gọi database/camera adapter trực tiếp.
- Missing/unknown/not-measured không thành zero/normal.
- Raw frame/landmark không persistence/log/telemetry.
- Breaking contract cần migration/ADR/version.

## Working rules

- Đọc spec, acceptance, plan và task được chỉ định trước khi sửa.
- Báo xung đột; không tự chốt `tbd/proposed`.
- Chỉ sửa phạm vi task; dependency/schema/claim/retention mới cần review.
- Test đi cùng behavior; không disable test để CI xanh.
- Không copy toàn bộ docs vào prompt/context.

## Definition of done

Theo `GOVERNANCE.md`; bổ sung command thực tế và project-specific checks tại đây.

