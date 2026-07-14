import "../shared/renderer-globals.js";
import { getScreen, screenIds, type ScreenId } from "../app-shell/navigation.js";

const statusElement = document.querySelector<HTMLParagraphElement>("#runtime-status");
const pageTitleElement = document.querySelector<HTMLHeadingElement>("#page-title");
const pageBodyElement = document.querySelector<HTMLParagraphElement>("#page-body");
const pageStateElement = document.querySelector<HTMLParagraphElement>("#page-state");
const privacySummaryElement = document.querySelector<HTMLParagraphElement>("#privacy-summary");
const surveySelect = document.querySelector<HTMLSelectElement>("#survey-response");
const safetySelect = document.querySelector<HTMLSelectElement>("#safety-response");
const surveyButton = document.querySelector<HTMLButtonElement>("#run-survey");
const checkupSummaryElement = document.querySelector<HTMLParagraphElement>("#checkup-summary");
const onboardingButton = document.querySelector<HTMLButtonElement>("#complete-onboarding");
const onboardingStatusElement = document.querySelector<HTMLParagraphElement>("#onboarding-status");
const withdrawCameraButton = document.querySelector<HTMLButtonElement>("#withdraw-camera");
const deleteLocalDataButton = document.querySelector<HTMLButtonElement>("#delete-local-data");
const reportHistoryElement = document.querySelector<HTMLParagraphElement>("#report-history");
const sessionStatusElement = document.querySelector<HTMLParagraphElement>("#session-status");
const sessionModeElement = document.querySelector<HTMLSelectElement>("#session-mode");
const nudgeStatusElement = document.querySelector<HTMLParagraphElement>("#nudge-status");
const m3StatusElement = document.querySelector<HTMLParagraphElement>("#m3-status");
const m3PreviewElement = document.querySelector<HTMLPreElement>("#m3-preview-output");
const m3ExportPathElement = document.querySelector<HTMLInputElement>("#m3-export-path");
const m3ExportFormatElement = document.querySelector<HTMLSelectElement>("#m3-export-format");
const m3DeleteCategoryElement = document.querySelector<HTMLSelectElement>("#m3-delete-category");
const m3DetailsElement = document.querySelector<HTMLElement>("#m3-report-details");
let currentNudgeId: string | null = null;
function renderM3Report(report: import("../personal-intelligence/report-service.js").PersonalReport): void {
  if (m3DetailsElement === null) return;
  const pattern = report.daily.patterns[0];
  m3DetailsElement.textContent = [
    `Nguồn dữ liệu: ${report.dataSource}.`,
    `Baseline: ${report.baseline.state}; mẫu hợp lệ ${report.baseline.sampleCount}; độ phủ ${Math.round(report.baseline.coverage * 100)}%.`,
    `Ngày ${report.daily.localDate}: ${report.daily.totalSessionMinutes} phút; phiên dài nhất ${report.daily.longestSessionMinutes} phút.`,
    `VLI: ${report.daily.vli.score ?? "CHƯA ĐỦ DỮ LIỆU"}; độ tin cậy dữ liệu ${Math.round(report.daily.vli.dataConfidence * 100)}%.`,
    `Pattern: ${pattern?.status ?? "CHƯA ĐỦ DỮ LIỆU"}; bằng chứng ${pattern?.evidence.join(", ") || "không có"}; thiếu ${pattern?.missingData.join(", ") || "không có"}.`,
    `Tuần: ${report.weekly.status}; ${report.weekly.daysWithData} ngày có dữ liệu, ${report.weekly.missingDays} ngày thiếu.`,
    `Giới hạn: ${[...report.missingData, ...report.limitations].join(", ") || "không có"}.`,
    "EyeMate không chẩn đoán hoặc thay thế tư vấn chuyên môn."
  ].join(" ");
}
const renderSession = (session: Awaited<ReturnType<typeof window.eyeMate.getWorkSession>>) => { if (sessionStatusElement) sessionStatusElement.textContent = session ? `Phiên ${session.state}; thời gian hoạt động ${session.elapsedActiveMs} ms.` : "Chưa có phiên."; };

