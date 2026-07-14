# Feature 012 — M2 Work Companion MVP

```yaml
decision_status: proposed
release_scope: m2
owner: product-owner
review: { product: required, privacy: required }
```

## Outcome

Work Companion local-first chạy timer-only end-to-end: chọn mode, chạy/pause/resume/finish session, nhận nudge không spam, khôi phục session dở dang và xem Session Summary trung thực.

## Invariant

- Session không phụ thuộc camera; camera thiếu là `NOT_MEASURED`.
- Domain policy không import Electron/SQLite/DOM/clock thật.
- Unknown/low confidence abstain, không tạo intervention severity cao.
- Không lưu raw frame/video/landmark hoặc raw time series.
- Summary không diagnosis, không coi missing là compliant.
