# Enterprise Demo Responsive & Data Visual Review

Ngày review: 18/07/2026  
Baseline HEAD: `98ab092230e23b210272eaf0d34b9446c6cbba71`  
Phạm vi: chỉ `npm run dev:enterprise-demo`

## 1. Xác nhận phạm vi Enterprise-only

Lượt này chỉ thiết kế lại Enterprise Demo. Không thay đổi Personal Home, Checkup, Work Companion, Personal Intelligence, Personal Reports, Personal Privacy Center, camera pipeline, SQLite hoặc hành vi M0-M4. Thay đổi trong `src/main/main.ts` chỉ mở rộng hàm `runEnterpriseDemoValidation` đã tồn tại để resize/capture cửa sổ Enterprise; không thay đổi luồng Personal.

Enterprise Demo tiếp tục dùng Electron packaged renderer, synthetic data, profile cách ly, không backend, không API, không network, không personal SQLite và không gọi `window.eyeMate`.

## 2. File đã kiểm tra

- `src/enterprise-demo/enterprise-demo-data.ts`
- `src/renderer/enterprise-demo.ts`
- `src/renderer/enterprise-demo.css`
- `src/main/enterprise-demo-mode.ts`
- Enterprise-only validation trong `src/main/main.ts`
- `src/tests/unit/enterprise-demo.test.ts`
- `tools/m5/run-enterprise-demo-validation.mjs`
- Discovery Pack và privacy invariants liên quan M5

## 3. Personal files không sửa

- `src/renderer/app.ts`
- `src/renderer/styles.css`
- `src/renderer/index.html`
- Personal fixtures, storage, preload contract và camera modules

`npm run dev` đã được mở bằng Electron và xác nhận vẫn render cửa sổ `EyeMate`, Personal navigation và Home hiện hành. `npm run acceptance` PASS.

## 4. Lỗi UX Enterprise trước thay đổi

| Mức | Lỗi | Trạng thái |
|---|---|---|
| HIGH | Overview chỉ mô tả kiến trúc, không trả lời tình trạng triển khai/chương trình | Đã sửa |
| HIGH | Metric là chuỗi hardcode, thiếu numerator, denominator, period, delta, version | Đã sửa |
| HIGH | Legal suppression chỉ là trạng thái hiển thị, model còn mang số | Đã sửa |
| HIGH | Không có time series, chart, axis, legend hoặc color registry | Đã sửa |
| HIGH | Một breakpoint 980 px, không có desktop compact shell | Đã sửa |
| MEDIUM | IT Administration không có version distribution/update visualization | Đã sửa |
| MEDIUM | Campaign, Report và Transparency chủ yếu là text panel | Đã sửa |
| MEDIUM | Icon không có semantic registry | Đã sửa |

## 5. Quyết định responsive

- Shell lớn dùng rail `248px`; từ `1350px` trở xuống chuyển thành rail icon-only `76px`, có tooltip tên route.
- KPI dùng 4 cột trên desktop lớn và 2 cột ở desktop nhỏ; không ép thành một cột ở 1100 px.
- Main trend luôn giữ vùng ưu tiên; cohort panel co độc lập.
- Từ `1180px`, quality và supporting panels chuyển theo grid 2 cột.
- Table audit dùng overflow ngang nội bộ; toàn trang không có horizontal overflow.
- SVG có `viewBox`, `preserveAspectRatio`, inner margins cho axis và endpoint label.
- Chart height dùng `clamp()` theo available viewport; legend được wrap.

## 6. Data model mới

Model typed gồm:

- `SyntheticOrganization`
- `ReportingPeriod`
- `MetricDefinition`
- `MetricObservation`
- `MetricSeries`
- `CohortSummary`
- `DataCoverageSummary`
- `CampaignSummary`
- `ReportSummary`
- `AppVersionDistribution`
- `PrivacyThresholdPolicy`
- `PrivacyState`

Metric lưu numerator/denominator, period, previous value, delta point, coverage, missing rate, metric version, privacy/source state, series và giới hạn diễn giải. Không còn lưu metric chỉ dưới dạng `"68%"`.

## 7. Quy tắc tính

- Enrollment coverage = `205 / 247 = 83.0%`.
- Monthly active participation = `168 / 247 = 68.0%`.
- Break engagement = `842 / 1238 = 68.0%`.
- Long observed-session rate = `131 / 1187 = 11.0%`.
- Delta dùng percentage point, không phải relative percentage.
- Favorable direction được định nghĩa riêng; giảm long-session rate là favorable.
- Denominator bằng 0 trả `null/UNKNOWN`, không trả `0%`.
- Coverage và missing được hiển thị cùng reporting window/version.

## 8. Chart system

- Overview: line chart bốn series, sáu tháng, axis 0-100%, endpoint label và accessible summary.
- Program Insights: single-metric trend theo selector, cohort comparison và data-quality context.
- Cohort comparison: horizontal bar, sort cao-thấp, tên cohort độc lập với bar.
- IT Administration: stacked version distribution và status legend.
- Chart dùng SVG/CSS hiện có, không thêm dependency.

