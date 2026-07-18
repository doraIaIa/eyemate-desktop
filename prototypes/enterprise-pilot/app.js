
const state = {
  view: "employee",
  aggregate: false,
  paused: false,
  selectedTemplate: "healthy-break",
};

const devices = [
  { device: "ACM-LT-0041", user: "an.nguyen@acme.example", version: "2.1.0", health: "Healthy", window: "Trong 24h", license: "Active", key: "healthy" },
  { device: "ACM-LT-0088", user: "linh.tran@acme.example", version: "2.0.4", health: "Update required", window: "Trong 24h", license: "Active", key: "update" },
  { device: "ACM-WS-0193", user: "minh.le@acme.example", version: "2.1.0", health: "Healthy", window: "Trong 24h", license: "Active", key: "healthy" },
  { device: "ACM-LT-0214", user: "hoa.pham@acme.example", version: "2.0.3", health: "Update required", window: "2–7 ngày", license: "Active", key: "update" },
  { device: "ACM-LT-0227", user: "quang.vo@acme.example", version: "2.1.0", health: "Stale", window: "> 7 ngày", license: "Active", key: "stale" },
];

const cohorts = {
  company: { size: 230, seats: 247, enrollment: 93, participation: 83, active: 191, break: 68, long: 11, coverage: 78, unknown: 22, contributors: 191, trend: [52,61,67,74,77,83] },
  engineering: { size: 87, seats: 91, enrollment: 96, participation: 88, active: 77, break: 78, long: 8, coverage: 81, unknown: 19, contributors: 77, trend: [60,65,69,75,81,88] },
  sales: { size: 32, seats: 36, enrollment: 89, participation: 79, active: 25, break: 51, long: 19, coverage: 73, unknown: 27, contributors: 25, trend: [58,63,65,70,76,79] },
  legal: { size: 12, seats: 13, enrollment: 92, participation: 75, active: 9, break: 64, long: 12, coverage: 70, unknown: 30, contributors: 9, trend: [62,68,71,72,73,75] },
};

const templates = [
  {
    id: "healthy-break",
    title: "Healthy Break Month",
    desc: "Khuyến khích các khoảng nghỉ ngắn trong phiên màn hình kéo dài.",
    preview: "Hãy thử nghỉ mắt ngắn trong các phiên màn hình kéo dài. Công ty chỉ nhận thống kê nhóm hàng tuần và không thấy lịch sử cá nhân của bạn."
  },
  {
    id: "202020",
    title: "20-20-20 Awareness",
    desc: "Giới thiệu nguyên tắc 20-20-20 bằng nội dung có thể tắt.",
    preview: "Trong 20 giây, hãy nhìn một vật ở xa khi thấy phù hợp. Bạn có thể đổi lịch hoặc tắt reminder bất cứ lúc nào."
  },
  {
    id: "new-employee",
    title: "New Employee Screen Setup",
    desc: "Hướng dẫn nhân viên mới thiết lập màn hình và thói quen sử dụng.",
    preview: "Chương trình onboarding này giúp bạn tự kiểm tra cách bố trí màn hình và chọn nhịp nghỉ phù hợp với mình."
  },
  {
    id: "peak-workload",
    title: "Peak Workload Recovery",
    desc: "Giảm cường độ nhắc trong giai đoạn cao điểm và hỗ trợ hồi phục.",
    preview: "Trong giai đoạn cao điểm, EyeMate sẽ ưu tiên các reminder nhẹ và ít gây gián đoạn. Bạn vẫn toàn quyền điều chỉnh."
  }
];

function $(id) { return document.getElementById(id); }

function showView(view) {
  state.view = view;
  document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === view));
  document.querySelectorAll(".nav-tab").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-tab").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.go)));

