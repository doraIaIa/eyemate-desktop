# Threat Model

```yaml
decision_status: proposed
owner: security-owner
review: { privacy: required, security: required }
```

## Tài sản cần bảo vệ

- Survey answers và symptom history.
- Session/checkup summaries và reports.
- Calibration/device profiles.
- Encryption/signing/update keys.
- Consent records và deletion state.
- Uy tín claim/safety content và algorithm packages.

## Trust boundaries

1. Camera/OS permission → application process.
2. UI → application use cases.
3. Domain → persistence adapter.
4. Application → OS credential store.
5. Release pipeline → signing/store.
6. Post-MVP client → sync/share/enterprise relay.

## Threats và control tối thiểu

| Threat | Mức | Control |
|---|---:|---|
| Raw frame lọt log/crash/temp | Cao | RAM-only, forbidden-field scan, crash scrub, no frame serialization |
| Local DB bị đọc sau mất máy | Cao | OS protection + encryption ADR + key store; user-facing limitation |
| Key hard-code/log | Cao | OS secret store/signing service, CI secret scan, least privilege |
| Malicious/tampered update | Cao | Signed package, Store stable channel, verified beta manifest/hash |
| Migration làm mất/corrupt dữ liệu | Cao | Backup, transaction, integrity check, recovery fixtures |
| Report bị ứng dụng khác đọc | Trung bình/Cao | User warning, explicit destination, optional encrypted export later |
| Dependency/SDK gửi network | Cao | Network allowlist, offline tests, SBOM, dependency review |
| Enterprise re-identification | Cao | No individual pipeline, cohort threshold, query limits, audit/privacy review |
| Debug mode mở trong production | Trung bình | Production flag check, no devtools, sanitized diagnostics |
| Consent/version bị giả hoặc stale | Cao | Append-only decision record, versioned text, integrity validation |

## Security acceptance

- Production chạy chức năng cá nhân cốt lõi khi chặn mạng.
- Không có raw-frame/landmark/answer content trong log, fixture hoặc crash attachment.
- Tampered artifact/manifest bị từ chối.
- App không chạy DB schema nửa migrated.
- Delete all không để orphan record trong database/backup vượt policy.
- Dependency mới có owner, license, network/data review và removal path.

## Open decisions

- SQLCipher hay field-level encryption sau POC packaging/licensing/performance.
- Mức bảo vệ report export ngoài app sandbox.
- Crash upload provider và consent nếu được dùng.
- Post-MVP key recovery cho encrypted backup.

