import type { CheckupSummary, SafetyResponse, SurveyResponse } from "../shared/m1-contract.js";
import type { LocalExportFormat, NudgeResponse } from "../shared/preload-contract.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
import type { WorkSession } from "../work-session/session-state.js";

type RouteId = "home" | "checkup" | "companion" | "reports" | "privacy" | "settings";
type ReportTab = "overview" | "week" | "month" | "history";

const routes: readonly RouteId[] = ["home", "checkup", "companion", "reports", "privacy", "settings"];
const view = document.querySelector<HTMLElement>("#view");
const main = document.querySelector<HTMLElement>("#app-main");
const modalRoot = document.querySelector<HTMLElement>("#modal-root");
const toastRegion = document.querySelector<HTMLElement>("#toast-region");
let checkupStep = 1;
let checkupResult: CheckupSummary | null = null;
let reportTab: ReportTab = "overview";
let currentNudgeId: string | null = null;
let sessionTicker: number | null = null;
let activeStartedAt: number | null = null;
let activeElapsedBase = 0;

function routeFromHash(): RouteId {
  const candidate = location.hash.replace(/^#\/?/, "").split("/")[0];
  return routes.includes(candidate as RouteId) ? candidate as RouteId : "home";
}

function setView(content: string): void {
  if (view === null) return;
  view.innerHTML = content;
  main?.focus({ preventScroll: true });
  for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-route]"))) {
    link.setAttribute("aria-current", link.dataset.route === routeFromHash() ? "page" : "false");
  }
}

function pageHeading(eyebrow: string, title: string, description: string, action = ""): string {
  return `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subtle">${description}</p></div>${action}</header>`;
}

function skeletonPage(): void {
  setView(`${pageHeading("EyeMate", "Đang đồng bộ trạng thái cục bộ", "Không có dữ liệu nào rời khỏi thiết bị.")}
    <div class="grid grid-4"><div class="card skeleton" style="height:138px"></div><div class="card skeleton" style="height:138px"></div><div class="card skeleton" style="height:138px"></div><div class="card skeleton" style="height:138px"></div></div>`);
}

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error("LOCAL_OPERATION_TIMEOUT")), 10_000); });
  try { return await Promise.race([operation, timeout]); } finally { window.clearTimeout(timer); }
}

function errorView(title: string, reason: string): void {
  setView(`${pageHeading("Không thể tải", title, "Dữ liệu cục bộ của bạn không bị thay đổi.")}
    <section class="card empty-state" aria-label="Lỗi"><div><div class="empty-icon" aria-hidden="true">!</div><h2>${reason}</h2><p class="subtle">Hãy thử lại. Nếu lỗi tiếp diễn, đóng và mở lại EyeMate.</p><button class="btn btn-primary" id="retry-view" type="button">Thử lại</button></div></section>`);
  document.querySelector("#retry-view")?.addEventListener("click", () => void renderRoute());
}

