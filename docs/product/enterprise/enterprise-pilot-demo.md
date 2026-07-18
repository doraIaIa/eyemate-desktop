# Enterprise Pilot Demo

Status: `DEVELOPMENT_ONLY_REVIEW_ARTIFACT`

`npm run dev:enterprise-demo` mở một cửa sổ Electron đóng gói từ bundle hiện tại và vào thẳng `#/enterprise-demo/overview`. Demo này dùng dữ liệu synthetic trong renderer, không dùng backend, API, tenant service, cloud sync, authentication, SSO, database production hoặc personal SQLite.

Demo nhằm giúp project owner, HR/EHS, IT/Security và Privacy/Legal đánh giá journey Enterprise Pilot trước khi quyết định có lập kế hoạch implementation hay không.

## Boundary

- `npm run dev` vẫn mở ứng dụng cá nhân hiện tại.
- `npm run dev:enterprise-demo` chạy chế độ enterprise demo bằng `--enterprise-demo`.
- Enterprise demo không đăng ký personal IPC handlers và không khởi tạo local personal storage.
- Network HTTP/HTTPS/WS/WSS bị chặn ở Electron session trong demo.
- Camera permission bị từ chối trong demo; employee camera vẫn là tùy chọn trong Personal Wellbeing Plane.
- Aggregate participation trong Employee Transparency mặc định `OFF`.
- Mọi số liệu là synthetic, không đọc dữ liệu checkup, session, baseline, report hoặc camera cá nhân.

## Screens

- Overview: three-plane architecture và forbidden employer features.
- Employee Transparency: employee notice, aggregate opt-in/opt-out, unlink.
- IT Administration: device/app inventory, update health, support metadata đã scrub.
- Program Insights: cohort aggregate, small cohort suppression, missing/unknown.
- Campaigns: transparent campaign templates, preview, pause/stop, no hidden measurement.
- Program Report: Program Evidence Report, allowed/prohibited claims, revocation state.
- Privacy Audit: allowed/denied audit events cho privacy gates.

## Validation

Chạy:

```powershell
npm run test:enterprise-demo
```

Validation hiện kiểm tra:

- Electron packaged dev window mở đúng enterprise route.
- Personal topbar bị ẩn trong demo.
- Không có text hoặc path thể hiện personal SQLite trong UI demo.
- Aggregate contribution mặc định `OFF`.
- 7 route enterprise demo render được.
- Program Insights có suppressed cohort.
- Không có metric card focus/fatigue/productivity/health score.
- Không phát sinh network request trong phiên validation.

## Non-Implementation Note

Demo này không phải production admin dashboard và không mở M5 implementation. Nó không thay đổi intended use của sản phẩm cá nhân và không chứng minh legal/ISO/HSE compliance, medical effectiveness, employee health status hoặc causal productivity improvement.
