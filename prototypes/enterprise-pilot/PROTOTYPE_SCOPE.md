# Enterprise Pilot — Product Decisions

Status: proposed-for-owner-approval
Purpose: discovery and specification reference, not production implementation authorization.

## Product category

EyeMate Enterprise là **Workplace Visual Wellbeing Program Platform for Screen-Based Work**.

EyeMate giúp tổ chức triển khai, vận hành và đánh giá chương trình visual wellbeing bằng dữ liệu tổng hợp, trong khi dữ liệu sức khỏe và wellbeing cá nhân tiếp tục thuộc quyền kiểm soát của nhân viên.

EyeMate Enterprise không phải employee monitoring, attendance, productivity analytics, workforce intelligence, focus tracking, fatigue detection, employee health scoring hay health diagnosis.

## Three-plane model

### Personal Wellbeing Plane
- Symptom, camera, personal reports và history nằm local.
- Camera là tùy chọn.
- Người dùng có thể pause, unlink, export và delete.
- Employer không truy cập personal data.

### Enterprise Control Plane
- Organization, tenant, license, device/app inventory, version, update health.
- Identity data có thể tồn tại để cấp license và quản trị thiết bị.
- Identity dataset phải tách khỏi wellbeing analytics.

### Privacy-Preserving Program Insights Plane
- Chỉ weekly/monthly aggregate.
- Không exact timestamp.
- Không individual drill-down.
- Cohort threshold, cell suppression và anti-differencing bắt buộc.
- Contribution-level data phải có retention ngắn và bị xóa sau aggregation.

## Enterprise Discovery Scope

1. Organization enrollment và license.
2. IT Admin Console.
3. Employee Transparency Center.
4. RBAC và audit.
5. Local aggregate event contract.
6. Privacy Relay logical contract bằng synthetic data trước.
7. HR/EHS aggregate insights.
8. Transparent campaign templates.
9. EyeMate Program Implementation & Participation Report.
10. Security/privacy documentation pack.

## Allowed employer metrics

- Enrollment coverage.
- Monthly active participation.
- Break engagement rate.
- Long uninterrupted observed-session rate.
- Campaign reach.
- Data coverage / missing / unknown.
- Employee helpfulness.
- App/version health.

Mọi metric phải có denominator, reporting window, coverage và metric version.

## Permanently forbidden employer features

- Camera stream, raw frame, landmark.
- Symptom answers hoặc personal report.
- Blink/distance timeline.
- Focus, fatigue, emotion hoặc productivity score.
- Real-time employee presence.
- Individual break history.
- Individual ranking hoặc manager drill-down.
- Use for performance review, discipline or termination.

## Deferred

- Industry benchmark.
- ROI calculator.
- Legal/ISO/HSE compliance certificate.
- Bronze/Silver/Gold tier based on employee behavior.
- SSO/SCIM production integration.
- Real customer analytics.
- Differential privacy until threat model justifies it.

## Terminology

Use:
- Break engagement, not employee compliance.
- Observed session, not work time.
- EyeMate Program Implementation & Participation Report / Báo cáo triển khai và mức độ tham gia chương trình EyeMate, not compliance certificate.
- Observed change, not proven causal improvement.
- Insufficient data / suppressed, not zero.
