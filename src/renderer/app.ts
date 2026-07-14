import type { CheckupSummary, SafetyResponse, SurveyResponse } from "../shared/m1-contract.js";
import type { DataInventoryItem, LocalExportFormat, NudgeResponse, UserPreferences } from "../shared/preload-contract.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
import type { WorkSession } from "../work-session/session-state.js";
import { LOCAL_OPERATION_TIMEOUT, withOperationTimeout } from "./async-operation.js";
import { LocalCameraRuntime, type CameraRuntimeState } from "./camera-runtime.js";
import { aggregateMeasurementWindow, validateCalibrationProfile, type CameraCalibrationProfile, type CameraFrameObservation, type CameraMeasurementAggregate } from "../camera/measurement-window.js";

type RouteId = "home" | "checkup" | "companion" | "intelligence" | "reports" | "privacy" | "settings";
type ReportTab = "overview" | "week" | "month" | "history";

const routes: readonly RouteId[] = ["home", "checkup", "companion", "intelligence", "reports", "privacy", "settings"];
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
let preferencesSaveTimer: number | null = null;
let currentPreferences: UserPreferences | null = null;
let modalReturnFocus: HTMLElement | null = null;
let cameraRequested = false;
let cameraState: CameraRuntimeState = "IDLE";
let cameraReason = "CAMERA_NOT_STARTED";
let latestCameraObservation: CameraFrameObservation | null = null;
let cameraCalibration: CameraCalibrationProfile | null = null;
let cameraMeasurement: CameraMeasurementAggregate | null = null;
let cameraMeasurementStartedAt: number | null = null;
let cameraMeasurementTicker: number | null = null;
const cameraFrames: CameraFrameObservation[] = [];

const cameraRuntime = new LocalCameraRuntime({
  onState(state, reason) {
    cameraState = state;
    cameraReason = reason;
    updateCameraLiveUi();
    if (["DENIED", "UNAVAILABLE", "BUSY", "DISCONNECTED", "DEVICE_CHANGED", "FAILED"].includes(state) && cameraMeasurementStartedAt !== null) {
      void finishCameraMeasurement("CAMERA_FAILED");
    }
  },
  onObservation(observation) {
    latestCameraObservation = observation;
    if (cameraMeasurementStartedAt !== null) cameraFrames.push(observation);
    updateCameraLiveUi();
  }
});

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

function skeletonPage(route: RouteId): void {
  const cardCount = route === "home" ? 4 : route === "checkup" ? 1 : 2;
  setView(`${pageHeading("EyeMate", "Đang đồng bộ trạng thái cục bộ", "Không có dữ liệu nào rời khỏi thiết bị.")}
    <div class="grid ${cardCount === 4 ? "grid-4" : "grid-2"}">${Array.from({ length: cardCount }, () => `<div class="card skeleton" style="height:${route === "checkup" ? 400 : 180}px"></div>`).join("")}</div>`);
}

async function runMutation<T>(button: HTMLButtonElement | null, operation: Promise<T>, successMessage?: string, timeoutMs: number | null = 10_000): Promise<T | null> {
  if (button?.disabled) return null;
  if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
  try {
    const result = timeoutMs === null ? await operation : await withOperationTimeout(operation, timeoutMs);
    if (successMessage) showToast(successMessage);
    return result;
  } catch (error) {
    const timeout = error instanceof Error && error.message === LOCAL_OPERATION_TIMEOUT;
    showToast(timeout ? "Tác vụ quá 10 giây. Hãy thử lại." : "Tác vụ cục bộ thất bại. Dữ liệu chưa được thay đổi.", "warning");
    return null;
  } finally {
    if (button?.isConnected) { button.disabled = false; button.removeAttribute("aria-busy"); }
  }
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
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><h2 id="modal-title">${title}</h2>${body}<div class="actions">${actions}<button class="btn btn-ghost" id="modal-close" type="button">Đóng</button></div></section></div>`;
  document.querySelector<HTMLButtonElement>("#modal-close")?.addEventListener("click", closeModal);
  document.querySelector<HTMLElement>(".modal-backdrop")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) closeModal(); });
  document.querySelector<HTMLElement>(".modal")?.addEventListener("click", (event) => event.stopPropagation());
  document.querySelector<HTMLElement>(".modal")?.focus();
  document.addEventListener("keydown", handleModalKeydown);
}

function handleModalKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && modalRoot?.childElementCount) closeModal();
}
function closeModal(): void {
  modalRoot?.replaceChildren();
  document.removeEventListener("keydown", handleModalKeydown);
  modalReturnFocus?.focus({ preventScroll: true });
  modalReturnFocus = null;
}
function formatDuration(ms: number): string { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function minutesToTime(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function timeToMinutes(value: string): number { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match) return 0; return Number(match[1]) * 60 + Number(match[2]); }
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
    symptomBurden: "mức khó chịu",
    CHECKUP: "Checkup",
    SESSION: "Phiên làm việc",
    NUDGE: "Lời nhắc",
    REPORT: "Thấu hiểu cá nhân",
    PREFERENCE: "Cài đặt"
  };
  return escapeHtml(labels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("vi-VN"));
}

async function renderHome(): Promise<void> {
  const [runtime, reports, summaries, m3Reports, session, privacy] = await withOperationTimeout(Promise.all([
    window.eyeMate.getRuntimeInfo(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries(), window.eyeMate.listM3Reports(), window.eyeMate.getWorkSession(), window.eyeMate.getPrivacySummary()
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
    <section class="grid grid-2 home-context" aria-label="Tình trạng gần nhất">
      <article class="card"><p class="label">Phiên gần nhất</p>${summaries[0] ? `<h2>${formatDuration(summaries[0].elapsedActiveMs)}</h2><p class="subtle">${humanLabel(summaries[0].status)} · ${safeDate(summaries[0].createdAt)}</p>` : `<h2>Chưa có phiên</h2><p class="subtle">Bắt đầu Timer Only để tạo Session Summary đầu tiên.</p>`}</article>
      <article class="card"><p class="label">Privacy & dữ liệu thiếu</p><h2>${humanLabel(privacy.cameraConsentDecision)}</h2><p class="subtle">Camera: ${humanLabel(privacy.cameraState)}. ${latest ? `${latest.missingData.length} nhóm evidence còn thiếu.` : "Chưa có report snapshot."}</p><a class="text-link" href="#/privacy">Xem quyền riêng tư</a></article>
    </section>
    <section class="card quick-actions" aria-label="Hành động nhanh"><p class="label">Bắt đầu</p><div class="actions"><a class="btn btn-primary" href="#/companion">Bắt đầu phiên</a><a class="btn" href="#/checkup">Khám mắt</a><a class="btn" href="#/reports">Xem báo cáo</a></div></section>`);
}

function metricCard(label: string, value: string, note: string, progress: number | null): string {
  return `<article class="card metric-card"><span class="label">${label}</span><span class="trend ${progress === null ? "unknown" : ""}">${progress === null ? "Chưa đo" : "↑ local"}</span><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span><div class="metric-progress"><span style="--progress:${progress === null ? 0 : Math.max(0, Math.min(100, progress))}%"></span></div></article>`;
}

