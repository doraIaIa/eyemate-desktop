# EyeMate Internal Beta Pilot Package

```yaml
decision_status: proposed
release_scope: pilot-readiness
owner: product-owner
review: { product: required, privacy: required, security: required, clinical: required }
```

## Phạm vi beta

Đây là bản beta nội bộ local-only, unsigned, chỉ dùng dữ liệu synthetic hoặc dữ liệu do chính operator kiểm thử chủ động tạo. Không phải bản public, không phải thiết bị y tế và chưa được phép thu thập dữ liệu nhạy cảm của pilot participant.

Nguồn trạng thái máy đọc được là `pilot/feature-matrix.json`. Validator phải từ chối mọi cấu hình tự bật sensitive persistence, camera accuracy, clinical content hoặc signing khi external gate chưa đóng.

## Phân loại limitation

| Limitation | Phân loại | Trạng thái beta |
|---|---|---|
| Sensitive payload encryption | Implementation PASS; cần Security/Privacy approval | `SENSITIVE_PILOT=DISABLED`; ADR-005 chờ approval |
| Camera lifecycle/calibration | Start/stop thật PASS; full measurement cần operator/ground truth | `DISABLED` cho accuracy-dependent use |
| Blink/distance accuracy | Cần ground truth, protocol và threshold | `UNKNOWN`; không hiển thị số |
| OSDI 12 mục/recommendation | Cần Clinical/Product approval | Không phân phối câu hỏi; chỉ có adapter kỹ thuật 12 mục, thang 0–4, đang tắt |
| PDF | Local implementation và multipage acceptance PASS | Markdown/JSON/PDF được hỗ trợ |
| Dynamic egress | WPR cần host permission; local observation chỉ coverage một phần | `DEGRADED/UNKNOWN`, không claim no-egress |
| Signing/Store | Cần certificate và Store identity | Unsigned internal MSIX |

## Consent, privacy và retention

- Camera chỉ được mở sau action rõ ràng trong guided validation; OS permission không thay thế product consent.
- Raw frame, video, landmark, pixel buffer và raw per-frame series chỉ ở RAM và không được ghi DB/log/evidence/export.
- Package mặc định chỉ bật survey-only và Timer Only. Camera controls accuracy-dependent bị disabled.
- Dữ liệu app hiện được giữ local đến khi người dùng xóa. `Xóa toàn bộ` xóa các entity do app quản lý nhưng không tuyên bố xóa file export bên ngoài app-data.
- Sensitive payload encryption đã có executable evidence, nhưng chưa có Security/Privacy approval; chưa nhập dữ liệu người thật hoặc dữ liệu sức khỏe nhạy cảm vào beta này.

## Release, rollback và incident

1. Freeze commit; chạy `npm run verify:pilot` và tạo manifest/SBOM/checksum.
2. Không cài unsigned MSIX lên participant. Staged smoke chỉ chạy local từ payload đã đóng gói.
3. Update từ schema 9 và skipped update từ schema 8 phải tạo backup, migrate transactionally và pass integrity.
4. Không chạy binary cũ trên schema mới. Rollback dùng previous compatible binary cùng pre-migration backup; nếu không có thì forward-fix.
5. Khi có incident: dừng phân phối, giữ package/manifest checksum, không thu health content, phân loại affected version, tạo fix + regression test và ghi quyết định resume.
6. Không commit certificate, private key, passphrase, user path, hostname, IP/URL trace hoặc ETL thô.

## Entry criteria

- Canonical regression, UI/Electron acceptance, privacy/security/accessibility và staged MSIX smoke PASS.
- Feature matrix validate fail-closed; external gates vẫn disabled.
- Beta identity tách internal/stable; SBOM, checksum, manifest, release notes và signing interface có bằng chứng.
- Camera harness synthetic PASS; real-camera result có thể là `NOT_RUN_EXTERNAL_GATE`.
- Dynamic egress ghi đúng coverage và không suy static scan thành no-egress.

## Exit criteria

Pilot có người thật chỉ được cân nhắc sau khi: ADR-005 được Security/Privacy chấp thuận bằng executable encryption evidence; clinical content được duyệt; signed beta identity tồn tại; camera lifecycle/accuracy có evidence nếu capability đó bật; incident owner và participant consent được phê duyệt.

Nếu các external gate chưa đóng nhưng mọi phần tự động PASS, trạng thái tối đa là `PILOT_READY_WITH_EXTERNAL_GATES`.

## Checklist external-gate

Danh sách machine-readable để bàn giao: `pilot/external-gate-checklist.json`. Chạy `npm run pilot:external-gates` chỉ xác nhận checklist không che giấu evidence/approver; không thay thế phê duyệt hoặc bằng chứng thực tế.

## Ký beta nội bộ và quan sát network có quyền Administrator

- `tools/pilot/create-internal-msix-certificate.ps1` đọc Publisher từ beta manifest, tạo self-signed certificate CurrentUser và CER public dưới `.pilot/signing/`. Với `-InstallForCurrentUser`, script trust CER ở `TrustedPeople` (cài MSIX) và `Root` (chỉ verify SignTool trên máy build). Chỉ thêm `-ExportPrivatePfx` khi cần PFX; PFX/passphrase không được commit hoặc chia sẻ cho tester.
- `tools/pilot/install-internal-msix-certificate.ps1` chỉ import CER public vào `TrustedPeople`; `LocalMachine` yêu cầu PowerShell Administrator. Subject certificate phải khớp Publisher manifest.
- `tools/pilot/capture-pktmon-egress.ps1` yêu cầu PowerShell Administrator, capture NIC tối đa 60 giây và luôn dừng pktmon trong `finally`. ETL/TXT thô có thể chứa dữ liệu nhạy cảm, không commit; mặc định script xóa chúng. Chỉ dùng `-KeepRawCapture` khi cần inspection cục bộ đã được phê duyệt, sau đó scrub summary và xóa raw artifact.
- Các script là hỗ trợ evidence nội bộ. Chữ ký self-signed chỉ phù hợp development/testing; kết quả pktmon chỉ có thể kết luận phạm vi workload/capture đã quan sát, không chứng minh tuyệt đối không egress.
