export type EnterpriseDemoRoute = "overview" | "transparency" | "it" | "insights" | "campaigns" | "report" | "audit";
export type MetricId = "enrollment-coverage" | "monthly-active-participation" | "break-engagement" | "long-observed-session-rate" | "data-coverage" | "missing-unknown";
export type PrivacyState = "AVAILABLE" | "UNKNOWN" | "INSUFFICIENT_DATA" | "SUPPRESSED";
export type SourceState = "COMPLETE" | "PARTIAL" | "MISSING";

export interface SyntheticOrganization {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly eligibleSeats: number;
}

export interface ReportingPeriod {
  readonly id: string;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly methodologyVersion: string;
  readonly refreshedAt: string;
}

export interface MetricDefinition {
  readonly id: MetricId;
  readonly label: string;
  readonly shortLabel: string;
  readonly plainLanguageDefinition: string;
  readonly numeratorLabel: string;
  readonly denominatorLabel: string;
  readonly unit: "PERCENT";
  readonly colorToken: string;
  readonly icon: "users" | "activity" | "break" | "clock" | "database" | "unknown";
  readonly favorableDirection: "UP" | "DOWN" | "NEUTRAL";
  readonly allowedInterpretation: string;
  readonly prohibitedInterpretation: string;
}

export interface MetricPoint {
  readonly period: string;
  readonly numerator: number;
  readonly denominator: number;
}

export interface MetricObservation {
  readonly id: MetricId;
  readonly definition: MetricDefinition;
  readonly numerator: number | null;
  readonly denominator: number | null;
  readonly value: number | null;
  readonly previousPeriodValue: number | null;
  readonly deltaPoints: number | null;
  readonly coverage: number | null;
  readonly missingRate: number | null;
  readonly reportingPeriod: ReportingPeriod;
  readonly metricVersion: string;
  readonly privacyState: PrivacyState;
  readonly sourceState: SourceState;
  readonly series: readonly { readonly period: string; readonly value: number | null }[];
}

export interface MetricSeries {
  readonly metricId: MetricId;
  readonly label: string;
  readonly colorToken: string;
  readonly values: readonly { readonly period: string; readonly value: number | null }[];
}

export interface CohortSummary {
  readonly id: string;
  readonly label: string;
  readonly eligible: number | null;
  readonly contributors: number | null;
  readonly participation: number | null;
  readonly privacyState: PrivacyState;
  readonly explanation: string;
}

export interface DataCoverageSummary {
  readonly validContributors: number;
  readonly expectedContributors: number;
  readonly completeWindows: number;
  readonly expectedWindows: number;
  readonly thresholdReadyCohorts: number;
  readonly totalCohorts: number;
  readonly coverage: number;
  readonly missingRate: number;
  readonly reportReady: boolean;
  readonly methodologyVersion: string;
}

export interface CampaignSummary {
  readonly id: string;
  readonly title: string;
  readonly state: "ACTIVE" | "UPCOMING" | "PAUSED";
  readonly startsOn: string;
  readonly endsOn: string;
  readonly reachedCohorts: number;
  readonly eligibleCohorts: number;
  readonly previewState: "PUBLISHED" | "READY" | "WITHDRAWN";
  readonly employeeControl: string;
  readonly aggregateMetrics: readonly MetricId[];
}

export interface ReportSummary {
  readonly id: string;
  readonly name: "EyeMate Program Implementation & Participation Report";
  readonly period: string;
  readonly state: "READY" | "DRAFT" | "REVOKED";
  readonly methodologyVersion: string;
  readonly coverage: number;
  readonly issuedOn: string | null;
  readonly hash: string | null;
}

export interface AppVersionDistribution {
  readonly version: string;
  readonly devices: number;
  readonly state: "CURRENT" | "UPDATE_AVAILABLE" | "BLOCKED" | "UNKNOWN";
}

export interface PrivacyThresholdPolicy {
  readonly minimumEligibleCohort: 20;
  readonly minimumContributors: 15;
  readonly suppressCellsBelow: 10;
  readonly status: "PROPOSED";
}

export interface EnterpriseDemoAuditEvent {
  readonly id: string;
  readonly actor: string;
  readonly action: string;
  readonly result: "ALLOWED" | "DENIED";
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
  readonly organization: SyntheticOrganization;
  readonly period: ReportingPeriod;
  readonly policy: EnterpriseDemoPolicy;
  readonly thresholds: PrivacyThresholdPolicy;
  readonly routes: readonly EnterpriseDemoRoute[];
  readonly metrics: readonly MetricObservation[];
  readonly trendSeries: readonly MetricSeries[];
  readonly cohorts: readonly CohortSummary[];
  readonly dataCoverage: DataCoverageSummary;
  readonly campaigns: readonly CampaignSummary[];
  readonly reports: readonly ReportSummary[];
  readonly versions: readonly AppVersionDistribution[];
  readonly audit: readonly EnterpriseDemoAuditEvent[];
  readonly forbiddenEmployerFeatures: readonly string[];
}