function cameraStatusMessage(): string {
  const messages: Readonly<Record<string, string>> = {
    CAMERA_NOT_STARTED: "Camera chỉ mở sau thao tác rõ ràng của bạn.", CAMERA_STARTING: "Đang khởi tạo model cục bộ…", CAMERA_ACTIVE: "Camera đang xử lý cục bộ; không lưu hình ảnh.",
    CAMERA_PERMISSION_DENIED: "Quyền camera bị từ chối. Hãy cấp lại trong Windows Settings > Privacy & security > Camera.", CAMERA_UNAVAILABLE: "Không tìm thấy camera phù hợp.",
    CAMERA_API_UNAVAILABLE: "Thiết bị này không cung cấp camera API.", CAMERA_BUSY: "Camera đang được ứng dụng khác sử dụng.", CAMERA_DISCONNECTED: "Camera đã ngắt kết nối.",
    CAMERA_DEVICE_CHANGED: "Danh sách camera đã thay đổi; cần hiệu chỉnh lại.", CAMERA_RUNTIME_FAILED: "Không thể khởi tạo camera.", CAMERA_INFERENCE_FAILED: "Model camera cục bộ gặp lỗi.",
    CAMERA_INTERRUPTED_BY_VISIBILITY: "Camera đã dừng khi cửa sổ bị ẩn. Hãy mở lại và hiệu chỉnh trước khi đo."
  };
  return messages[cameraReason] ?? cameraReason;
}

function observationQuality(observation: CameraFrameObservation | null): { readonly label: string; readonly acceptable: boolean } {
  if (observation === null) return { label: "Đang chờ khuôn mặt", acceptable: false };
  if (observation.faceCount === 0) return { label: "Không thấy khuôn mặt", acceptable: false };
  if (observation.faceCount !== 1) return { label: "Chỉ để một người trong khung hình", acceptable: false };
  if (observation.lightingScore < 0.2) return { label: "Cần thêm ánh sáng", acceptable: false };
  if (observation.poseScore < 0.6 || observation.eyeVisibility < 0.55) return { label: "Nhìn thẳng vào màn hình", acceptable: false };
  if (observation.interEyeDistancePx === null || observation.leftEar === null || observation.rightEar === null) return { label: "Chưa đủ hình học khuôn mặt", acceptable: false };
  return { label: "Chất lượng phù hợp", acceptable: true };
}

function updateCameraLiveUi(): void {
  const stateElement = document.querySelector<HTMLElement>("#camera-runtime-state");
  if (stateElement) stateElement.textContent = cameraStatusMessage();
  const quality = observationQuality(latestCameraObservation);
  const qualityElement = document.querySelector<HTMLElement>("#camera-quality-state");
  if (qualityElement) { qualityElement.textContent = quality.label; qualityElement.classList.toggle("success", quality.acceptable); }
  const earElement = document.querySelector<HTMLElement>("#camera-live-ear");
  const averageEar = latestCameraObservation?.leftEar !== null && latestCameraObservation?.leftEar !== undefined && latestCameraObservation.rightEar !== null
    ? (latestCameraObservation.leftEar + latestCameraObservation.rightEar) / 2 : null;
  if (earElement) earElement.textContent = averageEar === null ? "—" : averageEar.toFixed(3);
  const calibrateButton = document.querySelector<HTMLButtonElement>("#checkup-calibrate");
  if (calibrateButton) calibrateButton.disabled = cameraState !== "ACTIVE" || !quality.acceptable;
  const measureButton = document.querySelector<HTMLButtonElement>("#checkup-measure-next");
  if (measureButton) measureButton.disabled = cameraState !== "ACTIVE" || cameraCalibration === null;
}

async function populateCameraDevices(): Promise<void> {
  const select = document.querySelector<HTMLSelectElement>("#camera-device");
  if (!select) return;
  try {
    const devices = await cameraRuntime.enumerateDevices();
    select.replaceChildren(...devices.map((device) => {
      const option = document.createElement("option"); option.value = device.deviceId; option.textContent = device.label; return option;
    }));
    if (devices.length === 0) { const option = document.createElement("option"); option.textContent = "Camera mặc định"; select.append(option); }
  } catch { showToast("Không thể đọc danh sách camera. Bạn vẫn có thể thử camera mặc định.", "warning"); }
}

async function stopCameraFlow(): Promise<void> {
  if (cameraMeasurementTicker !== null) window.clearInterval(cameraMeasurementTicker);
  cameraMeasurementTicker = null;
  cameraMeasurementStartedAt = null;
  cameraFrames.length = 0;
  latestCameraObservation = null;
  await cameraRuntime.stop();
  cameraState = "STOPPED";
  cameraReason = "CAMERA_NOT_STARTED";
}

async function finishCameraMeasurement(status: CameraMeasurementAggregate["status"]): Promise<void> {
  const startedAt = cameraMeasurementStartedAt;
  if (startedAt === null) return;
  cameraMeasurementStartedAt = null;
  if (cameraMeasurementTicker !== null) window.clearInterval(cameraMeasurementTicker);
  cameraMeasurementTicker = null;
  const endedAt = performance.now();
  const currentDeviceBinding = cameraRuntime.context?.deviceBinding ?? null;
  cameraMeasurement = aggregateMeasurementWindow({ status, startedAtMs: startedAt, endedAtMs: endedAt, frames: cameraFrames, calibration: cameraCalibration, currentDeviceBinding });
  cameraFrames.length = 0;
  await cameraRuntime.stop();
  const result = await runMutation(null, window.eyeMate.runSurveyOnly(pendingSurvey));
  if (result !== null) { checkupResult = result; checkupStep = 5; renderCheckup(); }
}