function showToast(message: string, tone: "default" | "warning" = "default"): void {
  if (toastRegion === null) return;
  const toast = document.createElement("div");
  toast.className = `toast${tone === "warning" ? " callout warning" : ""}`;
  toast.textContent = message;
  toastRegion.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function showModal(title: string, body: string, actions: string): void {
  if (modalRoot === null) return;
  modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${title}</h2>${body}<div class="actions">${actions}<button class="btn btn-ghost" id="modal-close" type="button">Đóng</button></div></section></div>`;
  document.querySelector<HTMLButtonElement>("#modal-close")?.addEventListener("click", closeModal);
  document.querySelector<HTMLElement>(".modal-backdrop")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });
  document.querySelector<HTMLElement>(".modal")?.addEventListener("click", (event) => event.stopPropagation());
  document.querySelector<HTMLElement>(".modal")?.focus();
}

function closeModal(): void { modalRoot?.replaceChildren(); }
function formatDuration(ms: number): string { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function safeDate(value: string): string { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "Không rõ" : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" }); }
function humanLabel(value: string): string {
  const labels: Readonly<Record<string, string>> = {
    REVIEW_YOUR_RESPONSES: "Xem lại cảm nhận và nghỉ mắt nếu cần",
    SEEK_PROFESSIONAL_HELP: "Dừng checkup và tìm tư vấn chuyên môn phù hợp",
    INSUFFICIENT_DATA: "Chưa đủ dữ liệu",
    blinkDeviation: "độ lệch blink rate",
    breakCompliance: "mức tuân thủ nghỉ",
    distanceDeviation: "khoảng cách",
    nearLoad: "tải nhìn gần",
    patternEvidence: "pattern hành vi",
    symptomBurden: "mức khó chịu"
  };
  return escapeHtml(labels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("vi-VN"));
}

async function renderHome(): Promise<void> {
  const [runtime, reports, summaries, m3Reports, session] = await withTimeout(Promise.all([
    window.eyeMate.getRuntimeInfo(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries(), window.eyeMate.listM3Reports(), window.eyeMate.getWorkSession()
  ]));
  const latest = m3Reports.at(-1);
  const vli = latest?.daily.vli.score;
  const sessionCount = summaries.length;
  const orbState = session?.state === "ACTIVE" ? "Mắt đang được đồng hành" : "Sẵn sàng khi bạn cần";
  setView(`${pageHeading("Hôm nay", "Chào bạn, đôi mắt thế nào?", `EyeMate ${escapeHtml(runtime.applicationVersion)} · mọi xử lý diễn ra cục bộ.`)}
    <section class="orb-wrap" aria-label="Trạng thái sức khỏe mắt hiện tại">
      <div class="vitals-orb" role="img" aria-label="Trạng thái trung lập vì camera đang tắt" style="--arc-offset:534">
        <span class="orb-ripple"></span><span class="orb-core"></span>
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="orb-track" cx="100" cy="100" r="85"/><circle class="orb-arc" cx="100" cy="100" r="85"/></svg><span class="orb-eye"></span>
      </div><p class="orb-status"><strong>${orbState}</strong>Camera đang tắt · không có dữ liệu hình ảnh được thu thập</p>
    </section>
    <section class="grid grid-4" aria-label="Chỉ số hôm nay">
      ${metricCard("Blink rate", "—", "Camera đang tắt", null)}
      ${metricCard("Khoảng cách", "—", "Chưa đo", null)}
      ${metricCard("Eye Load Index", vli === null || vli === undefined ? "—" : String(Math.round(vli)), latest ? `Tin cậy ${Math.round(latest.daily.vli.dataConfidence * 100)}%` : "Chưa đủ dữ liệu", vli ?? null)}
      ${metricCard("Phiên đã lưu", String(sessionCount), `${reports.length} lần checkup`, Math.min(100, sessionCount * 10))}
    </section>
    <section class="card quick-actions" aria-label="Hành động nhanh"><p class="label">Bắt đầu</p><div class="actions"><a class="btn btn-primary" href="#/companion">Bắt đầu phiên</a><a class="btn" href="#/checkup">Khám mắt</a><a class="btn" href="#/reports">Xem báo cáo</a></div></section>`);
}

function metricCard(label: string, value: string, note: string, progress: number | null): string {
  return `<article class="card metric-card"><span class="label">${label}</span><span class="trend ${progress === null ? "unknown" : ""}">${progress === null ? "Chưa đo" : "↑ local"}</span><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span><div class="metric-progress"><span style="--progress:${progress === null ? 0 : Math.max(0, Math.min(100, progress))}%"></span></div></article>`;
}

function renderCheckup(): void {
  const titles = ["Chào mừng", "Khảo sát cảm nhận", "Kiểm tra camera", "Đo với camera", "Kết quả"];
  const stepBars = Array.from({ length: 5 }, (_, index) => `<span class="step ${index + 1 < checkupStep ? "done" : index + 1 === checkupStep ? "active" : ""}"></span>`).join("");
  let content = "";
  if (checkupStep === 1) content = `<div><p class="eyebrow">Bước 1 / 5</p><h2>${titles[0]}</h2><p class="subtle">EyeMate có thể tiếp tục hoàn toàn không camera. Camera chưa có runtime được xác minh nên luôn ở trạng thái tắt trong phiên bản này.</p><div class="callout success"><strong>Local Only</strong><br>Không upload, không lưu raw frame, video hoặc landmark.</div></div><div class="actions"><button class="btn btn-primary" id="checkup-consent" type="button">Tiếp tục không camera</button></div>`;
  if (checkupStep === 2) content = `<div><p class="eyebrow">Bước 2 / 5</p><h2>${titles[1]}</h2><p class="subtle">Contract hiện tại có một câu hỏi cảm nhận synthetic và Safety Gate. EyeMate không tự thêm OSDI-6 khi chưa được phê duyệt clinical.</p><fieldset class="option-grid"><legend class="label">Mức độ thoải mái mắt hiện tại</legend>${surveyOptions()}</fieldset><label class="label" for="safety-response">Tín hiệu cần dừng</label><select class="field" id="safety-response"><option value="NEGATIVE">Không có tín hiệu cần dừng</option><option value="CONFIRMED">Có tín hiệu cần dừng</option><option value="UNSURE">Chưa chắc</option><option value="PREFER_NOT_TO_ANSWER">Không muốn trả lời</option></select></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-survey-next" type="button">Tiếp tục</button></div>`;
  if (checkupStep === 3) content = `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><div class="callout warning"><strong>Camera không khả dụng</strong><br>Runtime camera chưa được tích hợp. EyeMate sẽ hoàn tất survey-only, không crash và không suy đoán chỉ số camera.</div><p class="subtle">Bạn vẫn nhận được kết quả dựa trên câu trả lời đã cung cấp.</p></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-camera-next" type="button">Dùng survey-only</button></div>`;
  if (checkupStep === 4) content = `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="empty-state"><div><div class="empty-icon" aria-hidden="true">◉</div><h3>Đo camera đã được bỏ qua an toàn</h3><p class="subtle">EAR, khoảng cách và blink counter không được hiển thị khi camera tắt.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-finish" type="button">Xem kết quả</button></div>`;
  if (checkupStep === 5) content = checkupResult ? `<div><p class="eyebrow">Bước 5 / 5</p><h2>${titles[4]}</h2><span class="status-pill ${checkupResult.status === "SAFETY_STOP" ? "warning" : ""}">${humanLabel(checkupResult.status)}</span><h3 class="section-heading">Gợi ý tiếp theo</h3><div class="grid grid-2"><div class="callout success"><strong>Làm ngay</strong><br>${humanLabel(checkupResult.action)}</div><div class="callout"><strong>Dữ liệu sử dụng</strong><br>Survey-only · camera không đo</div></div><p class="subtle section-note">Đây không phải chẩn đoán. Nếu khó chịu kéo dài hoặc có tín hiệu cần dừng, hãy tìm tư vấn chuyên môn phù hợp.</p></div><div class="actions"><button class="btn btn-primary" id="checkup-done" type="button">Về tổng quan</button><button class="btn" id="checkup-repeat" type="button">Làm lại</button></div>` : `<div class="empty-state"><div><div class="empty-icon">!</div><h2>Chưa có kết quả</h2><button class="btn" id="checkup-repeat" type="button">Bắt đầu lại</button></div></div>`;
  setView(`${pageHeading("Checkup", "Một phút để lắng nghe đôi mắt", "Flow từng bước, camera-off an toàn và không đưa ra chẩn đoán.")}<section class="wizard"><div class="stepper" aria-label="Tiến trình checkup">${stepBars}</div><article class="card wizard-card">${content}</article></section>`);
  bindCheckupControls();
}

function surveyOptions(): string {
  const values: readonly [SurveyResponse, string][] = [["NONE", "Không có khó chịu"], ["MILD", "Khó chịu nhẹ"], ["NOTICEABLE", "Khó chịu đáng chú ý"], ["UNSURE", "Chưa chắc"], ["PREFER_NOT_TO_ANSWER", "Không muốn trả lời"]];
  return values.map(([value, label], index) => `<label class="option"><input type="radio" name="survey-response" value="${value}" ${index === 0 ? "checked" : ""}> <span>${label}</span></label>`).join("");
}

let pendingSurvey: { response: SurveyResponse; safety: SafetyResponse } = { response: "NONE", safety: "NEGATIVE" };
function bindCheckupControls(): void {
  document.querySelector("#checkup-consent")?.addEventListener("click", async () => { try { await window.eyeMate.completeOnboardingWithoutCamera(); checkupStep = 2; renderCheckup(); } catch { errorView("Không thể hoàn tất onboarding", "Storage cục bộ chưa sẵn sàng"); } });
  document.querySelector("#checkup-back")?.addEventListener("click", () => { checkupStep = Math.max(1, checkupStep - 1); renderCheckup(); });
  document.querySelector("#checkup-survey-next")?.addEventListener("click", () => { pendingSurvey = { response: (document.querySelector<HTMLInputElement>("input[name='survey-response']:checked")?.value ?? "NONE") as SurveyResponse, safety: (document.querySelector<HTMLSelectElement>("#safety-response")?.value ?? "NEGATIVE") as SafetyResponse }; checkupStep = 3; renderCheckup(); });
  document.querySelector("#checkup-camera-next")?.addEventListener("click", () => { checkupStep = 4; renderCheckup(); });
  document.querySelector("#checkup-finish")?.addEventListener("click", async () => { try { checkupResult = await withTimeout(window.eyeMate.runSurveyOnly(pendingSurvey)); checkupStep = 5; renderCheckup(); } catch (error) { errorView("Không thể tạo kết quả", error instanceof Error && error.message === "LOCAL_OPERATION_TIMEOUT" ? "Quá 10 giây không có phản hồi" : "Checkup cục bộ gặp lỗi"); } });
  document.querySelector("#checkup-done")?.addEventListener("click", () => { location.hash = "#/home"; });
  document.querySelector("#checkup-repeat")?.addEventListener("click", () => { checkupStep = 1; checkupResult = null; renderCheckup(); });
}

async function renderCompanion(): Promise<void> {
  const session = await withTimeout(window.eyeMate.getWorkSession());
  setView(`${pageHeading("Work Companion", "Ở đây khi bạn cần tập trung", "Timer Only hoạt động local. Các mode camera được giữ tắt đến khi runtime được xác minh.")}
    <section class="mode-selector" aria-label="Chọn chế độ"><button class="mode active" type="button"><strong>Timer Only</strong><small>Khả dụng · không camera</small></button><button class="mode" type="button" disabled title="Tính năng này cần camera runtime đã xác minh"><strong>Camera + Timer</strong><small>Chưa khả dụng</small></button><button class="mode" type="button" disabled title="Tính năng này cần camera runtime đã xác minh"><strong>Camera Full</strong><small>Chưa khả dụng</small></button></section>
    <section class="card session-panel" id="session-panel">${sessionMarkup(session)}</section>`);
  bindSessionControls(session);
}

function sessionMarkup(session: WorkSession | null): string {
  if (session === null || ["COMPLETED", "CANCELLED", "FAILED"].includes(session.state)) return `<div><p class="label">Sẵn sàng</p><div class="session-timer">00:00:00</div><p class="subtle">Một phiên yên tĩnh, nhắc nghỉ vừa đủ.</p><button class="btn btn-primary" id="session-start" type="button">Bắt đầu phiên</button></div>`;
  const active = session.state === "ACTIVE";
  activeElapsedBase = session.elapsedActiveMs;
  if (active && activeStartedAt === null) activeStartedAt = performance.now();
  if (!active) activeStartedAt = null;
  return `<div class="${session.state === "PAUSED" ? "session-paused" : ""}"><p class="label">${session.state === "PAUSED" ? "Đang tạm dừng" : session.state === "RECOVERY_REQUIRED" ? "Cần tiếp tục phiên trước" : "Phiên đang hoạt động"}</p><div class="session-timer" id="session-timer">${formatDuration(session.elapsedActiveMs)}</div><p class="subtle">Break tiếp theo <span class="mono">20:00</span> · Camera tắt</p><div class="session-progress"><span style="--progress:${Math.min(100, session.elapsedActiveMs / 12_000)}%"></span></div><div class="actions"><button class="btn" id="session-toggle" type="button">${active ? "Tạm dừng" : "Tiếp tục"}</button><button class="btn" id="session-nudge" type="button" ${active ? "" : "disabled title=\"Chỉ khả dụng khi phiên đang chạy\""}>Nhắc tôi nghỉ</button><button class="btn btn-danger" id="session-end" type="button">Kết thúc phiên</button></div></div>`;
}

function bindSessionControls(session: WorkSession | null): void {
  if (sessionTicker !== null) window.clearInterval(sessionTicker);
  if (session?.state === "ACTIVE") sessionTicker = window.setInterval(() => { const element = document.querySelector("#session-timer"); if (element && activeStartedAt !== null) element.textContent = formatDuration(activeElapsedBase + performance.now() - activeStartedAt); }, 250);
  document.querySelector("#session-start")?.addEventListener("click", async () => { try { activeStartedAt = performance.now(); await window.eyeMate.startWorkSession("TIMER_ONLY"); await renderCompanion(); } catch { showToast("Không thể bắt đầu phiên. Hãy thử lại.", "warning"); } });
  document.querySelector("#session-toggle")?.addEventListener("click", async () => { if (!session) return; try { if (session.state === "ACTIVE") { const next = await window.eyeMate.pauseWorkSession(); activeElapsedBase = next.elapsedActiveMs; } else await window.eyeMate.resumeWorkSession(); activeStartedAt = null; await renderCompanion(); } catch { showToast("Không thể đổi trạng thái phiên.", "warning"); } });
  document.querySelector("#session-nudge")?.addEventListener("click", async () => { try { const decision = await window.eyeMate.requestBreakNudge(); if (decision.action === "EMIT") { currentNudgeId = decision.nudgeId; showNudge(); } else showToast(`Chưa nhắc lúc này: ${decision.reason}.`); } catch { showToast("Nudge chỉ khả dụng trong phiên đang chạy.", "warning"); } });
  document.querySelector("#session-end")?.addEventListener("click", () => {
    showModal("Kết thúc phiên?", "<p class=\"subtle\">EyeMate sẽ lưu Session Summary cục bộ. Dữ liệu camera không tồn tại trong phiên Timer Only.</p>", "<button class=\"btn btn-primary\" id=\"confirm-session-end\" type=\"button\">Lưu và kết thúc</button>");
    document.querySelector("#confirm-session-end")?.addEventListener("click", async () => { await window.eyeMate.finishWorkSession(); const finished = await window.eyeMate.finishWorkSession(); closeModal(); activeStartedAt = null; showSessionSummary(finished); });
  });
}

function showNudge(): void {
  if (toastRegion === null || currentNudgeId === null) return;
  toastRegion.innerHTML = `<aside class="toast" aria-label="Nhắc nghỉ"><p class="label">Một chút cho đôi mắt</p><strong>Nhìn xa và thả lỏng trong chốc lát?</strong><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-nudge="ACCEPTED" type="button">Nghỉ ngay</button><button class="btn" data-nudge="SNOOZED" type="button">Nhắc sau 5 phút</button><button class="btn btn-ghost" data-nudge="DISMISSED" type="button">Bỏ qua</button></div></aside>`;
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-nudge]"))) button.addEventListener("click", () => void respondNudge(button.dataset.nudge as NudgeResponse));
  document.addEventListener("click", dismissNudgeOutside, { once: true, capture: true });
}

