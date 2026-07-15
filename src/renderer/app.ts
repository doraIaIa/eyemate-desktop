import type { CheckupSummary, SafetyResponse, SurveyResponse } from "../shared/m1-contract.js";
import type { DataInventoryItem, LocalExportFormat, NudgeResponse, UserPreferences } from "../shared/preload-contract.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
import type { WorkSession } from "../work-session/session-state.js";
import { LOCAL_OPERATION_TIMEOUT, withOperationTimeout } from "./async-operation.js";
import { LocalCameraRuntime, type CameraRuntimeState } from "./camera-runtime.js";
import { aggregateMeasurementWindow, validateCalibrationProfile, type CameraCalibrationProfile, type CameraFrameObservation, type CameraMeasurementAggregate } from "../camera/measurement-window.js";
import { WELLNESS_DISCLAIMER, wellnessQuestions, type WellnessQuestionId } from "../symptom-checkup/wellness-check.js";
import { renderTasteDesignLab } from "./taste-design-lab.js";
import { CAMERA_CALIBRATION_CONFIG, createCameraCalibrationRecord, type CameraCalibrationRecord } from "../camera/calibration-service.js";
import { applyDevObservationOverrides, EMPTY_DEV_OVERRIDES, type DevOverrides } from "../camera/dev-overrides.js";
import { DevPanelController } from "./dev-panel.js";

type RouteId = "home" | "checkup" | "companion" | "intelligence" | "reports" | "privacy" | "settings" | "design-lab" | "taste-design-lab";
type ReportTab = "overview" | "week" | "month" | "history";

const routes: readonly RouteId[] = ["home", "checkup", "companion", "intelligence", "reports", "privacy", "settings", "design-lab", "taste-design-lab"];
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
let settingsCalibrationSamples: number[] | null = null;
let settingsCalibrationStartedAt: number | null = null;
let settingsCalibrationTicker: number | null = null;
let activeDevOverrides: DevOverrides = EMPTY_DEV_OVERRIDES;
let designLabMascotState = "WELCOME";
let designLabReducedMotion = false;
let designLabDestination = "Hôm nay";

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
    const effectiveObservation = applyDevObservationOverrides(observation, cameraCalibration, activeDevOverrides);
    latestCameraObservation = effectiveObservation;
    if (cameraMeasurementStartedAt !== null) cameraFrames.push(effectiveObservation);
    if (settingsCalibrationSamples !== null && observationQuality(effectiveObservation).acceptable && effectiveObservation.interEyeDistancePx !== null) settingsCalibrationSamples.push(effectiveObservation.interEyeDistancePx);
    updateDevRawMetrics();
    updateCameraLiveUi();
  }
});

const devPanel = new DevPanelController({
  getReadings: () => ({ cameraState, deviceLabel: cameraRuntime.context?.label ?? "Camera chưa mở", poseScore: latestCameraObservation?.poseScore ?? null, interEyeDistancePx: latestCameraObservation?.interEyeDistancePx ?? null, ear: latestCameraObservation?.leftEar !== null && latestCameraObservation?.leftEar !== undefined && latestCameraObservation.rightEar !== null ? (latestCameraObservation.leftEar + latestCameraObservation.rightEar) / 2 : null, calibrationState: cameraCalibration === null ? "UNKNOWN · cần calibration" : `profile ${cameraCalibration.profileVersion} · device-bound` }),
  onOverridesChanged: (overrides) => { activeDevOverrides = overrides; updateDevRawMetrics(); },
  onLandmarkOverlayChanged: (enabled) => cameraRuntime.setLandmarkOverlayEnabled(enabled)
});

function updateDevRawMetrics(): void {
  let strip = document.querySelector<HTMLElement>("#dev-raw-metrics");
  if (!activeDevOverrides.showRawMetrics) { strip?.remove(); return; }
  if (!strip) { strip = document.createElement("output"); strip.id = "dev-raw-metrics"; strip.className = "dev-raw-metrics"; strip.setAttribute("aria-live", "off"); document.body.append(strip); }
  const observation = latestCameraObservation;
  const ear = observation?.leftEar !== null && observation?.leftEar !== undefined && observation.rightEar !== null ? (observation.leftEar + observation.rightEar) / 2 : null;
  strip.textContent = `DEV · pose ${observation?.poseScore.toFixed(3) ?? "—"} · IOD ${observation?.interEyeDistancePx?.toFixed(1) ?? "—"}px · EAR ${ear?.toFixed(3) ?? "—"}`;
}