function renderCheckup(): void {
  const titles = ["Chào mừng", "Khảo sát cảm nhận", "Kiểm tra camera", "Đo với camera", "Kết quả"];
  const stepBars = Array.from({ length: 5 }, (_, index) => `<span class="step ${index + 1 < checkupStep ? "done" : index + 1 === checkupStep ? "active" : ""}"></span>`).join("");
  let content = "";
  if (checkupStep === 1) content = `<div><p class="eyebrow">Bước 1 / 5</p><h2>${titles[0]}</h2><p class="subtle">EyeMate là công cụ wellness giúp bạn tự theo dõi hành vi màn hình; không chẩn đoán, điều trị hoặc thay thế tư vấn chuyên môn. Camera chỉ mở sau lựa chọn rõ ràng của bạn.</p><div class="callout success"><strong>Local Only</strong><br>Model và xử lý chạy trên máy. Không upload, không lưu raw frame, video hoặc landmark.</div></div><div class="actions"><button class="btn btn-primary" id="checkup-camera-consent" type="button">Cho phép dùng camera</button><button class="btn" id="checkup-consent" type="button">Tiếp tục không camera</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 2) content = `<div><p class="eyebrow">Bước 2 / 5</p><h2>${titles[1]}</h2><p class="subtle">Contract hiện tại có một câu hỏi cảm nhận synthetic và Safety Gate. EyeMate không tự thêm OSDI-6 khi chưa được phê duyệt clinical.</p><fieldset class="option-grid"><legend class="label">Mức độ thoải mái mắt hiện tại</legend>${surveyOptions()}</fieldset><label class="label" for="safety-response">Tín hiệu cần dừng</label><select class="field" id="safety-response"><option value="NEGATIVE">Không có tín hiệu cần dừng</option><option value="CONFIRMED">Có tín hiệu cần dừng</option><option value="UNSURE">Chưa chắc</option><option value="PREFER_NOT_TO_ANSWER">Không muốn trả lời</option></select></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-survey-next" type="button">Tiếp tục</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 3) content = cameraRequested ? `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><div class="camera-calibration"><video id="camera-preview" aria-label="Xem trước camera cục bộ"></video><div><label class="label" for="camera-device">Thiết bị</label><select class="field" id="camera-device"><option>Camera mặc định</option></select><p class="callout" id="camera-runtime-state">${cameraStatusMessage()}</p><p class="callout" id="camera-quality-state">${observationQuality(latestCameraObservation).label}</p><div class="camera-reading"><span><small>EAR trực tiếp</small><strong id="camera-live-ear">—</strong></span></div><label class="label" for="calibration-distance">Khoảng cách tham chiếu do bạn đo (cm)</label><input class="field" id="calibration-distance" type="number" min="20" max="150" value="60" inputmode="decimal"><p class="subtle">Khoảng cách chỉ dùng để hiệu chỉnh local. EyeMate không tuyên bố độ chính xác khi chưa có ground truth validation.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-open-camera" type="button">Mở camera</button><button class="btn" id="checkup-calibrate" type="button" disabled title="Cần camera hoạt động và chất lượng phù hợp">Xác nhận hiệu chỉnh</button><button class="btn btn-primary" id="checkup-measure-next" type="button" disabled title="Cần hiệu chỉnh hợp lệ">Tiếp tục đo</button><button class="btn btn-ghost" id="checkup-camera-next" type="button">Dùng survey-only</button></div>` : `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><div class="callout warning"><strong>Camera đang tắt</strong><br>Bạn chưa cấp consent camera. EyeMate sẽ tiếp tục survey-only và không suy đoán chỉ số camera.</div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-camera-next" type="button">Dùng survey-only</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 4) content = cameraRequested && cameraCalibration !== null && cameraRuntime.active ? `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="measurement-countdown" aria-live="polite"><strong id="camera-countdown">00:30</strong><span>giữ tư thế tự nhiên</span></div><div class="camera-reading"><span><small>EAR</small><strong id="camera-live-ear">—</strong></span><span><small>Chất lượng</small><strong id="camera-quality-state">Đang chờ</strong></span></div><p class="subtle">Quan sát per-frame chỉ tồn tại trong RAM trong cửa sổ 30 giây và bị xóa ngay sau khi tổng hợp.</p></div><div class="actions"><button class="btn btn-primary" id="checkup-measure-start" type="button">Bắt đầu 30 giây</button><button class="btn btn-danger" data-checkup-cancel type="button">Hủy đo</button></div>` : `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="empty-state"><div><div class="empty-icon" aria-hidden="true">◉</div><h3>Đo camera đã được bỏ qua an toàn</h3><p class="subtle">EAR, khoảng cách và blink counter không được suy đoán khi camera tắt.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-finish" type="button">Xem kết quả</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  const cameraEvidence = cameraMeasurement === null ? "Survey-only · camera không đo" : cameraMeasurement.status === "COMPLETED" ? `Camera local · ${cameraMeasurement.validSampleCount}/${cameraMeasurement.sampleCount} mẫu hợp lệ · blink ${cameraMeasurement.blinkSummary.status === "OBSERVED" ? `${cameraMeasurement.blinkSummary.ratePerMinute}/phút` : "UNKNOWN"} · khoảng cách ${cameraMeasurement.distanceSummary.status === "OBSERVED" ? humanLabel(cameraMeasurement.distanceSummary.dominantZone) : "UNKNOWN"}` : `Camera ${humanLabel(cameraMeasurement.status)} · kết quả camera UNKNOWN`;
  if (checkupStep === 5) content = checkupResult ? `<div><p class="eyebrow">Bước 5 / 5</p><h2>${titles[4]}</h2><span class="status-pill ${checkupResult.status === "SAFETY_STOP" ? "warning" : ""}">${humanLabel(checkupResult.status)}</span><h3 class="section-heading">Gợi ý tiếp theo</h3><div class="grid grid-2"><div class="callout success"><strong>Làm ngay</strong><br>${humanLabel(checkupResult.action)}</div><div class="callout"><strong>Dữ liệu sử dụng</strong><br>${cameraEvidence}</div></div><p class="subtle section-note">Đây không phải chẩn đoán. Chỉ số camera là quan sát wellness local và chưa phải phép đo lâm sàng.</p></div><div class="actions"><button class="btn btn-primary" id="checkup-done" type="button">Về tổng quan</button><button class="btn" id="checkup-repeat" type="button">Làm lại</button></div>` : `<div class="empty-state"><div><div class="empty-icon">!</div><h2>Chưa có kết quả</h2><button class="btn" id="checkup-repeat" type="button">Bắt đầu lại</button></div></div>`;
  setView(`${pageHeading("Checkup", "Một phút để lắng nghe đôi mắt", "Flow từng bước, camera-off an toàn và không đưa ra chẩn đoán.")}<section class="wizard"><div class="stepper" aria-label="Tiến trình checkup">${stepBars}</div><article class="card wizard-card">${content}</article></section>`);
  bindCheckupControls();
}

function surveyOptions(): string {
  const values: readonly [SurveyResponse, string][] = [["NONE", "Không có khó chịu"], ["MILD", "Khó chịu nhẹ"], ["NOTICEABLE", "Khó chịu đáng chú ý"], ["UNSURE", "Chưa chắc"], ["PREFER_NOT_TO_ANSWER", "Không muốn trả lời"]];
  return values.map(([value, label], index) => `<label class="option"><input type="radio" name="survey-response" value="${value}" ${index === 0 ? "checked" : ""}> <span>${label}</span></label>`).join("");
}

