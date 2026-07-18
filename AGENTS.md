# Hướng dẫn tác nhân — EyeMate V2

## Phạm vi và nguồn sự thật

- Repository V2: `F:\eyemate-desktop`.
- V1: `F:\dry-eye-app` chỉ đọc; không sửa, không commit, không sao chép mù quáng kiến trúc hay hành vi.
- M3 đã đạt `ENGINEERING_COMPLETE_WITH_LIMITATIONS`; Electron là desktop shell đã được chấp nhận tại `ADR-003`. Không mở M4 hoặc mở lại Electron/Tauri nếu chưa có objective/evidence mới được phê duyệt.
- Dùng theo thứ tự: Git thực tế → `PROJECT_STATUS.md` → spec/acceptance/task hiện hành → code/test → `GOVERNANCE.md` → `MASTER_SPEC.md` → ADR accepted.
- Đọc `docs/` và `specs/` theo feature đang làm; không dùng chat hay V1 làm nguồn sự thật cho behavior V2.

## M3 extension

- Current milestone: **M3 — Personal Intelligence, Trends & Reports**. Read `specs/013-m3-personal-intelligence/` after `PROJECT_STATUS.md`.
- Continue M3 as a local-only vertical slice: typed aggregate source → baseline/pattern/VLI → daily/weekly report → preview/export → reset/delete → Electron smoke.
- Preserve M1/M2 snapshots. Legacy rows without safe aggregate provenance must remain `UNKNOWN`/partial; do not infer camera or symptom values.

## Resume và thực thi liên tục

1. Bắt đầu bằng `git status --short`, `git diff --stat`, `git diff --check`, `git log --oneline -10`, rồi đọc `PROJECT_STATUS.md` và task hiện hành.
2. Nếu có diff, review, xác định task sở hữu và tiếp tục task đó. Không reset, stash, discard hoặc ghi đè thay đổi không rõ nguồn gốc.
3. Mỗi task nhỏ: implement → test phù hợp → review diff → `git diff --check` → commit có chủ đích.
4. Sau task PASS, tự đọc task sẵn sàng theo dependency và tiếp tục ngay. Không chờ xác nhận commit thông thường, không báo cáo từng task.
5. Cập nhật `PROJECT_STATUS.md` theo batch, blocker hoặc milestone; gộp vào task commit khi phù hợp.
6. Checkpoint/report chỉ khi: tối đa 5–10 commit, blocker thật, xung đột safety/privacy/data, cần quyền owner, hoặc M1 hoàn tất.

## Quyền tự chủ M2

- Được tạo/sửa code, UI, test, fixture, harness, docs và dependency repo-local cần thiết trong V2; chạy npm install/build/test/package local; tạo SQLite fixture; chạy Electron local; commit nhỏ.
- Dependency mới phải có requirement, module owner, license, hành vi network, ảnh hưởng build và đường thay thế/gỡ bỏ được ghi trong task hoặc package metadata.
- Được triển khai camera mock/denied/unavailable; camera thật chỉ với action/consent rõ ràng và theo ADR-004.

## Phải dừng hỏi owner

- Sửa V1; cần Administrator hoặc system setting/toolchain ngoài phạm vi đã cho phép; signing/Store/public upload; cloud/account/telemetry; dữ liệu hoặc pilot người thật; clinical approval; thay đổi lớn consent/retention/data ownership; hoặc spec/acceptance/privacy/safety mâu thuẫn.
- Cũng dừng nếu cần camera thật mà chưa có quyền rõ ràng, hoặc evidence mâu thuẫn khiến không thể chọn hành vi an toàn.

## Kiến trúc M2

- Modular monolith + ports/adapters: `app-shell`, `onboarding-consent`, `safety`, `symptom-checkup`, `measurement-quality`, `camera`, `distance`, `reports`, `user-data`, `platform-electron`.
- Domain không import Electron, DOM, MediaPipe, ONNX hoặc SQLite. Renderer không gọi SQLite/camera SDK trực tiếp. Preload chỉ cung cấp API hẹp, typed và allowlist.
- Không event bus tổng quát, plugin system, microservice hoặc cloud abstraction.
- `contextIsolation` phải bật; `nodeIntegration` phải tắt.

## Invariant safety và privacy

- Local Only mặc định; không account, cloud, telemetry hay CDN cho asset bắt buộc.
- Không persistence/log/evidence raw frame, video, landmark, pixel buffer hoặc raw per-frame series; camera raw chỉ RAM.
- `UNKNOWN`, `NOT_MEASURED`, `INSUFFICIENT_DATA` không được biến thành bình thường/0/PASS.
- Không claim diagnosis, disease probability, treatment, camera xác nhận bệnh hoặc “không có vấn đề”.
- Camera denied/unavailable không chặn survey-only. Quality rejected phải abstain.
- Export cần preview; delete phải báo `DELETED`, `PARTIALLY_DELETED` hoặc `FAILED` trung thực.
- Chặn traversal, symlink/junction escape và Windows case collision ở mọi path nhận từ ngoài.

## Giới hạn đã biết

- Dynamic WPR egress/auto-update: `UNKNOWN / DEFERRED_M0_LIMITATION` do `0xc5585011`; không retry WPR/elevation/policy. Static scan không chứng minh “không egress”.
- ADR-004 vẫn proposed: chưa chọn runtime/model camera; không dùng CDN fallback.
- File-symlink integration M0: `SKIP (EPERM)`, phải chạy lại trước benchmark chính thức.

## Lệnh M2 chuẩn

Chỉ thêm lệnh vào đây sau khi tồn tại và đã chạy thành công trong `package.json`. Không bịa lệnh app/camera/package.

## Definition of Done M2

- Timer-only Work Companion end-to-end có session lifecycle/recovery, nudge policy/cooldown/quiet mode, Session Summary và delete coverage.
- Camera missing/unknown degrade trung thực; raw camera data không persistence/log/evidence.
- Canonical verify, Electron acceptance và staged internal MSIX smoke pass; V1 không đổi.
- Có thể là `ENGINEERING_COMPLETE_WITH_LIMITATIONS`, chưa `PUBLIC_READY` nếu camera thật, clinical, encryption, signing hoặc dynamic egress còn UNKNOWN/TBD.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **eyemate-desktop** (2754 symbols, 4540 relationships, 184 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/eyemate-desktop/context` | Codebase overview, check index freshness |
| `gitnexus://repo/eyemate-desktop/clusters` | All functional areas |
| `gitnexus://repo/eyemate-desktop/processes` | All execution flows |
| `gitnexus://repo/eyemate-desktop/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