function routeFromHash(): RouteId {
  const path = location.hash.replace(/^#\/?/, "");
  if (path === "design-lab/living-aurora") return "design-lab";
  if (path === "design-lab/taste-direction") return "taste-design-lab";
  const candidate = path.split("/")[0];
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

interface HomeEvidenceItem {
  readonly id: "session" | "checkup" | "blink" | "distance" | "vli";
  readonly label: string;
  readonly coverage: number | null;
  readonly detail: string;
}

function productionEvidenceTrace(items: readonly HomeEvidenceItem[], note: string): string {
  const baseline = 112;
  const availableCount = items.filter((item) => item.coverage !== null).length;
  const state = availableCount >= 2 ? "READY" : "INSUFFICIENT_DATA";
  const bars = items.map((item, index) => {
    const x = 57 + index * 66;
    const coverage = item.coverage === null ? null : Math.max(0, Math.min(100, item.coverage));
    const height = coverage === null ? 18 : Math.max(10, Math.round(coverage * 0.88));
    const y = baseline - height;
    const coverageLabel = coverage === null ? "Thiếu dữ liệu" : `${Math.round(coverage)}% độ phủ`;
    const accessibleLabel = `${item.label}: ${coverageLabel}. ${item.detail}`;
    return `<g class="production-evidence-bar ${coverage === null ? "is-missing" : "is-available"}" tabindex="0" role="img" aria-label="${escapeHtml(accessibleLabel)}">
      <title>${escapeHtml(accessibleLabel)}</title>
      <rect x="${x}" y="${y}" width="36" height="${height}" rx="7"></rect>
      <text x="${x + 18}" y="132" text-anchor="middle">${escapeHtml(item.label)}</text>
    </g>`;
  }).join("");
  return `<figure class="production-trace trace-${state.toLowerCase()}" aria-labelledby="production-trace-title production-trace-note">
    <div class="production-trace-heading"><strong id="production-trace-title">Độ phủ evidence</strong><span>${availableCount}/5 nhóm có evidence</span></div>
    <div class="production-trace-field">
      <svg class="production-trace-chart" viewBox="0 0 408 146" role="img" aria-label="Biểu đồ độ phủ evidence cục bộ. Dùng Tab để đọc từng nhóm.">
        <defs><pattern id="production-missing-pattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eef0ed"></rect><path d="M0 0V6" stroke="#b8beb7" stroke-width="2"></path></pattern></defs>
        <g class="production-chart-axis" aria-hidden="true"><line x1="45" y1="24" x2="390" y2="24"></line><line x1="45" y1="68" x2="390" y2="68"></line><line x1="45" y1="112" x2="390" y2="112"></line><text x="5" y="28">100%</text><text x="12" y="72">50%</text><text x="22" y="116">0%</text></g>
        ${bars}
      </svg>
    </div>
    <figcaption><span id="production-trace-note">${escapeHtml(note)}</span><small>Lime biểu thị evidence có sẵn. Nét gạch biểu thị dữ liệu còn thiếu, không phải mức sức khỏe.</small></figcaption>
  </figure>`;
}

function productionHomeArtwork(): string {
  return `<div class="clarity-home-artwork" aria-hidden="true"><svg viewBox="0 0 220 96" focusable="false">
    <text class="clarity-optotype" x="8" y="19">E F P</text><text class="clarity-optotype faint" x="151" y="86">T O Z</text>
    <path class="clarity-art-trace trace-back" d="M9 55C42 25 80 25 111 49C137 69 169 72 211 38"></path>
    <path class="clarity-art-trace trace-front" d="M11 61C49 82 83 80 111 54C139 28 171 28 209 48"></path>
    <path class="clarity-art-lens" d="M67 53C80 37 98 29 115 31C133 33 149 43 159 57C145 72 128 79 110 77C92 75 77 67 67 53Z"></path>
    <circle class="clarity-art-focus" cx="113" cy="54" r="10"></circle><circle class="clarity-art-point" cx="113" cy="54" r="3"></circle>
  </svg></div>`;
}

function sessionProgressRing(value: string, progress: number | null, note: string): string {
  const angle = progress === null ? 0 : Math.round(Math.max(0, Math.min(100, progress)) * 3.6);
  const progressLabel = progress === null ? "Chưa có phiên hôm nay" : `${Math.round(Math.max(0, Math.min(100, progress)))}% của preset 25 phút`;
  return `<div class="clarity-session-ring ${progress === null ? "is-missing" : ""}" style="--session-angle:${angle}deg" role="img" aria-label="${escapeHtml(progressLabel)}"><div><small>Phiên hôm nay</small><strong>${value}</strong><span>Preset 25 phút</span></div></div><p>${escapeHtml(note)}</p>`;
}

function metricIcon(kind: "blink" | "distance" | "load"): string {
  if (kind === "blink") return `<svg viewBox="0 0 24 24" focusable="false"><path d="M3 12c2.4-3.2 5.4-4.8 9-4.8s6.6 1.6 9 4.8c-2.4 3.2-5.4 4.8-9 4.8S5.4 15.2 3 12Z"></path><circle cx="12" cy="12" r="2.2"></circle></svg>`;
  if (kind === "distance") return `<svg viewBox="0 0 24 24" focusable="false"><path d="M8 5H4v14h4M16 5h4v14h-4M7 12h10M9.5 9.5 7 12l2.5 2.5M14.5 9.5 17 12l-2.5 2.5"></path></svg>`;
  return `<svg viewBox="0 0 24 24" focusable="false"><path d="M4 17a8 8 0 0 1 16 0M12 17l4-6"></path><circle cx="12" cy="17" r="1.5"></circle></svg>`;
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
  if (settingsCalibrationStartedAt !== null) void cancelSettingsCalibration();
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
    LOOK_AWAY_BREAK: "Nghỉ nhìn xa trong chốc lát",
    CONSCIOUS_BLINK: "Chớp mắt chủ động vài lần",
    ADJUST_SCREEN_SETUP: "Điều chỉnh khoảng cách và ánh sáng màn hình",
    RECHECK_AFTER_REST: "Kiểm tra lại sau khi nghỉ mắt",
    CONSIDER_PROFESSIONAL_GUIDANCE: "Cân nhắc trao đổi với chuyên gia nếu khó chịu kéo dài",
    SCREEN_RELATED_DISCOMFORT_REPORTED: "khó chịu khi dùng màn hình được tự báo cáo",
    EYE_COMFORT_REPORTED: "cảm giác ở mắt được tự báo cáo",
    SCREEN_OR_ENVIRONMENT_DISCOMFORT_REPORTED: "khó chịu liên quan màn hình/môi trường được tự báo cáo",
    PERSISTENT_SELF_REPORTED_DISCOMFORT: "nhiều khó chịu được tự báo cáo",
    MAINTAIN_SUPPORTIVE_ROUTINE: "duy trì thói quen hỗ trợ mắt",
    ADD_SUPPORTIVE_BREAKS: "thêm nhịp nghỉ hỗ trợ",
    REVIEW_SCREEN_SETUP: "xem lại cách bố trí màn hình",
    PRIORITIZE_REST: "ưu tiên một nhịp nghỉ",
    RECHECK_SELF_REPORTED_EXPERIENCE: "theo dõi lại trải nghiệm sau khi nghỉ",
    INSUFFICIENT_SELF_REPORTED_DATA: "chưa đủ dữ liệu tự báo cáo",
    SAFETY_GATE_STOP: "Safety Gate yêu cầu ưu tiên hướng dẫn an toàn",
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
    PREFERENCE: "Cài đặt",
    NONE: "Chưa quyết định",
    GRANTED: "Đã cấp",
    SKIPPED: "Đã bỏ qua",
    WITHDRAWN: "Đã rút",
    SKIPPED_NO_CONSENT: "Bỏ qua vì chưa có consent",
    CAMERA_UNAVAILABLE: "Camera không khả dụng"
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
  const latestSummary = summaries[0];
  const todaySummary = summaries.find((summary) => {
    const createdAt = new Date(summary.createdAt);
    const today = new Date();
    return !Number.isNaN(createdAt.valueOf()) && createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth() && createdAt.getDate() === today.getDate();
  });
  const sessionElapsedMs = session?.state === "ACTIVE" ? session.elapsedActiveMs : todaySummary?.elapsedActiveMs ?? null;
  const sessionValue = sessionElapsedMs === null ? "Chưa có" : formatDuration(sessionElapsedMs);
  const sessionProgress = sessionElapsedMs === null ? null : sessionElapsedMs / (25 * 60_000) * 100;
  const sessionNote = session?.state === "ACTIVE" ? "Phiên Timer Only đang hoạt động." : todaySummary ? `${humanLabel(todaySummary.status)}. ${safeDate(todaySummary.createdAt)}.` : latestSummary ? `Chưa có phiên hôm nay. Phiên gần nhất: ${safeDate(latestSummary.createdAt)}.` : "Bắt đầu Timer Only để tạo Session Summary đầu tiên.";
  const missing = new Set(latest?.missingData ?? []);
  const evidenceItems: readonly HomeEvidenceItem[] = [
    { id: "session", label: "Phiên", coverage: sessionCount > 0 || session?.state === "ACTIVE" ? 100 : null, detail: sessionCount > 0 ? `${sessionCount} Session Summary đã lưu.` : session?.state === "ACTIVE" ? "Phiên Timer Only đang hoạt động." : "Chưa có Session Summary." },
    { id: "checkup", label: "Checkup", coverage: reports.length > 0 ? 100 : null, detail: reports.length > 0 ? `${reports.length} checkup tự báo cáo đã lưu.` : "Chưa có checkup tự báo cáo." },
    { id: "blink", label: "Blink", coverage: latest && !missing.has("blinkDeviation") ? Math.round(latest.daily.vli.dataConfidence * 100) : null, detail: latest && !missing.has("blinkDeviation") ? "Có provenance blink trong report mới nhất." : "Không suy đoán khi chưa có measurement hợp lệ." },
    { id: "distance", label: "Khoảng cách", coverage: latest && !missing.has("distanceDeviation") ? Math.round(latest.daily.vli.dataConfidence * 100) : null, detail: latest && !missing.has("distanceDeviation") ? "Có provenance khoảng cách trong report mới nhất." : "Không suy đoán khi chưa có measurement hợp lệ." },
    { id: "vli", label: "VLI", coverage: latest?.daily.vli.status === "AVAILABLE" ? Math.round(latest.daily.vli.dataConfidence * 100) : null, detail: latest?.daily.vli.status === "AVAILABLE" ? `Confidence ${Math.round(latest.daily.vli.dataConfidence * 100)}%.` : "Chưa đủ component để tính VLI." }
  ];
  const evidenceNote = latest ? `${latest.weekly.daysWithData}/7 ngày có dữ liệu. ${latest.missingData.length} nhóm evidence còn thiếu trong report mới nhất.` : "Chưa có report snapshot để mô tả pattern theo thời gian.";
  const weeklyValue = latest ? `${latest.weekly.daysWithData}/7 ngày` : "Chưa đủ";
  const weeklyNote = latest ? `${Math.round(latest.weekly.totalSessionMinutes)} phút được tổng hợp. ${latest.weekly.status === "AVAILABLE" ? "Đủ độ phủ tuần." : "Chưa đủ độ phủ tuần."}` : "Chưa có report tuần để đối chiếu.";
  setView(`<section class="clarity-home" aria-label="Tổng quan Hôm nay">${pageHeading("Hôm nay", "Chào bạn, mình bắt đầu nhẹ nhàng nhé.", `EyeMate ${escapeHtml(runtime.applicationVersion)} giữ rõ điều đã ghi nhận, điều chưa đo và bước tiếp theo.`, productionHomeArtwork())}
    <div class="clarity-home-grid">
      <article class="card clarity-overview-panel"><div class="clarity-panel-heading"><div><span class="clarity-section-mark"></span><p>Tổng quan hôm nay</p></div><small>LOCAL EVIDENCE</small></div><div class="clarity-overview-main"><div class="clarity-session-stat">${sessionProgressRing(sessionValue, sessionProgress, sessionNote)}</div>${productionEvidenceTrace(evidenceItems, evidenceNote)}</div><div class="actions clarity-quick-actions" aria-label="Hành động nhanh"><a class="btn btn-primary" href="#/companion">${session?.state === "ACTIVE" ? "Tiếp tục phiên" : "Bắt đầu phiên"}</a><a class="btn" href="#/checkup">Khám mắt</a><a class="text-link" href="#/reports">Xem báo cáo</a></div></article>
      <article class="clarity-focus-card"><div class="clarity-panel-heading"><div><span class="clarity-section-mark"></span><p>Đồng hành</p></div><small>QUIET MODE</small></div><p>${session?.state === "ACTIVE" ? "Phiên đang chạy" : "Phiên đề xuất"}</p><strong>${session?.state === "ACTIVE" ? formatDuration(session.elapsedActiveMs) : "25:00"}</strong><span>Timer Only · Camera đang tắt</span><a href="#/companion">${session?.state === "ACTIVE" ? "Tiếp tục" : "Mở phiên"}<b aria-hidden="true">→</b></a></article>
      ${metricCard("blink", "Nhịp chớp mắt", "Chưa đo", "NOT_MEASURED. Camera đang tắt.", null)}
      ${metricCard("distance", "Khoảng cách", "Chưa đo", "NOT_MEASURED. Không suy đoán.", null)}
      ${metricCard("load", "Tải thị giác", vli === null || vli === undefined ? "Chưa đủ" : String(Math.round(vli)), latest ? `Confidence ${Math.round(latest.daily.vli.dataConfidence * 100)}%.` : "INSUFFICIENT_DATA.", vli ?? null, "accent")}
      <article class="card clarity-next-panel"><div><span class="clarity-section-mark"></span><p>Bước tiếp theo</p></div><h2>Một việc nhỏ là đủ.</h2><p class="subtle">${sessionCount} phiên đã lưu. ${reports.length} lần checkup. Consent camera: ${humanLabel(privacy.cameraConsentDecision)}.</p><div class="actions"><a class="text-link" href="#/privacy">Privacy Center</a><a class="clarity-round-action" href="#/reports" aria-label="Xem báo cáo">↗</a></div></article>
      <article class="card clarity-week-panel"><span class="label">Dấu vết tuần này</span><strong>${weeklyValue}</strong><span>${weeklyNote}</span><a class="text-link" href="#/reports">Đối chiếu báo cáo</a></article>
    </div>
  </section>`);
}

function metricCard(kind: "blink" | "distance" | "load", label: string, value: string, note: string, progress: number | null, tone: "default" | "accent" = "default"): string {
  return `<article class="card metric-card clarity-metric-panel clarity-metric-${kind} ${tone === "accent" ? "accent" : ""}"><div class="clarity-metric-heading"><span class="clarity-metric-icon ${progress === null ? "is-missing" : "is-available"}" aria-hidden="true">${metricIcon(kind)}</span><span class="label">${label}</span><span class="trend ${progress === null ? "unknown" : ""}">${progress === null ? "Chưa đo" : "Local"}</span></div><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span><div class="metric-progress ${progress === null ? "is-missing" : ""}" aria-hidden="true"><span style="--progress:${progress === null ? 0 : Math.max(0, Math.min(100, progress))}%"></span></div></article>`;
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

function cameraGuidance(): string {
  const quality = observationQuality(latestCameraObservation);
  if (cameraState !== "ACTIVE") return "Bước 1: chọn camera (nếu có nhiều thiết bị), rồi nhấn “Mở camera”.";
  if (!quality.acceptable) return "Bước 2: giữ một khuôn mặt trong khung, nhìn thẳng và tăng ánh sáng nếu cần. Nút hiệu chỉnh sẽ mở khi chất lượng phù hợp.";
  if (cameraCalibration === null) return "Bước 3: dùng thước đo khoảng cách thật từ mắt đến màn hình, nhập số đo rồi nhấn “Xác nhận hiệu chỉnh”.";
  return "Hiệu chỉnh đã sẵn sàng. Bước 4: nhấn “Tiếp tục đo”, sau đó bắt đầu cửa sổ 30 giây.";
}

function updateCameraLiveUi(): void {
  const stateElement = document.querySelector<HTMLElement>("#camera-runtime-state");
  if (stateElement) stateElement.textContent = cameraStatusMessage();
  const quality = observationQuality(latestCameraObservation);
  const qualityElement = document.querySelector<HTMLElement>("#camera-quality-state");
  if (qualityElement) { qualityElement.textContent = quality.label; qualityElement.classList.toggle("success", quality.acceptable); }
  const guidanceElement = document.querySelector<HTMLElement>("#camera-guidance");
  if (guidanceElement) guidanceElement.textContent = cameraGuidance();
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
  const titles = ["EyeMate Symptom Check", "Năm câu tự báo cáo", "Kiểm tra camera", "Đo với camera", "Kết quả"];
  const stepBars = Array.from({ length: 5 }, (_, index) => `<span class="step ${index + 1 < checkupStep ? "done" : index + 1 === checkupStep ? "active" : ""}"></span>`).join("");
  let content = "";
  if (checkupStep === 1) content = `<div><p class="eyebrow">Bước 1 / 5</p><h2>${titles[0]}</h2><div class="callout disclaimer" role="note"><strong>Lưu ý quan trọng</strong><br>${escapeHtml(WELLNESS_DISCLAIMER)}</div><p class="subtle">Questionnaire này do EyeMate tự phát triển cho mục đích wellness. Camera chỉ mở sau lựa chọn rõ ràng của bạn.</p><div class="callout success"><strong>Local Only</strong><br>Model và xử lý chạy trên máy. Không upload, không lưu raw frame, video hoặc landmark.</div></div><div class="actions"><button class="btn btn-primary" id="checkup-camera-consent" type="button">Cho phép dùng camera</button><button class="btn" id="checkup-consent" type="button">Tiếp tục không camera</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 2) content = `<div><p class="eyebrow">Bước 2 / 5</p><h2>${titles[1]}</h2><p class="subtle">Trong 7 ngày gần đây, hãy ghi lại trải nghiệm của bạn. EyeMate Symptom Check gồm 5 câu tự phát triển, không phải công cụ lâm sàng đã được validation.</p>${wellnessSurveyFields()}<label class="label" for="safety-response">Tín hiệu cần dừng</label><select class="field" id="safety-response"><option value="NEGATIVE">Không có tín hiệu cần dừng</option><option value="CONFIRMED">Có tín hiệu cần dừng</option><option value="UNSURE">Chưa chắc</option><option value="PREFER_NOT_TO_ANSWER">Không muốn trả lời</option></select></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-survey-next" type="button">Tiếp tục</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 3) content = cameraRequested ? `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><p class="subtle">Chỉ cần làm lần lượt bốn bước bên dưới. Bạn có thể bỏ qua camera bất cứ lúc nào.</p><ol class="camera-steps" aria-label="Các bước hiệu chỉnh camera"><li class="${cameraState === "ACTIVE" ? "done" : "active"}">Mở camera</li><li class="${observationQuality(latestCameraObservation).acceptable ? "done" : ""}">Đưa khuôn mặt vào khung hình</li><li class="${cameraCalibration !== null ? "done" : ""}">Nhập khoảng cách thật bằng thước</li><li class="${cameraCalibration !== null ? "active" : ""}">Bắt đầu đo 30 giây</li></ol><div class="camera-calibration"><video id="camera-preview" aria-label="Xem trước camera cục bộ"></video><div><label class="label" for="camera-device">Camera đang dùng</label><select class="field" id="camera-device"><option>Camera mặc định</option></select><p class="callout" id="camera-runtime-state" aria-live="polite">${cameraStatusMessage()}</p><p class="callout" id="camera-quality-state" aria-live="polite">${observationQuality(latestCameraObservation).label}</p><p class="camera-guidance" id="camera-guidance" aria-live="polite">${cameraGuidance()}</p><div class="camera-reading"><span><small>EAR trực tiếp</small><strong id="camera-live-ear">—</strong></span></div><label class="label" for="calibration-distance">Khoảng cách thật từ mắt đến màn hình (cm)</label><input class="field" id="calibration-distance" type="number" min="20" max="150" value="60" inputmode="decimal" aria-describedby="calibration-help"><p class="subtle" id="calibration-help">Dùng thước đo một lần. Số này chỉ dùng để hiệu chỉnh cục bộ, không phải chẩn đoán.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-open-camera" type="button">1. Mở camera</button><button class="btn" id="checkup-calibrate" type="button" disabled title="Hoàn tất bước 1 và 2 trước">3. Xác nhận hiệu chỉnh</button><button class="btn btn-primary" id="checkup-measure-next" type="button" disabled title="Hoàn tất hiệu chỉnh trước">4. Tiếp tục đo</button><button class="btn btn-ghost" id="checkup-camera-next" type="button">Bỏ qua camera</button></div>` : `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><div class="callout warning"><strong>Camera đang tắt</strong><br>Bạn chưa cấp consent camera. EyeMate sẽ tiếp tục survey-only và không suy đoán chỉ số camera.</div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-camera-next" type="button">Dùng survey-only</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 4) content = cameraRequested && cameraCalibration !== null && cameraRuntime.active ? `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="measurement-countdown" aria-live="polite"><strong id="camera-countdown">00:30</strong><span>giữ tư thế tự nhiên</span></div><div class="camera-reading"><span><small>EAR</small><strong id="camera-live-ear">—</strong></span><span><small>Chất lượng</small><strong id="camera-quality-state">Đang chờ</strong></span></div><p class="subtle">Quan sát per-frame chỉ tồn tại trong RAM trong cửa sổ 30 giây và bị xóa ngay sau khi tổng hợp.</p></div><div class="actions"><button class="btn btn-primary" id="checkup-measure-start" type="button">Bắt đầu 30 giây</button><button class="btn btn-danger" data-checkup-cancel type="button">Hủy đo</button></div>` : `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="empty-state"><div><div class="empty-icon" aria-hidden="true">◉</div><h3>Đo camera đã được bỏ qua an toàn</h3><p class="subtle">EAR, khoảng cách và blink counter không được suy đoán khi camera tắt.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-finish" type="button">Xem kết quả</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  const cameraEvidence = cameraMeasurement === null ? "Survey-only · camera không đo" : cameraMeasurement.status === "COMPLETED" ? `Camera local · ${cameraMeasurement.validSampleCount}/${cameraMeasurement.sampleCount} mẫu hợp lệ · blink ${cameraMeasurement.blinkSummary.status === "OBSERVED" ? `${cameraMeasurement.blinkSummary.ratePerMinute}/phút` : "UNKNOWN"} · khoảng cách ${cameraMeasurement.distanceSummary.status === "OBSERVED" ? humanLabel(cameraMeasurement.distanceSummary.dominantZone) : "UNKNOWN"}` : `Camera ${humanLabel(cameraMeasurement.status)} · kết quả camera UNKNOWN`;
  if (checkupStep === 5) content = checkupResult ? `<div><p class="eyebrow">Bước 5 / 5</p><h2>${titles[4]}</h2><span class="status-pill ${checkupResult.status === "SAFETY_STOP" ? "warning" : ""}">${humanLabel(checkupResult.status)}</span><section class="grid grid-2" aria-label="Tổng quan hôm nay"><div class="callout success"><strong>EyeMate Symptom Check</strong><br><span class="metric-value">${checkupResult.discomfortLoad.score === null ? "—" : checkupResult.discomfortLoad.score.toFixed(0)}</span> / ${checkupResult.discomfortLoad.maximumScore}<br>${checkupResult.discomfortLoad.label}<br><small>Nhóm hành động sản phẩm · dựa trên câu trả lời tự báo cáo</small></div><div class="callout"><strong>Camera</strong><br>${cameraEvidence}<br><small>Chất lượng/độ tin cậy chỉ có khi có đủ dữ liệu.</small></div></section><h3 class="section-heading">Gợi ý wellness</h3><div class="grid grid-2">${checkupResult.actions.map((action) => `<div class="callout"><strong>${humanLabel(action.id)}</strong><br><small>Nguồn: ${action.evidenceSource === "SAFETY_GATE" ? "Safety Gate" : "Tự báo cáo"} · ${humanLabel(action.reasonCode)}</small></div>`).join("")}</div><h3 class="section-heading">Dữ liệu thiếu và giới hạn</h3><p class="subtle">${checkupResult.missingData.length ? `Chưa chắc/chưa đủ: ${checkupResult.missingData.join(", ")}. ` : "Không có câu tự báo cáo bị thiếu. "}${checkupResult.limitation}. Không hợp nhất câu trả lời và camera thành kết luận bệnh.</p><p class="subtle">Nên check lại sau khi nghỉ mắt hoặc khi trải nghiệm thay đổi. Safety Gate luôn được ưu tiên khi có tín hiệu cần dừng.</p><div class="callout disclaimer" role="note"><strong>Lưu ý quan trọng</strong><br>${escapeHtml(WELLNESS_DISCLAIMER)}</div></div><div class="actions"><button class="btn" data-checkup-export="MARKDOWN" type="button">Export Markdown</button><button class="btn" data-checkup-export="JSON" type="button">Export JSON</button><button class="btn" data-checkup-export="PDF" type="button">Export PDF</button><button class="btn btn-primary" id="checkup-done" type="button">Về tổng quan</button><button class="btn" id="checkup-repeat" type="button">Làm lại</button></div>` : `<div class="empty-state"><div><div class="empty-icon">!</div><h2>Chưa có kết quả</h2><button class="btn" id="checkup-repeat" type="button">Bắt đầu lại</button></div></div>`;
  setView(`${pageHeading("Checkup", "Một phút để lắng nghe đôi mắt", "Flow từng bước, camera-off an toàn và không đưa ra chẩn đoán.")}<section class="wizard"><div class="stepper" aria-label="Tiến trình checkup">${stepBars}</div><article class="card wizard-card">${content}</article></section>`);
  bindCheckupControls();
}

function wellnessSurveyFields(): string {
  return wellnessQuestions.map((question, index) => `<fieldset class="option-grid" data-wellness-question="${question.id}"><legend class="label">${index + 1}. ${question.wording}</legend>${question.responseScale.map((label, value) => `<label class="option"><input type="radio" name="wellness-${question.id}" value="${value}"> <span>${value} · ${label}</span></label>`).join("")}<label class="option"><input type="radio" name="wellness-${question.id}" value="UNKNOWN" checked> <span>Chưa chắc</span></label>${question.supportsNotApplicable ? `<label class="option"><input type="radio" name="wellness-${question.id}" value="NOT_APPLICABLE"> <span>Không áp dụng</span></label>` : ""}</fieldset>`).join("");
}

let pendingSurvey: { answers: Record<WellnessQuestionId, SurveyResponse>; safety: SafetyResponse } = {
  answers: Object.fromEntries(wellnessQuestions.map((question) => [question.id, "UNKNOWN"])) as Record<WellnessQuestionId, SurveyResponse>,
  safety: "NEGATIVE"
};
function bindCheckupControls(): void {
  document.querySelector<HTMLButtonElement>("#checkup-camera-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.grantCameraConsent()); if (result !== null) { cameraRequested = true; checkupStep = 2; renderCheckup(); } });
  document.querySelector<HTMLButtonElement>("#checkup-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.completeOnboardingWithoutCamera()); if (result !== null) { checkupStep = 2; renderCheckup(); } });
  document.querySelector("#checkup-back")?.addEventListener("click", () => { if (checkupStep <= 3) { void stopCameraFlow(); cameraCalibration = null; } checkupStep = Math.max(1, checkupStep - 1); renderCheckup(); });
  document.querySelector("#checkup-survey-next")?.addEventListener("click", () => {
    const answers = Object.fromEntries(wellnessQuestions.map((question) => {
      const value = document.querySelector<HTMLInputElement>(`input[name='wellness-${question.id}']:checked`)?.value ?? "UNKNOWN";
      return [question.id, /^[0-3]$/.test(value) ? Number(value) as SurveyResponse : value as SurveyResponse];
    })) as Record<WellnessQuestionId, SurveyResponse>;
    pendingSurvey = { answers, safety: (document.querySelector<HTMLSelectElement>("#safety-response")?.value ?? "NEGATIVE") as SafetyResponse };
    checkupStep = 3; renderCheckup();
  });
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
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-checkup-export]"))) button.addEventListener("click", async (event) => {
    if (!checkupResult) return;
    const format = (event.currentTarget as HTMLButtonElement).dataset.checkupExport as LocalExportFormat;
    const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.exportCheckupWithDialog(checkupResult.reportId, format), undefined, null);
    if (result) showToast(result.status === "EXPORTED" ? "Đã xuất EyeMate Symptom Check cục bộ." : "Đã hủy export.");
  });
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
  return `<div class="${session.state === "PAUSED" ? "session-paused" : ""}"><p class="label">${session.state === "PAUSED" ? "Đang tạm dừng" : "Phiên đang hoạt động"}</p>${sessionTimerRing(session.elapsedActiveMs)}<p class="subtle">Preset 25 phút · nhắc nghỉ theo cooldown policy · Camera tắt</p><div class="actions"><button class="btn" id="session-toggle" type="button">${active ? "Tạm dừng" : "Tiếp tục"}</button><button class="btn" id="session-nudge" type="button" ${active && preferences.breakReminderEnabled ? "" : `disabled title=\"${preferences.breakReminderEnabled ? "Chỉ khả dụng khi phiên đang chạy" : "Break reminder đang tắt trong Cài đặt"}\"`}>Nhắc tôi nghỉ</button><button class="btn btn-primary" id="session-end" type="button">Hoàn thành</button><button class="btn btn-danger" id="session-cancel" type="button">Hủy phiên</button></div></div>`;
}

const SESSION_PRESET_MS = 25 * 60_000;
const SESSION_RING_CIRCUMFERENCE = 2 * Math.PI * 48;
function sessionTimerRing(elapsedMs: number): string {
  const progress = Math.min(1, Math.max(0, elapsedMs / SESSION_PRESET_MS));
  const offset = SESSION_RING_CIRCUMFERENCE * (1 - progress);
  return `<div class="companion-timer-ring" id="companion-timer-ring" role="timer" aria-label="Đã làm việc ${formatDuration(elapsedMs)} trên preset 25 phút"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="companion-ring-track" cx="60" cy="60" r="48"></circle><circle class="companion-ring-progress" id="session-ring-progress" cx="60" cy="60" r="48" stroke-dasharray="${SESSION_RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}"></circle></svg><div><strong class="session-timer" id="session-timer">${formatDuration(elapsedMs)}</strong><small>PHIÊN LÀM VIỆC</small></div></div>`;
}

function updateSessionTimerVisual(elapsedMs: number): void {
  const timer = document.querySelector<HTMLElement>("#session-timer"); if (timer) timer.textContent = formatDuration(elapsedMs);
  const progress = Math.min(1, Math.max(0, elapsedMs / SESSION_PRESET_MS));
  document.querySelector<SVGCircleElement>("#session-ring-progress")?.setAttribute("stroke-dashoffset", String(SESSION_RING_CIRCUMFERENCE * (1 - progress)));
  document.querySelector<HTMLElement>("#companion-timer-ring")?.setAttribute("aria-label", `Đã làm việc ${formatDuration(elapsedMs)} trên preset 25 phút`);
}

function bindSessionControls(session: WorkSession | null, _preferences: UserPreferences): void {
  if (sessionTicker !== null) window.clearInterval(sessionTicker);
  if (session?.state === "ACTIVE") sessionTicker = window.setInterval(() => { if (activeStartedAt !== null) updateSessionTimerVisual(activeElapsedBase + performance.now() - activeStartedAt); }, 250);
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
    <section class="card data-actions"><p class="label">Quản lý dữ liệu</p><div class="actions"><button class="btn" id="privacy-export" type="button">Preview & export</button><select class="field" id="privacy-export-format" aria-label="Định dạng export"><option value="MARKDOWN">Markdown</option><option value="JSON">JSON</option></select><button class="btn" id="privacy-reset-baseline" type="button">Reset baseline</button><button class="btn" id="privacy-reset-calibration" type="button">Reset calibration</button><button class="btn btn-danger" id="privacy-delete" type="button">Xóa toàn bộ dữ liệu</button></div><p class="subtle section-note">File export bên ngoài ứng dụng không được xóa tự động. Reset và delete là các action độc lập.</p></section>`);
  const pdfOption = document.createElement("option"); pdfOption.value = "PDF"; pdfOption.textContent = "PDF"; document.querySelector<HTMLSelectElement>("#privacy-export-format")?.append(pdfOption);
  document.querySelector<HTMLButtonElement>("#camera-consent-toggle")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.withdrawCameraConsent()); if (result !== null) { showToast("Consent camera đã được rút. History cũ chưa bị xóa."); await renderPrivacy(); } });
  document.querySelector<HTMLButtonElement>("#privacy-export")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, (document.querySelector<HTMLSelectElement>("#privacy-export-format")?.value ?? "MARKDOWN") as LocalExportFormat));
  document.querySelector("#privacy-reset-baseline")?.addEventListener("click", showResetBaselineDialog);
  document.querySelector("#privacy-reset-calibration")?.addEventListener("click", showResetCalibrationDialog);
  document.querySelector("#privacy-delete")?.addEventListener("click", showDeleteStepOne);
}

function inventoryCard(item: DataInventoryItem): string { return `<article class="card inventory-card"><span class="label">${humanLabel(item.category)}</span><strong class="metric-value">${item.recordCount}</strong><p class="subtle">${escapeHtml(item.purpose)}<br>Local · đến khi bạn xóa</p></article>`; }

function showDeleteStepOne(): void { showModal("Xóa toàn bộ dữ liệu cục bộ?", "<p class=\"subtle\">Hành động này xóa onboarding, consent, session, report và aggregate do EyeMate quản lý. File export ngoài ứng dụng không bị xóa.</p><p class=\"callout warning\">Bước 1/2 · Không thể hoàn tác trong ứng dụng.</p>", "<button class=\"btn btn-danger\" id=\"delete-next\" type=\"button\">Tôi hiểu, tiếp tục</button>"); document.querySelector("#delete-next")?.addEventListener("click", showDeleteStepTwo); }
function showDeleteStepTwo(): void { showModal("Xác nhận lần cuối", "<p class=\"subtle\">Chọn “Xóa dữ liệu” để thực hiện ngay trên storage cục bộ.</p><p class=\"callout error\">Bước 2/2 · EyeMate sẽ báo kết quả thật.</p>", "<button class=\"btn btn-danger\" id=\"delete-confirm\" type=\"button\">Xóa dữ liệu</button>"); document.querySelector<HTMLButtonElement>("#delete-confirm")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.deleteAllLocalData()); if (!result) return; closeModal(); showToast(`Kết quả xóa: ${result}.`, result === "DELETED" ? "default" : "warning"); await renderPrivacy(); }); }

async function renderSettings(): Promise<void> {
  const [preferences, runtime, calibration] = await withOperationTimeout(Promise.all([window.eyeMate.getUserPreferences(), window.eyeMate.getRuntimeInfo(), window.eyeMate.getCameraCalibration()]));
  currentPreferences = preferences;
  applyPreferences(preferences);
  setView(`${pageHeading("Settings", "Điều chỉnh theo nhịp của bạn", "Mọi preference được tự lưu vào SQLite cục bộ sau 500ms.")}
    <div class="grid grid-2"><section class="card setting-group"><p class="label">Appearance & accessibility</p><div class="setting-row"><div><label for="appearance">Giao diện</label><small>Clarity Grid light đang là giao diện production</small></div><select class="field" id="appearance" disabled><option>Clarity light</option></select></div><div class="setting-row"><div><label>Giảm chuyển động</label><small>Tắt reveal, ripple và chuyển động không thiết yếu</small></div><button class="toggle" id="reduced-motion-toggle" type="button" aria-label="Bật giảm chuyển động" aria-pressed="${preferences.reducedMotion}"></button></div></section>
    <section class="card setting-group"><p class="label">Notifications</p><div class="setting-row"><div><label>Break reminder</label><small>Nối trực tiếp vào nudge policy</small></div><button class="toggle" id="break-reminder-toggle" type="button" aria-label="Bật nhắc nghỉ" aria-pressed="${preferences.breakReminderEnabled}"></button></div><div class="setting-row"><div><label>Âm thanh nudge</label><small>Âm báo ngắn được tạo cục bộ; tắt mặc định</small></div><button class="toggle" id="sound-toggle" type="button" aria-label="Bật âm thanh nudge" aria-pressed="${preferences.soundEnabled}"></button></div></section>
    <section class="card setting-group"><p class="label">Quiet hours</p><div class="setting-row"><div><label>Không làm phiền</label><small>Nudge không khẩn sẽ bị policy abstain</small></div><button class="toggle" id="quiet-toggle" type="button" aria-label="Bật quiet hours" aria-pressed="${preferences.quietHoursEnabled}"></button></div><div class="setting-row"><label for="quiet-start">Bắt đầu</label><input class="field" id="quiet-start" type="time" value="${minutesToTime(preferences.quietStartMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div><div class="setting-row"><label for="quiet-end">Kết thúc</label><input class="field" id="quiet-end" type="time" value="${minutesToTime(preferences.quietEndMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div></section>
    <section class="card setting-group"><p class="label">Work session</p><div class="setting-row"><div><label for="default-mode">Mode mặc định</label><small>Camera modes bị khóa bởi ADR-004</small></div><select class="field" id="default-mode" disabled><option>Timer Only</option></select></div><div class="callout success">Timer Only luôn hoạt động khi camera off.</div></section>
    <section class="card setting-group" id="settings-camera-calibration"><p class="label">Hiệu chỉnh camera</p><div class="setting-row"><div><strong>${calibration === null ? "Chưa hiệu chỉnh" : `Đã hiệu chỉnh · ${humanLabel(calibration.confidence)}`}</strong><small>${calibration === null ? "Profile gắn với camera giúp phân loại zone; không xuất centimet." : `${calibration.validSampleCount} mẫu hợp lệ · ${safeDate(calibration.profile.calibratedAt)}`}</small></div><span class="status-pill ${calibration === null ? "warning" : ""}">${calibration === null ? "UNKNOWN" : "LOCAL"}</span></div><div class="actions"><button class="btn btn-primary" id="settings-calibrate-camera" type="button">${calibration === null ? "Hiệu chỉnh camera" : "Hiệu chỉnh lại"}</button>${calibration === null ? "" : `<button class="btn" id="settings-reset-calibration" type="button">Reset</button>`}</div><p class="subtle">Camera chỉ mở sau hành động này và consent rõ ràng. Raw frame/landmark không được lưu; chỉ aggregate profile được mã hóa cục bộ.</p></section>
    <section class="card setting-group"><p class="label">Data & reset</p><div class="setting-row"><div><label for="retention">Retention</label><small>Giữ local đến khi người dùng xóa; D-013 chưa final</small></div><select class="field" id="retention" disabled><option>Đến khi tôi xóa</option></select></div><div class="actions"><button class="btn" id="settings-reset-baseline" type="button">Reset baseline</button><a class="btn btn-danger" href="#/privacy">Quản lý/xóa dữ liệu</a></div></section>
    <section class="card"><p class="label">About</p><h2>EyeMate ${escapeHtml(runtime.applicationVersion)}</h2><p class="subtle">Channel: internal unsigned engineering · ${runtime.mode.replaceAll("_", " ")}<br>Không phải thiết bị y tế hoặc công cụ chẩn đoán.</p></section></div><p id="settings-save-status" class="save-status" aria-live="polite">Cài đặt đã đồng bộ từ storage cục bộ.</p>`);
  bindPreferenceToggle("sound-toggle"); bindPreferenceToggle("break-reminder-toggle"); bindPreferenceToggle("reduced-motion-toggle"); bindPreferenceToggle("quiet-toggle", true);
  document.querySelector("#quiet-start")?.addEventListener("change", schedulePreferencesSave);
  document.querySelector("#quiet-end")?.addEventListener("change", schedulePreferencesSave);
  document.querySelector("#settings-reset-baseline")?.addEventListener("click", showResetBaselineDialog);
  document.querySelector("#settings-calibrate-camera")?.addEventListener("click", showCameraCalibrationDialog);
  document.querySelector("#settings-reset-calibration")?.addEventListener("click", showResetCalibrationDialog);
}

function showCameraCalibrationDialog(): void {
  showModal("Hiệu chỉnh khoảng cách", `<p class="subtle">Ngồi thẳng, nhìn thẳng vào camera và dùng thước đo khoảng cách từ mắt đến màn hình. Giá trị này là tham chiếu calibration, không phải phép đo y tế.</p><label class="label" for="settings-calibration-distance">Khoảng cách tham chiếu (cm)</label><input class="field" id="settings-calibration-distance" type="number" min="20" max="150" value="50" inputmode="decimal"><div class="callout warning" role="note">Camera chỉ xử lý cục bộ. EyeMate sẽ thu các IOD sample trong RAM trong 5 giây rồi chỉ giữ median/variance/confidence.</div>`, `<button class="btn btn-primary" id="settings-calibration-start" type="button">Bắt đầu hiệu chỉnh</button>`);
  document.querySelector<HTMLButtonElement>("#settings-calibration-start")?.addEventListener("click", (event) => void startSettingsCalibration(event.currentTarget as HTMLButtonElement));
}

async function startSettingsCalibration(button: HTMLButtonElement): Promise<void> {
  const referenceDistanceCm = Number(document.querySelector<HTMLInputElement>("#settings-calibration-distance")?.value);
  if (!Number.isFinite(referenceDistanceCm) || referenceDistanceCm < 20 || referenceDistanceCm > 150) { showToast("Khoảng cách tham chiếu phải từ 20 đến 150 cm.", "warning"); return; }
  const consent = await runMutation(button, window.eyeMate.grantCameraConsent());
  if (consent === null) return;
  settingsCalibrationSamples = [];
  showModal("Giữ nguyên tư thế…", `<video id="settings-calibration-video" class="calibration-video" aria-label="Xem trước camera hiệu chỉnh cục bộ"></video><p class="callout" id="settings-calibration-state" aria-live="polite">Đang mở camera…</p><div class="session-progress" role="progressbar" aria-label="Tiến trình hiệu chỉnh" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="settings-calibration-progress" style="--progress:0%"></span></div><p class="subtle">Dữ liệu theo frame chỉ ở RAM và sẽ bị xóa sau khi tạo aggregate.</p>`, `<button class="btn" id="settings-calibration-cancel" type="button">Hủy</button>`);
  document.querySelector("#settings-calibration-cancel")?.addEventListener("click", closeModal);
  const video = document.querySelector<HTMLVideoElement>("#settings-calibration-video");
  if (!video) { await cancelSettingsCalibration(); return; }
  const context = await cameraRuntime.start(video);
  if (context === null) { settingsCalibrationSamples = null; showToast("Không thể mở camera để hiệu chỉnh.", "warning"); return; }
  settingsCalibrationStartedAt = performance.now();
  const state = document.querySelector<HTMLElement>("#settings-calibration-state"); if (state) state.textContent = "Đang thu aggregate cục bộ…";
  settingsCalibrationTicker = window.setInterval(() => {
    if (settingsCalibrationStartedAt === null) return;
    const progress = Math.min(1, (performance.now() - settingsCalibrationStartedAt) / CAMERA_CALIBRATION_CONFIG.captureDurationMs);
    const bar = document.querySelector<HTMLElement>("#settings-calibration-progress"); if (bar) bar.style.setProperty("--progress", `${Math.round(progress * 100)}%`);
    document.querySelector<HTMLElement>("[aria-label='Tiến trình hiệu chỉnh']")?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    if (progress >= 1) void finishSettingsCalibration(context, referenceDistanceCm);
  }, 100);
}

async function finishSettingsCalibration(context: { readonly deviceBinding: string; readonly width: number; readonly height: number }, referenceDistanceCm: number): Promise<void> {
  if (settingsCalibrationStartedAt === null) return;
  const samples = settingsCalibrationSamples ?? [];
  settingsCalibrationStartedAt = null;
  if (settingsCalibrationTicker !== null) window.clearInterval(settingsCalibrationTicker);
  settingsCalibrationTicker = null;
  settingsCalibrationSamples = null;
  await cameraRuntime.stop();
  try {
    const record = createCameraCalibrationRecord({ ...context, referenceDistanceCm, interEyeDistanceSamplesPx: samples, calibratedAt: new Date().toISOString() });
    showCameraCalibrationResult(record);
  } catch {
    showModal("Chưa đủ dữ liệu", `<p class="callout warning">EyeMate nhận được ${samples.length} sample hợp lệ; cần ít nhất ${CAMERA_CALIBRATION_CONFIG.minimumValidSamples}. Hãy bảo đảm khuôn mặt rõ, ánh sáng ổn định và nhìn thẳng.</p>`, `<button class="btn btn-primary" id="settings-calibration-retry" type="button">Thử lại</button>`);
    document.querySelector("#settings-calibration-retry")?.addEventListener("click", showCameraCalibrationDialog);
  }
}

function showCameraCalibrationResult(record: CameraCalibrationRecord): void {
  showModal("Hiệu chỉnh hoàn tất", `<div class="grid grid-2"><div class="callout success"><strong>Tham chiếu đã nhập</strong><br><span class="metric-value">${record.profile.groundTruthCm} cm</span></div><div class="callout"><strong>Độ tin cậy kỹ thuật</strong><br><span class="metric-value">${humanLabel(record.confidence)}</span></div></div><p class="subtle">${record.validSampleCount} sample hợp lệ · CV ${(record.coefficientOfVariation * 100).toFixed(1)}%. EyeMate chỉ dùng profile này để phân loại zone; chưa công bố khoảng cách centimet đo được.</p>`, `<button class="btn btn-primary" id="settings-calibration-save" type="button">Lưu</button><button class="btn" id="settings-calibration-retry" type="button">Thử lại</button>`);
  document.querySelector<HTMLButtonElement>("#settings-calibration-save")?.addEventListener("click", async (event) => { const saved = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.saveCameraCalibration(record)); if (!saved) return; cameraCalibration = saved.profile; closeModal(); showToast("Đã lưu aggregate hiệu chỉnh cục bộ."); await renderSettings(); });
  document.querySelector("#settings-calibration-retry")?.addEventListener("click", showCameraCalibrationDialog);
}

async function cancelSettingsCalibration(): Promise<void> {
  settingsCalibrationStartedAt = null;
  settingsCalibrationSamples = null;
  if (settingsCalibrationTicker !== null) window.clearInterval(settingsCalibrationTicker);
  settingsCalibrationTicker = null;
  await cameraRuntime.stop();
}

function showResetCalibrationDialog(): void {
  showModal("Reset calibration?", "<p class=\"subtle\">Profile camera hiện tại sẽ bị xóa. Distance monitoring trở về UNKNOWN cho đến khi hiệu chỉnh lại; dữ liệu khác được giữ nguyên.</p>", "<button class=\"btn btn-danger\" id=\"confirm-calibration-reset\" type=\"button\">Reset calibration</button>");
  document.querySelector<HTMLButtonElement>("#confirm-calibration-reset")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.resetCameraCalibration()); if (!result) return; cameraCalibration = null; closeModal(); showToast("Calibration đã reset; khoảng cách trở về UNKNOWN."); if (routeFromHash() === "settings") await renderSettings(); else if (routeFromHash() === "privacy") await renderPrivacy(); });
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

function lumiPrototype(state: string): string {
  return `<svg class="lumi-prototype state-${state.toLowerCase()}" viewBox="0 0 240 240" role="img" aria-label="Lumi prototype, trạng thái ${state}"><defs><linearGradient id="lumi-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF0C8"/><stop offset=".5" stop-color="#8DE7D8"/><stop offset="1" stop-color="#A98AF4"/></linearGradient></defs><path class="lumi-glow" d="M120 31c42 0 77 34 77 77 0 43-29 77-77 100-48-23-77-57-77-100 0-43 35-77 77-77Z"/><path class="lumi-body" d="M120 43c37 0 66 29 66 66 0 38-25 68-66 88-41-20-66-50-66-88 0-37 29-66 66-66Z"/><path class="lumi-face smile" d="M81 120c17 15 61 15 78 0"/><path class="lumi-face neutral" d="M91 130h58"/><circle class="lumi-eye left" cx="93" cy="102" r="7"/><circle class="lumi-eye right" cx="147" cy="102" r="7"/><path class="lumi-focus-mark" d="M120 53v-12M120 199v-12M58 120H46M194 120h-12"/><path class="lumi-shield" d="M120 82l19 8v16c0 14-8 25-19 31-11-6-19-17-19-31V90l19-8Z"/><path class="lumi-break" d="M55 74c15-12 29-11 39 1M146 74c12-12 26-13 39-1"/><path class="lumi-error" d="M183 64l10 18-10 18h-20l-10-18 10-18Z"/><path class="lumi-spark" d="M179 57l4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z"/><path class="lumi-spark second" d="M54 155l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z"/></svg>`;
}

function renderDesignLab(): void {
  const states = ["IDLE", "WELCOME", "FOCUS", "BREAK_SUGGESTED", "CAMERA_OFF", "PRIVACY", "NO_DATA", "ERROR_NEUTRAL"];
  const destinations = ["Hôm nay", "Khám mắt", "Đồng hành", "Thấu hiểu", "Báo cáo"];
  const stateNote: Readonly<Record<string, string>> = { IDLE: "Sẵn sàng ở nền, không thu hút chú ý.", WELCOME: "Chào nhẹ khi mở màn hình tham chiếu.", FOCUS: "Hướng sự chú ý về phiên làm việc mô phỏng.", BREAK_SUGGESTED: "Nhắc nghỉ bằng chuyển động giãn nhẹ, không tạo áp lực.", CAMERA_OFF: "Camera tắt; các flow không dùng camera vẫn hoạt động.", PRIVACY: "Nhắc rằng dữ liệu demo không rời thiết bị.", NO_DATA: "Không đủ dữ liệu để nhận xét.", ERROR_NEUTRAL: "Có lỗi trung tính; nội dung quan trọng vẫn hiển thị bằng chữ." };
  setView(`<section class="aurora-lab ${designLabReducedMotion ? "aurora-lab-reduced" : ""}" aria-label="Living Aurora Design Lab"><div class="aurora-field aurora-field-one"></div><div class="aurora-field aurora-field-two"></div><div class="aurora-topnav"><button class="aurora-wordmark" type="button" aria-label="EyeMate Living Aurora reference">EyeMate <span>Living Aurora · Reference</span></button><nav aria-label="Điều hướng mẫu">${destinations.map((destination) => `<button class="aurora-nav ${destination === designLabDestination ? "active" : ""}" data-aurora-destination="${destination}" type="button">${destination}</button>`).join("")}</nav><div class="aurora-utilities"><button class="aurora-utility" data-aurora-utility="PRIVACY" type="button">Local Only · Privacy</button><button class="aurora-icon-button" data-aurora-utility="SETTINGS" type="button" aria-label="Mở preview Cài đặt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-2.1-.7a6 6 0 0 0-.5-1.2l1-2-2.1-2.1-2 1.1a6 6 0 0 0-1.2-.5L12 4H9l-.7 2.1a6 6 0 0 0-1.2.5l-2-1L3 7.7l1 2a6 6 0 0 0-.5 1.2L1.5 12v3l2.1.7a6 6 0 0 0 .5 1.2l-1 2L5.2 21l2-1a6 6 0 0 0 1.2.5L9 22.5h3l.7-2.1a6 6 0 0 0 1.2-.5l2 1 2.1-2.1-1-2a6 6 0 0 0 .5-1.2l2.1-.7v-3Z"/></svg><span>Cài đặt</span></button></div></div><div class="aurora-demo-label">DEMO/REFERENCE · KHÔNG GỌI IPC/CAMERA/DB/NETWORK</div><header class="aurora-hero"><div><p class="eyebrow">Visual reference · 1100 × 760</p><h1>Một nhịp dịu lại<br>cho thời gian trước màn hình.</h1><p>Trạng thái được mô phỏng rõ ràng; không suy luận sức khỏe hoặc dùng dữ liệu thật.</p><div class="actions"><button class="aurora-primary" id="aurora-demo-cta" type="button">Xem preview phiên tập trung</button><button class="aurora-secondary" id="aurora-demo-status" type="button">Xem cách EyeMate bảo vệ dữ liệu</button></div></div><div class="aurora-companion"><span class="aurora-state">Lumi · ${designLabMascotState}</span>${lumiPrototype(designLabMascotState)}<p>${stateNote[designLabMascotState]}</p></div></header><section class="aurora-bento"><article class="aurora-card aurora-session"><p class="eyebrow">Preset phiên tập trung</p><strong>25:00</strong><span>Thời lượng dự kiến · Timer Only · Camera đang tắt</span><div class="aurora-progress"><span></span></div><button class="aurora-link" type="button">Preview phiên <span aria-hidden="true">→</span></button></article><article class="aurora-card aurora-insight"><p class="eyebrow">Theo dõi</p><h2>Chưa đủ dữ liệu để nhận xét.</h2><p>EyeMate giữ rõ dữ liệu thiếu thay vì suy đoán.</p><span class="aurora-chip">INSUFFICIENT DATA</span></article><article class="aurora-card aurora-metric"><p>Nhịp chớp mắt</p><strong>—</strong><small>Camera đang tắt</small></article><article class="aurora-card aurora-metric violet"><p>Tải thị giác</p><strong>—</strong><small>Chưa có baseline</small></article></section><section class="aurora-controls"><div><span class="eyebrow">Mascot state</span><div class="aurora-state-list">${states.map((state) => `<button type="button" data-lumi-state="${state}" class="${state === designLabMascotState ? "selected" : ""}">${state}</button>`).join("")}</div></div><label class="aurora-toggle"><input id="aurora-reduced-motion" type="checkbox" ${designLabReducedMotion ? "checked" : ""}> <span>Reduced motion preview</span></label></section></section>`);
  document.querySelector("#aurora-demo-cta")?.addEventListener("click", () => { designLabMascotState = "FOCUS"; renderDesignLab(); });
  document.querySelector("#aurora-demo-status")?.addEventListener("click", () => { designLabMascotState = "PRIVACY"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-aurora-destination]"))) button.addEventListener("click", () => { designLabDestination = button.dataset.auroraDestination ?? "Hôm nay"; designLabMascotState = designLabDestination === "Đồng hành" ? "FOCUS" : "WELCOME"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-aurora-utility]"))) button.addEventListener("click", () => { designLabMascotState = button.dataset.auroraUtility === "PRIVACY" ? "PRIVACY" : "IDLE"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-lumi-state]"))) button.addEventListener("click", () => { designLabMascotState = button.dataset.lumiState ?? "IDLE"; renderDesignLab(); });
  document.querySelector<HTMLInputElement>("#aurora-reduced-motion")?.addEventListener("change", (event) => { designLabReducedMotion = (event.currentTarget as HTMLInputElement).checked; renderDesignLab(); });
}

function addProductionRipple(target: HTMLElement, event: PointerEvent): void {
  const bounds = target.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "production-click-ripple";
  ripple.setAttribute("aria-hidden", "true");
  ripple.style.setProperty("--ripple-x", `${event.clientX > 0 ? event.clientX - bounds.left : bounds.width / 2}px`);
  ripple.style.setProperty("--ripple-y", `${event.clientY > 0 ? event.clientY - bounds.top : bounds.height / 2}px`);
  target.append(ripple);
  window.setTimeout(() => ripple.remove(), 620);
}

function bindProductionShell(): void {
  const navigationLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".production-topbar [data-route]"));
  for (const [index, link] of navigationLinks.entries()) link.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    navigationLinks[(index + direction + navigationLinks.length) % navigationLinks.length]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("production-clarity-active")) return;
    const target = (event.target as Element | null)?.closest<HTMLElement>("button:not(:disabled), .btn, .primary-nav a, .clarity-focus-card a, .clarity-round-action");
    if (target) addProductionRipple(target, event);
  });
}

async function renderRoute(): Promise<void> {
  if (sessionTicker !== null) { window.clearInterval(sessionTicker); sessionTicker = null; }
  const route = routeFromHash();
  const productionRoute = route !== "design-lab" && route !== "taste-design-lab";
  document.body.classList.toggle("production-clarity-active", productionRoute);
  document.body.dataset.route = route;
  document.body.classList.toggle("design-lab-active", route === "design-lab");
  document.body.classList.toggle("taste-design-lab-active", route === "taste-design-lab");
  if (route !== "checkup" && cameraRuntime.active) await stopCameraFlow();
  skeletonPage(route);
  try {
    if (route === "design-lab") renderDesignLab();
    else if (route === "taste-design-lab") renderTasteDesignLab();
    else if (route === "home") await renderHome();
    else if (route === "checkup") renderCheckup();
    else if (route === "companion") await renderCompanion();
    else if (route === "intelligence") await renderIntelligence();
    else if (route === "reports") await renderReports();
    else if (route === "privacy") await renderPrivacy();
    else await renderSettings();
  } catch (error) { errorView("Không thể tải trang", error instanceof Error && error.message === LOCAL_OPERATION_TIMEOUT ? "Quá 10 giây không có phản hồi" : "IPC cục bộ không phản hồi"); }
}

window.addEventListener("hashchange", () => void renderRoute());
window.addEventListener("beforeunload", () => { devPanel.disable(); void stopCameraFlow(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden || !cameraRuntime.active) return;
  void stopCameraFlow().then(() => {
    cameraCalibration = null; cameraMeasurement = null; cameraReason = "CAMERA_INTERRUPTED_BY_VISIBILITY";
    if (routeFromHash() === "checkup") { checkupStep = 3; renderCheckup(); }
  });
});
if (!location.hash) location.replace("#/home");
bindProductionShell();
void window.eyeMate.getUserPreferences().then(applyPreferences).catch(() => { /* Route error UI handles unavailable storage. */ });
void window.eyeMate.getRuntimeInfo().then(async (runtime) => { if (!runtime.developerPanelEnabled) return; cameraCalibration = await window.eyeMate.getCameraCalibration().then((record) => record?.profile ?? null).catch(() => null); devPanel.enable(); }).catch(() => { /* Production remains without developer controls. */ });
void renderRoute();