let pendingSurvey: { response: SurveyResponse; safety: SafetyResponse } = { response: "NONE", safety: "NEGATIVE" };
function bindCheckupControls(): void {
  document.querySelector<HTMLButtonElement>("#checkup-camera-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.grantCameraConsent()); if (result !== null) { cameraRequested = true; checkupStep = 2; renderCheckup(); } });
  document.querySelector<HTMLButtonElement>("#checkup-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.completeOnboardingWithoutCamera()); if (result !== null) { checkupStep = 2; renderCheckup(); } });
  document.querySelector("#checkup-back")?.addEventListener("click", () => { if (checkupStep <= 3) { void stopCameraFlow(); cameraCalibration = null; } checkupStep = Math.max(1, checkupStep - 1); renderCheckup(); });
  document.querySelector("#checkup-survey-next")?.addEventListener("click", () => { pendingSurvey = { response: (document.querySelector<HTMLInputElement>("input[name='survey-response']:checked")?.value ?? "NONE") as SurveyResponse, safety: (document.querySelector<HTMLSelectElement>("#safety-response")?.value ?? "NEGATIVE") as SafetyResponse }; checkupStep = 3; renderCheckup(); });
  document.querySelector("#checkup-camera-next")?.addEventListener("click", () => { void stopCameraFlow(); cameraCalibration = null; cameraMeasurement = null; checkupStep = 4; renderCheckup(); });
  document.querySelector<HTMLButtonElement>("#checkup-open-camera")?.addEventListener("click", async (event) => {
    const video = document.querySelector<HTMLVideoElement>("#camera-preview"); if (!video) return;
    const selectedValue = document.querySelector<HTMLSelectElement>("#camera-device")?.value;
    const selected = selectedValue && selectedValue !== "Camera mặc định" ? selectedValue : undefined;
    cameraCalibration = null; latestCameraObservation = null;
    const context = await runMutation(event.currentTarget as HTMLButtonElement, cameraRuntime.start(video, selected), undefined, 20_000);
    if (context !== null) { await populateCameraDevices(); updateCameraLiveUi(); }
  });
  document.querySelector<HTMLButtonElement>("#checkup-calibrate")?.addEventListener("click", (event) => {
    const context = cameraRuntime.context; const observation = latestCameraObservation; const distanceValue = Number(document.querySelector<HTMLInputElement>("#calibration-distance")?.value);
    if (!context || !observation || !observationQuality(observation).acceptable || observation.interEyeDistancePx === null) { showToast("Chưa đủ chất lượng để hiệu chỉnh.", "warning"); return; }
    try {
      cameraCalibration = validateCalibrationProfile({ profileVersion: "camera-calibration/0.1.0", deviceBinding: context.deviceBinding, width: context.width, height: context.height, groundTruthCm: distanceValue, referenceInterEyePx: observation.interEyeDistancePx, calibratedAt: new Date().toISOString() });
      showToast("Hiệu chỉnh local đã sẵn sàng cho camera hiện tại."); updateCameraLiveUi();
      (event.currentTarget as HTMLButtonElement).textContent = "Đã hiệu chỉnh";
    } catch { cameraCalibration = null; showToast("Khoảng cách hiệu chỉnh phải từ 20 đến 150 cm.", "warning"); }
  });
  document.querySelector("#checkup-measure-next")?.addEventListener("click", () => { checkupStep = 4; renderCheckup(); });
  document.querySelector<HTMLButtonElement>("#checkup-measure-start")?.addEventListener("click", (event) => {
    if (!cameraRuntime.active || cameraCalibration === null || cameraMeasurementStartedAt !== null) return;
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true; button.textContent = "Đang đo…";
    cameraFrames.length = 0; cameraMeasurement = null; cameraMeasurementStartedAt = performance.now();
    cameraMeasurementTicker = window.setInterval(() => {
      if (cameraMeasurementStartedAt === null) return;
      const remaining = Math.max(0, 30_000 - (performance.now() - cameraMeasurementStartedAt));
      const element = document.querySelector<HTMLElement>("#camera-countdown"); if (element) element.textContent = `00:${String(Math.ceil(remaining / 1000)).padStart(2, "0")}`;
      if (remaining <= 0) void finishCameraMeasurement("COMPLETED");
    }, 100);
  });
  document.querySelector<HTMLButtonElement>("#checkup-finish")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.runSurveyOnly(pendingSurvey)); if (result !== null) { checkupResult = result; checkupStep = 5; renderCheckup(); } });
  document.querySelector("#checkup-done")?.addEventListener("click", () => { location.hash = "#/home"; });
  document.querySelector("#checkup-repeat")?.addEventListener("click", () => { void stopCameraFlow(); checkupStep = 1; checkupResult = null; cameraMeasurement = null; renderCheckup(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-checkup-cancel]"))) button.addEventListener("click", () => { void stopCameraFlow(); checkupStep = 1; checkupResult = null; cameraMeasurement = null; location.hash = "#/home"; });
  if (checkupStep === 3 && cameraRequested) void populateCameraDevices();
}

async function renderCompanion(): Promise<void> {
  const [session, preferences] = await withOperationTimeout(Promise.all([window.eyeMate.getWorkSession(), window.eyeMate.getUserPreferences()]));
  currentPreferences = preferences;
  setView(`${pageHeading("Work Companion", "Ở đây khi bạn cần tập trung", "Timer Only hoạt động local. Các mode camera được giữ tắt đến khi runtime được xác minh.")}
    <section class="mode-selector" aria-label="Chọn chế độ"><div class="mode active" role="status"><strong>Timer Only</strong><small>Khả dụng · không camera</small></div><button class="mode" type="button" disabled title="Tính năng này cần camera runtime đã xác minh"><strong>Camera + Timer</strong><small>Chưa khả dụng</small></button><button class="mode" type="button" disabled title="Tính năng này cần camera runtime đã xác minh"><strong>Camera Full</strong><small>Chưa khả dụng</small></button></section>
    <div class="callout companion-policy"><strong>Chính sách nhắc</strong> · ${preferences.breakReminderEnabled ? "Break reminder bật" : "Break reminder tắt"} · ${preferences.quietHoursEnabled ? `Quiet hours ${minutesToTime(preferences.quietStartMinute)}–${minutesToTime(preferences.quietEndMinute)}` : "Quiet hours tắt"}</div>
    <section class="card session-panel" id="session-panel">${sessionMarkup(session, preferences)}</section>`);
  bindSessionControls(session, preferences);
}

function sessionMarkup(session: WorkSession | null, preferences: UserPreferences): string {
  if (session === null || ["COMPLETED", "CANCELLED", "FAILED"].includes(session.state)) return `<div><p class="label">Sẵn sàng</p><div class="session-timer">00:00:00</div><p class="subtle">Một phiên yên tĩnh, nhắc nghỉ vừa đủ.</p><button class="btn btn-primary" id="session-start" type="button">Bắt đầu phiên</button></div>`;
  if (session.state === "RECOVERY_REQUIRED") return `<div><p class="label">Khôi phục phiên</p><div class="session-timer">${formatDuration(session.elapsedActiveMs)}</div><p class="callout warning">EyeMate đã lưu phiên đang dở. Thời gian trong lúc ứng dụng đóng không được suy thành thời gian làm việc hoặc nghỉ.</p><div class="actions"><button class="btn btn-primary" id="session-recover" type="button">Tiếp tục phiên</button><button class="btn btn-danger" id="session-cancel" type="button">Hủy phiên cũ</button></div></div>`;
  const active = session.state === "ACTIVE";
  activeElapsedBase = session.elapsedActiveMs;
  if (active && activeStartedAt === null) activeStartedAt = performance.now();
  if (!active) activeStartedAt = null;
  return `<div class="${session.state === "PAUSED" ? "session-paused" : ""}"><p class="label">${session.state === "PAUSED" ? "Đang tạm dừng" : "Phiên đang hoạt động"}</p><div class="session-timer" id="session-timer">${formatDuration(session.elapsedActiveMs)}</div><p class="subtle">Nhắc nghỉ theo cooldown policy · Camera tắt</p><div class="session-progress"><span style="--progress:${Math.min(100, session.elapsedActiveMs / 12_000)}%"></span></div><div class="actions"><button class="btn" id="session-toggle" type="button">${active ? "Tạm dừng" : "Tiếp tục"}</button><button class="btn" id="session-nudge" type="button" ${active && preferences.breakReminderEnabled ? "" : `disabled title=\"${preferences.breakReminderEnabled ? "Chỉ khả dụng khi phiên đang chạy" : "Break reminder đang tắt trong Cài đặt"}\"`}>Nhắc tôi nghỉ</button><button class="btn btn-primary" id="session-end" type="button">Hoàn thành</button><button class="btn btn-danger" id="session-cancel" type="button">Hủy phiên</button></div></div>`;
}

function bindSessionControls(session: WorkSession | null, _preferences: UserPreferences): void {
  if (sessionTicker !== null) window.clearInterval(sessionTicker);
  if (session?.state === "ACTIVE") sessionTicker = window.setInterval(() => { const element = document.querySelector("#session-timer"); if (element && activeStartedAt !== null) element.textContent = formatDuration(activeElapsedBase + performance.now() - activeStartedAt); }, 250);
  document.querySelector<HTMLButtonElement>("#session-start")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.startWorkSession("TIMER_ONLY")); if (result) { activeStartedAt = performance.now(); await renderCompanion(); } });
  document.querySelector<HTMLButtonElement>("#session-toggle")?.addEventListener("click", async (event) => { if (!session) return; const result = await runMutation(event.currentTarget as HTMLButtonElement, session.state === "ACTIVE" ? window.eyeMate.pauseWorkSession() : window.eyeMate.resumeWorkSession()); if (result) { activeElapsedBase = result.elapsedActiveMs; activeStartedAt = null; await renderCompanion(); } });
  document.querySelector<HTMLButtonElement>("#session-recover")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.resumeWorkSession(), "Phiên đã được khôi phục."); if (result) await renderCompanion(); });
  document.querySelector<HTMLButtonElement>("#session-nudge")?.addEventListener("click", async (event) => { const decision = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.requestBreakNudge()); if (!decision) return; if (decision.action === "EMIT") { currentNudgeId = decision.nudgeId; showNudge(); } else showToast(`Chưa nhắc lúc này: ${humanLabel(decision.reason)}${decision.cooldownRemainingMs > 0 ? ` (${Math.ceil(decision.cooldownRemainingMs / 60_000)} phút)` : ""}.`); });
  document.querySelector("#session-end")?.addEventListener("click", () => {
    showModal("Kết thúc phiên?", "<p class=\"subtle\">EyeMate sẽ lưu Session Summary cục bộ. Dữ liệu camera không tồn tại trong phiên Timer Only.</p>", "<button class=\"btn btn-primary\" id=\"confirm-session-end\" type=\"button\">Lưu và kết thúc</button>");
    document.querySelector<HTMLButtonElement>("#confirm-session-end")?.addEventListener("click", async (event) => { const finished = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.finishWorkSession()); if (!finished) return; closeModal(); activeStartedAt = null; showSessionSummary(finished); });
  });
  document.querySelector("#session-cancel")?.addEventListener("click", () => {
    showModal("Hủy phiên này?", "<p class=\"subtle\">Phiên sẽ được đánh dấu CANCELLED và không được diễn giải như một phiên hoàn thành.</p>", "<button class=\"btn btn-danger\" id=\"confirm-session-cancel\" type=\"button\">Hủy phiên</button>");
    document.querySelector<HTMLButtonElement>("#confirm-session-cancel")?.addEventListener("click", async (event) => { const cancelled = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.cancelWorkSession()); if (!cancelled) return; closeModal(); activeStartedAt = null; showToast("Phiên đã hủy; không tạo kết luận hoàn thành."); await renderCompanion(); });
  });
}

