# Feature 011 — M1 Personal Checkup MVP

```yaml
decision_status: proposed
release_scope: m1
owner: implementation-owner
review: { product: required, clinical: required, privacy: required }
```

## Mục tiêu

Xây dựng ứng dụng Electron local-first chạy Windows cho luồng checkup cá nhân survey-only an toàn. Camera chỉ có state consent/off/denied/unavailable cho đến khi ADR-004 có evidence runtime phù hợp.

## Phạm vi

- Electron app shell, preload bridge hẹp và điều hướng.
- Onboarding, Local Only, consent camera tách riêng và withdrawal.
- Safety Gate deterministic/versioned với catalogue placeholder nội bộ, không claim đã duyệt clinical.
- Questionnaire synthetic/versioned, survey-only checkup, report snapshot, export preview và user-data primitives local.
- SQLite local với migration, backup/recovery, offline core và release-like build.

## Ngoài phạm vi

Cloud, account, telemetry, enterprise, ML thích ứng, camera runtime/model thật, calibration/distance centimet, diagnosis, treatment, public release và M2+.

## Invariant

- `UNKNOWN`, `NOT_MEASURED`, `INSUFFICIENT_DATA` không được map thành normal/zero.
- Không lưu/log raw frame, video, landmark, pixel buffer hoặc raw series.
- Safety Gate chạy trước scoring/camera; survey-only vẫn hoạt động khi camera bị từ chối/không khả dụng.
- Report phải có source, coverage, missing data, action, limitation và provenance/version.

