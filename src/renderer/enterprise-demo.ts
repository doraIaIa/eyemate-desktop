import { createEnterpriseDemoModel, enterpriseMetricDefinitions, isEnterpriseDemoRoute, type CampaignSummary, type CohortSummary, type EnterpriseDemoRoute, type MetricId, type MetricObservation, type MetricSeries, type PrivacyState } from "../enterprise-demo/enterprise-demo-data.js";

type SetView = (content: string) => void;
type IconName = "overview" | "insights" | "cohort" | "campaign" | "report" | "it" | "transparency" | "audit" | "users" | "activity" | "break" | "clock" | "database" | "unknown" | "lock" | "check" | "shield" | "info" | "chevron";

const model = createEnterpriseDemoModel();
let aggregateParticipation: boolean = model.policy.defaultAggregateParticipation;
let selectedCampaignId = model.campaigns[0]?.id ?? "detox-mat";
let selectedInsightMetric: MetricId = "monthly-active-participation";
let selectedInsightCohort = "all";

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character); }
function formatPercent(value: number | null): string { return value === null ? "Chưa rõ" : `${Math.round(value)}%`; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }

function icon(name: IconName, label = ""): string {
  const paths: Readonly<Record<IconName, string>> = {
    overview: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 18h7M17.5 14v7"/>',
    insights: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/><path d="m4 8 6-4 6 7 5-5"/>',
    cohort: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    campaign: '<path d="m3 11 15-5v12L3 13zM11 16l1 5H7l-1-7"/><path d="M21 9v6"/>',
    report: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
    it: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 21h8M12 16v5M7 9h2M12 9h5"/>',
    transparency: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    audit: '<path d="M12 2 20 5v6c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M14 15a4 4 0 0 1 7 3v2"/>',
    activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    break: '<path d="M5 8h12v6a6 6 0 0 1-12 0zM17 10h2a3 3 0 0 1 0 6h-2M4 22h15"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 3.6 2.3c-1 .5-1.4 1.1-1.4 2.2M12 17.5h.01"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    shield: '<path d="M12 2 20 5v6c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V5z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>'
  };
  return `<svg class="enterprise-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"'}>${paths[name]}</svg>`;
}

