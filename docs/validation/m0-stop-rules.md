# M0 Benchmark Stop Rules

```yaml
decision_status: proposed
release_scope: m0
owner: tech-lead + qa-owner
review: { product: not-required, clinical: not-required, privacy: required, security: required }
last_reviewed: 2026-07-14
related: [PRIV-M0-001, SEC-M0-001, DATA-M0-002, NFR-M0-002, REL-M0-001, VAL-M0-001]
```

## Nguyên tắc

Stop rule áp dụng trước performance comparison. Không loại candidate bằng threshold hiệu năng khi chưa có baseline, trừ hard limit của máy thử đã được Tech + QA ghi trước run. Trạng thái được ghi theo ba chiều trong evidence schema: `executionStatus=ABORTED` khi sequence dừng sớm, `validity=INVALID` khi protocol/evidence không hợp lệ, và `outcome=FAILED` chỉ khi một acceptance/correctness rule có đủ evidence và không đạt. Không dùng ba từ này thay thế lẫn nhau; không xóa evidence an toàn về việc dừng.

Mỗi stop event PHẢI ghi `ruleId`, `detector/methodVersion`, trigger đã quan sát, timestamp, candidate, planned slot/attempt, artifact reference/checksum, action/cleanup result, owner và pair effect. Nếu trigger không quan sát được bằng method đã khóa hoặc artifact bắt buộc thiếu, run là `INVALID`; reviewer không được kích hoạt stop rule hồi tố chỉ từ nhận xét định tính.

## Catalogue

| Rule ID / loại / mức | Trigger và evidence | Immediate action / cleanup | Owner / resume condition | Effect on run / candidate / ADR |
|---|---|---|---|---|
| `VAL-M0-STOP-001` Safety/privacy — BLOCKER | Raw frame/video/landmark bị persist; scan/path/checksum hoặc quan sát sink xác nhận | Dừng process/camera; cô lập artifact, thu hồi quyền; không copy vào evidence tree; scrub chỉ trên bản sao được Privacy cho phép | Privacy + Security; resume sau root-cause fix, regression scan và phê duyệt | Run `INVALID`; candidate blocked; ADR không được quyết định |
| `VAL-M0-STOP-002` Safety/privacy — BLOCKER | Raw camera data trong log/crash/telemetry/temp | Dừng collection/upload, cô lập artifact, xóa bản phát tán theo incident record | Privacy + Security; resume sau sink allowlist và zero-finding rerun | Run `INVALID`; candidate blocked; ADR blocked |
| `VAL-M0-STOP-003` Safety/privacy — BLOCKER | Camera mở khi chưa có product consent trong flow mô phỏng consent | Stop track/model, ghi code không chứa user data | Privacy + Product; resume sau consent gate test đạt | Run `INVALID`; candidate blocked; ADR blocked dù OS permission có |
| `VAL-M0-STOP-004` Technical/privacy — BLOCKER | Workload offline có CDN/network attempt ngoài allowlist rỗng; network trace | Chặn request, stop runtime, giữ trace đã scrub | Security + Tech; resume sau local asset fix và trace sạch | Run `INVALID`; candidate fail offline gate; ADR không chọn candidate |
| `VAL-M0-STOP-005` Safety/data — BLOCKER | Migration mất/corrupt data synthetic, backup hỏng/không nhất quán với SQLite WAL, copy riêng file DB khi WAL active, hoặc recovery không hoạt động | Khóa write, dừng app, giữ backup/DB/WAL/SHM fixture nguyên trạng | Data + Release; resume sau backup method versioned, recovery fixture đạt và integrity review | Run `ABORTED`; candidate blocked; ADR blocked |
| `VAL-M0-STOP-006` Validity — BLOCKER | Candidate dùng workload/asset/config/camera/resolution khác | Dừng cả cặp comparison; không normalize hậu nghiệm | QA; resume khi hai bên dùng manifest/checksum giống nhau | Run `INVALID`; không kết luận candidate; ADR evidence unusable |
| `VAL-M0-STOP-007` Validity — HIGH | Evidence thiếu commit/dirty flag/device/workload/tool/checksum provenance | Dừng ingest/summary; giữ record invalid | QA; resume bằng rerun có provenance, không điền hồi tố | Run `INVALID`; candidate chưa được chấm; ADR `NOT_EVALUATED` |
| `VAL-M0-STOP-008` Validity — HIGH | Measurement tool/mode khác candidate, hoặc overhead vượt tolerance đã được Tech + QA khóa trước result; nếu tolerance chưa khóa thì không được tạo run `VALID` | Dừng, ghi tool overhead evidence nếu an toàn | Tech + QA; resume sau overhead study và method/tolerance chung được duyệt | Run `INVALID`; candidate comparison paused; ADR `NOT_EVALUATED` |
| `VAL-M0-STOP-009` Technical — HIGH | Resource leak tích lũy qua start/stop: track/process/handle/memory không recovery theo rule đã khóa | Stop repetitions, cleanup process/package/data tạm | Tech; resume sau fix và chạy lại toàn sequence từ đầu | Run `ABORTED`; candidate blocked ở lifecycle; ADR không pass camera |
| `VAL-M0-STOP-010` Technical — BLOCKER | Package/signature/update-data-path không hợp lệ, hoặc normalized payload/content manifest của clean build khác mà không định danh được nguồn nondeterminism | Dừng package/update workload; giữ build/sign logs, normalized manifests và checksums đã scrub | Release + Security; resume sau clean runner rerun đạt hoặc nondeterminism được giải thích và policy duyệt | Run `ABORTED`; candidate fail release gate; ADR blocked. Signed MSIX hash khác chỉ do signing timestamp/metadata đã chứng minh không tự kích hoạt rule này |
| `VAL-M0-STOP-011` Decision — HIGH | Assumption/TBD được trình bày thành verified fact hoặc summary sửa không khớp evidence | Freeze review, đánh dấu summary invalid | Tech + QA; resume sau correction, checksum/index review | Run không đổi nhưng summary `INVALID`; candidate unscored; ADR blocked |
| `VAL-M0-STOP-012` Validity — HIGH | Run thiếu repetition/duration/warm-up, clock/tool lỗi, thermal/power/network mode sai protocol | Stop hoặc loại run theo pre-registered rule | QA; resume bằng rerun đầy đủ | Run `INVALID`; candidate không bị loại; ADR chờ đủ sample |
| `VAL-M0-STOP-013` Technical — HIGH | Camera denied/busy/disconnect gây crash, measurement giả hoặc resource còn giữ | Stop session, cleanup track/model/process | Tech + QA; resume sau scenario regression đạt | Run `ABORTED`; candidate blocked ở workload liên quan; ADR chờ |
| `VAL-M0-STOP-014` Resource/budget — HIGH | Disk/RAM/thermal hard safety limit của máy đã ghi trước run bị vượt | Stop app/tool, bảo toàn evidence đã flush an toàn | Tech + device owner; resume sau cooldown/free-space hoặc profile khác đã duyệt | Run `ABORTED`; không tự loại candidate; ADR ghi limitation |
| `VAL-M0-STOP-015` Decision — HIGH | Weight/decision rule bị thay sau khi xem kết quả hoặc metric khác đơn vị bị cộng thành điểm tùy ý | Freeze matrix, giữ raw evidence | Tech + QA; resume khi weight/rule được duyệt độc lập | Run vẫn có thể valid; matrix invalid; ADR blocked |
| `VAL-M0-STOP-016` Resource/operations — HIGH | Cleanup có nguy cơ xóa evidence bắt buộc, certificate/package owner không rõ hoặc camera/model process còn chạy | Dừng cleanup/destructive step; cô lập resource | Release + QA; resume sau manifest/owner/checksum đầy đủ | Run/cleanup `ABORTED`; candidate archive blocked; ADR không mất evidence |