function dismissNudgeOutside(event: Event): void { if (!(event.target as Element | null)?.closest(".toast")) void respondNudge("DISMISSED"); }
async function respondNudge(response: NudgeResponse): Promise<void> { if (currentNudgeId === null) return; await window.eyeMate.respondToNudge(currentNudgeId, response); currentNudgeId = null; toastRegion?.replaceChildren(); }
function showSessionSummary(session: WorkSession): void { showModal("Phiên đã hoàn thành", `<div class="grid grid-2"><div class="callout success"><span class="label">Tổng thời gian</span><strong class="metric-value">${formatDuration(session.elapsedActiveMs)}</strong></div><div class="callout"><span class="label">Dữ liệu camera</span><strong>Không đo</strong></div></div><p class="subtle" style="margin-top:16px">Session Summary đã lưu cục bộ. So sánh baseline cần thêm dữ liệu hợp lệ.</p>`, "<a class=\"btn btn-primary\" href=\"#/reports\">Xem báo cáo</a>"); document.querySelector(".modal a")?.addEventListener("click", closeModal); }

async function renderReports(): Promise<void> {
  const [reports, surveyReports, summaries] = await withTimeout(Promise.all([window.eyeMate.listM3Reports(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries()]));
  const latest = reports.at(-1);
  const tabs: readonly [ReportTab, string][] = [["overview", "Tổng quan"], ["week", "7 ngày"], ["month", "30 ngày"], ["history", "Lịch sử"]];
  setView(`${pageHeading("Personal Intelligence", "Hiểu nhịp làm việc của riêng bạn", "Tổng hợp hành vi local, không phải chẩn đoán.", `<button class="btn btn-primary" id="report-generate" type="button">Cập nhật báo cáo</button>`)}
    <div class="tabs" role="tablist" aria-label="Khoảng thời gian báo cáo">${tabs.map(([id, label]) => `<button class="tab ${reportTab === id ? "active" : ""}" data-report-tab="${id}" role="tab" aria-selected="${reportTab === id}" type="button">${label}</button>`).join("")}</div>
    <div id="report-content">${reportContent(reportTab, latest, surveyReports, summaries)}</div>`);
  document.querySelector("#report-generate")?.addEventListener("click", async () => { try { await window.eyeMate.generateM3Report(); showToast("Báo cáo local đã được cập nhật."); await renderReports(); } catch { showToast("Không thể tạo báo cáo lúc này.", "warning"); } });
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-report-tab]"))) tab.addEventListener("click", () => { reportTab = tab.dataset.reportTab as ReportTab; void renderReports(); });
  document.querySelector("#report-preview")?.addEventListener("click", async () => { const preview = await window.eyeMate.previewProfessionalSummary(); showModal("Doctor-Ready Summary", `<pre>${escapeHtml(preview)}</pre><p class="callout warning">Bản tóm tắt này không phải chẩn đoán hoặc hồ sơ y tế.</p>`, "<button class=\"btn btn-primary\" id=\"report-export\" type=\"button\">Export Markdown</button>"); bindExportButton("MARKDOWN"); });
  document.querySelector("#report-export-json")?.addEventListener("click", () => void exportReport("JSON"));
  document.querySelector("#report-reset")?.addEventListener("click", () => {
    showModal("Reset baseline?", "<p class=\"subtle\">Báo cáo cũ vẫn được giữ. Baseline mới bắt đầu ở trạng thái LEARNING.</p>", "<button class=\"btn btn-danger\" id=\"confirm-reset\" type=\"button\">Reset baseline</button>");
    document.querySelector("#confirm-reset")?.addEventListener("click", async () => { await window.eyeMate.resetM3Baseline(); closeModal(); showToast("Baseline đã được reset."); });
  });
}

