# Quality Attributes and Budgets

## Reliability

- Session không mất hoàn toàn khi app restart/crash; recovery state rõ.
- Camera failure degrade độc lập, không làm hỏng survey/session.
- Write quan trọng dùng transaction/idempotency.
- Update không restart khi session/export/migration đang chạy.

## Offline

- M1–M3 personal core chạy khi không có mạng.
- Model/WASM/content bắt buộc được đóng gói local.
- Network feature post-MVP fail độc lập và không khóa local data.

## Performance

Con số phải chốt sau M0 theo ba device profile. Tối thiểu đo:

- cold/warm startup;
- idle và active RAM;
- CPU/GPU trong camera session;
- battery impact;
- frame processing p50/p95;
- UI input latency;
- installer/update size.

Không dùng từ “nhẹ/nhanh” trước khi có budget và measurement report.

## Accessibility/localization

- Core flows dùng được bằng keyboard.
- Focus, screen-reader label, contrast và reduced-motion được test.
- Màu không là tín hiệu duy nhất.
- Safety/claim content không nối string làm đổi nghĩa; bản dịch có content version.

## Observability

- Error có code, category, recoverability, user action và safe diagnostic context.
- Diagnostics local mặc định; upload là opt-in.
- Không log dữ liệu health/camera cấm.
- Metric có purpose/owner/retention; không thu “phòng khi cần”.

## Maintainability

- Module public API; cấm deep import.
- Typed config có unit, version, owner, expiry.
- Feature flag có owner và removal date.
- Dependency mới phải chỉ ra requirement/acceptance mà nó giải quyết.