## Severity và effect

- `BLOCKER`: cấm tiếp tục candidate/ADR cho đến khi resume condition đạt.
- `HIGH`: cấm dùng run hoặc matrix liên quan; có thể tiếp tục công việc tài liệu/diagnostic an toàn.
- Stop rule không phải performance threshold. Baseline metric còn `TBD` không kích hoạt loại candidate.
- Cụm “Run `INVALID`” trong catalogue chỉ đặt `validity=INVALID`; cụm “Run `ABORTED`” đặt `executionStatus=ABORTED`. “Candidate fail/blocked” là gate effect, không tự tạo `outcome=FAILED` cho metric performance. `FAILED` cần acceptance evaluation có evaluator version và evidence refs.
- Mọi slot bị stop vẫn nằm trong run-plan completeness và summary counts; retry tạo attempt mới, không thay slot/attempt cũ.

## Approval

| Tài liệu | Version | Owner | Reviewer role | Decision | Review date | Blocking comments | Next review trigger |
|---|---|---|---|---|---|---|---|
| `m0-stop-rules.md` | `0.1.0-proposed` | Tech + QA | Tech | `CHANGES_REQUIRED` | 2026-07-14 | Cleanup, process-tree attribution, tool overhead tolerance và package/recovery method chưa được dry-run | Sau technical dry-run không thu benchmark result và owner xác nhận resume semantics |
| `m0-stop-rules.md` | `0.2.0-proposed` | Tech + QA | QA | `CHANGES_REQUIRED` | 2026-07-14 | Semantics trạng thái đã tách nhưng detector/tool, threshold/tolerance, cleanup và resume condition chưa dry-run/khóa | Sau positive/negative stop-event fixture và overhead-only dry-run |
| `m0-stop-rules.md` | `0.2.0-proposed` | Tech + QA | Privacy + Security | `NOT_REVIEWED` | — | Cần duyệt incident isolation/retention | Trước run có camera |
