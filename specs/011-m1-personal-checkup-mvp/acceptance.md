# Acceptance — M1 Personal Checkup MVP

- `AC-M1-001`: Release-like Electron build mở offline, renderer không có Node access và preload chỉ có API allowlist.
- `AC-M1-002`: Onboarding hiển thị intended-use/non-goals/Local Only; bỏ qua camera vẫn vào survey-only checkup.
- `AC-M1-003`: Consent camera không đồng nghĩa OS permission; denied/unavailable không chặn survey-only và không tạo prompt tự động.
- `AC-M1-004`: Safety Gate deterministic có version, trigger dừng scoring/camera; catalogue thiếu tạo safe-stop.
- `AC-M1-005`: Survey synthetic hỗ trợ missing/unsure/prefer-not-to-answer, partial/cancel/restart và không tự hoàn tất checkup.
- `AC-M1-006`: Survey-only report có source `SURVEY_ONLY`, coverage, missing data, action, limitation và snapshot version; không diagnosis/score bệnh.
- `AC-M1-007`: SQLite local CRUD, migration success/failure/recovery, backup và deletion/export preview pass; raw camera sink scan pass.
- `AC-M1-008`: Offline core, lint, typecheck, unit, integration, acceptance, architecture check và build pass; V1 không đổi.

