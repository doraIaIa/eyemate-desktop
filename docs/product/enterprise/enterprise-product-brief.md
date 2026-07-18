# Enterprise Product Brief

```yaml
decision_status: proposed
owner_boundary_status: approved-for-discovery
release_scope: m5-enterprise-discovery
implementation_status: not-started
product_owner_approval: required
privacy_review: required
security_review: required
legal_review: required
research_validation: required
```

## Positioning

EyeMate Enterprise is a Workplace Visual Wellbeing Program Platform for Screen-Based Work.

EyeMate giúp tổ chức triển khai, vận hành và đánh giá một chương trình visual wellbeing bằng dữ liệu tổng hợp, trong khi dữ liệu sức khỏe và wellbeing cá nhân tiếp tục thuộc quyền kiểm soát của nhân viên.

EyeMate Enterprise không phải employee monitoring, workforce surveillance, attendance tracking, productivity analytics, focus tracking, fatigue detection, emotion recognition, employee health scoring hoặc medical diagnosis.

## Problem Statement

Tổ chức muốn hỗ trợ nhân viên làm việc với màn hình nhiều nhưng các công cụ hiện có thường rơi vào hai cực: phúc lợi chung chung không có evidence hoặc giám sát cá nhân gây mất niềm tin. EyeMate Enterprise cần chứng minh chương trình được triển khai, được nhân viên hiểu và tạo tín hiệu aggregate hữu ích mà không cho employer xem dữ liệu cá nhân.

## Product Category

Workplace Visual Wellbeing Program Platform for Screen-Based Work, cohort aggregate only, privacy-preserving by design.

## Intended Use

- Triển khai chương trình visual wellbeing ở cấp tổ chức hoặc nhóm đủ lớn.
- Quản lý license, rollout, app health và campaign minh bạch.
- Xem weekly/monthly cohort aggregate về participation, break engagement, observed session pattern, helpfulness và data coverage.
- Tạo EyeMate Program Implementation & Participation Report, tiếng Việt là **Báo cáo triển khai và mức độ tham gia chương trình EyeMate**, có methodology, coverage và limitation rõ.

## Non-Goals

- Không theo dõi nhân viên cá nhân.
- Không đo focus, fatigue, emotion, productivity hoặc attendance.
- Không cung cấp individual wellbeing view cho manager hoặc employer.
- Không dùng dữ liệu cho performance review, kỷ luật, sa thải hoặc compensation.
- Không thay đổi intended use của personal EyeMate.

## Value Proposition

Employee: hiểu rõ campaign đang diễn ra, dữ liệu aggregate nào được dùng, có quyền opt-out, unlink, export và delete dữ liệu personal local.

HR/EHS: biết chương trình có reach, engagement và perceived helpfulness ở cấp nhóm hay không mà không xem dữ liệu cá nhân.

IT/Security: quản lý license, app version, rollout ring, update health, audit và support metadata đã scrub.

## Actors

Buyer: HR, People, EHS hoặc benefits leader.

Champion: wellbeing program owner hoặc EHS lead.

Blocker: Privacy/Legal/DPO, Security, Works Council hoặc employee trust concern.

Beneficiary: employee và organization-level wellbeing program owner.

Data subject: employee.

Administrator: IT Admin, Wellbeing Admin, Privacy Auditor, Organization Owner.

Decision maker: budget owner và privacy/legal approver.

## Jobs To Be Done

- Khi tổ chức triển khai EyeMate, IT cần cấp license và app health mà không truy cập wellbeing data.
- Khi HR/EHS chạy campaign, employee phải thấy nội dung và quyền opt-out trước khi aggregate contribution được dùng.
- Khi lãnh đạo xem kết quả, họ chỉ thấy cohort đủ ngưỡng, không thấy cá nhân.
- Khi Privacy Auditor kiểm tra, họ thấy audit trail, suppression và query denial.

## Enterprise Pilot Scope

- Prototype/static discovery artifact.
- Spec proposed cho trust/deployment, transparency/enrollment, privacy relay, organizational insights, campaign, EyeMate Program Implementation & Participation Report, RBAC/audit.
- Aggregate contribution mặc định OFF trong Enterprise Pilot và chỉ bật sau transparency notice với hành động chủ động của employee.
- Synthetic data only.
- No backend, no production dashboard, no auth, no database, no cloud sync.

## Hypotheses

- Employers value aggregate visual wellbeing evidence without individual monitoring.
- Employees trust the program more when opt-out and no individual employer view are explicit.
- Privacy/Legal will require cohort suppression, query audit and identity separation before pilot.
- IT/Security will accept Control Plane metadata if it is separated from wellbeing analytics.

## Risks

- Buyers may ask for employee-level productivity or compliance data.
- Managers may attempt drill-down through small cohorts or repeated filters.
- Campaigns may feel coercive if templates are not bounded.
- EyeMate Program Implementation & Participation Report may be misunderstood as legal or medical certification.

## Success Signals

- Employees can explain what employer cannot see.
- Privacy/Legal accepts three-plane boundary as reviewable.
- HR/EHS accepts cohort aggregate instead of individual views.
- IT can separate license/device management from wellbeing analytics.
- Design partners can name a pilot use case without requesting surveillance.

## Failure Signals

- Buyer insists on individual focus/fatigue/productivity score.
- Employee trust interview shows fear of hidden monitoring.
- Privacy/Legal rejects identity separation or cohort thresholds.
- EyeMate Program Implementation & Participation Report is interpreted as compliance certificate.

## Conditions Before Implementation

- Owner approved the product category wording for Discovery.
- Owner approved the three-plane architecture boundary and forbidden feature list for Discovery.
- Threat model validates initial suppression thresholds.
- Design partner research confirms demand without individual monitoring.
- Proposed specs are reviewed before any plan/tasks/code.
- Legal basis remains OWNER/LEGAL DECISION REQUIRED by jurisdiction.