function reportContent(tab: ReportTab, report: PersonalReport | undefined, surveys: readonly { readonly status: string; readonly action: string; readonly createdAt: string }[], summaries: readonly { readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]): string {
  if (tab === "month") return `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">30</div><h2>Chưa đủ dữ liệu 30 ngày</h2><p class="subtle">EyeMate không nội suy dữ liệu còn thiếu.</p><a class="btn btn-primary" href="#/companion">Bắt đầu một phiên</a></div></section>`;
  if (tab === "history") { const rows = [...surveys.map((item) => ({ title: `Checkup · ${humanLabel(item.status)}`, note: humanLabel(item.action), date: item.createdAt })), ...summaries.map((item) => ({ title: `Work session · ${humanLabel(item.status)}`, note: formatDuration(item.elapsedActiveMs), date: item.createdAt }))].sort((a,b) => b.date.localeCompare(a.date)); return rows.length ? `<div class="grid">${rows.map((item) => `<article class="card"><span class="label">${safeDate(item.date)}</span><h3>${item.title}</h3><p class="subtle">${item.note}</p></article>`).join("")}</div>` : emptyReport(); }
  if (!report) return emptyReport();
  if (tab === "week") return `<div class="grid grid-2"><article class="card"><p class="label">Weekly digest</p><strong class="metric-value">${report.weekly.daysWithData}/7 ngày</strong><p class="subtle">${report.weekly.missingDays} ngày chưa có dữ liệu. EyeMate không gắn nhãn “tốt/xấu” khi evidence chưa đủ.</p></article><article class="card"><p class="label">Nhịp làm việc</p>${heatmap(report.weekly.daysWithData)}</article></div>`;
  return `<div class="grid grid-2"><article class="card"><p class="label">Eye Load Index trend</p>${lineChart(report.daily.vli.score)}<p class="subtle">Điểm gần nhất · confidence ${Math.round(report.daily.vli.dataConfidence * 100)}%</p></article><article class="card"><p class="label">Baseline cá nhân</p><strong class="metric-value">${humanLabel(report.baseline.state)}</strong><p class="subtle">${report.baseline.sampleCount} mẫu hợp lệ · độ phủ ${Math.round(report.baseline.coverage * 100)}%</p><div class="session-progress"><span style="--progress:${Math.round(report.baseline.coverage * 100)}%"></span></div></article><article class="card"><p class="label">Weekly digest</p><h2>${report.weekly.daysWithData} ngày có dữ liệu</h2><p class="subtle">Nguồn: ${humanLabel(report.dataSource)}. Thiếu: ${report.missingData.map(humanLabel).join(", ") || "không có"}.</p></article><article class="card"><p class="label">Personal Intelligence</p><p class="subtle">Nudge effectiveness và drift alert cần thêm evidence hợp lệ; không suy diễn từ dữ liệu thiếu.</p><div class="actions"><button class="btn btn-primary" id="report-preview" type="button">Doctor-Ready Summary</button><button class="btn" id="report-export-json" type="button">Export JSON</button><button class="btn btn-ghost" id="report-reset" type="button">Reset baseline</button></div></article></div>`;
}

