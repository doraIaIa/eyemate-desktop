export type EnterpriseDemoRoute = "overview" | "transparency" | "it" | "insights" | "campaigns" | "report" | "audit";

export interface EnterpriseDemoMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly window: string;
  readonly coverage: number;
  readonly status: "available" | "suppressed" | "unknown";
  readonly interpretation: string;
  readonly prohibitedInterpretation: string;
}

export interface EnterpriseDemoCohort {
  readonly id: string;
  readonly label: string;
  readonly employees: number;
  readonly contributors: number;
  readonly status: "reportable" | "suppressed";
}

export interface EnterpriseDemoCampaign {
  readonly id: string;
  readonly title: string;
  readonly state: "draft" | "scheduled" | "paused";
  readonly window: string;
  readonly reach: string;
  readonly employeeControl: string;
  readonly aggregateOnly: string;
}

export interface EnterpriseDemoAuditEvent {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly result: "allowed" | "denied";
  readonly detail: string;
}

export interface EnterpriseDemoPolicy {
  readonly defaultAggregateParticipation: false;
  readonly cameraCoercionAllowed: false;
  readonly managerDrillDownAllowed: false;
  readonly identityInsightsJoinAllowed: false;
  readonly realtimePresenceAllowed: false;
  readonly syntheticDataOnly: true;
  readonly networkAllowed: false;
}

export interface EnterpriseDemoModel {
  readonly organization: {
    readonly name: string;
    readonly plan: string;
    readonly ring: string;
    readonly appVersion: string;
    readonly devices: number;
  };
  readonly policy: EnterpriseDemoPolicy;
  readonly routes: readonly EnterpriseDemoRoute[];
  readonly metrics: readonly EnterpriseDemoMetric[];
  readonly cohorts: readonly EnterpriseDemoCohort[];
  readonly campaigns: readonly EnterpriseDemoCampaign[];
  readonly audit: readonly EnterpriseDemoAuditEvent[];
  readonly forbiddenEmployerFeatures: readonly string[];
  readonly reportClaims: {
    readonly allowed: readonly string[];
    readonly prohibited: readonly string[];
  };
}

export const enterpriseDemoRoutes: readonly EnterpriseDemoRoute[] = ["overview", "transparency", "it", "insights", "campaigns", "report", "audit"];

export const defaultEnterpriseDemoPolicy: EnterpriseDemoPolicy = {
  defaultAggregateParticipation: false,
  cameraCoercionAllowed: false,
  managerDrillDownAllowed: false,
  identityInsightsJoinAllowed: false,
  realtimePresenceAllowed: false,
  syntheticDataOnly: true,
  networkAllowed: false
};

export const enterpriseDemoForbiddenEmployerFeatures: readonly string[] = [
  "Camera stream, raw frame, video hoặc landmark",
  "Symptom answer hoặc personal report của một nhân viên",
  "Blink timeline hoặc distance timeline cá nhân",
  "Focus score, fatigue score, productivity score hoặc emotion inference",
  "Real-time employee presence",
  "Individual break history hoặc employee ranking",
  "Manager drill-down xuống dữ liệu wellbeing cá nhân"
];