function renderDevices() {
  const filter = $("deviceFilter").value;
  const rows = devices.filter(d => filter === "all" || d.key === filter).map(d => `
    <tr>
      <td>${d.device}</td>
      <td>${d.user}</td>
      <td>${d.version}</td>
      <td>${d.health}</td>
      <td>${d.window}</td>
      <td><span class="badge allowed">${d.license}</span></td>
    </tr>
  `).join("");
  $("deviceTable").innerHTML = rows || `<tr><td colspan="6">Không có thiết bị phù hợp.</td></tr>`;
}

function renderTrend(values) {
  $("trendChart").innerHTML = values.map((v, i) => `
    <div class="bar" style="height:${Math.max(45, v * 2.25)}px">
      <span>${v}%</span><small>T${i+1}</small>
    </div>
  `).join("");
}

function renderCohort() {
  const key = $("cohortSelect").value;
  const data = cohorts[key];
  const suppressed = data.size < 20 || data.contributors < 15;

  $("suppressionNotice").classList.toggle("hidden", !suppressed);
  $("insightContent").classList.toggle("hidden", suppressed);
  if (suppressed) return;

  $("enrollmentMetric").textContent = data.enrollment + "%";
  $("enrollmentDenom").textContent = `${data.size} / ${data.seats} seats`;
  $("participationMetric").textContent = data.participation + "%";
  $("participationDenom").textContent = `${data.active} / ${data.size} activated`;
  $("breakMetric").textContent = data.break + "%";
  $("longMetric").textContent = data.long + "%";
  $("coverageMetric").textContent = data.coverage + "%";
  $("unknownMetric").textContent = data.unknown + "%";
  $("contributorsMetric").textContent = data.contributors;
  $("windowMetric").textContent = $("periodSelect").value === "month" ? "Tháng" : "Tuần";
  renderTrend(data.trend);
}

function renderTemplates() {
  $("templateList").innerHTML = templates.map(t => `
    <div class="template-card ${state.selectedTemplate === t.id ? "selected" : ""}" data-template="${t.id}">
      <strong>${t.title}</strong><span>${t.desc}</span>
    </div>
  `).join("");

  document.querySelectorAll("[data-template]").forEach(card => {
    card.addEventListener("click", () => {
      state.selectedTemplate = card.dataset.template;
      renderTemplates();
      renderCampaignPreview();
    });
  });
}

function renderCampaignPreview() {
  const t = templates.find(x => x.id === state.selectedTemplate);
  $("campaignPreviewTitle").textContent = t.title;
  $("campaignPreviewDescription").textContent = `${$("campaignDuration").value}, có thể tùy chỉnh hoặc tắt bất cứ lúc nào.`;
  $("campaignPreviewMessage").textContent = t.preview;
}

function updateParticipation() {
  const enabled = $("aggregateToggle").checked && !state.paused;
  const el = $("participationState");
  if (enabled) {
    el.className = "notice success";
    el.textContent = "Bạn đang tham gia chương trình bằng thống kê tổng hợp hàng tuần.";
  } else {
    el.className = "notice warning";
    el.textContent = state.paused
      ? "Đóng góp đang tạm dừng 30 ngày. Công ty không thấy ai đã tạm dừng."
      : "Bạn đã tắt đóng góp aggregate. Ứng dụng cá nhân vẫn hoạt động bình thường.";
  }
}

function showGeneric(title, html) {
  $("genericDialogTitle").textContent = title;
  $("genericDialogBody").innerHTML = html;
  $("genericDialog").showModal();
}

$("aggregateToggle").addEventListener("change", updateParticipation);
$("pauseBtn").addEventListener("click", () => {
  state.paused = !state.paused;
  $("pauseBtn").textContent = state.paused ? "Tiếp tục đóng góp" : "Tạm dừng đóng góp 30 ngày";
  updateParticipation();
});
$("unlinkBtn").addEventListener("click", () => showGeneric(
  "Rời tổ chức",
  `<div class="notice info">Liên kết enterprise sẽ bị hủy. Dữ liệu cá nhân tiếp tục ở local và không được gửi cho công ty.</div>
   <button class="danger-button full" onclick="document.getElementById('genericDialog').close()">Xác nhận trong prototype</button>`
));

