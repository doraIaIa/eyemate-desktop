type TasteView = "HOME" | "CHECKUP" | "COMPANION" | "INTELLIGENCE" | "REPORTS" | "PRIVACY" | "SETTINGS";
type TraceState = "READY" | "NOT_MEASURED" | "INSUFFICIENT_DATA" | "STALE" | "LOW_QUALITY" | "PRIVACY";

const destinations: readonly { readonly id: TasteView; readonly label: string; readonly utility?: boolean }[] = [
  { id: "HOME", label: "Hôm nay" },
  { id: "CHECKUP", label: "Khám mắt" },
  { id: "COMPANION", label: "Đồng hành" },
  { id: "INTELLIGENCE", label: "Thấu hiểu" },
  { id: "REPORTS", label: "Báo cáo" },
  { id: "PRIVACY", label: "Privacy Center", utility: true },
  { id: "SETTINGS", label: "Cài đặt", utility: true }
];

const traceStates: readonly TraceState[] = ["READY", "NOT_MEASURED", "INSUFFICIENT_DATA", "STALE", "LOW_QUALITY", "PRIVACY"];
const traceNotes: Readonly<Record<TraceState, string>> = {
  READY: "Evidence đã đủ cho trạng thái tham chiếu này.",
  NOT_MEASURED: "Tín hiệu chưa được đo. Không thay bằng số 0.",
  INSUFFICIENT_DATA: "Dữ liệu hiện có chưa đủ để nhận xét.",
  STALE: "Dấu vết cũ cần được làm mới trước khi so sánh.",
  LOW_QUALITY: "Phép đo không đạt chất lượng cần thiết.",
  PRIVACY: "Evidence chỉ mô tả dữ liệu cục bộ và quyền kiểm soát của bạn."
};

let activeView: TasteView = "HOME";
let activeTraceState: TraceState = "INSUFFICIENT_DATA";
let reducedMotion = false;
let reducedTransparency = false;
let viewTransitionPending = false;

function evidenceVisual(compact = false): string {
  const bars = [34, 46, 42, 58, 52, 66, 78, 55, 48, 43, 51, 62];
  return `<figure class="taste-trace ${compact ? "compact" : ""} trace-${activeTraceState.toLowerCase()}" aria-labelledby="taste-trace-title taste-trace-note">
    <div class="taste-trace-field" aria-hidden="true">
      <span class="taste-trace-contour contour-a"></span><span class="taste-trace-contour contour-b"></span>
      <span class="taste-trace-axis"></span><span class="taste-trace-break"></span>
      <span class="taste-spark-bars">${bars.map((height, index) => `<i style="--bar:${height}%" class="${index === 6 ? "peak" : ""}"></i>`).join("")}</span>
    </div>
    <figcaption><strong id="taste-trace-title">Evidence state · ${activeTraceState}</strong><span id="taste-trace-note">${traceNotes[activeTraceState]}</span><small>Đồ họa chỉ hỗ trợ đọc trạng thái, không suy luận sức khỏe.</small></figcaption>
  </figure>`;
}

function homeView(): string {
  return `<section class="taste-home" data-taste-view="HOME">
    <header class="taste-page-heading"><div><p class="taste-kicker">Thứ tư · 15 tháng 7</p><h1>Chào bạn, mình bắt đầu nhẹ nhàng nhé.</h1><p class="taste-lede">EyeMate giữ rõ điều đã ghi nhận, điều chưa đo và bước tiếp theo. Không phán xét.</p></div><div class="taste-filter-set"><button type="button">Hôm nay</button><button type="button">7 ngày</button><button class="selected" type="button">Tổng quan</button></div></header>
    <div class="taste-dashboard-grid">
      <article class="taste-overview-panel"><div class="taste-panel-heading"><div><span class="taste-section-mark"></span><p>Tổng quan hôm nay</p></div><small>DEMO DATA</small></div><div class="taste-overview-main"><div><strong>47</strong><span>phút tập trung<br>Phiên gần nhất · Timer Only</span></div>${evidenceVisual()}</div><div class="taste-actions" aria-label="Hành động nhanh"><button class="taste-button primary" type="button" data-taste-action="Bắt đầu phiên Timer Only">Bắt đầu phiên</button><button class="taste-button" type="button" data-taste-go="CHECKUP">Khám mắt</button><button class="taste-text-action" type="button" data-taste-go="REPORTS">Xem báo cáo</button></div></article>
      <article class="taste-focus-card"><div class="taste-panel-heading"><div><span class="taste-section-mark"></span><p>Đồng hành</p></div><small>QUIET MODE</small></div><p>Phiên đề xuất</p><strong>25:00</strong><span>Timer Only · Camera đang tắt</span><button type="button" data-taste-go="COMPANION">Mở phiên <b aria-hidden="true">→</b></button></article>
      <article class="taste-metric-panel"><span>Nhịp chớp mắt</span><strong>Chưa đo</strong><p>NOT_MEASURED<br>Camera đang tắt</p></article>
      <article class="taste-metric-panel"><span>Khoảng cách</span><strong>Chưa đo</strong><p>NOT_MEASURED<br>Không suy đoán</p></article>
      <article class="taste-metric-panel lime"><span>Tải thị giác</span><strong>Chưa đủ</strong><p>INSUFFICIENT_DATA<br>Confidence 0%</p></article>
      <article class="taste-next-panel"><div><span class="taste-section-mark"></span><p>Bước tiếp theo</p></div><h2>Một việc nhỏ là đủ.</h2><p>Thử một phiên tập trung hoặc checkup survey-only. Camera không bắt buộc.</p><button class="taste-round-action" type="button" data-taste-action="Mở gợi ý">↗</button></article>
    </div>
  </section>`;
}