export function createEnterpriseDemoModel(): EnterpriseDemoModel {
  return {
    organization: {
      name: "Northstar Studio",
      plan: "Enterprise Pilot Discovery",
      ring: "Design partner ring A",
      appVersion: "0.1.0-m1",
      devices: 186
    },
    policy: defaultEnterpriseDemoPolicy,
    routes: enterpriseDemoRoutes,
    metrics: [
      {
        id: "monthly-active-participation",
        label: "Program participation",
        value: "68%",
        window: "30 ngày",
        coverage: 82,
        status: "available",
        interpretation: "Tỷ lệ thiết bị có đóng góp aggregate trong kỳ, sau khi nhân viên đã biết rõ và cho phép.",
        prohibitedInterpretation: "Không phải attendance, không cho biết ai đang làm việc."
      },
      {
        id: "break-engagement-rate",
        label: "Break engagement",
        value: "54%",
        window: "Tuần này",
        coverage: 76,
        status: "available",
        interpretation: "Tỷ lệ nhắc nghỉ được phản hồi ở cấp cohort.",
        prohibitedInterpretation: "Không phải mức tuân thủ của từng nhân viên."
      },
      {
        id: "long-observed-session-rate",
        label: "Long observed-session rate",
        value: "21%",
        window: "Tuần này",
        coverage: 74,
        status: "available",
        interpretation: "Tỷ lệ phiên local dài hơn ngưỡng chương trình ở cấp nhóm.",
        prohibitedInterpretation: "Không phải thời gian làm việc cá nhân."
      },
      {
        id: "helpfulness",
        label: "Employee helpfulness",
        value: "4.1/5",
        window: "Khảo sát tháng",
        coverage: 63,
        status: "available",
        interpretation: "Đánh giá hữu ích tự nguyện sau campaign.",
        prohibitedInterpretation: "Không phải sức khỏe, năng suất hoặc mức hài lòng cá nhân."
      },
      {
        id: "engineering-small-cohort",
        label: "Engineering cohort",
        value: "Suppressed",
        window: "Tuần này",
        coverage: 0,
        status: "suppressed",
        interpretation: "Cohort dưới ngưỡng không được hiển thị.",
        prohibitedInterpretation: "Không được suy ra unknown thành zero hoặc trạng thái tốt."
      }
    ],
    cohorts: [
      { id: "product-design", label: "Product Design", employees: 42, contributors: 31, status: "reportable" },
      { id: "customer-ops", label: "Customer Operations", employees: 58, contributors: 44, status: "reportable" },
      { id: "engineering-platform", label: "Engineering Platform", employees: 17, contributors: 12, status: "suppressed" },
      { id: "finance", label: "Finance", employees: 24, contributors: 15, status: "reportable" }
    ],
    campaigns: [
      {
        id: "micro-break-week",
        title: "Micro-break week",
        state: "scheduled",
        window: "22-26 tháng 7",
        reach: "4 cohort đủ ngưỡng",
        employeeControl: "Preview trước khi bắt đầu, có opt-out và pause",
        aggregateOnly: "Chỉ campaign reach, break engagement và helpfulness aggregate"
      },
      {
        id: "lighting-check",
        title: "Lighting setup check",
        state: "draft",
        window: "Chưa phát hành",
        reach: "Đang review bởi Privacy Auditor",
        employeeControl: "Không bật camera và không đo ẩn",
        aggregateOnly: "Chỉ mức tham gia aggregate nếu đủ ngưỡng"
      },
      {
        id: "close-workout",
        title: "End-of-day visual reset",
        state: "paused",
        window: "Đã tạm dừng",
        reach: "Không gửi thêm reminder",
        employeeControl: "Employee thấy trạng thái paused",
        aggregateOnly: "Không tạo leaderboard hoặc target cá nhân"
      }
    ],
    audit: [
      { id: "audit-001", actor: "Wellbeing Admin", action: "Xem Program Insights", result: "allowed", detail: "Cohort aggregate đủ ngưỡng; không có drill-down." },
      { id: "audit-002", actor: "Manager", action: "Mở individual break history", result: "denied", detail: "Vai trò manager không có individual wellbeing view." },
      { id: "audit-003", actor: "Support Operator", action: "Truy cập technical support metadata", result: "allowed", detail: "Payload đã scrub; không chứa symptom/camera/personal report." },
      { id: "audit-004", actor: "IT Admin", action: "Ép camera policy ON", result: "denied", detail: "Camera luôn do employee quyết định ở Personal Wellbeing Plane." },
      { id: "audit-005", actor: "Executive Viewer", action: "Export Program Evidence Report", result: "allowed", detail: "Report chỉ xác minh source, hash, methodology và trạng thái revocation." }
    ],
    forbiddenEmployerFeatures: enterpriseDemoForbiddenEmployerFeatures,
    reportClaims: {
      allowed: [
        "Mô tả phạm vi chương trình và mức tham gia aggregate",
        "Nêu phương pháp, coverage, suppressed cohort và limitation",
        "Xác minh report ID, document hash, issue state và methodology version"
      ],
      prohibited: [
        "Legal/ISO/HSE compliance claim",
        "Medical effectiveness hoặc employee health status",
        "Causal productivity improvement",
        "Focus, fatigue hoặc productivity score"
      ]
    }
  };
}

export function isEnterpriseDemoRoute(value: string): value is EnterpriseDemoRoute {
  return enterpriseDemoRoutes.includes(value as EnterpriseDemoRoute);
}

export function validateEnterpriseDemoBoundary(model: EnterpriseDemoModel): readonly string[] {
  const failures: string[] = [];
  if (model.policy.defaultAggregateParticipation !== false) failures.push("AGGREGATE_PARTICIPATION_NOT_OFF_BY_DEFAULT");
  if (model.policy.networkAllowed !== false) failures.push("NETWORK_ALLOWED_IN_DEMO");
  if (model.policy.syntheticDataOnly !== true) failures.push("SYNTHETIC_DATA_ONLY_NOT_DECLARED");
  if (model.policy.cameraCoercionAllowed || model.policy.managerDrillDownAllowed || model.policy.identityInsightsJoinAllowed || model.policy.realtimePresenceAllowed) failures.push("FORBIDDEN_ENTERPRISE_CAPABILITY_ENABLED");
  for (const metric of model.metrics) {
    const prohibited = `${metric.label} ${metric.interpretation}`.toLowerCase();
    if (/\bfocus score\b|\bfatigue score\b|\bproductivity score\b|\bhealth score\b/.test(prohibited)) failures.push(`PROHIBITED_METRIC:${metric.id}`);
  }
  if (!model.cohorts.some((cohort) => cohort.status === "suppressed")) failures.push("SUPPRESSED_COHORT_EXAMPLE_MISSING");
  return failures;
}
