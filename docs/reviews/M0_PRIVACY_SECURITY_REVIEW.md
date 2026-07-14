# M0 Privacy/Security Readiness Review

```yaml
decision_status: confirmed
release_scope: m0
owner: privacy-security-reviewer
review_role: privacy-security
review_decision: changes_required
reviewed_baseline: 4b5615b12d8f44ac9cedcb9c1c68498a07019c0c
last_reviewed: 2026-07-14
review_scope: documentation-only
```

## Kết luận

**Privacy/Security: `CHANGES_REQUIRED`. Không bắt đầu T-M0-002, T-M0-003, implementation, camera run hoặc benchmark.**

Các invariant cốt lõi đúng hướng: raw frame/video/landmark là RAM-only; không có cloud/account/telemetry upload trong M0; local asset phải fail closed; product consent không được thay bằng OS permission; DB/migration chỉ dùng fixture synthetic; signing production và encryption final vẫn ngoài quyết định. Tuy nhiên readiness chưa đủ an toàn để sinh evidence thật vì scrubber/scanner và negative fixtures chưa tồn tại, retention/access/deletion/quarantine chưa khóa, checksum chưa có lớp bảo vệ provenance, và measurement tool chưa được chứng minh không upload/capture payload.

Lượt review đã sửa sáu HIGH ở mức contract tài liệu: positive artifact allowlist/pre-ingest gate; consent bắt buộc cho mọi camera workload; inventory minimization; synthetic fixture provenance; signing/build evidence minimization; và tool egress/payload-free network trace. Bốn HIGH vẫn mở và chặn approval. Không có căn cứ chọn Electron/Tauri, runtime, encryption hoặc clinical content.

## Phạm vi và negative constraints

- Đọc đầy đủ bốn spec M0, bốn readiness docs, ADR-004, threat model, data contract, retention/deletion, consent/data flow, release/recovery, `M0_TECH_REVIEW.md` và `M0_QA_REVIEW.md` tại baseline nêu trên.
- Review độc lập; không tự phê duyệt Tech/QA và không coi proposal/dry-run chưa tồn tại là fact.
- Không mở camera, không install/build/test/benchmark/package/migration, không viết application code, không sửa V1, không đổi ADR status và không commit.
- Chỉ sửa BLOCKER/HIGH trong readiness docs và tạo review này.

## Tổng hợp mức độ

| Mức độ | Trước sửa | Đã sửa ở contract tài liệu | Còn mở |
|---|---:|---:|---:|
| BLOCKER | 0 | 0 | 0 |
| HIGH | 10 | 6 | 4 |

Không tạo MEDIUM/LOW vì lượt này chỉ hành động với BLOCKER/HIGH.

## Review theo control area