function checkupView(): string {
  return `<section class="taste-letter" data-taste-view="CHECKUP">
    <header class="taste-page-heading"><div><p class="taste-kicker">Kết quả tham chiếu · demo data</p><h1>Những gì EyeMate có thể nói lúc này.</h1><p>Evidence được tách thành từng lớp để bạn biết điều gì đã ghi nhận và điều gì còn thiếu.</p></div><button class="taste-button" type="button" data-taste-action="Preview export">Preview trước export</button></header>
    <div class="taste-letter-body">
      <section class="taste-letter-lead"><span>Observation</span><strong>01</strong><h2>Bạn đã hoàn thành phần tự ghi nhận.</h2><p>Nguồn: self-report demo. Camera không được dùng trong reference này.</p></section>
      <section><span>Pattern</span><h2>Chưa đủ dữ liệu để nhận xét.</h2><p>Không tạo pattern thay thế khi evidence còn thiếu.</p></section>
      <section class="lime"><span>Missing</span><h2>Nhịp chớp mắt và khoảng cách chưa đo.</h2><p>NOT_MEASURED không được quy đổi thành bình thường hoặc 0.</p></section>
      <section><span>Confidence</span><h2>Data confidence chưa đủ.</h2><p>Confidence mô tả độ đầy đủ của evidence, không phải xác suất bệnh.</p></section>
      <section class="taste-letter-action"><span>Action</span><h2>Thử nhìn xa trong chốc lát.</h2><p>Action wellness mẫu, không phải điều trị hoặc chẩn đoán.</p><button class="taste-round-action" type="button" data-taste-action="Mở action">→</button></section>
    </div>
  </section>`;
}

function companionView(): string {
  return `<section class="taste-companion" data-taste-view="COMPANION">
    <header class="taste-page-heading"><div><p class="taste-kicker">Quiet mode · demo data</p><h1>Ở đây khi bạn cần tập trung.</h1><p>Timer Only đang hoạt động. Camera tắt và không có metric camera được suy đoán.</p></div><span class="taste-live-badge">Phiên đang chạy</span></header>
    <div class="taste-companion-grid"><article class="taste-focus-stage"><div class="taste-timer"><span>Phiên đang hoạt động</span><strong>24:18</strong><small>Nhắc nghỉ theo cooldown policy</small></div>${evidenceVisual(true)}<div class="taste-actions"><button class="taste-button light" type="button" data-taste-action="Tạm dừng">Tạm dừng</button><button class="taste-button lime" type="button" data-taste-action="Hoàn thành">Hoàn thành</button><button class="taste-text-action danger" type="button" data-taste-action="Hủy phiên">Hủy phiên</button></div></article>
      <aside class="taste-session-rail"><div><span>Tiến độ phiên</span><strong>46%</strong></div><div class="taste-progress-track"><i></i></div><dl><div><dt>Chế độ</dt><dd>Timer Only</dd></div><div><dt>Camera</dt><dd>Đang tắt</dd></div><div><dt>Nudge</dt><dd>Cooldown</dd></div></dl></aside>
      <aside class="taste-nudge" aria-label="Nhắc nghỉ mẫu"><div><span>Nhắc nghỉ</span><strong>Thử nhìn xa trong chốc lát?</strong><p>Lời nhắc rõ nhưng không phát sáng hoặc thay đổi đột ngột.</p></div><div class="taste-actions"><button class="taste-button primary" type="button" data-taste-action="Nghỉ ngay">Nghỉ ngay</button><button class="taste-button" type="button" data-taste-action="Nhắc sau">Nhắc sau</button><button class="taste-text-action" type="button" data-taste-action="Bỏ qua">Bỏ qua</button></div></aside>
    </div>
  </section>`;
}