export function routeFromEnterpriseDemoHash(hash = location.hash): EnterpriseDemoRoute {
  const parts = hash.replace(/^#\/?/, "").split("/");
  const candidate = parts[0] === "enterprise-demo" ? parts[1] : parts[0];
  return isEnterpriseDemoRoute(candidate) ? candidate : "overview";
}

const routeMeta: Readonly<Record<EnterpriseDemoRoute, { readonly label: string; readonly icon: IconName; readonly section: string }>> = {
  overview: { label: "Tổng quan", icon: "overview", section: "Chương trình" },
  insights: { label: "Program Insights", icon: "insights", section: "Phân tích" },
  campaigns: { label: "Chiến dịch", icon: "campaign", section: "Vận hành" },
  report: { label: "Báo cáo", icon: "report", section: "Vận hành" },
  it: { label: "IT Administration", icon: "it", section: "Quản trị" },
  transparency: { label: "Employee Transparency", icon: "transparency", section: "Quản trị" },
  audit: { label: "Privacy Audit", icon: "audit", section: "Quản trị" }
};

function demoNav(route: EnterpriseDemoRoute): string {
  let section = "";
  return `<nav class="enterprise-nav" aria-label="Điều hướng Enterprise demo">${model.routes.map((item) => {
    const meta = routeMeta[item];
    const heading = section === meta.section ? "" : `<span class="enterprise-nav-section">${escapeHtml(meta.section)}</span>`;
    section = meta.section;
    return `${heading}<a href="#/enterprise-demo/${item}" aria-current="${item === route ? "page" : "false"}" title="${escapeHtml(meta.label)}">${icon(meta.icon)}<span>${escapeHtml(meta.label)}</span></a>`;
  }).join("")}</nav>`;
}

function demoShell(route: EnterpriseDemoRoute, body: string): string {
  return `<section class="enterprise-demo" data-enterprise-demo-root data-demo-route="${route}">
    <aside class="enterprise-rail">
      <a class="enterprise-brand" href="#/enterprise-demo/overview" aria-label="EyeMate Enterprise demo overview"><span class="enterprise-brand-mark">✳</span><strong>EyeMate</strong><b>Enterprise</b><small>Nền tảng chương trình wellbeing thị giác tại nơi làm việc</small></a>
      ${demoNav(route)}
      <div class="enterprise-rail-note"><strong>Câu hỏi về dữ liệu?</strong><span>Chỉ aggregate theo cohort đủ ngưỡng. Không có dữ liệu cá nhân.</span><a href="#/enterprise-demo/transparency">Xem privacy boundary</a></div>
    </aside>
    <div class="enterprise-stage">
      <header class="enterprise-topbar">
        <div class="enterprise-org-select" title="Organization synthetic"><span><strong>${escapeHtml(model.organization.name)}</strong><small>${escapeHtml(model.organization.plan)}</small></span></div>
        <div class="enterprise-period">${icon("chevron")}<strong>${escapeHtml(model.period.label)}</strong>${icon("chevron")}</div>
        <div class="enterprise-topbar-spacer"></div>
        <span class="enterprise-environment">Development demo</span><span class="enterprise-synthetic">Synthetic data</span>
        <a class="enterprise-help" href="#/enterprise-demo/transparency" aria-label="Giải thích quyền riêng tư">${icon("info")}</a>
      </header>
      <main class="enterprise-main" id="enterprise-main">${body}</main>
    </div>
  </section>`;
}

function pageHeader(title: string, description: string, controls = ""): string {
  return `<header class="enterprise-page-header"><div><h1>${escapeHtml(title)}<i></i></h1><p>${escapeHtml(description)}</p></div>${controls}</header>`;
}

function stateBadge(state: PrivacyState): string {
  const label: Readonly<Record<PrivacyState, string>> = { AVAILABLE: "Đủ dữ liệu", UNKNOWN: "Chưa rõ", INSUFFICIENT_DATA: "Chưa đủ dữ liệu", SUPPRESSED: "Cohort bị ẩn" };
  return `<span class="enterprise-state is-${state.toLowerCase()}">${state === "SUPPRESSED" ? icon("lock") : state === "AVAILABLE" ? icon("check") : icon("unknown")}${label[state]}</span>`;
}

function delta(metric: MetricObservation): string {
  if (metric.deltaPoints === null) return `<span class="metric-delta neutral">${icon("unknown")}Không có kỳ so sánh</span>`;
  const improving = metric.definition.favorableDirection === "DOWN" ? metric.deltaPoints < 0 : metric.deltaPoints > 0;
  const symbol = metric.deltaPoints > 0 ? "↑" : metric.deltaPoints < 0 ? "↓" : "→";
  return `<span class="metric-delta ${improving ? "positive" : metric.deltaPoints === 0 ? "neutral" : "negative"}">${symbol} ${Math.abs(metric.deltaPoints).toFixed(1)} điểm so với tháng trước</span>`;
}

function ring(value: number | null, color: string): string {
  const angle = value === null ? 0 : Math.max(0, Math.min(100, value)) * 3.6;
  return `<span class="metric-ring color-${color}" style="--ring-angle:${angle}deg" aria-hidden="true"><i>${value === null ? icon("unknown") : icon("check")}</i></span>`;
}

function kpiCard(metric: MetricObservation): string {
  const definition = metric.definition;
  const accessible = metric.value === null ? `${definition.label}: chưa rõ` : `${definition.label}: ${formatPercent(metric.value)}, ${metric.numerator} trên ${metric.denominator} ${definition.denominatorLabel}, độ phủ ${metric.coverage}%`;
  return `<article class="enterprise-kpi color-${definition.colorToken}" aria-label="${escapeHtml(accessible)}">
    <div class="enterprise-kpi-label"><span>${icon(definition.icon, definition.label)}${escapeHtml(definition.label)}</span><button class="enterprise-info" type="button" aria-label="Giải thích ${escapeHtml(definition.label)}" data-tooltip="${escapeHtml(`${definition.plainLanguageDefinition} Mẫu số: ${definition.denominatorLabel}. Giới hạn: ${definition.prohibitedInterpretation}`)}">${icon("info")}</button></div>
    <div class="enterprise-kpi-body"><div><strong>${formatPercent(metric.value)}</strong><p>${metric.numerator ?? "—"} / ${metric.denominator ?? "—"} ${escapeHtml(definition.denominatorLabel)}</p>${delta(metric)}</div>${ring(metric.value, definition.colorToken)}</div>
    <footer><span>${escapeHtml(metric.reportingPeriod.label)}</span><span>Coverage ${metric.coverage ?? "—"}%</span><span>v1.0</span></footer>
  </article>`;
}

function legend(series: readonly MetricSeries[]): string {
  return `<div class="enterprise-chart-legend" aria-label="Chú thích biểu đồ">${series.map((item) => `<span><i class="color-${item.colorToken}"></i>${escapeHtml(item.label)}</span>`).join("")}</div>`;
}

function lineChart(series: readonly MetricSeries[], title: string): string {
  const width = 760; const height = 252; const left = 46; const right = 58; const top = 20; const bottom = 42;
  const periods = series[0]?.values.map((point) => point.period) ?? [];
  const innerWidth = width - left - right; const innerHeight = height - top - bottom;
  const x = (index: number): number => left + index * innerWidth / Math.max(1, periods.length - 1);
  const y = (value: number): number => top + (100 - value) * innerHeight / 100;
  const paths = series.map((item) => {
    const points = item.values.map((point, index) => point.value === null ? null : `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).filter((point): point is string => point !== null);
    const last = [...item.values].reverse().find((point) => point.value !== null);
    const lastIndex = last ? item.values.indexOf(last) : -1;
    return `<polyline class="enterprise-line color-${item.colorToken}" points="${points.join(" ")}"></polyline>${item.values.map((point, index) => point.value === null ? "" : `<circle class="enterprise-point color-${item.colorToken}" cx="${x(index)}" cy="${y(point.value)}" r="3.5"><title>${escapeHtml(item.label)} · ${escapeHtml(point.period)}: ${formatPercent(point.value)}</title></circle>`).join("")}${last && lastIndex >= 0 ? `<text class="enterprise-end-label color-${item.colorToken}" x="${x(lastIndex) + 9}" y="${y(last.value ?? 0) + 4}">${Math.round(last.value ?? 0)}%</text>` : ""}`;
  }).join("");
  const summary = series.map((item) => `${item.label}: ${item.values.map((point) => point.value === null ? "chưa rõ" : formatPercent(point.value)).join(", ")}`).join(". ");
  return `<figure class="enterprise-chart" aria-label="${escapeHtml(`${title}. ${summary}`)}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img"><g class="enterprise-grid-lines">${[0, 25, 50, 75, 100].map((tick) => `<line x1="${left}" x2="${width - right}" y1="${y(tick)}" y2="${y(tick)}"></line><text x="${left - 9}" y="${y(tick) + 4}" text-anchor="end">${tick}%</text>`).join("")}</g>${paths}<g class="enterprise-axis-labels">${periods.map((period, index) => `<text x="${x(index)}" y="${height - 12}" text-anchor="middle">${escapeHtml(period)}</text>`).join("")}</g></svg></figure>`;
}

function cohortBars(cohorts: readonly CohortSummary[]): string {
  const visible = [...cohorts].sort((a, b) => (b.participation ?? -1) - (a.participation ?? -1));
  return `<div class="enterprise-cohort-bars" role="list" aria-label="So sánh participation theo cohort">${visible.map((cohort) => cohort.privacyState === "SUPPRESSED" ? `<div class="cohort-row suppressed" role="listitem" aria-label="${escapeHtml(cohort.label)}: cohort bị ẩn"><span>${escapeHtml(cohort.label)}</span><div>${icon("lock")}<i>Suppressed</i></div><small>Không đạt ngưỡng báo cáo</small></div>` : `<div class="cohort-row" role="listitem" aria-label="${escapeHtml(cohort.label)}: ${formatPercent(cohort.participation)}"><span>${escapeHtml(cohort.label)}</span><div><i style="--cohort-value:${cohort.participation ?? 0}%"></i></div><strong>${formatPercent(cohort.participation)}</strong></div>`).join("")}</div>`;
}

function dataQualityPanel(): string {
  const quality = model.dataCoverage;
  return `<article class="enterprise-panel data-quality"><header><div><span class="section-icon">${icon("database")}</span><div><h2>Chất lượng dữ liệu & khả năng báo cáo</h2><p>Đọc cùng coverage và missing, không biến unknown thành zero.</p></div></div>${stateBadge(quality.reportReady ? "AVAILABLE" : "INSUFFICIENT_DATA")}</header><div class="quality-grid"><div><strong>${formatPercent(quality.coverage)}</strong><span>Contributor coverage</span><small>${quality.validContributors}/${quality.expectedContributors}</small></div><div><strong>${formatPercent(quality.missingRate)}</strong><span>Missing / unknown</span><small>${quality.expectedContributors - quality.validContributors} contributor</small></div><div><strong>${quality.completeWindows}/${quality.expectedWindows}</strong><span>Cửa sổ hoàn chỉnh</span><small>${model.period.label}</small></div><div><strong>${quality.thresholdReadyCohorts}/${quality.totalCohorts}</strong><span>Cohort đủ ngưỡng</span><small>Threshold proposed</small></div></div><footer><span>Methodology ${escapeHtml(quality.methodologyVersion)}</span><span>Minimum cohort ${model.thresholds.minimumEligibleCohort} · contributors ${model.thresholds.minimumContributors}</span></footer></article>`;
}

function campaignCompact(campaign: CampaignSummary): string {
  const reach = campaign.eligibleCohorts === 0 ? null : Math.round(campaign.reachedCohorts * 100 / campaign.eligibleCohorts);
  return `<article class="campaign-compact is-${campaign.state.toLowerCase()}"><span>${campaign.state === "ACTIVE" ? "Đang diễn ra" : campaign.state === "UPCOMING" ? "Sắp diễn ra" : "Đã tạm dừng"}</span><h3>${escapeHtml(campaign.title)}</h3><p>${formatDate(campaign.startsOn)} – ${formatDate(campaign.endsOn)}</p><div><i style="--campaign-progress:${reach ?? 0}%"></i></div><footer><span>${reach === null ? "Chưa bắt đầu" : `${reach}% aggregate reach`}</span><span>${escapeHtml(campaign.previewState)}</span></footer></article>`;
}

function reportCompact(): string {
  const report = model.reports[0];
  if (!report) return "";
  return `<article class="enterprise-panel report-compact"><header><div><span class="section-icon">${icon("report")}</span><div><h2>Báo cáo chương trình</h2><p>Implementation, participation và giới hạn phương pháp.</p></div></div>${stateBadge("AVAILABLE")}</header><strong>${escapeHtml(report.name)}</strong><div class="report-meta"><span>${escapeHtml(report.period)}</span><span>Coverage ${formatPercent(report.coverage)}</span><span>Methodology v1.0</span><span>${report.state}</span></div><a href="#/enterprise-demo/report">Mở báo cáo ${icon("chevron")}</a></article>`;
}

function privacyAdvantage(): string {
  return `<section class="enterprise-privacy-advantage"><div class="privacy-vault">${icon("lock")}</div><div><span>Quyền riêng tư là cấu trúc hệ thống</span><h2>Employer không bao giờ xem dữ liệu wellbeing cá nhân</h2><p>Chỉ aggregate theo cohort đủ ngưỡng được hiển thị; identity không join trực tiếp với Insights Plane.</p></div><div class="privacy-prohibitions">${model.forbiddenEmployerFeatures.map((item) => `<span>${icon("check")}${escapeHtml(item)}</span>`).join("")}</div><a href="#/enterprise-demo/transparency">Xem ranh giới dữ liệu ${icon("chevron")}</a></section>`;
}

function overview(): string {
  const controls = `<div class="enterprise-method-meta"><span>${escapeHtml(model.period.methodologyVersion)}</span><span>Cập nhật synthetic 09:20 · 01/07/2025</span></div>`;
  return demoShell("overview", `${pageHeader("Tổng quan chương trình", "Mức triển khai, tham gia và chất lượng dữ liệu ở cấp aggregate, ẩn danh.", controls)}
    <aside class="enterprise-aggregate-notice">${icon("shield")}<span><strong>Privacy-preserving aggregate</strong> Không real-time · Không individual drill-down · Legal đang được suppression.</span></aside>
    <section class="enterprise-kpi-grid">${model.metrics.slice(0, 4).map(kpiCard).join("")}</section>
    <section class="enterprise-overview-primary">
      <article class="enterprise-panel enterprise-trend-panel"><header><div><h2>Xu hướng 6 tháng</h2><p>Cùng color registry trên toàn bộ dashboard.</p></div><span class="enterprise-period-chip">6 tháng</span></header>${legend(model.trendSeries)}${lineChart(model.trendSeries, "Xu hướng chương trình sáu tháng")}</article>
      <article class="enterprise-panel enterprise-cohort-panel"><header><div><h2>So sánh theo cohort</h2><p>Monthly active participation · Cao đến thấp</p></div><a href="#/enterprise-demo/insights">Chi tiết</a></header>${cohortBars(model.cohorts)}<p class="enterprise-privacy-note">${icon("lock")} Legal bị ẩn từ data selector; không có giá trị trong DOM.</p></article>
    </section>
    <section class="enterprise-overview-secondary">${dataQualityPanel()}<article class="enterprise-panel campaign-summary"><header><div><span class="section-icon">${icon("campaign")}</span><div><h2>Chiến dịch</h2><p>Minh bạch, có preview và opt-out.</p></div></div><a href="#/enterprise-demo/campaigns">Quản lý</a></header>${model.campaigns.map(campaignCompact).join("")}</article>${reportCompact()}</section>
    ${privacyAdvantage()}`);
}

function transparency(): string {
  return demoShell("transparency", `${pageHeader("Employee Transparency", "Employee biết chương trình nào đang chạy, aggregate nào được dùng và luôn giữ quyền kiểm soát.")}
    <section class="enterprise-transparency-grid"><article class="enterprise-panel employee-notice"><span class="enterprise-environment">Employee notice preview</span><h2>${escapeHtml(model.organization.name)} đang chạy chương trình wellbeing thị giác cấp nhóm</h2><p>EyeMate chỉ đóng góp aggregate nếu bạn chủ động bật. Triệu chứng, camera, baseline và báo cáo cá nhân vẫn ở thiết bị.</p><label class="enterprise-switch"><input id="enterprise-aggregate-toggle" type="checkbox" ${aggregateParticipation ? "checked" : ""}><span><strong>Cho phép đóng góp aggregate</strong><small>Chỉ cohort đủ ngưỡng; trạng thái opt-out không hiển thị cho employer.</small></span></label><div class="enterprise-actions"><button class="enterprise-button primary" id="enterprise-save-participation" type="button">Lưu lựa chọn demo</button><button class="enterprise-button" id="enterprise-unlink" type="button">Unlink organization</button></div></article>
    <article class="enterprise-panel employee-controls"><h2>Quyền kiểm soát của employee</h2>${[["transparency","Thông báo rõ ràng","Xem campaign và metric aggregate trước khi tham gia"],["campaign","Pause hoặc opt-out","Không lộ lựa chọn cá nhân cho employer"],["database","Export và delete local","Không chuyển lịch sử cá nhân khi rời tổ chức"],["shield","Camera luôn tùy chọn","Enterprise policy không thể ép bật"]].map(([iconName,title,copy]) => `<div><span>${icon(iconName as IconName)}</span><p><strong>${title}</strong><small>${copy}</small></p></div>`).join("")}</article></section>${privacyAdvantage()}`);
}

function insightControls(): string {
  return `<div class="enterprise-filter-row"><label>Metric<select id="enterprise-metric-select">${model.metrics.slice(0, 4).map((metric) => `<option value="${metric.id}" ${metric.id === selectedInsightMetric ? "selected" : ""}>${escapeHtml(metric.definition.label)}</option>`).join("")}</select></label><label>Cohort<select id="enterprise-cohort-select"><option value="all">Tất cả cohort</option>${model.cohorts.map((cohort) => `<option value="${cohort.id}" ${cohort.id === selectedInsightCohort ? "selected" : ""}>${escapeHtml(cohort.label)}${cohort.privacyState === "SUPPRESSED" ? " · Suppressed" : ""}</option>`).join("")}</select></label><span>${escapeHtml(model.period.label)}</span></div>`;
}

function insights(): string {
  const metric = model.metrics.find((item) => item.id === selectedInsightMetric) ?? model.metrics[1];
  const series = metric ? [{ metricId: metric.id, label: metric.definition.label, colorToken: metric.definition.colorToken, values: metric.series }] : [];
  const visibleCohorts = selectedInsightCohort === "all" ? model.cohorts : model.cohorts.filter((cohort) => cohort.id === selectedInsightCohort);
  return demoShell("insights", `${pageHeader("Program Insights", "Phân tích chuyên sâu theo metric và cohort đủ ngưỡng; không có individual drill-down.", insightControls())}
    <section class="enterprise-insight-summary">${metric ? kpiCard(metric) : ""}<article><span>Định nghĩa</span><p>${escapeHtml(metric?.definition.plainLanguageDefinition ?? "")}</p><small>Không được diễn giải: ${escapeHtml(metric?.definition.prohibitedInterpretation ?? "")}</small></article><article><span>Privacy state</span>${stateBadge(metric?.privacyState ?? "UNKNOWN")}<p>Minimum cohort ${model.thresholds.minimumEligibleCohort} · contributors ${model.thresholds.minimumContributors}</p></article></section>
    <section class="enterprise-insights-grid"><article class="enterprise-panel enterprise-trend-panel"><header><div><h2>Xu hướng metric đã chọn</h2><p>${escapeHtml(model.period.methodologyVersion)}</p></div><span class="enterprise-period-chip">Theo tháng</span></header>${legend(series)}${lineChart(series, metric?.definition.label ?? "Metric")}</article><article class="enterprise-panel enterprise-cohort-panel"><header><div><h2>${selectedInsightCohort === "all" ? "So sánh cohort" : "Cohort đã chọn"}</h2><p>Cùng metric · suppression được áp dụng trước render</p></div></header>${cohortBars(visibleCohorts)}</article></section>${dataQualityPanel()}`);
}

function versionChart(): string {
  const total = model.versions.reduce((sum, item) => sum + item.devices, 0);
  const colors: Readonly<Record<string, string>> = { CURRENT: "lime", UPDATE_AVAILABLE: "amber", BLOCKED: "red", UNKNOWN: "muted" };
  return `<div class="version-chart" role="img" aria-label="Phân bổ phiên bản ứng dụng: ${model.versions.map((item) => `${item.version} ${item.devices} thiết bị`).join(", ")}"><div class="version-stack">${model.versions.map((item) => `<i class="color-${colors[item.state]}" style="--version-width:${item.devices * 100 / total}%"></i>`).join("")}</div><div class="version-legend">${model.versions.map((item) => `<span><i class="color-${colors[item.state]}"></i><b>${escapeHtml(item.version)}</b><strong>${item.devices}</strong><small>${item.state.replaceAll("_", " ")}</small></span>`).join("")}</div></div>`;
}

function itAdministration(): string {
  const total = model.versions.reduce((sum, item) => sum + item.devices, 0); const current = model.versions.find((item) => item.state === "CURRENT")?.devices ?? 0;
  return demoShell("it", `${pageHeader("IT Administration", "License, rollout, update health và support metadata đã scrub; không có wellbeing cá nhân.")}
    <section class="enterprise-kpi-grid it-kpis">${[["it","Device inventory",total,"Ứng dụng đã đăng ký"],["check","Current version",current,"Thiết bị ở phiên bản hiện tại"],["activity","Rollout progress",`${Math.round(current * 100 / total)}%`,"Ring A/B"],["shield","Support payload","Scrubbed","Không symptom/camera/report"]].map(([iconName,label,value,note]) => `<article class="enterprise-kpi operational"><div class="enterprise-kpi-label"><span>${icon(iconName as IconName)}${label}</span></div><strong>${value}</strong><p>${note}</p></article>`).join("")}</section>
    <section class="enterprise-it-grid"><article class="enterprise-panel"><header><div><h2>Phân bổ phiên bản ứng dụng</h2><p>${total} thiết bị synthetic · cập nhật 09:20</p></div><span class="enterprise-period-chip">Rollout ring A/B</span></header>${versionChart()}</article><article class="enterprise-panel update-health"><h2>Update health</h2>${model.versions.map((item) => `<div><span>${stateBadge(item.state === "CURRENT" ? "AVAILABLE" : item.state === "UNKNOWN" ? "UNKNOWN" : "INSUFFICIENT_DATA")}</span><p><strong>${escapeHtml(item.version)}</strong><small>${item.devices} thiết bị · ${item.state.replaceAll("_", " ")}</small></p></div>`).join("")}</article></section>
    <section class="enterprise-panel technical-issues"><header><div><h2>Technical issue summary</h2><p>Aggregate app health; không exact last active hoặc online now.</p></div></header><div class="quality-grid"><div><strong>7</strong><span>Update retry</span><small>Không có identity</small></div><div><strong>4</strong><span>Version blocked</span><small>Policy compatibility</small></div><div><strong>2</strong><span>Metadata unknown</span><small>Cần inventory refresh</small></div><div><strong>0</strong><span>Cross-tenant event</span><small>Validation synthetic</small></div></div></section>`);
}

function campaignCard(campaign: CampaignSummary): string {
  return `<article class="enterprise-campaign-card ${campaign.id === selectedCampaignId ? "selected" : ""}"><header><span class="enterprise-state is-${campaign.state.toLowerCase()}">${campaign.state}</span><span>${escapeHtml(campaign.previewState)}</span></header><h2>${escapeHtml(campaign.title)}</h2><p>${formatDate(campaign.startsOn)} – ${formatDate(campaign.endsOn)}</p><div class="campaign-metrics">${campaign.aggregateMetrics.map((id) => `<span><i class="color-${enterpriseMetricDefinitions[id].colorToken}"></i>${escapeHtml(enterpriseMetricDefinitions[id].shortLabel)}</span>`).join("")}</div><small>${escapeHtml(campaign.employeeControl)}</small><button class="enterprise-button" data-campaign="${escapeHtml(campaign.id)}" type="button">Xem policy state</button></article>`;
}

function campaigns(): string {
  const selected = model.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? model.campaigns[0];
  return demoShell("campaigns", `${pageHeader("Chiến dịch minh bạch", "Template có giới hạn, employee preview, opt-out, quiet hours và aggregate metrics.")}
    <section class="enterprise-campaign-grid">${model.campaigns.map(campaignCard).join("")}</section><section class="enterprise-panel campaign-policy"><header><div><h2>${escapeHtml(selected?.title ?? "Campaign")}</h2><p>Policy state · ${escapeHtml(selected?.previewState ?? "")}</p></div>${stateBadge("AVAILABLE")}</header><div class="enterprise-policy-grid">${[["transparency","Employee preview","Luôn thấy campaign và aggregate được dùng"],["shield","No camera coercion","Không bật camera, không đo ẩn"],["clock","Frequency cap","Tối đa 3 reminder/ngày · quiet hours"],["database","Aggregate only",selected?.aggregateMetrics.map((id) => enterpriseMetricDefinitions[id].label).join(", ") ?? ""]].map(([iconName,title,copy]) => `<div><span>${icon(iconName as IconName)}</span><p><strong>${title}</strong><small>${escapeHtml(copy)}</small></p></div>`).join("")}</div></section>`);
}

function programReport(): string {
  return demoShell("report", `${pageHeader("Program Report", "Báo cáo bằng chứng triển khai và tham gia; không phải chứng chỉ compliance hay kết quả sức khỏe.")}
    <section class="enterprise-report-grid">${model.reports.map((report) => `<article class="enterprise-report-card"><header>${icon("report")}<span class="enterprise-state is-${report.state.toLowerCase()}">${report.state}</span></header><h2>${escapeHtml(report.name)}</h2><p>${escapeHtml(report.period)}</p><div><span>Coverage</span><strong>${formatPercent(report.coverage)}</strong></div><dl><dt>Methodology</dt><dd>${escapeHtml(report.methodologyVersion)}</dd><dt>Report ID</dt><dd>${escapeHtml(report.id)}</dd><dt>Issue state</dt><dd>${report.issuedOn ? `Issued ${formatDate(report.issuedOn)}` : "Draft"}</dd><dt>Document hash</dt><dd>${escapeHtml(report.hash ?? "Chưa phát hành")}</dd></dl>${report.state === "READY" ? '<button class="enterprise-button primary" id="enterprise-revoke-report" type="button">Mô phỏng revoke</button>' : ""}</article>`).join("")}
    <article class="enterprise-panel report-claims"><h2>Claim boundary</h2><div class="claim-list allowed"><strong>Được phép</strong><span>${icon("check")}Phạm vi triển khai và participation aggregate</span><span>${icon("check")}Coverage, methodology và suppressed cohort</span><span>${icon("check")}Source, hash và trạng thái issue/revocation</span></div><div class="claim-list denied"><strong>Không được phép</strong><span>× Legal, ISO hoặc HSE compliance</span><span>× Hiệu quả y tế hoặc health status</span><span>× Causal productivity improvement</span></div></article></section>`);
}

function privacyAudit(): string {
  return demoShell("audit", `${pageHeader("Privacy Audit", "Hành động bị chặn được ghi nhận; support và export không bypass privacy gate.")}
    <section class="enterprise-audit-summary"><article><span>${icon("audit")}</span><div><strong>${model.audit.length}</strong><small>Audit event synthetic</small></div></article><article><span>${icon("lock")}</span><div><strong>${model.audit.filter((item) => item.result === "DENIED").length}</strong><small>Hành động bị chặn</small></div></article><article><span>${icon("shield")}</span><div><strong>0</strong><small>Privacy gate bypass</small></div></article></section>
    <section class="enterprise-panel"><header><div><h2>Audit trail synthetic</h2><p>Không chứa personal wellbeing payload.</p></div><span class="enterprise-period-chip">${escapeHtml(model.period.label)}</span></header><div class="enterprise-table-wrap"><div class="enterprise-table audit" role="table" aria-label="Privacy audit events"><div role="row"><strong>Actor</strong><strong>Action</strong><strong>Result</strong><strong>Detail</strong></div>${model.audit.map((event) => `<div role="row"><span>${escapeHtml(event.actor)}</span><span>${escapeHtml(event.action)}</span><span class="audit-${event.result.toLowerCase()}">${event.result}</span><span>${escapeHtml(event.detail)}</span></div>`).join("")}</div></div></section>${privacyAdvantage()}`);
}

function screen(route: EnterpriseDemoRoute): string {
  if (route === "transparency") return transparency(); if (route === "it") return itAdministration(); if (route === "insights") return insights(); if (route === "campaigns") return campaigns(); if (route === "report") return programReport(); if (route === "audit") return privacyAudit(); return overview();
}

export function renderEnterpriseDemo(setView: SetView): void {
  const route = routeFromEnterpriseDemoHash(); document.title = "EyeMate Enterprise Demo"; setView(screen(route));
  document.querySelector("#enterprise-save-participation")?.addEventListener("click", () => { aggregateParticipation = document.querySelector<HTMLInputElement>("#enterprise-aggregate-toggle")?.checked ?? false; renderEnterpriseDemo(setView); });
  document.querySelector("#enterprise-unlink")?.addEventListener("click", () => { aggregateParticipation = false; renderEnterpriseDemo(setView); });
  document.querySelector<HTMLSelectElement>("#enterprise-metric-select")?.addEventListener("change", (event) => { selectedInsightMetric = (event.currentTarget as HTMLSelectElement).value as MetricId; renderEnterpriseDemo(setView); });
  document.querySelector<HTMLSelectElement>("#enterprise-cohort-select")?.addEventListener("change", (event) => { selectedInsightCohort = (event.currentTarget as HTMLSelectElement).value; renderEnterpriseDemo(setView); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-campaign]"))) button.addEventListener("click", () => { selectedCampaignId = button.dataset.campaign ?? selectedCampaignId; renderEnterpriseDemo(setView); });
  document.querySelector("#enterprise-revoke-report")?.addEventListener("click", (event) => { const button = event.currentTarget as HTMLButtonElement; button.textContent = "Report revoked · verification inactive"; button.classList.remove("primary"); button.disabled = true; });
}