function lineChart(score: number | null): string { if (score === null) return `<div class="empty-state chart-placeholder"><p class="chart-empty">Chưa đủ dữ liệu để vẽ trend</p></div>`; const y = 170 - Math.min(100, score) * 1.4; return `<svg class="chart" viewBox="0 0 500 190" role="img" aria-label="Eye Load Index gần nhất là ${Math.round(score)}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="chart-grid" d="M20 30H480M20 90H480M20 150H480"/><path class="chart-area" d="M20 170 C160 160 320 ${y + 10} 460 ${y} L460 180H20Z"/><path class="chart-line" d="M20 170 C160 160 320 ${y + 10} 460 ${y}"/><circle class="chart-point" cx="460" cy="${y}" r="5"/></svg>`; }
function heatmap(activeDays: number): string { return `<div class="heatmap" aria-label="Heatmap 7 ngày, ${activeDays} ngày có dữ liệu">${Array.from({ length: 168 }, (_, index) => `<span data-level="${index < activeDays * 8 ? (index % 3) + 1 : 0}"></span>`).join("")}</div>`; }
function emptyReport(): string { return `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">⌁</div><h2>Chưa có báo cáo cá nhân</h2><p class="subtle">Bắt đầu một phiên hoặc checkup để tạo aggregate local đầu tiên.</p><a class="btn btn-primary" href="#/checkup">Bắt đầu khám</a></div></section>`; }
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function bindExportButton(format: LocalExportFormat): void { document.querySelector("#report-export")?.addEventListener("click", () => void exportReport(format)); }
async function exportReport(format: LocalExportFormat): Promise<void> { const result = await window.eyeMate.exportM3WithDialog(format, true); if (result.status === "EXPORTED") showToast("Đã export vào vị trí bạn chọn."); else if (result.status === "CANCELLED") showToast("Bạn đã hủy export."); else showToast(`Export thất bại: ${result.reason}.`, "warning"); }