function intelligenceView(): string {
  return `<section class="taste-journal" data-taste-view="INTELLIGENCE">
    <header class="taste-page-heading"><div><p class="taste-kicker">Thấu hiểu · demo data</p><h1>Evidence trước, pattern sau.</h1><p>Baseline và tải thị giác chỉ xuất hiện khi coverage đủ.</p></div><button class="taste-button" type="button" data-taste-action="Reset baseline preview">Reset baseline</button></header>
    <article class="taste-chart-panel"><div class="taste-panel-heading"><div><span class="taste-section-mark"></span><p>Coverage 7 ngày</p></div><small>1/7 ngày có dữ liệu</small></div><div class="taste-bar-chart" aria-label="Biểu đồ coverage mẫu"><i style="--h:28%"></i><i style="--h:42%"></i><i style="--h:34%"></i><i class="active" style="--h:72%"></i><i style="--h:39%"></i><i style="--h:47%"></i><i style="--h:30%"></i></div><div class="taste-chart-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></article>
    <ol class="taste-timeline"><li><time>Hôm nay</time><div><span>Baseline</span><h2>LEARNING</h2><p>1 mẫu hợp lệ · coverage 100% · baseline version 0.1.0.</p></div></li><li><time>7 ngày</time><div><span>Pattern</span><h2>INSUFFICIENT_DATA</h2><p>Thiếu tải nhìn gần, tuân thủ nghỉ và quality đủ điều kiện.</p></div></li><li><time>Hiện tại</time><div><span>Tải thị giác</span><h2>Chưa hiển thị điểm</h2><p>Data confidence 0%. Missing không được tính như 0.</p></div></li></ol>
    <aside class="taste-provenance"><h2>Tra cứu nhanh</h2><dl><div><dt>Source</dt><dd>Timer Only + self-report demo</dd></div><div><dt>Timezone</dt><dd>Asia/Bangkok</dd></div><div><dt>Report schema</dt><dd>m3-report/0.1.0</dd></div><div><dt>Camera</dt><dd>NOT_MEASURED</dd></div></dl></aside>
  </section>`;
}

function reportsView(): string {
  return `<section class="taste-journal" data-taste-view="REPORTS">
    <header class="taste-page-heading"><div><p class="taste-kicker">Báo cáo · demo data</p><h1>Một dòng thời gian có thể kiểm chứng.</h1><p>Số liệu, unit, confidence và version vẫn tra cứu nhanh.</p></div><div class="taste-filter-set"><button class="selected" type="button">Tuần</button><button type="button">Tháng</button><button type="button">Lịch sử</button></div></header>
    <article class="taste-chart-panel report"><div class="taste-panel-heading"><div><span class="taste-section-mark"></span><p>Thời gian tập trung</p></div><strong>47 phút</strong></div><div class="taste-report-line" aria-hidden="true"><span></span><i></i></div><small>Coverage 1/7 ngày · Không nội suy ngày thiếu</small></article>
    <ol class="taste-timeline report"><li><time>14/07</time><div><span>Daily summary</span><h2>47 phút trong một phiên Timer Only</h2><p>Longest session: 47 phút. Camera: NOT_MEASURED.</p></div></li><li><time>Tuần này</time><div><span>Coverage</span><h2>1/7 ngày có dữ liệu</h2><p>6 ngày thiếu. Không nội suy ngày chưa có dữ liệu.</p></div></li><li><time>Snapshot</time><div><span>Professional Summary</span><h2>Sẵn sàng để preview cục bộ</h2><p>Report schema m3-report/0.1.0.</p></div></li></ol>
    <aside class="taste-provenance"><h2>Report actions</h2><p>Xem nội dung trước khi chọn nơi lưu.</p><div class="taste-action-stack"><button class="taste-button primary" type="button" data-taste-action="Preview Markdown">Preview Markdown</button><button class="taste-button" type="button" data-taste-action="Preview JSON">Preview JSON</button><button class="taste-text-action danger" type="button" data-taste-action="Xóa report snapshots">Xóa report snapshots</button></div></aside>
  </section>`;
}