export const enterpriseDemoRoutes: readonly EnterpriseDemoRoute[] = ["overview", "insights", "campaigns", "report", "it", "transparency", "audit"];

export const enterpriseMetricDefinitions: Readonly<Record<MetricId, MetricDefinition>> = {
  "enrollment-coverage": { id: "enrollment-coverage", label: "Phủ sóng đăng ký", shortLabel: "Phủ sóng", plainLanguageDefinition: "Tỷ lệ vị trí đủ điều kiện đã kích hoạt EyeMate.", numeratorLabel: "vị trí đã kích hoạt", denominatorLabel: "vị trí đủ điều kiện", unit: "PERCENT", colorToken: "lime", icon: "users", favorableDirection: "UP", allowedInterpretation: "Phạm vi triển khai chương trình.", prohibitedInterpretation: "Không phải tỷ lệ nhân viên đang làm việc." },
  "monthly-active-participation": { id: "monthly-active-participation", label: "Tham gia chủ động hàng tháng", shortLabel: "Tham gia", plainLanguageDefinition: "Tỷ lệ contributor đủ điều kiện đã đóng góp aggregate trong tháng.", numeratorLabel: "contributor có aggregate", denominatorLabel: "contributor đủ điều kiện", unit: "PERCENT", colorToken: "violet", icon: "activity", favorableDirection: "UP", allowedInterpretation: "Mức tham gia chương trình ở cấp tổng hợp.", prohibitedInterpretation: "Không phải attendance hoặc thời gian làm việc." },
  "break-engagement": { id: "break-engagement", label: "Tương tác break", shortLabel: "Tương tác break", plainLanguageDefinition: "Tỷ lệ cửa sổ nhắc nghỉ đủ điều kiện có phản hồi aggregate.", numeratorLabel: "cửa sổ có tương tác", denominatorLabel: "cửa sổ đủ điều kiện", unit: "PERCENT", colorToken: "amber", icon: "break", favorableDirection: "UP", allowedInterpretation: "Mức tương tác với nhắc nghỉ của chương trình.", prohibitedInterpretation: "Không phải mức tuân thủ của từng nhân viên." },
  "long-observed-session-rate": { id: "long-observed-session-rate", label: "Tỷ lệ phiên quan sát dài", shortLabel: "Phiên dài", plainLanguageDefinition: "Tỷ lệ observed session tổng hợp dài từ hai giờ trở lên.", numeratorLabel: "phiên dài", denominatorLabel: "phiên quan sát đủ điều kiện", unit: "PERCENT", colorToken: "teal", icon: "clock", favorableDirection: "DOWN", allowedInterpretation: "Tín hiệu chương trình để điều chỉnh nhịp nghỉ.", prohibitedInterpretation: "Không phải thời gian làm việc hoặc fatigue score." },
  "data-coverage": { id: "data-coverage", label: "Độ phủ dữ liệu", shortLabel: "Độ phủ", plainLanguageDefinition: "Tỷ lệ contributor tạo dữ liệu aggregate hợp lệ trong kỳ.", numeratorLabel: "contributor hợp lệ", denominatorLabel: "contributor kỳ vọng", unit: "PERCENT", colorToken: "green", icon: "database", favorableDirection: "UP", allowedInterpretation: "Mức đủ dữ liệu để đọc báo cáo.", prohibitedInterpretation: "Không phải trạng thái sức khỏe." },
  "missing-unknown": { id: "missing-unknown", label: "Thiếu hoặc chưa rõ", shortLabel: "Thiếu/chưa rõ", plainLanguageDefinition: "Tỷ lệ observation thiếu hoặc không xác định.", numeratorLabel: "observation thiếu", denominatorLabel: "observation kỳ vọng", unit: "PERCENT", colorToken: "muted", icon: "unknown", favorableDirection: "DOWN", allowedInterpretation: "Giới hạn dữ liệu cần đọc cùng báo cáo.", prohibitedInterpretation: "Unknown không được hiểu thành 0 hoặc bình thường." }
};

export const defaultEnterpriseDemoPolicy: EnterpriseDemoPolicy = { defaultAggregateParticipation: false, cameraCoercionAllowed: false, managerDrillDownAllowed: false, identityInsightsJoinAllowed: false, realtimePresenceAllowed: false, syntheticDataOnly: true, networkAllowed: false };
export const defaultPrivacyThresholds: PrivacyThresholdPolicy = { minimumEligibleCohort: 20, minimumContributors: 15, suppressCellsBelow: 10, status: "PROPOSED" };