async function renderRuntimeStatus(): Promise<void> {
  if (statusElement === null) {
    return;
  }

  try {
    const runtime = await window.eyeMate.getRuntimeInfo();
    statusElement.textContent = `Chế độ ${runtime.mode.replaceAll("_", " ")} — phiên bản ${runtime.applicationVersion}`;
  } catch {
    statusElement.textContent = "Không thể xác minh trạng thái ứng dụng cục bộ.";
  }
}

void renderRuntimeStatus();

async function renderPrivacySummary(): Promise<void> {
  if (privacySummaryElement === null) return;
  try {
    const summary = await window.eyeMate.getPrivacySummary();
    privacySummaryElement.textContent = `Camera: ${summary.cameraState.replaceAll("_", " ")}. Export cần xác nhận đích: có.`;
  } catch {
    privacySummaryElement.textContent = "Không thể đọc tóm tắt quyền riêng tư cục bộ.";
  }
}

async function renderReportHistory(): Promise<void> {
  if (reportHistoryElement === null) return;
  const reports = await window.eyeMate.listSurveyOnlyReports();
  const sessions = await window.eyeMate.listSessionSummaries();
  reportHistoryElement.textContent = reports.length === 0 && sessions.length === 0 ? "Chưa có báo cáo cục bộ." : `Có ${reports.length} survey-only và ${sessions.length} Session Summary cục bộ. ${sessions.map((summary) => `${summary.status} ${summary.elapsedActiveMs} ms`).join("; ")}`;
}

function renderScreen(screenId: ScreenId): void {
  const screen = getScreen(screenId);
  if (pageTitleElement !== null) pageTitleElement.textContent = screen.title;
  if (pageBodyElement !== null) pageBodyElement.textContent = screen.body;
  if (pageStateElement !== null) pageStateElement.textContent = `Trạng thái: ${screen.state.replaceAll("_", " ")}`;
  if (screen.id === "privacy") void renderPrivacySummary();
  if (screen.id === "reports") void renderReportHistory();

  for (const navigationButton of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-screen]"))) {
    const selected = navigationButton.dataset.screen === screen.id;
    navigationButton.setAttribute("aria-current", selected ? "page" : "false");
  }
}

for (const navigationButton of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-screen]"))) {
  navigationButton.addEventListener("click", () => {
    const requestedScreen = navigationButton.dataset.screen;
    if (requestedScreen !== undefined && (screenIds as readonly string[]).includes(requestedScreen)) {
      renderScreen(requestedScreen as ScreenId);
    }
  });
}

renderScreen("home");
void window.eyeMate.getWorkSession().then(renderSession);

