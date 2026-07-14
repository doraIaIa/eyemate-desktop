# Feature 001 — Onboarding and Consent

```yaml
decision_status: proposed
release_scope: m1
owner: product-owner
review: { privacy: required, product: required }
```

## Problem

Người dùng cần hiểu EyeMate làm gì, không làm gì và camera/dữ liệu được xử lý thế nào trước khi cấp quyền. Permission của hệ điều hành không đủ để thể hiện consent theo purpose.

## In scope

- Intended-use/limitation introduction.
- Local Only mặc định.
- Consent camera tách biệt, có thể bỏ qua/rút lại.
- Permission request chỉ sau hành động rõ ràng.
- Trạng thái onboarding có thể resume.

## Out of scope

Account, cloud backup, enterprise enrollment, marketing consent và share link.

## Requirements

- `FR-ONB-001`: Hiển thị intended use và non-goals trước checkup đầu tiên.
- `FR-ONB-002`: Local Only là mặc định; không yêu cầu tài khoản.
- `FR-ONB-003`: Camera consent tách khỏi điều khoản chung và OS permission.
- `FR-ONB-004`: Consent record gồm purpose, scope, textVersion, decision, decidedAt.
- `FR-ONB-005`: Người dùng bỏ qua/rút camera vẫn dùng survey-only và companion không camera.
- `FR-ONB-006`: Chỉ gọi OS camera permission sau thao tác chủ động “Bật camera”.
- `FR-ONB-007`: Privacy text thay đổi thuộc scope camera phải tạo version mới và yêu cầu consent lại trước lần camera tiếp theo.
- `FR-ONB-008`: Onboarding resume từ bước an toàn sau restart; không tự suy consent.
- `FR-ONB-009`: UI giải thích raw frame/video không lưu trong luồng mặc định và nêu dữ liệu aggregate nào có thể lưu.

## State

```text
NOT_STARTED → INTRO_SEEN → PRIVACY_SEEN → CAMERA_DECIDED → COMPLETE
                                    ↘ CAMERA_PERMISSION_DENIED
```

Consent `UNKNOWN` không đồng nghĩa `DENIED`, nhưng cả hai đều không cho phép mở camera.

## Failure/edge cases

- OS permission denied/permanently denied.
- Camera unavailable dù consent đã có.
- Consent record write thất bại: không mở camera; cho retry hoặc tiếp tục không camera.
- Text version không load: không dùng bản fallback không version.

