# EyeMate V2 Documentation

> Bộ nguồn sự thật dùng để thiết kế, triển khai và kiểm chứng EyeMate V2.

## Bắt đầu ở đây

1. Đọc [`MASTER_SPEC.md`](MASTER_SPEC.md) để hiểu sản phẩm, phạm vi và các cổng phát hành.
2. Đọc [`GOVERNANCE.md`](GOVERNANCE.md) trước khi thay đổi requirement, dữ liệu, claim hoặc kiến trúc.
3. Chọn đúng feature trong `specs/`; không giao cho AI hoặc developer nhiệm vụ “xây toàn bộ V2”.
4. Chỉ tạo `plan.md` sau khi đã đọc codebase thực tế. Chỉ tạo `tasks.md` sau khi spec, acceptance và plan được duyệt.
5. Dùng template trong `docs/templates/`; `AGENTS.template.md` chỉ được đổi thành `AGENTS.md` sau khi command/repository map đã được kiểm chứng.

## Trạng thái bộ tài liệu

- Phiên bản: `1.0.0-draft`
- Ngày: `2026-07-14`
- Trạng thái: nền thiết kế đã tái cấu trúc; chưa phải bằng chứng xác thực y tế hoặc kỹ thuật.
- Nguồn lịch sử: `EYEMATE_V2_MASTER_SPEC.md` phiên bản `0.3.0-draft`.

File master cũ là **historical snapshot**, không còn là nguồn để âm thầm thay đổi hành vi. Nội dung chuẩn tắc mới phải nằm trong tài liệu có owner tương ứng ở bộ này.

## Bản đồ tài liệu

| Nhóm | Trả lời câu hỏi | Nguồn chính |
|---|---|---|
| Product | Sản phẩm là gì, phục vụ ai, bản nào làm gì? | `docs/product/` |
| Safety | Sản phẩm được phép kết luận và hướng dẫn đến đâu? | `docs/safety/` |
| Domain | Thuật ngữ và invariant nào không được phá? | `docs/domain/` |
| Feature | Người dùng quan sát được hành vi gì? | `specs/*/spec.md` |
| Acceptance | Làm thế nào chứng minh feature đúng? | `specs/*/acceptance.md` |
| Data | Dữ liệu có nghĩa gì, vòng đời và version ra sao? | `docs/data/` |
| Privacy/security | Thu gì, vì sao, ai thấy, rủi ro nào phải chặn? | `docs/privacy/` |
| Architecture | Boundary và quality attribute nào phải giữ? | `docs/architecture/` |
| Validation | Đo độ chính xác và usability thế nào? | `docs/validation/` |
| Operations | Build, phát hành, migration và recovery thế nào? | `docs/operations/` |
| Governance | Quyết định, review và traceability vận hành thế nào? | `GOVERNANCE.md` |

## Cấu trúc

```text
EyeMate_V2_Documentation/
├── README.md
├── MASTER_SPEC.md
├── GOVERNANCE.md
├── AGENTS.template.md
├── docs/
│   ├── product/
│   ├── domain/
│   ├── data/
│   ├── safety/
│   ├── privacy/
│   ├── architecture/
│   ├── validation/
│   ├── operations/
│   └── requirements/
└── specs/
    ├── 001-onboarding-consent/
    ├── 002-safety-gate/
    ├── 003-symptom-checkup/
    ├── 004-camera-quality/
    ├── 005-distance-monitoring/
    ├── 006-work-companion/
    ├── 007-personal-baseline/
    ├── 008-patterns-visual-load/
    ├── 009-reports-export/
    └── 010-user-data-management/
```

## Quy tắc làm việc tối thiểu

- Không triển khai requirement có `decision_status: proposed` hoặc `tbd` nếu quyết định đó ảnh hưởng behavior.
- Không coi acceptance test là quyền sửa Product Constitution, claim, privacy invariant hoặc data semantics.
- Không hard-code ngưỡng chưa benchmark như sự thật y khoa.
- Không thêm cloud, tài khoản, enterprise hoặc ML chỉ vì “có thể sẽ cần”.
- Không lưu raw frame, video hoặc landmark từng frame trong luồng mặc định.
- Không biến `UNKNOWN`, `NOT_MEASURED` hoặc dữ liệu thiếu thành `NORMAL` hay `0`.
- Mọi thay đổi claim, consent, retention, schema hoặc quyền truy cập cần review riêng.

## Thứ tự triển khai khuyến nghị

1. `M0` — Architecture POC.
2. `M1` — Contest/Checkup MVP.
3. `M2` — Personal pilot và Work Companion.
4. `M3` — Personalization và xu hướng.
5. `M4` — Public release hardening.
6. `M5` — Enterprise, chỉ sau validation và privacy review.