function showNudge(): void {
  if (toastRegion === null || currentNudgeId === null) return;
  toastRegion.innerHTML = `<aside class="toast" aria-label="Nhắc nghỉ"><p class="label">Một chút cho đôi mắt</p><strong>Nhìn xa và thả lỏng trong chốc lát?</strong><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-nudge="ACCEPTED" type="button">Nghỉ ngay</button><button class="btn" data-nudge="SNOOZED" type="button">Nhắc sau 5 phút</button><button class="btn btn-ghost" data-nudge="DISMISSED" type="button">Bỏ qua</button></div></aside>`;
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-nudge]"))) button.addEventListener("click", () => void respondNudge(button.dataset.nudge as NudgeResponse));
  document.addEventListener("click", dismissNudgeOutside, { once: true, capture: true });
  if (currentPreferences?.soundEnabled === true) playNudgeTone();
}

function playNudgeTone(): void {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    showToast("Không thể phát âm thanh trên thiết bị này; lời nhắc vẫn hiển thị.", "warning");
  }
}

function dismissNudgeOutside(event: Event): void { if (!(event.target as Element | null)?.closest(".toast")) void respondNudge("DISMISSED"); }
async function respondNudge(response: NudgeResponse): Promise<void> { if (currentNudgeId === null) return; const handled = await runMutation(null, window.eyeMate.respondToNudge(currentNudgeId, response)); currentNudgeId = null; toastRegion?.replaceChildren(); if (handled === true) showToast(response === "ACCEPTED" ? "Đã ghi nhận: nghỉ ngay." : response === "SNOOZED" ? "Đã ghi nhận: nhắc lại sau." : "Đã bỏ qua lời nhắc."); }
function showSessionSummary(session: WorkSession): void { showModal("Phiên đã hoàn thành", `<div class="grid grid-2"><div class="callout success"><span class="label">Tổng thời gian</span><strong class="metric-value">${formatDuration(session.elapsedActiveMs)}</strong></div><div class="callout"><span class="label">Dữ liệu camera</span><strong>Không đo</strong></div></div><p class="subtle" style="margin-top:16px">Session Summary đã lưu cục bộ. So sánh baseline cần thêm dữ liệu hợp lệ.</p>`, "<a class=\"btn btn-primary\" href=\"#/reports\">Xem báo cáo</a>"); document.querySelector(".modal a")?.addEventListener("click", closeModal); }

async function renderIntelligence(): Promise<void> {
  const reports = await withOperationTimeout(window.eyeMate.listM3Reports());
  const report = reports.at(-1);
  setView(`${pageHeading("Personal Intelligence", "Hiểu nhịp làm việc của riêng bạn", "Baseline, pattern và VLI chỉ xuất hiện khi evidence đủ; đây không phải chẩn đoán.", `<a class="btn" href="#/reports">Mở báo cáo</a>`)}${intelligenceContent(report)}`);
  document.querySelector("#intelligence-refresh")?.addEventListener("click", () => { location.hash = "#/reports"; });
  document.querySelector("#intelligence-reset")?.addEventListener("click", showResetBaselineDialog);
}

function intelligenceContent(report: PersonalReport | undefined): string {
  if (!report) return `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">⌁</div><h2>Baseline chưa bắt đầu</h2><p class="subtle">Tạo report từ dữ liệu checkup hoặc session để bắt đầu trạng thái learning.</p><button class="btn btn-primary" id="intelligence-refresh" type="button">Tạo dữ liệu tổng hợp</button></div></section>`;
  const pattern = report.daily.patterns[0];
  return `<div class="grid grid-2"><article class="card"><p class="label">Baseline cá nhân</p><strong class="metric-value">${humanLabel(report.baseline.state)}</strong><p class="subtle">${report.baseline.sampleCount} mẫu hợp lệ · coverage ${Math.round(report.baseline.coverage * 100)}%</p><div class="session-progress"><span style="--progress:${Math.round(report.baseline.coverage * 100)}%"></span></div><button class="btn btn-ghost" id="intelligence-reset" type="button">Reset baseline</button></article><article class="card"><p class="label">Visual Load Index</p><strong class="metric-value">${report.daily.vli.score === null ? "—" : Math.round(report.daily.vli.score)}</strong><p class="subtle">Data confidence ${Math.round(report.daily.vli.dataConfidence * 100)}%. Missing không được tính như 0 hoặc trạng thái tốt.</p></article><article class="card"><p class="label">Pattern hiện tại</p><h2>${pattern ? humanLabel(pattern.status) : "chưa đủ dữ liệu"}</h2><p class="subtle">Evidence: ${pattern?.evidence.map(humanLabel).join(", ") || "không có"}. Thiếu: ${pattern?.missingData.map(humanLabel).join(", ") || "không có"}.</p></article><article class="card"><p class="label">Limitation</p><h2>Camera metrics chưa xác minh</h2><p class="subtle">Blink và distance không đóng góp vào baseline/VLI hiện tại. Không có disease score hoặc clinical severity.</p></article></div>`;
}