| Control area | Đánh giá | Bằng chứng/giới hạn |
|---|---|---|
| Raw frame/video/landmark RAM-only | `CONDITIONALLY SATISFIED` ở contract | `spec.md`, ADR-004 và workload cấm serialize/persist; chưa có type-boundary test, process/bridge inspection hoặc scanner chạy được. |
| DB/log/crash/telemetry/temp leakage | `NOT VERIFIED` | `AC-M0-007/018/019`, `WL-017`, stop rules đã bao phủ sink; symbolic canary đơn lẻ không đủ chứng minh binary/type leak nếu scanner/negative fixture chưa tồn tại. |
| Artifact allowlist | `FIXED_DOC` | `m0-evidence-schema.md` nay deny-by-default theo loại/field và có pre-ingest gate; implementation/validator chưa tồn tại. |
| Unexpected network/CDN | `CONDITIONALLY SATISFIED` ở contract | Allowlist mạng M0 rỗng và fail closed; đã mở rộng sang app/dependency/tool. Chưa có payload-free capture hoặc dry-run chứng minh auto-update/upload/telemetry bị tắt. |
| Product consent trước camera | `FIXED_DOC` | Global workload constraint yêu cầu consent fixture `GRANTED` trước mọi camera intent; OS denial được test sau product consent. Chưa có implementation test. |
| Inventory minimization | `FIXED_DOC` | Device snapshot được xem là technical fingerprint; cấm username/SID/path/drive letter/serial/PnP/MAC/IP/SSID, dùng ID ngẫu nhiên và free-space bucket. Collector/scrubber chưa tồn tại. |
| Checksum/provenance | `PARTIAL` | SHA-256/index/link đã định nghĩa; checksum không tự chống người sửa đồng thời artifact và index. Protected attestation/immutable storage, writer/reviewer separation còn `TBD`. |
| Retention/deletion/isolation | `MISSING` | Thời hạn, storage, access role, deletion owner và purge verification đều `TBD`; incident quarantine không được phép chạy trước policy. |
| Synthetic fixtures | `FIXED_DOC` | Chỉ procedural generator trong RAM, version/seed/provenance; cấm nguồn người thật và cấm lưu output pixel/landmark. Generator/fixture review chưa xảy ra. |
| Evidence secret/PII | `FIXED_DOC` | Pre-ingest scrub/scan cấm raw command/output, home/workspace path, identifier, token/key; chưa có positive/negative fixtures và fail-closed tool. |
| Signing/package evidence | `FIXED_DOC` | Chỉ test identity/certificate; evidence cho phép public fingerprint/alias, cấm private key/passphrase/provider URI/key path/production cert/cert subject cá nhân. Clean runner/signing policy chưa khóa. |
| Migration backup/recovery artifact | `CONDITIONALLY SATISFIED` ở contract | Chỉ synthetic DB/backup, cấm V1/user DB; WAL-consistent method đã có trong workload. Purge manifest và isolation test chưa tồn tại. |
| Measurement tool behavior | `MISSING EVIDENCE` | Contract đã cấm auto-update/cloud sync/crash upload/usage telemetry và network payload capture; tool/config/version/overhead/egress dry-run chưa được xác minh. |

## Findings

| ID | Mức | Phát hiện | Tác động | Hành động/điều kiện đóng | Trạng thái |
|---|---|---|---|---|---|
| `M0-PS-001` | HIGH | Evidence schema chỉ có danh sách cấm, chưa có positive allowlist hoặc pre-ingest fail-closed cho trace/log/build/network/device artifacts. | Tool output có thể được ingest nguyên trạng và mang raw sensor, path, identifier hoặc secret. | Thêm allowlist theo loại/field, staging, scrub/scan/checksum và deny unknown. | `FIXED_DOC`; implementation thuộc close gate chung. |
| `M0-PS-002` | HIGH | Consent chỉ xuất hiện ở một số workload; camera workload khác có thể request camera mà không chứng minh product consent trước OS permission. | Vi phạm `PRIV-CON-002` và stop rule 003 có thể chỉ phát hiện sau sự kiện. | Áp consent fixture `GRANTED` như precondition chung; withdrawal/missing phải chứng minh không request camera. | `FIXED_DOC`. |
| `M0-PS-003` | HIGH | Inventory schema/raw command cho phép drive letter, command output và tổ hợp phần cứng chi tiết tạo technical fingerprint; cấm identifier chưa theo deny-by-default. | Evidence có thể chứa path/serial/PnP/network identifier hoặc tăng khả năng liên kết máy/operator. | Dùng field allowlist, random pseudonymous snapshot ID, free-space bucket, access limitation; cấm raw output và identifier. | `FIXED_DOC`; collector verification còn ở `M0-PS-007`. |
| `M0-PS-004` | HIGH | Measurement/network/scanner tool chưa bị ràng buộc rõ về auto-update, crash/usage upload, cloud sync và payload capture. | Harness có thể tự tạo unexpected network hoặc thu payload nhạy cảm dù candidate offline. | Tính mọi tool egress là finding; tắt upload/update/telemetry; chỉ payload-free metadata trace. | `FIXED_DOC`; dry-run còn ở `M0-PS-008`. |
| `M0-PS-005` | HIGH | Synthetic fixture chưa có provenance đủ mạnh để loại ảnh/video/landmark người thật và output synthetic có thể bị lưu như evidence. | “Synthetic” có thể vẫn mang dữ liệu cá nhân hoặc phá invariant RAM-only. | Chỉ procedural generator trong RAM; version/seed/provenance; cấm nguồn người thật và cấm persist pixel/landmark output. | `FIXED_DOC`; generator review chưa thực hiện. |
| `M0-PS-006` | HIGH | Signing/build/command evidence chưa có field-level policy cho key path, provider URI, cert subject, raw stdout/stderr và filesystem path. | Secret/PII có thể lọt log/artifact hoặc được giữ quá lâu. | Allowlist public test-cert fingerprint/alias; cấm private/production material, subject cá nhân và raw output/path. | `FIXED_DOC`; scrubber verification còn ở `M0-PS-007`. |
| `M0-PS-007` | HIGH | Chưa có scrubber/scanner/validator và positive/negative fixtures chứng minh bắt raw binary/type, username/path/serial/device ID, secret và forbidden artifact trên mọi sink. | Không thể chứng minh zero leakage hoặc fail-closed; mọi privacy acceptance vẫn `NOT_EVALUATED`. | Tạo ở task được phép sau readiness: fixture synthetic/canary không nhạy cảm; test từng sink và loại artifact; scanner lỗi phải `INVALID`; Privacy/Security review output. | `OPEN`. |
| `M0-PS-008` | HIGH | Chưa có tool/config/version và privacy-only dry-run chứng minh measurement/capture/scanner không upload, không auto-update và không capture payload; network block/capture scope chưa khóa. | Tool có thể làm sai zero-network evidence hoặc phát tán metadata/secret. | Provision cấu hình offline; kiểm tra egress positive/negative, payload-free output, privilege và cleanup; không dùng kết quả làm benchmark. | `OPEN`. |
| `M0-PS-009` | HIGH | Retention duration, storage location, access roles, deletion owner, purge verification và forbidden-artifact isolation/destruction deadline còn `TBD`. | Evidence/incident artifact có thể tồn tại vô hạn hoặc bị truy cập/upload ngoài scope. | Privacy + Security + QA/Release khóa policy trước collection; test purge/retained index; evidence tree chỉ giữ incident metadata đã scrub. | `OPEN`. |
| `M0-PS-010` | HIGH | SHA-256/index chưa có trust anchor, protected writer path, attestation hoặc immutable retention; cùng actor có thể sửa artifact và checksum. | Provenance/summary có thể bị thay mà review không phát hiện. | Khóa protected CI/attestation hoặc immutable storage tương đương, writer/reviewer separation, access/audit và checksum recomputation procedure. | `OPEN`. |