async function renderPrivacy(): Promise<void> {
  const summary = await withTimeout(window.eyeMate.getPrivacySummary());
  setView(`${pageHeading("Privacy Center", "Dữ liệu của bạn, ở thiết bị của bạn", "Không account, không cloud và không lưu raw camera data.")}
    <div class="grid grid-2"><section class="card setting-group"><div class="setting-row"><div><label>Camera consent</label><small>${summary.cameraState.replaceAll("_", " ")}</small></div><button class="toggle" id="camera-consent-toggle" type="button" aria-label="Rút consent camera" aria-pressed="false"></button></div><div class="setting-row"><div><label>Dữ liệu local</label><small>Thư mục dữ liệu ứng dụng · đường dẫn đầy đủ được ẩn</small></div><span class="status-pill">Local</span></div><div class="setting-row"><div><label>Network verification</label><small>Static inspection PASS; dynamic WPR UNKNOWN</small></div><span class="status-pill warning">UNKNOWN</span></div></section><section class="card"><p class="label">Cam kết dữ liệu</p><h2>Raw frame không được lưu</h2><p class="subtle">Video, landmark và raw per-frame series không đi vào database, log hoặc evidence. Dynamic egress chưa được chứng minh do giới hạn host policy.</p></section></div>
    <section class="card" style="margin-top:16px"><p class="label">Quản lý dữ liệu</p><div class="actions"><button class="btn" id="privacy-export" type="button">Export dữ liệu</button><select class="field" id="privacy-export-format" aria-label="Định dạng export"><option value="MARKDOWN">Markdown</option><option value="JSON">JSON</option></select><button class="btn btn-danger" id="privacy-delete" type="button">Xóa toàn bộ dữ liệu</button></div><p class="subtle" style="margin-top:12px">File export bên ngoài ứng dụng không được xóa tự động.</p></section>`);
  document.querySelector("#camera-consent-toggle")?.addEventListener("click", async () => { await window.eyeMate.withdrawCameraConsent(); showToast("Consent camera đã được rút. Camera vẫn tắt."); await renderPrivacy(); });
  document.querySelector("#privacy-export")?.addEventListener("click", () => void exportReport((document.querySelector<HTMLSelectElement>("#privacy-export-format")?.value ?? "MARKDOWN") as LocalExportFormat));
  document.querySelector("#privacy-delete")?.addEventListener("click", showDeleteStepOne);
}

