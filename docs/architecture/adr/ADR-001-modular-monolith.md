# ADR-001 — Modular monolith with ports and adapters

- Status: accepted
- Date: 2026-07-14
- Owner: tech-lead
- Related: `INV-008`, M0–M4

## Context

V1 có controller lớn, module cũ/mới song song và boundary không được kiểm tra. V2 cần mở rộng nhưng đội ngũ nhỏ, local-first và phát hành dưới dạng một desktop app.

## Decision

Dùng modular monolith. Domain Core độc lập framework; UI gọi Application Use Cases; camera/storage/OS/export nằm ở adapter. Không microservice, plugin runtime hoặc event bus tổng quát trước khi có requirement thực tế.

## Consequences

- Dễ test domain không cần desktop/camera.
- Giảm deployment và consistency complexity.
- Cần boundary test, public module API và discipline chống deep import.
- Nếu tương lai tách service, contract hiện tại là seam nhưng không được thiết kế quá mức từ bây giờ.

## Revisit criteria

Chỉ xem lại khi có capability cần deploy/scale/security boundary độc lập và modular monolith đã được đo là không đáp ứng, không dựa trên dự báo mơ hồ.