## Blocking comments và close conditions

Privacy/Security chỉ chuyển `APPROVED` khi đồng thời:

1. `M0-PS-007`–`010` được đóng bằng evidence có checksum; không đóng bằng prose hoặc self-attestation.
2. Artifact allowlist/pre-ingest validator chạy fail-closed trên positive/negative fixtures cho DB/backup/log/crash/telemetry/temp/resource trace/network/build/sign/device inventory; scanner lỗi tạo `INVALID`.
3. Tool/network dry-run chứng minh candidate, dependency và measurement tools không có unexpected egress; capture không giữ payload/header/token/local identifier và không upload artifact.
4. Retention/access/deletion/isolation policy có thời hạn/owner/storage/purge verification cụ thể trước collection. Không giữ raw forbidden artifact trong evidence tree.
5. Provenance có trust anchor hoặc protected immutable mechanism; reviewer có thể tái tính checksum và đối chiếu index/summary mà không dùng cùng quyền ghi.
6. Consent negative fixture chứng minh missing/withdrawn product consent không gọi camera API; OS permission không được xem là consent.
7. Device inventory, signing/build và migration evidence chỉ chứa field allowlisted; không có username/path/serial/device identifier, secret, production certificate/private material hoặc user/V1 database.

## Trạng thái gate

- Tech: giữ nguyên `CHANGES_REQUIRED`; review này không phê duyệt thay Tech.
- QA: giữ nguyên `CHANGES_REQUIRED`; review này không phê duyệt thay QA.
- Privacy/Security: `CHANGES_REQUIRED`.
- T-M0-002: `NOT READY`; review này không thực hiện T-M0-002.
- T-M0-003/application code/camera/benchmark/package/migration: không được bắt đầu từ kết quả review này.

## File thay đổi trong lượt review

- `docs/validation/m0-device-profiles.md`
- `docs/validation/m0-benchmark-workloads.md`
- `docs/validation/m0-evidence-schema.md`
- `docs/validation/m0-stop-rules.md`
- `docs/reviews/M0_PRIVACY_SECURITY_REVIEW.md`

Không sửa source V1, application code, ADR decision, Tech/QA review hoặc Git history.
