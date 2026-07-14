import "../shared/renderer-globals.js";
import { getScreen, screenIds, type ScreenId } from "../app-shell/navigation.js";

const statusElement = document.querySelector<HTMLParagraphElement>("#runtime-status");
const pageTitleElement = document.querySelector<HTMLHeadingElement>("#page-title");
const pageBodyElement = document.querySelector<HTMLParagraphElement>("#page-body");
const pageStateElement = document.querySelector<HTMLParagraphElement>("#page-state");
const privacySummaryElement = document.querySelector<HTMLParagraphElement>("#privacy-summary");
const surveySelect = document.querySelector<HTMLSelectElement>("#survey-response");
const surveyButton = document.querySelector<HTMLButtonElement>("#run-survey");
const checkupSummaryElement = document.querySelector<HTMLParagraphElement>("#checkup-summary");
const onboardingButton = document.querySelector<HTMLButtonElement>("#complete-onboarding");
const onboardingStatusElement = document.querySelector<HTMLParagraphElement>("#onboarding-status");
const withdrawCameraButton = document.querySelector<HTMLButtonElement>("#withdraw-camera");
const deleteLocalDataButton = document.querySelector<HTMLButtonElement>("#delete-local-data");
const reportHistoryElement = document.querySelector<HTMLParagraphElement>("#report-history");

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
  reportHistoryElement.textContent = reports.length === 0 ? "Chưa có báo cáo cục bộ." : `Có ${reports.length} báo cáo survey-only cục bộ.`;
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
  if (surveySelect === null || checkupSummaryElement === null) return;
  const summary = await window.eyeMate.runSurveyOnly(surveySelect.value as import("../shared/m1-contract.js").SurveyResponse);
  checkupSummaryElement.textContent = `Nguồn: ${summary.source}; camera: ${summary.camera}; trạng thái: ${summary.status}; hành động: ${summary.action}.`;
});