export const enterpriseDemoForbiddenEmployerFeatures: readonly string[] = [
  "Triệu chứng hoặc báo cáo cá nhân", "Luồng camera, raw frame hoặc landmark", "Điểm tập trung, mệt mỏi hoặc năng suất", "Hiện diện nhân viên theo thời gian thực", "Lịch sử nghỉ của một cá nhân", "Manager drill-down hoặc xếp hạng nhân viên"
];

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round(numerator * 1000 / denominator) / 10;
}

function observation(id: MetricId, numerator: number, denominator: number, previousNumerator: number, previousDenominator: number, coverage: number, missingRate: number, period: ReportingPeriod, points: readonly MetricPoint[]): MetricObservation {
  const value = ratio(numerator, denominator);
  const previousPeriodValue = ratio(previousNumerator, previousDenominator);
  return { id, definition: enterpriseMetricDefinitions[id], numerator, denominator, value, previousPeriodValue, deltaPoints: value === null || previousPeriodValue === null ? null : Math.round((value - previousPeriodValue) * 10) / 10, coverage, missingRate, reportingPeriod: period, metricVersion: "enterprise-metrics/1.0.0-proposed", privacyState: value === null ? "UNKNOWN" : "AVAILABLE", sourceState: coverage >= 80 ? "COMPLETE" : "PARTIAL", series: points.map((point) => ({ period: point.period, value: ratio(point.numerator, point.denominator) })) };
}

function safeCohort(id: string, label: string, eligible: number, contributors: number, thresholds: PrivacyThresholdPolicy): CohortSummary {
  if (eligible < thresholds.minimumEligibleCohort || contributors < thresholds.minimumContributors || contributors < thresholds.suppressCellsBelow) {
    return { id, label, eligible: null, contributors: null, participation: null, privacyState: "SUPPRESSED", explanation: `Không hiển thị vì chưa đạt ngưỡng cohort ${thresholds.minimumEligibleCohort} và contributor ${thresholds.minimumContributors}.` };
  }
  return { id, label, eligible, contributors, participation: ratio(contributors, eligible), privacyState: "AVAILABLE", explanation: "Aggregate đủ ngưỡng để hiển thị." };
}