function privacyView(): string {
  return `<section class="taste-ledger" data-taste-view="PRIVACY"><header class="taste-page-heading"><div><p class="taste-kicker">Privacy Center · demo data</p><h1>Dữ liệu của bạn, quyền quyết định của bạn.</h1><p>Trạng thái network vẫn UNKNOWN khi dynamic verification chưa đủ evidence.</p></div><span class="taste-local-badge">Local Only</span></header><div class="taste-ledger-list"><section class="dark"><span>Camera consent</span><strong>SKIPPED</strong><p>Camera đang tắt. Survey-only vẫn khả dụng.</p><button class="taste-button light" type="button" disabled>Không có consent để rút</button></section><section><span>Data inventory</span><strong>5 nhóm dữ liệu cục bộ</strong><p>Checkup, session, nudge, report và preference.</p><button class="taste-button" type="button" data-taste-action="Preview và export">Preview và export</button></section><section class="lime"><span>Reset</span><strong>Baseline và calibration là hai action riêng</strong><p>Reset không âm thầm sửa report lịch sử.</p><button class="taste-button" type="button" data-taste-action="Reset baseline preview">Reset baseline</button></section><section class="danger-zone"><span>Delete</span><strong>Xóa phải báo kết quả thật</strong><p>DELETED, PARTIALLY_DELETED hoặc FAILED. File export bên ngoài không tự bị xóa.</p><button class="taste-button danger" type="button" data-taste-action="Xóa dữ liệu hai bước">Xóa toàn bộ dữ liệu</button></section></div></section>`;
}

function settingsView(): string {
  return `<section class="taste-ledger" data-taste-view="SETTINGS"><header class="taste-page-heading"><div><p class="taste-kicker">Cài đặt · demo data</p><h1>Điều chỉnh theo nhịp của bạn.</h1><p>Chỉ preference đã có handler thật mới được mô tả là khả dụng.</p></div></header><div class="taste-settings-list"><label><span>Giảm chuyển động<small>Tắt chuyển động không thiết yếu</small></span><input type="checkbox" checked disabled></label><label><span>Break reminder<small>Nối vào nudge policy</small></span><input type="checkbox" checked disabled></label><label><span>Âm thanh nudge<small>Âm báo ngắn được tạo cục bộ</small></span><input type="checkbox" disabled></label><label><span>Quiet hours<small>22:00 đến 07:00</small></span><input type="checkbox" checked disabled></label><label><span>Camera mode<small>Disabled by policy</small></span><select disabled><option>Timer Only</option></select></label><label><span>Appearance<small>Light reference · chưa rollout</small></span><select disabled><option>Clarity light</option></select></label></div></section>`;
}

function viewMarkup(): string {
  if (activeView === "CHECKUP") return checkupView();
  if (activeView === "COMPANION") return companionView();
  if (activeView === "INTELLIGENCE") return intelligenceView();
  if (activeView === "REPORTS") return reportsView();
  if (activeView === "PRIVACY") return privacyView();
  if (activeView === "SETTINGS") return settingsView();
  return homeView();
}

function navigationMarkup(): string {
  const primary = destinations.filter((item) => !item.utility);
  const utilities = destinations.filter((item) => item.utility);
  const button = (item: typeof destinations[number]): string => `<button class="taste-nav-button ${activeView === item.id ? "active" : ""}" type="button" data-taste-destination="${item.id}" aria-label="${item.label}" aria-current="${activeView === item.id ? "page" : "false"}"><span class="taste-nav-window" aria-hidden="true"><span class="taste-nav-track"><span>${item.label}</span><span>${item.label}</span></span></span></button>`;
  return `<header class="taste-topbar"><button class="taste-wordmark" type="button" data-taste-destination="HOME" aria-label="EyeMate Clarity Grid, về Hôm nay"><span aria-hidden="true">✳</span><strong>EyeMate</strong><small>Clarity Grid · Reference</small></button><nav class="taste-primary-nav" aria-label="Điều hướng mẫu">${primary.map(button).join("")}</nav><nav class="taste-utility-nav" aria-label="Quyền riêng tư và cài đặt">${utilities.map(button).join("")}</nav></header>`;
}

function controlsMarkup(): string {
  return `<footer class="taste-lab-controls"><div><span>Evidence preview</span><div class="taste-state-controls" role="group" aria-label="Evidence states">${traceStates.map((state) => `<button type="button" data-taste-trace-state="${state}" aria-pressed="${state === activeTraceState}">${state}</button>`).join("")}</div></div><div class="taste-preference-controls"><label><input id="taste-reduced-motion" type="checkbox" ${reducedMotion ? "checked" : ""}> Reduced motion</label><label><input id="taste-reduced-transparency" type="checkbox" ${reducedTransparency ? "checked" : ""}> Reduced transparency</label></div></footer>`;
}

