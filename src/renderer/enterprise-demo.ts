import { createEnterpriseDemoModel, isEnterpriseDemoRoute, type EnterpriseDemoCampaign, type EnterpriseDemoMetric, type EnterpriseDemoRoute } from "../enterprise-demo/enterprise-demo-data.js";

type SetView = (content: string) => void;

const model = createEnterpriseDemoModel();
let aggregateParticipation: boolean = model.policy.defaultAggregateParticipation;
let selectedCampaignId = model.campaigns[0]?.id ?? "micro-break-week";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character] ?? character);
}

export function routeFromEnterpriseDemoHash(hash = location.hash): EnterpriseDemoRoute {
  const parts = hash.replace(/^#\/?/, "").split("/");
  const candidate = parts[0] === "enterprise-demo" ? parts[1] : parts[0];
  return isEnterpriseDemoRoute(candidate) ? candidate : "overview";
}

function demoNav(route: EnterpriseDemoRoute): string {
  const labels: Readonly<Record<EnterpriseDemoRoute, string>> = {
    overview: "Overview",
    transparency: "Employee Transparency",
    it: "IT Administration",
    insights: "Program Insights",
    campaigns: "Campaigns",
    report: "Program Report",
    audit: "Privacy Audit"
  };
  return `<nav class="enterprise-nav" aria-label="Enterprise demo navigation">
    ${model.routes.map((item) => `<a href="#/enterprise-demo/${item}" aria-current="${item === route ? "page" : "false"}">${labels[item]}</a>`).join("")}
  </nav>`;
}

function demoShell(route: EnterpriseDemoRoute, body: string): string {
  return `<section class="enterprise-demo" data-enterprise-demo-root data-demo-route="${route}">
    <aside class="enterprise-rail">
      <a class="enterprise-brand" href="#/enterprise-demo/overview" aria-label="EyeMate Enterprise demo overview">
        <span aria-hidden="true"></span>
        <strong>EyeMate Enterprise</strong>
        <small>Pilot Discovery Demo</small>
      </a>
      ${demoNav(route)}
      <div class="enterprise-rail-note">
        <strong>Boundary</strong>
        <span>Không employee monitoring. Không focus/fatigue/productivity score. Dữ liệu trong demo là synthetic.</span>
      </div>
    </aside>
    <div class="enterprise-stage">
      <header class="enterprise-topbar">
        <div>
          <span class="enterprise-pill">Development-only packaged demo</span>
          <span class="enterprise-pill muted">No backend</span>
          <span class="enterprise-pill muted">No network</span>
        </div>
        <strong>${escapeHtml(model.organization.name)}</strong>
      </header>
      ${body}
    </div>
  </section>`;
}

function hero(title: string, description: string, action = ""): string {
  return `<header class="enterprise-hero"><div><p class="enterprise-eyebrow">Workplace Visual Wellbeing Program Platform</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${action}</header>`;
}

function metricCard(metric: EnterpriseDemoMetric): string {
  return `<article class="enterprise-card enterprise-metric ${metric.status === "suppressed" ? "is-suppressed" : ""}">
    <div><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></div>
    <div class="enterprise-meter" aria-label="${escapeHtml(`${metric.label}: coverage ${metric.coverage}%`)}"><i style="--value:${metric.coverage}%"></i></div>
    <p>${escapeHtml(metric.interpretation)}</p>
    <small>${escapeHtml(metric.window)} · ${escapeHtml(metric.prohibitedInterpretation)}</small>
  </article>`;
}

function overview(): string {
  const denied = model.audit.filter((event) => event.result === "denied").length;
  return demoShell("overview", `${hero("Enterprise demo để đánh giá chương trình, không giám sát nhân viên", "Màn hình này minh họa Control Plane và Insights Plane bằng dữ liệu synthetic. Personal wellbeing data vẫn nằm local ở máy nhân viên.")}
    <section class="enterprise-grid four">
      <article class="enterprise-card stat"><span>Devices inventoried</span><strong>${model.organization.devices}</strong><small>Ứng dụng, version, rollout ring</small></article>
      <article class="enterprise-card stat"><span>Rollout ring</span><strong>${escapeHtml(model.organization.ring)}</strong><small>Không chứa wellbeing cá nhân</small></article>
      <article class="enterprise-card stat"><span>Denied privacy actions</span><strong>${denied}</strong><small>Camera coercion và drill-down bị chặn</small></article>
      <article class="enterprise-card stat"><span>Aggregate contribution</span><strong>${aggregateParticipation ? "ON" : "OFF"}</strong><small>Mặc định OFF cho employee</small></article>
    </section>
    <section class="enterprise-split">
      <article class="enterprise-panel">
        <h2>Three-plane architecture</h2>
        <div class="enterprise-plane"><strong>Personal Wellbeing Plane</strong><span>Symptom, camera, baseline, history và report nằm local. Employer không truy cập.</span></div>
        <div class="enterprise-plane"><strong>Enterprise Control Plane</strong><span>Organization, license, app version, device inventory, rollout ring, RBAC, audit.</span></div>
        <div class="enterprise-plane"><strong>Privacy-Preserving Insights Plane</strong><span>Weekly/monthly cohort aggregate, participation, break engagement, campaign reach, coverage.</span></div>
      </article>
      <article class="enterprise-panel">
        <h2>Forbidden employer features</h2>
        <ul class="enterprise-clean-list">${model.forbiddenEmployerFeatures.slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    </section>`);
}

function transparency(): string {
  return demoShell("transparency", `${hero("Employee thấy rõ chương trình trước khi đóng góp aggregate", "Không đo ẩn, không ép camera, không lộ opt-out cho employer. Employee có thể pause, unlink, export và delete dữ liệu cá nhân.")}
    <section class="enterprise-split">
      <article class="enterprise-panel employee-preview">
        <span class="enterprise-pill">Employee notice preview</span>
        <h2>Northstar Studio đang chạy chương trình sức khỏe thị giác cấp nhóm</h2>
        <p>EyeMate chỉ gửi đóng góp aggregate nếu bạn bật. Dữ liệu triệu chứng, camera, baseline và report cá nhân vẫn nằm trên thiết bị của bạn.</p>
        <label class="enterprise-switch"><input id="enterprise-aggregate-toggle" type="checkbox" ${aggregateParticipation ? "checked" : ""}> <span>Cho phép đóng góp aggregate ẩn danh theo cohort đủ ngưỡng</span></label>
        <div class="enterprise-actions"><button class="enterprise-button primary" id="enterprise-save-participation" type="button">Lưu lựa chọn demo</button><button class="enterprise-button" id="enterprise-unlink" type="button">Unlink organization</button></div>
        <p class="enterprise-note">Trạng thái opt-out không hiển thị cho manager hoặc employer dashboard.</p>
      </article>
      <article class="enterprise-panel">
        <h2>Employee controls</h2>
        <div class="enterprise-control-row"><strong>Pause campaign</strong><span>Employee tạm dừng reminder không khẩn cấp.</span></div>
        <div class="enterprise-control-row"><strong>Export personal data</strong><span>Chỉ local personal app xử lý, không gửi doanh nghiệp.</span></div>
        <div class="enterprise-control-row"><strong>Delete local data</strong><span>Rời tổ chức không chuyển dữ liệu cá nhân.</span></div>
        <div class="enterprise-control-row"><strong>Camera optional</strong><span>Enterprise policy không thể ép bật camera.</span></div>
      </article>
    </section>`);
}

function itAdministration(): string {
  return demoShell("it", `${hero("IT quản trị triển khai, không xem wellbeing cá nhân", "Control Plane chỉ giữ dữ liệu cần cho license, rollout, update health, RBAC, audit và support metadata đã scrub.")}
    <section class="enterprise-grid three">
      <article class="enterprise-card stat"><span>App version health</span><strong>94%</strong><small>${escapeHtml(model.organization.appVersion)} · ring A/B</small></article>
      <article class="enterprise-card stat"><span>Device inventory</span><strong>${model.organization.devices}</strong><small>Không có camera frame hoặc report cá nhân</small></article>
      <article class="enterprise-card stat"><span>Support payload</span><strong>Scrubbed</strong><small>Logs không chứa symptom/camera/landmark</small></article>
    </section>
    <section class="enterprise-panel">
      <h2>RBAC boundary</h2>
      <div class="enterprise-role-grid">
        ${["IT Admin: license, device inventory, update health", "Wellbeing Admin: cohort aggregate và campaign state", "Privacy Auditor: audit, policy, suppression evidence", "Executive Viewer: Program Evidence Report aggregate", "Support Operator: technical metadata đã scrub"].map((role) => `<div>${escapeHtml(role)}</div>`).join("")}
      </div>
    </section>`);
}

function insights(): string {
  return demoShell("insights", `${hero("Insights chỉ ở cấp cohort đủ ngưỡng", "Không có exact event timeline, không real-time, không individual drill-down và không join identity trực tiếp với wellbeing aggregate.")}
    <section class="enterprise-grid three">${model.metrics.map(metricCard).join("")}</section>
    <section class="enterprise-panel">
      <h2>Cohort suppression</h2>
      <div class="enterprise-table" role="table" aria-label="Cohort suppression demo">
        <div role="row"><strong>Cohort</strong><strong>Employees</strong><strong>Contributors</strong><strong>State</strong></div>
        ${model.cohorts.map((cohort) => `<div role="row"><span>${escapeHtml(cohort.label)}</span><span>${cohort.employees}</span><span>${cohort.contributors}</span><span class="${cohort.status === "suppressed" ? "enterprise-denied" : "enterprise-allowed"}">${cohort.status === "suppressed" ? "Suppressed cohort" : "Reportable aggregate"}</span></div>`).join("")}
      </div>
    </section>`);
}

function campaignCard(campaign: EnterpriseDemoCampaign): string {
  return `<article class="enterprise-card campaign ${campaign.id === selectedCampaignId ? "selected" : ""}">
    <span class="enterprise-pill">${escapeHtml(campaign.state)}</span>
    <h2>${escapeHtml(campaign.title)}</h2>
    <p>${escapeHtml(campaign.window)} · ${escapeHtml(campaign.reach)}</p>
    <small>${escapeHtml(campaign.employeeControl)}</small>
    <button class="enterprise-button" data-campaign="${escapeHtml(campaign.id)}" type="button">Preview policy state</button>
  </article>`;
}

function campaigns(): string {
  const selected = model.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? model.campaigns[0];
  return demoShell("campaigns", `${hero("Campaign minh bạch, có preview và opt-out", "Campaign chỉ dùng template đã duyệt, bounded settings, quiet hours, frequency cap và aggregate metrics. Không leaderboard, không target cá nhân.")}
    <section class="enterprise-grid three">${model.campaigns.map(campaignCard).join("")}</section>
    <section class="enterprise-panel">
      <h2>${escapeHtml(selected?.title ?? "Campaign")}</h2>
      <div class="enterprise-policy-grid">
        <div><strong>Employee preview</strong><span>Luôn thấy campaign đang diễn ra và aggregate nào được dùng.</span></div>
        <div><strong>No camera coercion</strong><span>Không bật camera, không đo ẩn.</span></div>
        <div><strong>Aggregate metrics</strong><span>${escapeHtml(selected?.aggregateOnly ?? "Aggregate only")}</span></div>
        <div><strong>Emergency rollback</strong><span>Privacy Auditor có thể pause/stop toàn bộ campaign.</span></div>
      </div>
    </section>`);
}

function programReport(): string {
  return demoShell("report", `${hero("Program Evidence Report không phải chứng chỉ compliance", "QR chỉ xác minh report source, document hash, report ID, issue/revocation state và methodology version.")}
    <section class="enterprise-split">
      <article class="enterprise-panel report-preview">
        <span class="enterprise-pill">Program Evidence Report</span>
        <h2>Northstar Studio · July pilot evidence</h2>
        <p>Coverage 82%. 1 cohort suppressed. Methodology enterprise-metric-dictionary/0.1.0-proposed.</p>
        <div class="enterprise-hash">sha256: 9f4e...7ac2 · report: PER-2026-07-NS</div>
        <button class="enterprise-button primary" id="enterprise-revoke-report" type="button">Simulate revocation</button>
      </article>
      <article class="enterprise-panel">
        <h2>Allowed claims</h2>
        <ul class="enterprise-clean-list">${model.reportClaims.allowed.map((claim) => `<li>${escapeHtml(claim)}</li>`).join("")}</ul>
        <h2>Prohibited claims</h2>
        <ul class="enterprise-clean-list denied">${model.reportClaims.prohibited.map((claim) => `<li>${escapeHtml(claim)}</li>`).join("")}</ul>
      </article>
    </section>`);
}

function privacyAudit(): string {
  return demoShell("audit", `${hero("Privacy audit cho thấy hành động bị chặn, không bị lách qua support/export", "Negative acceptance được minh họa trực tiếp: small cohort suppression, no identity join, no manager drill-down, no hidden camera.")}
    <section class="enterprise-panel">
      <h2>Audit trail synthetic</h2>
      <div class="enterprise-table audit" role="table" aria-label="Privacy audit events">
        <div role="row"><strong>Actor</strong><strong>Action</strong><strong>Result</strong><strong>Detail</strong></div>
        ${model.audit.map((event) => `<div role="row"><span>${escapeHtml(event.actor)}</span><span>${escapeHtml(event.action)}</span><span class="${event.result === "denied" ? "enterprise-denied" : "enterprise-allowed"}">${event.result}</span><span>${escapeHtml(event.detail)}</span></div>`).join("")}
      </div>
    </section>`);
}

function screen(route: EnterpriseDemoRoute): string {
  if (route === "transparency") return transparency();
  if (route === "it") return itAdministration();
  if (route === "insights") return insights();
  if (route === "campaigns") return campaigns();
  if (route === "report") return programReport();
  if (route === "audit") return privacyAudit();
  return overview();
}

export function renderEnterpriseDemo(setView: SetView): void {
  const route = routeFromEnterpriseDemoHash();
  document.title = "EyeMate Enterprise Pilot Demo";
  setView(screen(route));
  document.querySelector("#enterprise-save-participation")?.addEventListener("click", () => {
    aggregateParticipation = document.querySelector<HTMLInputElement>("#enterprise-aggregate-toggle")?.checked ?? false;
    renderEnterpriseDemo(setView);
  });
  document.querySelector("#enterprise-unlink")?.addEventListener("click", () => {
    aggregateParticipation = false;
    renderEnterpriseDemo(setView);
  });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-campaign]"))) {
    button.addEventListener("click", () => {
      selectedCampaignId = button.dataset.campaign ?? selectedCampaignId;
      location.hash = "#/enterprise-demo/campaigns";
      renderEnterpriseDemo(setView);
    });
  }
  document.querySelector("#enterprise-revoke-report")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.textContent = "Report revoked · verification inactive";
    button.classList.remove("primary");
    button.disabled = true;
  });
}
