# Feature 006 — Work Companion and Nudge Policy

```yaml
decision_status: proposed
release_scope: m2
owner: product-owner
review: { product: required, privacy: required }
```

## Outcome

Người dùng bắt đầu một phiên làm việc ngay cả khi camera tắt, nhận nhắc nghỉ/khoảng cách có lý do và có thể snooze/dismiss. Hệ thống không biến thành công cụ ép tuân thủ.

## In scope

Session state, task type, optional pulse check, break deficit, near episode input, nudge ladder, cooldown, quiet/deep-focus mode, feedback và session summary.

## Out of scope

Productivity surveillance, app-content capture, keystroke tracking, employer visibility và automatic system-setting changes.

## Requirements

- `FR-CMP-001`: Session bắt đầu/tiếp tục khi camera tắt; metric camera là `NOT_MEASURED`.
- `FR-CMP-002`: Nudge có `reasonCode`, evidence scope, suggested action, policyVersion.
- `FR-CMP-003`: Low confidence/unknown không tạo high-severity nudge.
- `FR-CMP-004`: Policy tôn trọng quiet/deep-focus/meeting mode và cooldown.
- `FR-CMP-005`: User có snooze, dismiss, disable-by-type và stop session.
- `FR-CMP-006`: Dismiss thường xuyên không tự tăng severity hoặc hạ health/comfort boundary.
- `FR-CMP-007`: Feedback chỉ cập nhật timing/content/cooldown trong bounded config; có reset và version.
- `FR-CMP-008`: Session summary consumer idempotent; restart/retry không tạo summary/nudge trùng.
- `FR-CMP-009`: Summary ghi valid coverage, missing reason, interventions và responses; không coi missing là compliant.

## State

```text
IDLE → ACTIVE ↔ PAUSED → COMPLETING → COMPLETED
                ↘ RECOVERY_REQUIRED
```

Camera/pulse check là substate độc lập và không sở hữu lifecycle session.