function commitTasteView(nextView: TasteView): void {
  activeView = nextView;
  activeTraceState = activeView === "PRIVACY" ? "PRIVACY" : activeView === "COMPANION" ? "READY" : activeView === "HOME" ? "INSUFFICIENT_DATA" : activeTraceState;
  viewTransitionPending = false;
  renderTasteDesignLab();
}

function navigateTasteView(nextView: TasteView): void {
  if (viewTransitionPending || nextView === activeView) return;
  const systemReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || systemReducedMotion) {
    commitTasteView(nextView);
    return;
  }
  viewTransitionPending = true;
  document.querySelector<HTMLElement>(".taste-lab")?.classList.add("taste-view-leaving");
  setTimeout(() => commitTasteView(nextView), 110);
}

function addTasteRipple(button: HTMLButtonElement, event: PointerEvent): void {
  const bounds = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  const x = event.clientX > 0 ? event.clientX - bounds.left : bounds.width / 2;
  const y = event.clientY > 0 ? event.clientY - bounds.top : bounds.height / 2;
  ripple.className = "taste-click-ripple";
  ripple.setAttribute("aria-hidden", "true");
  ripple.style.setProperty("--taste-ripple-x", `${x}px`);
  ripple.style.setProperty("--taste-ripple-y", `${y}px`);
  button.append(ripple);
  setTimeout(() => ripple.remove(), 620);
}

function bindTasteDesignLab(): void {
  const root = document.querySelector<HTMLElement>(".taste-lab");
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-taste-destination], [data-taste-go]"))) button.addEventListener("click", () => {
    navigateTasteView((button.dataset.tasteDestination ?? button.dataset.tasteGo ?? "HOME") as TasteView);
  });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>(".taste-lab button:not(:disabled)"))) button.addEventListener("pointerdown", (event) => addTasteRipple(button, event));
  const navigationButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".taste-topbar [data-taste-destination]"));
  for (const [index, button] of navigationButtons.entries()) button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    navigationButtons[(index + direction + navigationButtons.length) % navigationButtons.length]?.focus();
  });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-taste-trace-state]"))) button.addEventListener("click", () => { activeTraceState = button.dataset.tasteTraceState as TraceState; renderTasteDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-taste-action]"))) button.addEventListener("click", () => { const status = document.querySelector<HTMLElement>("#taste-demo-status"); if (status) status.textContent = `Demo control: ${button.dataset.tasteAction}. Không gọi IPC hoặc thay đổi dữ liệu.`; });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>(".taste-filter-set button"))) button.addEventListener("click", () => {
    for (const item of Array.from(button.parentElement?.querySelectorAll("button") ?? [])) item.classList.toggle("selected", item === button);
    const status = document.querySelector<HTMLElement>("#taste-demo-status");
    if (status) status.textContent = `Demo filter: ${button.textContent?.trim() ?? "không rõ"}. Không gọi IPC hoặc thay đổi dữ liệu.`;
  });
  document.querySelector<HTMLInputElement>("#taste-reduced-motion")?.addEventListener("change", (event) => { reducedMotion = (event.currentTarget as HTMLInputElement).checked; renderTasteDesignLab(); });
  document.querySelector<HTMLInputElement>("#taste-reduced-transparency")?.addEventListener("change", (event) => { reducedTransparency = (event.currentTarget as HTMLInputElement).checked; renderTasteDesignLab(); });
  root?.classList.toggle("taste-reduced-motion", reducedMotion);
  root?.classList.toggle("taste-reduced-transparency", reducedTransparency);
}

export function renderTasteDesignLab(): void {
  const view = document.querySelector<HTMLElement>("#view");
  if (!view) return;
  view.innerHTML = `<section class="taste-lab ${reducedMotion ? "taste-reduced-motion" : ""} ${reducedTransparency ? "taste-reduced-transparency" : ""}" aria-label="EyeMate Clarity Grid Design Lab">${navigationMarkup()}<div class="taste-demo-banner">REFERENCE DEV-ONLY · KHÔNG GỌI IPC, CAMERA, DATABASE HOẶC NETWORK</div><main class="taste-canvas" id="taste-main" tabindex="-1">${viewMarkup()}</main>${controlsMarkup()}<p class="taste-demo-status" id="taste-demo-status" aria-live="polite">Reference screen dev-only. Production UI giữ nguyên.</p></section>`;
  document.querySelector<HTMLElement>("#app-main")?.scrollTo({ top: 0, left: 0 });
  bindTasteDesignLab();
  document.querySelector<HTMLElement>("#taste-main")?.focus({ preventScroll: true });
}
