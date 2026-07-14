# ADR-002 — SQLite local-first storage with OS-managed keys

- Status: proposed
- Date: 2026-07-14
- Owner: tech-lead + security-owner
- Related: `DATA-*`, `PRIV-*`, M0

## Context

V2 cần transaction, migration, aggregate query và report semantics lâu dài. IndexedDB V1 không phải lựa chọn mặc định cho desktop V2. SQLite không tự mã hóa.

## Decision đề xuất

- SQLite là storage engine mục tiêu, WAL và transaction.
- Raw camera data không vào database.
- Database nằm ngoài installation directory.
- Schema/migration versioned; pre-migration backup + integrity check + recovery.
- Encryption key không hard-code; lưu bằng OS credential store.
- M0 so sánh SQLCipher và field-level encryption về packaging, license, performance, migration và recovery trước khi chốt.

## Không quyết định trong ADR này

- Cloud sync/multi-device.
- Account identity.
- Post-MVP enterprise store.

## Revisit criteria

POC chứng minh SQLite không đóng gói/backup/recover được trên shell đã chọn hoặc requirement mới cần storage boundary khác.