document.querySelector<HTMLButtonElement>("#session-start")?.addEventListener("click", async () => renderSession(await window.eyeMate.startWorkSession((sessionModeElement?.value ?? "TIMER_ONLY") as import("../work-session/session-state.js").WorkSession["modeId"])));
document.querySelector<HTMLButtonElement>("#session-pause")?.addEventListener("click", async () => renderSession(await window.eyeMate.pauseWorkSession()));
document.querySelector<HTMLButtonElement>("#session-resume")?.addEventListener("click", async () => renderSession(await window.eyeMate.resumeWorkSession()));
document.querySelector<HTMLButtonElement>("#session-finish")?.addEventListener("click", async () => renderSession(await window.eyeMate.finishWorkSession()));
document.querySelector<HTMLButtonElement>("#session-cancel")?.addEventListener("click", async () => renderSession(await window.eyeMate.cancelWorkSession()));
document.querySelector<HTMLButtonElement>("#request-nudge")?.addEventListener("click", async () => { const decision = await window.eyeMate.requestBreakNudge(); currentNudgeId = decision.nudgeId; if (nudgeStatusElement) nudgeStatusElement.textContent = `${decision.action}: ${decision.reason}`; });
async function respondNudge(response: import("../shared/preload-contract.js").NudgeResponse): Promise<void> { if (currentNudgeId === null) return; const accepted = await window.eyeMate.respondToNudge(currentNudgeId, response); if (nudgeStatusElement) nudgeStatusElement.textContent = accepted ? `Nudge: ${response}` : "Nudge đã được xử lý trước đó."; }
document.querySelector<HTMLButtonElement>("#accept-nudge")?.addEventListener("click", () => void respondNudge("ACCEPTED"));
document.querySelector<HTMLButtonElement>("#snooze-nudge")?.addEventListener("click", () => void respondNudge("SNOOZED"));
document.querySelector<HTMLButtonElement>("#dismiss-nudge")?.addEventListener("click", () => void respondNudge("DISMISSED"));
document.querySelector<HTMLButtonElement>("#m3-generate")?.addEventListener("click", async () => { const report = await window.eyeMate.generateM3Report(); renderM3Report(report); if (m3StatusElement) m3StatusElement.textContent = "Báo cáo cục bộ đã được tạo từ snapshot dữ liệu hiện có."; });
document.querySelector<HTMLButtonElement>("#m3-list")?.addEventListener("click", async () => { const reports = await window.eyeMate.listM3Reports(); const report = reports.at(-1); if (report === undefined) { if (m3StatusElement) m3StatusElement.textContent = "Chưa có snapshot báo cáo; hãy tạo báo cáo trước."; return; } renderM3Report(report); if (m3StatusElement) m3StatusElement.textContent = `Đang xem snapshot tạo lúc ${report.generatedAt}.`; });
document.querySelector<HTMLButtonElement>("#m3-preview")?.addEventListener("click", async () => { if (m3PreviewElement) m3PreviewElement.textContent = await window.eyeMate.previewProfessionalSummary(); });
document.querySelector<HTMLButtonElement>("#m3-export")?.addEventListener("click", async () => { const format = (m3ExportFormatElement?.value ?? "MARKDOWN") as import("../shared/preload-contract.js").LocalExportFormat; const result = await window.eyeMate.exportM3Report(m3ExportPathElement?.value ?? "", format); if (m3StatusElement) m3StatusElement.textContent = `Export: ${result.status} (${result.reason}).`; });
document.querySelector<HTMLButtonElement>("#m3-reset")?.addEventListener("click", async () => { if (!window.confirm("Reset baseline sẽ không xóa báo cáo cũ.")) return; await window.eyeMate.resetM3Baseline(); if (m3StatusElement) m3StatusElement.textContent = "Baseline đã reset; lần đo mới sẽ bắt đầu LEARNING."; });
document.querySelector<HTMLButtonElement>("#m3-delete")?.addEventListener("click", async () => { const category = (m3DeleteCategoryElement?.value ?? "ALL") as import("../shared/preload-contract.js").M3DataCategory; if (!window.confirm(`Xóa nhóm dữ liệu ${category}?`)) return; await window.eyeMate.deleteM3Category(category); if (m3StatusElement) m3StatusElement.textContent = `Đã xóa nhóm dữ liệu ${category}.`; if (m3DetailsElement) m3DetailsElement.textContent = ""; });

onboardingButton?.addEventListener("click", async () => {
  await window.eyeMate.completeOnboardingWithoutCamera();
  if (onboardingStatusElement !== null) onboardingStatusElement.textContent = "Onboarding hoàn tất. Camera vẫn tắt; bạn có thể dùng checkup survey-only.";
});

withdrawCameraButton?.addEventListener("click", async () => {
  await window.eyeMate.withdrawCameraConsent();
  await renderPrivacySummary();
});

deleteLocalDataButton?.addEventListener("click", async () => {
  if (!window.confirm("Xóa onboarding, consent và báo cáo cục bộ? File export ngoài ứng dụng không bị xóa.")) return;
  const result = await window.eyeMate.deleteAllLocalData();
  if (privacySummaryElement !== null) privacySummaryElement.textContent = `Kết quả xóa dữ liệu cục bộ: ${result}. File export ngoài ứng dụng không bị xóa.`;
});

surveyButton?.addEventListener("click", async () => {
  if (surveySelect === null || safetySelect === null || checkupSummaryElement === null) return;
  const summary = await window.eyeMate.runSurveyOnly({ response: surveySelect.value as import("../shared/m1-contract.js").SurveyResponse, safety: safetySelect.value as import("../shared/m1-contract.js").SafetyResponse });
  checkupSummaryElement.textContent = `Nguồn: ${summary.source}; camera: ${summary.camera}; trạng thái: ${summary.status}; hành động: ${summary.action}.`;
});