## 9. Legend và color registry

| Metric/state | Token |
|---|---|
| Enrollment coverage | Lime |
| Monthly active participation | Violet |
| Break engagement | Amber |
| Long observed-session rate | Teal |
| Data coverage/available | Green |
| Missing/unknown | Muted gray |
| Suppressed | Privacy blue |
| Blocked/denied | Controlled red |

Color token đến từ `MetricDefinition` và được dùng lại cho KPI, line, point, legend và campaign metric.

## 10. Icon mapping

- Overview: dashboard grid
- Program Insights: analytics trend
- Campaigns: megaphone
- Reports: document
- IT Administration: device inventory
- Employee Transparency: eye
- Privacy Audit: shield check
- Enrollment: grouped users
- Participation: activity pulse
- Break engagement: cup
- Long session: clock
- Data quality: database
- Suppressed: lock

Tất cả icon dùng một stroke system, không emoji và không dùng generic circle thay semantic.

## 11. Privacy-state behavior

State hỗ trợ: `AVAILABLE`, `UNKNOWN`, `INSUFFICIENT_DATA`, `SUPPRESSED`.

Ngưỡng proposed giữ nguyên: cohort tối thiểu 20, contributor tối thiểu 15, suppress cell dưới 10. Legal được đưa qua selector trước renderer; model công khai trả `eligible`, `contributors` và `participation` bằng `null`. DOM, tooltip, aria label và data attribute không chứa số bị ẩn.

## 12. Ma trận viewport

| Viewport | Overflow | Overlap | Clipping | Chart | Legend | Status | Screenshot |
|---|---:|---:|---:|---:|---:|---|---|
| 1100 × 700 | Không | Không | Không | Hiển thị | Hiển thị | PASS | `enterprise-overview-1100x700.png` |
| 1280 × 800 | Không | Không | Không | Hiển thị | Hiển thị | PASS | Automated inspection |
| 1366 × 768 | Không | Không | Không | Hiển thị | Hiển thị | PASS | `enterprise-overview-1366x768.png` |
| 1440 × 900 | Không | Không | Không | Hiển thị | Hiển thị | PASS | `enterprise-overview-1440x900.png` |
| 1600 × 1000 | Không | Không | Không | Hiển thị | Hiển thị | PASS | Automated inspection |
| 1920 × 1080 | Không | Không | Không | Hiển thị | Hiển thị | PASS | `enterprise-overview-1920x1080.png` |
| Maximized 1920 × 1080 | Không | Không | Không | Hiển thị | Hiển thị | PASS | Live Electron inspection |

Mỗi viewport được kiểm tra bằng BrowserWindow thật cho horizontal overflow, KPI overlap, chart bounds, legend bounds và số KPI. 1100 px dùng rail icon-only; từ 1366 px rail đầy đủ.

## 13. Screenshot evidence

Thư mục: `docs/validation/enterprise-demo/`

- `enterprise-overview-1100x700.png`
- `enterprise-overview-1366x768.png`
- `enterprise-overview-1440x900.png`
- `enterprise-overview-1920x1080.png`
- `enterprise-program-insights-available-1440x900.png`
- `enterprise-program-insights-suppressed-1440x900.png`
- `enterprise-it-1440x900.png`
- `enterprise-campaigns-1440x900.png`
- `enterprise-report-1440x900.png`
- `enterprise-audit-1440x900.png`
- `enterprise-transparency-1440x900.png`

Ngoài capturePage, Computer Use đã xác nhận trực tiếp cửa sổ có title `EyeMate Enterprise Demo`, khung Electron, badge `DEVELOPMENT DEMO`, `SYNTHETIC DATA`, chart và compact rail không overlap.

## 14. Lỗi còn lại và mức độ

- BLOCKER: Không có.
- HIGH: Không có trong phạm vi demo.
- MEDIUM: Methodology và privacy thresholds vẫn `proposed`; cần Privacy/Security/Research validation trước pilot.
- MEDIUM: Dữ liệu hoàn toàn synthetic, không chứng minh chất lượng production pipeline hoặc product-market fit.
- LOW: Một số thuật ngữ chuẩn (`Program Insights`, `Employee Transparency`, `Coverage`) tiếp tục giữ tiếng Anh để khớp specification.

## 15. Validation

- `npm run typecheck`: PASS.
- `npm run unit`: PASS, 120/120.
- `npm run lint`: PASS.
- `npm run architecture`: PASS.
- `npm run privacy`: PASS.
- `npm run acceptance`: PASS.
- `npm run test:enterprise-demo`: PASS, 6 viewport, 11 screenshot, 7 route.
- `npm run dev:enterprise-demo`: đã mở và xác nhận là Enterprise Demo.
- `npm run dev`: đã mở và xác nhận Personal app không đổi layout ngoài phạm vi.

## 16. Xác nhận ranh giới

Không có backend, API, network, auth, SSO, cloud, production database hoặc personal data được thêm. Đây là Enterprise Discovery Demo và synthetic presentation layer. M5 production implementation vẫn `NOT_STARTED`.
