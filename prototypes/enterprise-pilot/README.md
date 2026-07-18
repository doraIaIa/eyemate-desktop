# EyeMate Enterprise Pilot Prototype

Prototype tương tác dùng để chốt phạm vi sản phẩm B2B trước khi triển khai production.

## Chạy prototype

Mở trực tiếp `index.html` bằng trình duyệt. Không cần cài package, không dùng CDN và không gọi network.

## Màn hình

1. **Nhân viên** — transparency, local-first, opt-out, unlink.
2. **IT Admin** — license, device/app inventory, update health; không có wellbeing data.
3. **HR / EHS Insights** — aggregate theo cohort, data coverage, privacy suppression.
4. **Campaign** — approved templates, employee notice, opt-out, no leaderboard.
5. **EyeMate Program Implementation & Participation Report** — Báo cáo triển khai và mức độ tham gia chương trình EyeMate; không phải chứng nhận pháp lý.
6. **Privacy Audit** — mô phỏng query gate và negative privacy tests.

## Mục đích bàn giao cho Codex

Prototype là reference UX và product-boundary artifact. Nó không phải production architecture và không được coi là nguồn sự thật cao hơn Product Constitution, privacy invariants, data contract hoặc approved feature specs.

Codex nên dùng prototype để:

- kiểm tra tính nhất quán của terminology và user journeys;
- lập feature specs và acceptance criteria;
- xác định data contract tối thiểu;
- ghi nhận các lớp enforcement cần được review trong tài liệu tương lai, không xây backend/API;
- giữ nguyên các trạng thái privacy suppression và UNKNOWN;
- không triển khai employee surveillance.

## Dữ liệu

Toàn bộ dữ liệu trong prototype là giả lập. Email dùng tên miền `.example`.