async function renderReports(): Promise<void> {
  const [reports, surveyReports, summaries] = await withOperationTimeout(Promise.all([window.eyeMate.listM3Reports(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries()]));
  const latest = reports.at(-1);
  const tabs: readonly [ReportTab, string][] = [["overview", "Tổng quan"], ["week", "7 ngày"], ["month", "30 ngày"], ["history", "Lịch sử"]];
  setView(`${pageHeading("Reports", "Nhìn lại mà không phán xét", "Daily summary, checkup history và bản tóm tắt local có provenance.", `<button class="btn btn-primary" id="report-generate" type="button">Cập nhật báo cáo</button>`)}
    <div class="tabs" role="tablist" aria-label="Khoảng thời gian báo cáo">${tabs.map(([id, label]) => `<button class="tab ${reportTab === id ? "active" : ""}" data-report-tab="${id}" role="tab" aria-selected="${reportTab === id}" type="button">${label}</button>`).join("")}</div>
    <div id="report-content">${reportContent(reportTab, latest, surveyReports, summaries)}</div>`);
  document.querySelector("#report-export-json")?.insertAdjacentHTML("afterend", `<button class="btn" id="report-export-pdf" type="button">Preview PDF</button>`);
  document.querySelector<HTMLButtonElement>("#report-generate")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.generateM3Report(), "Báo cáo local đã được cập nhật."); if (result) await renderReports(); });
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-report-tab]"))) tab.addEventListener("click", () => { reportTab = tab.dataset.reportTab as ReportTab; void renderReports(); });
  document.querySelector<HTMLButtonElement>("#report-preview")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "MARKDOWN"));
  document.querySelector<HTMLButtonElement>("#report-export-json")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "JSON"));
  document.querySelector<HTMLButtonElement>("#report-export-pdf")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "PDF"));
  document.querySelector("#report-delete")?.addEventListener("click", showDeleteReportsDialog);
}

function reportContent(tab: ReportTab, report: PersonalReport | undefined, surveys: readonly { readonly status: string; readonly action: string; readonly createdAt: string }[], summaries: readonly { readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]): string {
  if (tab === "month") return `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">30</div><h2>Chưa đủ dữ liệu 30 ngày</h2><p class="subtle">EyeMate không nội suy dữ liệu còn thiếu.</p><a class="btn btn-primary" href="#/companion">Bắt đầu một phiên</a></div></section>`;
  if (tab === "history") { const rows = [...surveys.map((item) => ({ title: `Checkup · ${humanLabel(item.status)}`, note: humanLabel(item.action), date: item.createdAt })), ...summaries.map((item) => ({ title: `Work session · ${humanLabel(item.status)}`, note: formatDuration(item.elapsedActiveMs), date: item.createdAt }))].sort((a,b) => b.date.localeCompare(a.date)); return rows.length ? `<div class="grid">${rows.map((item) => `<article class="card"><span class="label">${safeDate(item.date)}</span><h3>${item.title}</h3><p class="subtle">${item.note}</p></article>`).join("")}</div>` : emptyReport(); }
  if (!report) return emptyReport();
  if (tab === "week") return `<div class="grid grid-2"><article class="card"><p class="label">Weekly digest</p><strong class="metric-value">${report.weekly.daysWithData}/7 ngày</strong><p class="subtle">${report.weekly.missingDays} ngày chưa có dữ liệu. EyeMate không gắn nhãn “tốt/xấu” khi evidence chưa đủ.</p></article><article class="card"><p class="label">Nhịp làm việc</p>${heatmap(report.weekly.daysWithData)}</article></div>`;
  const latestSurvey = surveys[0];
  return `<div class="grid grid-2"><article class="card"><p class="label">Daily summary · ${escapeHtml(report.daily.localDate)}</p><strong class="metric-value">${report.daily.totalSessionMinutes} phút</strong><p class="subtle">Phiên dài nhất ${report.daily.longestSessionMinutes} phút · source ${humanLabel(report.dataSource)}.</p>${lineChart(report.daily.vli.score)}</article><article class="card"><p class="label">Checkup gần nhất</p>${latestSurvey ? `<h2>${humanLabel(latestSurvey.status)}</h2><p class="subtle">${humanLabel(latestSurvey.action)} · ${safeDate(latestSurvey.createdAt)}</p>` : `<h2>Chưa có checkup</h2><p class="subtle">Camera-off survey vẫn khả dụng.</p>`}<a class="text-link" href="#/checkup">Mở checkup</a></article><article class="card"><p class="label">Coverage & missing data</p><h2>${report.weekly.daysWithData} ngày có dữ liệu</h2><p class="subtle">Thiếu: ${report.missingData.map(humanLabel).join(", ") || "không có"}. Không nội suy ngày thiếu.</p><a class="text-link" href="#/intelligence">Xem baseline và pattern</a></article><article class="card"><p class="label">Professional Summary</p><p class="subtle">Preview trước khi chọn destination. EyeMate không tự gửi file.</p><div class="actions"><button class="btn btn-primary" id="report-preview" type="button">Preview Markdown</button><button class="btn" id="report-export-json" type="button">Preview JSON</button><button class="btn btn-danger" id="report-delete" type="button">Xóa report snapshots</button></div></article></div>`;
}

function lineChart(score: number | null): string { if (score === null) return `<div class="empty-state chart-placeholder"><p class="chart-empty">Chưa đủ dữ liệu để vẽ trend</p></div>`; const y = 170 - Math.min(100, score) * 1.4; return `<svg class="chart" viewBox="0 0 500 190" role="img" aria-label="Eye Load Index gần nhất là ${Math.round(score)}"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="chart-grid" d="M20 30H480M20 90H480M20 150H480"/><path class="chart-area" d="M20 170 C160 160 320 ${y + 10} 460 ${y} L460 180H20Z"/><path class="chart-line" d="M20 170 C160 160 320 ${y + 10} 460 ${y}"/><circle class="chart-point" cx="460" cy="${y}" r="5"/></svg>`; }
function heatmap(activeDays: number): string { return `<div class="heatmap" aria-label="Heatmap 7 ngày, ${activeDays} ngày có dữ liệu">${Array.from({ length: 168 }, (_, index) => `<span data-level="${index < activeDays * 8 ? (index % 3) + 1 : 0}"></span>`).join("")}</div>`; }
function emptyReport(): string { return `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">⌁</div><h2>Chưa có báo cáo cá nhân</h2><p class="subtle">Bắt đầu một phiên hoặc checkup để tạo aggregate local đầu tiên.</p><a class="btn btn-primary" href="#/checkup">Bắt đầu khám</a></div></section>`; }
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
async function openExportPreview(button: HTMLButtonElement, format: LocalExportFormat): Promise<void> {
  const preview = await runMutation(button, window.eyeMate.previewProfessionalSummary(format));
  if (preview === null) return;
  showModal("Preview trước export", `<pre>${escapeHtml(preview)}</pre><label class="option"><input id="export-include-evidence" type="checkbox" checked> <span>Bao gồm evidence IDs và missing-data details</span></label><p class="callout warning">Không phải chẩn đoán hoặc hồ sơ y tế. Destination chỉ được chọn sau bước này.</p>`, `<button class="btn btn-primary" id="report-export-confirm" type="button">Chọn nơi lưu ${format}</button>`);
  document.querySelector<HTMLButtonElement>("#report-export-confirm")?.addEventListener("click", async (event) => { const includeEvidence = document.querySelector<HTMLInputElement>("#export-include-evidence")?.checked ?? true; const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.exportM3WithDialog(format, includeEvidence), undefined, null); if (!result) return; closeModal(); if (result.status === "EXPORTED") showToast("Đã export vào vị trí bạn chọn."); else if (result.status === "CANCELLED") showToast("Bạn đã hủy export."); else showToast(`Export thất bại: ${result.reason}.`, "warning"); });
}

