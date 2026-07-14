# Build, Release, Migration and Recovery

```yaml
decision_status: proposed
release_scope: m0-m4
owner: release-owner
review: { security: required, privacy: required }
```

## Channels

- Internal: unsigned/dev-only, không phân phối người dùng.
- Beta/pilot: package identity và update endpoint riêng; tester opt-in.
- Stable: Microsoft Store/MSIX theo quyết định hiện tại; không chạy beta updater.

Beta không tự chuyển stable. Nếu identity/data directory khác, export/import hoặc migration phải được test.

## Pipeline

```text
protected commit/tag
→ dependency install từ lockfile
→ lint/typecheck/unit/integration/acceptance
→ architecture/privacy/security scans
→ build package
→ migration/clean-install/update tests
→ sign
→ checksum/SBOM/release manifest
→ publish channel
→ staged observation
```

## Release record

Version, commit, channel, build environment, schema compatibility, algorithm/content versions, artifact checksum, SBOM, migration list, known limitations và privacy-impacting changes.

## Migration

- Support matrix khai báo schema min/max có thể đọc.
- Update từ phiên bản cũ nhất được hỗ trợ và skipped-version path được test.
- Preflight dung lượng/quyền/backup.
- Transaction/atomic equivalent + integrity check.
- Failure khóa write và vào recovery; không auto-retry vô hạn.

## Rollback

Không downgrade binary trên schema mới nếu không tương thích. Recovery dùng `previous compatible binary + pre-migration backup`, hoặc forward-fix đã test. User data không nằm trong installation directory.

## Incident

Critical incident cần khả năng dừng rollout, gỡ/chặn manifest beta, phát patch, thông báo known issue và postmortem có affected versions, root cause, remediation, regression test.

## Acceptance

- `REL-001`: Clean install offline khởi chạy personal core với local assets.
- `REL-002`: Stable và beta không nhận update của nhau.
- `REL-003`: Artifact/manifest/signature bị sửa bị từ chối.
- `REL-004`: Update không restart giữa session/export/migration.
- `REL-005`: Migration failure giữ backup và recovery path.
- `REL-006`: Report cũ render đúng semantics sau update.
- `REL-007`: Signing secrets không có trong repo/log/artifact.
- `REL-008`: Uninstall/data deletion limitation hiển thị rõ.

## Runbook checklist

- [ ] Freeze release candidate.
- [ ] Run canonical verification command.
- [ ] Test clean/update/skipped-version/recovery on clean VM.
- [ ] Verify offline/network calls and privacy policy.
- [ ] Generate checksum, SBOM, manifest, notes.
- [ ] Sign/publish through protected environment.
- [ ] Verify package identity/channel/store listing.
- [ ] Monitor crash/migration/support signals without health content.
- [ ] Record go/no-go owner and rollback trigger.