function showDeleteStepOne(): void { showModal("Xóa toàn bộ dữ liệu cục bộ?", "<p class=\"subtle\">Hành động này xóa onboarding, consent, session, report và aggregate do EyeMate quản lý. File export ngoài ứng dụng không bị xóa.</p><p class=\"callout warning\">Bước 1/2 · Không thể hoàn tác trong ứng dụng.</p>", "<button class=\"btn btn-danger\" id=\"delete-next\" type=\"button\">Tôi hiểu, tiếp tục</button>"); document.querySelector("#delete-next")?.addEventListener("click", showDeleteStepTwo); }
function showDeleteStepTwo(): void { showModal("Xác nhận lần cuối", "<p class=\"subtle\">Chọn “Xóa dữ liệu” để thực hiện ngay trên storage cục bộ.</p><p class=\"callout error\">Bước 2/2 · EyeMate sẽ báo kết quả thật.</p>", "<button class=\"btn btn-danger\" id=\"delete-confirm\" type=\"button\">Xóa dữ liệu</button>"); document.querySelector("#delete-confirm")?.addEventListener("click", async () => { const result = await window.eyeMate.deleteAllLocalData(); closeModal(); showToast(`Kết quả xóa: ${result}.`, result === "DELETED" ? "default" : "warning"); await renderPrivacy(); }); }