export function createEnterpriseDemoModel(): EnterpriseDemoModel {
  const period: ReportingPeriod = { id: "2025-06", label: "Tháng 6, 2025", startsOn: "2025-06-01", endsOn: "2025-06-30", methodologyVersion: "enterprise-metrics/1.0.0-proposed", refreshedAt: "2025-07-01T09:20:00+07:00" };
  const periods = ["T1/2025", "T2/2025", "T3/2025", "T4/2025", "T5/2025", "T6/2025"];
  const points = (values: readonly [number, number][]): readonly MetricPoint[] => values.map(([numerator, denominator], index) => ({ period: periods[index] ?? `Kỳ ${index + 1}`, numerator, denominator }));
  const metrics = [
    observation("enrollment-coverage", 205, 247, 190, 247, 94, 6, period, points([[178, 240], [185, 242], [196, 245], [199, 247], [201, 247], [205, 247]])),
    observation("monthly-active-participation", 168, 247, 158, 247, 92, 8, period, points([[141, 240], [149, 242], [158, 245], [160, 247], [162, 247], [168, 247]])),
    observation("break-engagement", 842, 1238, 866, 1217, 88, 12, period, points([[624, 1090], [669, 1118], [723, 1172], [767, 1194], [866, 1217], [842, 1238]])),
    observation("long-observed-session-rate", 131, 1187, 166, 1182, 86, 14, period, points([[174, 1072], [168, 1101], [174, 1128], [171, 1150], [166, 1182], [131, 1187]]))
  ] as const;
  const coverage = { validContributors: 221, expectedContributors: 247, completeWindows: 28, expectedWindows: 30, thresholdReadyCohorts: 5, totalCohorts: 6, coverage: ratio(221, 247) ?? 0, missingRate: ratio(26, 247) ?? 0, reportReady: true, methodologyVersion: period.methodologyVersion };
  return {
    organization: { id: "northstar-studio", name: "Northstar Studio", plan: "Design partner · 247 vị trí", eligibleSeats: 247 },
    period,
    policy: defaultEnterpriseDemoPolicy,
    thresholds: defaultPrivacyThresholds,
    routes: enterpriseDemoRoutes,
    metrics,
    trendSeries: metrics.map((metric) => ({ metricId: metric.id, label: metric.definition.shortLabel, colorToken: metric.definition.colorToken, values: metric.series })),
    cohorts: [safeCohort("engineering", "Engineering", 62, 54, defaultPrivacyThresholds), safeCohort("finance", "Finance", 37, 30, defaultPrivacyThresholds), safeCohort("design", "Product Design", 43, 31, defaultPrivacyThresholds), safeCohort("product", "Product", 39, 26, defaultPrivacyThresholds), safeCohort("sales", "Sales", 46, 28, defaultPrivacyThresholds), safeCohort("operations", "Customer Operations", 40, 19, defaultPrivacyThresholds), safeCohort("legal", "Legal", 17, 12, defaultPrivacyThresholds)],
    dataCoverage: coverage,
    campaigns: [
      { id: "detox-mat", title: "Detox Mắt — Hè 2025", state: "ACTIVE", startsOn: "2025-06-01", endsOn: "2025-06-30", reachedCohorts: 5, eligibleCohorts: 6, previewState: "PUBLISHED", employeeControl: "Preview, opt-out và pause luôn khả dụng", aggregateMetrics: ["break-engagement", "monthly-active-participation"] },
      { id: "focus-reset", title: "Visual Reset — Tháng 7", state: "UPCOMING", startsOn: "2025-07-01", endsOn: "2025-07-31", reachedCohorts: 0, eligibleCohorts: 6, previewState: "READY", employeeControl: "Chưa mở đăng ký; không đo ẩn", aggregateMetrics: ["break-engagement"] }
    ],
    reports: [
      { id: "EPR-2025-06", name: "EyeMate Program Implementation & Participation Report", period: "Tháng 6, 2025", state: "READY", methodologyVersion: period.methodologyVersion, coverage: coverage.coverage, issuedOn: "2025-07-01", hash: "sha256:9f4e8d2a7ac2" },
      { id: "EPR-2025-Q2", name: "EyeMate Program Implementation & Participation Report", period: "Quý 2, 2025", state: "DRAFT", methodologyVersion: period.methodologyVersion, coverage: 87.4, issuedOn: null, hash: null }
    ],
    versions: [{ version: "0.1.0-m1", devices: 171, state: "CURRENT" }, { version: "0.0.9", devices: 49, state: "UPDATE_AVAILABLE" }, { version: "0.0.8", devices: 18, state: "BLOCKED" }, { version: "Không xác định", devices: 9, state: "UNKNOWN" }],
    audit: [
      { id: "audit-001", actor: "Wellbeing Admin", action: "Xem Program Insights", result: "ALLOWED", detail: "Cohort aggregate đủ ngưỡng; không có drill-down." },
      { id: "audit-002", actor: "Manager", action: "Mở lịch sử nghỉ cá nhân", result: "DENIED", detail: "Vai trò manager không có individual wellbeing view." },
      { id: "audit-003", actor: "Support Operator", action: "Đọc support metadata", result: "ALLOWED", detail: "Payload đã scrub; không chứa symptom, camera hoặc personal report." },
      { id: "audit-004", actor: "IT Admin", action: "Ép camera policy ON", result: "DENIED", detail: "Camera luôn do employee quyết định ở Personal Wellbeing Plane." }
    ],
    forbiddenEmployerFeatures: enterpriseDemoForbiddenEmployerFeatures
  };
}

export function isEnterpriseDemoRoute(value: string): value is EnterpriseDemoRoute { return enterpriseDemoRoutes.includes(value as EnterpriseDemoRoute); }

export function validateEnterpriseDemoBoundary(model: EnterpriseDemoModel): readonly string[] {
  const failures: string[] = [];
  if (model.policy.defaultAggregateParticipation !== false) failures.push("AGGREGATE_PARTICIPATION_NOT_OFF_BY_DEFAULT");
  if (model.policy.networkAllowed !== false || model.policy.syntheticDataOnly !== true) failures.push("DEMO_DATA_BOUNDARY_INVALID");
  if (model.policy.cameraCoercionAllowed || model.policy.managerDrillDownAllowed || model.policy.identityInsightsJoinAllowed || model.policy.realtimePresenceAllowed) failures.push("FORBIDDEN_ENTERPRISE_CAPABILITY_ENABLED");
  if (!model.cohorts.some((cohort) => cohort.privacyState === "SUPPRESSED" && cohort.eligible === null && cohort.contributors === null && cohort.participation === null)) failures.push("SUPPRESSION_SELECTOR_INVALID");
  if (model.metrics.some((metric) => metric.value === null && metric.privacyState === "AVAILABLE")) failures.push("UNKNOWN_RENDERED_AVAILABLE");
  const metricText = model.metrics.map((metric) => `${metric.id} ${metric.definition.label}`).join(" ").toLowerCase();
  if (/focus score|fatigue score|productivity score|health score/.test(metricText)) failures.push("PROHIBITED_METRIC");
  return failures;
}