function showResetBaselineDialog(): void { showModal("Reset baseline?", "<p class=\"subtle\">Báo cáo cũ vẫn được giữ. Pattern phụ thuộc baseline sẽ trở về insufficient/learning.</p>", "<button class=\"btn btn-danger\" id=\"confirm-reset\" type=\"button\">Reset baseline</button>"); document.querySelector<HTMLButtonElement>("#confirm-reset")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.resetM3Baseline()); if (result) { closeModal(); showToast("Baseline đã reset; report lịch sử không bị sửa."); if (routeFromHash() === "intelligence") await renderIntelligence(); } }); }
function showDeleteReportsDialog(): void { showModal("Xóa report snapshots?", "<p class=\"subtle\">Chỉ xóa M3 report snapshots đã tạo. Session/checkup nguồn vẫn được giữ để bạn có thể tạo report mới.</p>", "<button class=\"btn btn-danger\" id=\"confirm-report-delete\" type=\"button\">Xóa reports</button>"); document.querySelector<HTMLButtonElement>("#confirm-report-delete")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.deleteM3Category("REPORT")); if (result) { closeModal(); showToast("Report snapshots đã xóa."); await renderReports(); } }); }

async function renderPrivacy(): Promise<void> {
  const [summary, inventory] = await withOperationTimeout(Promise.all([window.eyeMate.getPrivacySummary(), window.eyeMate.getDataInventory()]));
  const canWithdraw = summary.cameraConsentDecision === "GRANTED";
  setView(`${pageHeading("Privacy Center", "Dữ liệu của bạn, ở thiết bị của bạn", "Không account, không cloud và không lưu raw camera data.")}
    <div class="grid grid-2"><section class="card setting-group"><div class="setting-row"><div><label>Camera consent</label><small>${humanLabel(summary.cameraConsentDecision)} · ${humanLabel(summary.cameraState)}</small></div><button class="toggle" id="camera-consent-toggle" type="button" aria-label="Rút consent camera" aria-pressed="${canWithdraw}" ${canWithdraw ? "" : "disabled title=\"Không có camera consent đang hoạt động\""}></button></div><div class="setting-row"><div><label>Dữ liệu local</label><small>Thư mục dữ liệu ứng dụng · đường dẫn đầy đủ được ẩn</small></div><span class="status-pill">Local</span></div><div class="setting-row"><div><label>Network verification</label><small>Static inspection PASS; dynamic WPR UNKNOWN</small></div><span class="status-pill warning">UNKNOWN</span></div></section><section class="card"><p class="label">Cam kết dữ liệu</p><h2>Raw frame không được lưu</h2><p class="subtle">Video, landmark và raw per-frame series không đi vào database, log hoặc evidence. Dynamic egress chưa được chứng minh do giới hạn host policy.</p></section></div>
    <section class="inventory-section"><p class="label">Dữ liệu đang lưu</p><div class="grid grid-4">${inventory.map(inventoryCard).join("")}</div><p class="subtle">Sensitive payload được mã hóa local bằng AES-256-GCM; khóa được Windows bảo vệ. Pilot vẫn chờ Security/Privacy phê duyệt theo ADR-005.</p></section>
    <section class="card data-actions"><p class="label">Quản lý dữ liệu</p><div class="actions"><button class="btn" id="privacy-export" type="button">Preview & export</button><select class="field" id="privacy-export-format" aria-label="Định dạng export"><option value="MARKDOWN">Markdown</option><option value="JSON">JSON</option></select><button class="btn" id="privacy-reset-baseline" type="button">Reset baseline</button><button class="btn" type="button" disabled title="Chưa có calibration profile vì camera runtime chưa được xác minh">Reset calibration</button><button class="btn btn-danger" id="privacy-delete" type="button">Xóa toàn bộ dữ liệu</button></div><p class="subtle section-note">File export bên ngoài ứng dụng không được xóa tự động. Reset và delete là các action độc lập.</p></section>`);
  const pdfOption = document.createElement("option"); pdfOption.value = "PDF"; pdfOption.textContent = "PDF"; document.querySelector<HTMLSelectElement>("#privacy-export-format")?.append(pdfOption);
  document.querySelector<HTMLButtonElement>("#camera-consent-toggle")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.withdrawCameraConsent()); if (result !== null) { showToast("Consent camera đã được rút. History cũ chưa bị xóa."); await renderPrivacy(); } });
  document.querySelector<HTMLButtonElement>("#privacy-export")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, (document.querySelector<HTMLSelectElement>("#privacy-export-format")?.value ?? "MARKDOWN") as LocalExportFormat));
  document.querySelector("#privacy-reset-baseline")?.addEventListener("click", showResetBaselineDialog);
  document.querySelector("#privacy-delete")?.addEventListener("click", showDeleteStepOne);
}

function inventoryCard(item: DataInventoryItem): string { return `<article class="card inventory-card"><span class="label">${humanLabel(item.category)}</span><strong class="metric-value">${item.recordCount}</strong><p class="subtle">${escapeHtml(item.purpose)}<br>Local · đến khi bạn xóa</p></article>`; }

function showDeleteStepOne(): void { showModal("Xóa toàn bộ dữ liệu cục bộ?", "<p class=\"subtle\">Hành động này xóa onboarding, consent, session, report và aggregate do EyeMate quản lý. File export ngoài ứng dụng không bị xóa.</p><p class=\"callout warning\">Bước 1/2 · Không thể hoàn tác trong ứng dụng.</p>", "<button class=\"btn btn-danger\" id=\"delete-next\" type=\"button\">Tôi hiểu, tiếp tục</button>"); document.querySelector("#delete-next")?.addEventListener("click", showDeleteStepTwo); }
function showDeleteStepTwo(): void { showModal("Xác nhận lần cuối", "<p class=\"subtle\">Chọn “Xóa dữ liệu” để thực hiện ngay trên storage cục bộ.</p><p class=\"callout error\">Bước 2/2 · EyeMate sẽ báo kết quả thật.</p>", "<button class=\"btn btn-danger\" id=\"delete-confirm\" type=\"button\">Xóa dữ liệu</button>"); document.querySelector<HTMLButtonElement>("#delete-confirm")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.deleteAllLocalData()); if (!result) return; closeModal(); showToast(`Kết quả xóa: ${result}.`, result === "DELETED" ? "default" : "warning"); await renderPrivacy(); }); }