function renderSettings(): void {
  const sound = localStorage.getItem("eyemate.sound") === "on";
  setView(`${pageHeading("Settings", "Điều chỉnh theo nhịp của bạn", "Preference UI tự lưu cục bộ sau 500ms.")}
    <div class="grid grid-2"><section class="card setting-group"><p class="label">Appearance</p><div class="setting-row"><div><label for="appearance">Giao diện</label><small>Light theme chưa có token được duyệt</small></div><select class="field" id="appearance"><option>Dark</option><option disabled>Light · sắp có</option></select></div></section><section class="card setting-group"><p class="label">Notifications</p><div class="setting-row"><div><label>Âm thanh nudge</label><small>Tắt mặc định, chỉ lưu preference local</small></div><button class="toggle" id="sound-toggle" type="button" aria-label="Bật hoặc tắt âm thanh nudge" aria-pressed="${sound}"></button></div><div class="setting-row"><div><label for="break-interval">Khoảng nhắc nghỉ</label><small>Policy interval chưa có IPC cấu hình</small></div><select class="field" id="break-interval" disabled title="Cần policy contract trước khi thay đổi"><option>20 phút</option></select></div></section><section class="card setting-group"><p class="label">Camera</p><div class="setting-row"><div><label for="camera-device">Thiết bị</label><small>Camera runtime chưa khả dụng</small></div><select class="field" id="camera-device" disabled title="Tính năng này cần camera"><option>Camera đang tắt</option></select></div><button class="btn" type="button" disabled title="Tính năng này cần camera">Hiệu chỉnh camera</button></section><section class="card setting-group"><p class="label">Work session</p><div class="setting-row"><div><label for="default-mode">Mode mặc định</label><small>Mode khả dụng duy nhất</small></div><select class="field" id="default-mode"><option>Timer Only</option></select></div></section><section class="card setting-group"><p class="label">Data</p><div class="setting-row"><div><label for="retention">Retention</label><small>Chưa có data contract cho tự động xóa</small></div><select class="field" id="retention" disabled title="Cần data contract trước khi thay đổi"><option>Không tự động xóa</option></select></div><div class="setting-row"><div><label>Auto-backup</label><small>Tắt · chưa có destination contract</small></div><button class="toggle" type="button" disabled aria-label="Auto-backup chưa khả dụng" aria-pressed="false"></button></div></section><section class="card"><p class="label">About</p><h2>EyeMate 0.1.0</h2><p class="subtle">Local-first visual wellbeing companion.<br>Không phải thiết bị y tế hoặc công cụ chẩn đoán.</p></section></div>`);
  document.querySelector("#sound-toggle")?.addEventListener("click", (event) => { const target = event.currentTarget as HTMLButtonElement; const next = target.getAttribute("aria-pressed") !== "true"; target.setAttribute("aria-pressed", String(next)); window.setTimeout(() => { localStorage.setItem("eyemate.sound", next ? "on" : "off"); showToast("Cài đặt đã tự lưu cục bộ."); }, 500); });
}

async function renderRoute(): Promise<void> {
  if (sessionTicker !== null) { window.clearInterval(sessionTicker); sessionTicker = null; }
  skeletonPage();
  try {
    const route = routeFromHash();
    if (route === "home") await renderHome();
    else if (route === "checkup") renderCheckup();
    else if (route === "companion") await renderCompanion();
    else if (route === "reports") await renderReports();
    else if (route === "privacy") await renderPrivacy();
    else renderSettings();
  } catch (error) { errorView("Không thể tải trang", error instanceof Error && error.message === "LOCAL_OPERATION_TIMEOUT" ? "Quá 10 giây không có phản hồi" : "IPC cục bộ không phản hồi"); }
}

window.addEventListener("hashchange", () => void renderRoute());
if (!location.hash) location.replace("#/home");
void renderRoute();