$("deviceFilter").addEventListener("change", renderDevices);
$("exportInventoryBtn").addEventListener("click", () => showGeneric(
  "Export inventory",
  "<p>Prototype chỉ mô phỏng export device/app/license data. Không bao gồm wellbeing analytics.</p>"
));
$("rolloutBtn").addEventListener("click", () => showGeneric(
  "Rollout ring",
  "<p>Ví dụ: Canary 5% → Pilot 20% → Stable 100%. Mỗi ring chỉ quản lý phiên bản ứng dụng và rollback.</p>"
));

$("cohortSelect").addEventListener("change", renderCohort);
$("periodSelect").addEventListener("change", renderCohort);

$("campaignDuration").addEventListener("change", renderCampaignPreview);
$("campaignCohort").addEventListener("change", () => {
  const blocked = $("campaignCohort").value === "legal";
  $("campaignPrivacyWarning").classList.toggle("hidden", !blocked);
});
$("launchCampaignBtn").addEventListener("click", () => {
  const blocked = $("campaignCohort").value === "legal";
  if (blocked) {
    showGeneric("Campaign bị giới hạn", "<div class='notice warning'>Có thể gửi thông tin chung, nhưng analytics bị tắt vì cohort không đạt ngưỡng privacy.</div>");
  } else {
    showGeneric("Campaign prototype", "<div class='notice success'>Campaign đã được tạo trong prototype. Employee notice và opt-out là bắt buộc.</div>");
  }
});

$("generateReportBtn").addEventListener("click", () => {
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  $("reportId").textContent = `EM-REP-2026-${num}`;
  $("hashText").textContent = Math.random().toString(16).slice(2,6) + "…" + Math.random().toString(16).slice(2,6);
  $("issuedAt").textContent = new Date().toISOString().slice(0,10);
  $("verifyResult").classList.add("hidden");
});
$("verifyBtn").addEventListener("click", () => $("verifyResult").classList.remove("hidden"));

const queryRules = {
  individual: { allowed: false, reason: "Employer individual health view bị cấm bởi product invariant." },
  small: { allowed: false, reason: "Cohort dưới 20 người; analytics bị suppression." },
  difference: { allowed: false, reason: "Anti-differencing phát hiện nguy cơ suy ngược cá nhân." },
  realtime: { allowed: false, reason: "Real-time employee presence không thuộc mục đích wellbeing." },
  allowed: { allowed: true, reason: "Aggregate tháng, cohort 87 người, coverage đủ và không có drill-down." }
};

$("runQueryBtn").addEventListener("click", () => {
  const key = $("querySelect").value;
  const r = queryRules[key];
  $("queryResult").innerHTML = `<div class="notice ${r.allowed ? "success" : "danger"}">
    <strong>${r.allowed ? "ALLOWED" : "BLOCKED"}</strong><br>${r.reason}
  </div>`;
  const label = $("querySelect").options[$("querySelect").selectedIndex].text;
  const row = document.createElement("tr");
  row.innerHTML = `<td>${new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</td>
    <td>Prototype user</td><td>${label}</td>
    <td><span class="badge ${r.allowed ? "allowed" : "blocked"}">${r.allowed ? "Allowed" : "Blocked"}</span></td>
    <td>${r.reason}</td>`;
  $("auditTable").prepend(row);
});

$("privacySummaryBtn").addEventListener("click", () => $("privacyDialog").showModal());
$("closePrivacyDialog").addEventListener("click", () => $("privacyDialog").close());
$("closeGenericDialog").addEventListener("click", () => $("genericDialog").close());

renderDevices();
renderCohort();
renderTemplates();
renderCampaignPreview();
updateParticipation();