async function renderSettings(): Promise<void> {
  const [preferences, runtime] = await withOperationTimeout(Promise.all([window.eyeMate.getUserPreferences(), window.eyeMate.getRuntimeInfo()]));
  currentPreferences = preferences;
  applyPreferences(preferences);
  setView(`${pageHeading("Settings", "Điều chỉnh theo nhịp của bạn", "Mọi preference được tự lưu vào SQLite cục bộ sau 500ms.")}
    <div class="grid grid-2"><section class="card setting-group"><p class="label">Appearance & accessibility</p><div class="setting-row"><div><label for="appearance">Giao diện</label><small>Light theme chưa có contract/token được duyệt</small></div><select class="field" id="appearance" disabled><option>Dark</option></select></div><div class="setting-row"><div><label>Giảm chuyển động</label><small>Tắt breathing/ripple và chuyển động không thiết yếu</small></div><button class="toggle" id="reduced-motion-toggle" type="button" aria-label="Bật giảm chuyển động" aria-pressed="${preferences.reducedMotion}"></button></div></section>
    <section class="card setting-group"><p class="label">Notifications</p><div class="setting-row"><div><label>Break reminder</label><small>Nối trực tiếp vào nudge policy</small></div><button class="toggle" id="break-reminder-toggle" type="button" aria-label="Bật nhắc nghỉ" aria-pressed="${preferences.breakReminderEnabled}"></button></div><div class="setting-row"><div><label>Âm thanh nudge</label><small>Âm báo ngắn được tạo cục bộ; tắt mặc định</small></div><button class="toggle" id="sound-toggle" type="button" aria-label="Bật âm thanh nudge" aria-pressed="${preferences.soundEnabled}"></button></div></section>
    <section class="card setting-group"><p class="label">Quiet hours</p><div class="setting-row"><div><label>Không làm phiền</label><small>Nudge không khẩn sẽ bị policy abstain</small></div><button class="toggle" id="quiet-toggle" type="button" aria-label="Bật quiet hours" aria-pressed="${preferences.quietHoursEnabled}"></button></div><div class="setting-row"><label for="quiet-start">Bắt đầu</label><input class="field" id="quiet-start" type="time" value="${minutesToTime(preferences.quietStartMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div><div class="setting-row"><label for="quiet-end">Kết thúc</label><input class="field" id="quiet-end" type="time" value="${minutesToTime(preferences.quietEndMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div></section>
    <section class="card setting-group"><p class="label">Work session</p><div class="setting-row"><div><label for="default-mode">Mode mặc định</label><small>Camera modes bị khóa bởi ADR-004</small></div><select class="field" id="default-mode" disabled><option>Timer Only</option></select></div><div class="callout success">Timer Only luôn hoạt động khi camera off.</div></section>
    <section class="card setting-group"><p class="label">Camera</p><div class="setting-row"><div><label for="camera-device">Thiết bị</label><small>Runtime/model và ground truth chưa được xác minh</small></div><select class="field" id="camera-device" disabled title="Tính năng này cần ADR-004 accepted"><option>Camera đang tắt</option></select></div><button class="btn" type="button" disabled title="Chưa có calibration profile hợp lệ">Hiệu chỉnh camera</button></section>
    <section class="card setting-group"><p class="label">Data & reset</p><div class="setting-row"><div><label for="retention">Retention</label><small>Giữ local đến khi người dùng xóa; D-013 chưa final</small></div><select class="field" id="retention" disabled><option>Đến khi tôi xóa</option></select></div><div class="actions"><button class="btn" id="settings-reset-baseline" type="button">Reset baseline</button><a class="btn btn-danger" href="#/privacy">Quản lý/xóa dữ liệu</a></div></section>
    <section class="card"><p class="label">About</p><h2>EyeMate ${escapeHtml(runtime.applicationVersion)}</h2><p class="subtle">Channel: internal unsigned engineering · ${runtime.mode.replaceAll("_", " ")}<br>Không phải thiết bị y tế hoặc công cụ chẩn đoán.</p></section></div><p id="settings-save-status" class="save-status" aria-live="polite">Cài đặt đã đồng bộ từ storage cục bộ.</p>`);
  bindPreferenceToggle("sound-toggle"); bindPreferenceToggle("break-reminder-toggle"); bindPreferenceToggle("reduced-motion-toggle"); bindPreferenceToggle("quiet-toggle", true);
  document.querySelector("#quiet-start")?.addEventListener("change", schedulePreferencesSave);
  document.querySelector("#quiet-end")?.addEventListener("change", schedulePreferencesSave);
  document.querySelector("#settings-reset-baseline")?.addEventListener("click", showResetBaselineDialog);
}

function bindPreferenceToggle(id: string, controlsQuietInputs = false): void {
  document.querySelector<HTMLButtonElement>(`#${id}`)?.addEventListener("click", (event) => { const target = event.currentTarget as HTMLButtonElement; const next = target.getAttribute("aria-pressed") !== "true"; target.setAttribute("aria-pressed", String(next)); if (controlsQuietInputs) for (const input of [document.querySelector<HTMLInputElement>("#quiet-start"), document.querySelector<HTMLInputElement>("#quiet-end")]) if (input) input.disabled = !next; if (id === "reduced-motion-toggle") document.body.classList.toggle("motion-reduced", next); schedulePreferencesSave(); });
}

function readPreferencesFromControls(): UserPreferences {
  return { defaultMode: "TIMER_ONLY", soundEnabled: document.querySelector("#sound-toggle")?.getAttribute("aria-pressed") === "true", breakReminderEnabled: document.querySelector("#break-reminder-toggle")?.getAttribute("aria-pressed") === "true", quietHoursEnabled: document.querySelector("#quiet-toggle")?.getAttribute("aria-pressed") === "true", quietStartMinute: timeToMinutes(document.querySelector<HTMLInputElement>("#quiet-start")?.value ?? "22:00"), quietEndMinute: timeToMinutes(document.querySelector<HTMLInputElement>("#quiet-end")?.value ?? "07:00"), reducedMotion: document.querySelector("#reduced-motion-toggle")?.getAttribute("aria-pressed") === "true" };
}

function schedulePreferencesSave(): void {
  const status = document.querySelector<HTMLElement>("#settings-save-status"); if (status) status.textContent = "Đang chờ lưu…";
  const pendingPreferences = readPreferencesFromControls();
  if (pendingPreferences.quietHoursEnabled && pendingPreferences.quietStartMinute === pendingPreferences.quietEndMinute) {
    if (status) status.textContent = "Giờ bắt đầu và kết thúc phải khác nhau.";
    return;
  }
  if (preferencesSaveTimer !== null) window.clearTimeout(preferencesSaveTimer);
  preferencesSaveTimer = window.setTimeout(async () => { const saved = await runMutation(null, window.eyeMate.updateUserPreferences(pendingPreferences)); if (saved) { applyPreferences(saved); const current = document.querySelector<HTMLElement>("#settings-save-status"); if (current) current.textContent = "Đã tự lưu cục bộ."; } }, 500);
}

function applyPreferences(preferences: UserPreferences): void { currentPreferences = preferences; document.body.classList.toggle("motion-reduced", preferences.reducedMotion); }

async function renderRoute(): Promise<void> {
  if (sessionTicker !== null) { window.clearInterval(sessionTicker); sessionTicker = null; }
  const route = routeFromHash();
  if (route !== "checkup" && cameraRuntime.active) await stopCameraFlow();
  skeletonPage(route);
  try {
    if (route === "home") await renderHome();
    else if (route === "checkup") renderCheckup();
    else if (route === "companion") await renderCompanion();
    else if (route === "intelligence") await renderIntelligence();
    else if (route === "reports") await renderReports();
    else if (route === "privacy") await renderPrivacy();
    else await renderSettings();
  } catch (error) { errorView("Không thể tải trang", error instanceof Error && error.message === LOCAL_OPERATION_TIMEOUT ? "Quá 10 giây không có phản hồi" : "IPC cục bộ không phản hồi"); }
}

window.addEventListener("hashchange", () => void renderRoute());
window.addEventListener("beforeunload", () => { void stopCameraFlow(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden || !cameraRuntime.active) return;
  void stopCameraFlow().then(() => {
    cameraCalibration = null; cameraMeasurement = null; cameraReason = "CAMERA_INTERRUPTED_BY_VISIBILITY";
    if (routeFromHash() === "checkup") { checkupStep = 3; renderCheckup(); }
  });
});
if (!location.hash) location.replace("#/home");
void window.eyeMate.getUserPreferences().then(applyPreferences).catch(() => { /* Route error UI handles unavailable storage. */ });
void renderRoute();
