import type { CheckupSummary, SafetyResponse, SurveyResponse } from "../shared/m1-contract.js";
import type { DataInventoryItem, LocalExportFormat, NudgeResponse, StoredCheckupListItem, StoredSessionSummaryListItem, UserPreferences } from "../shared/preload-contract.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
import type { WorkSession } from "../work-session/session-state.js";
import { LOCAL_OPERATION_TIMEOUT, withOperationTimeout } from "./async-operation.js";
import { LocalCameraRuntime, type CameraRuntimeState } from "./camera-runtime.js";
import { aggregateMeasurementWindow, type CameraCalibrationProfile, type CameraFrameObservation, type CameraMeasurementAggregate } from "../camera/measurement-window.js";
import { WELLNESS_DISCLAIMER, wellnessQuestions, type WellnessQuestionId } from "../symptom-checkup/wellness-check.js";
import { renderTasteDesignLab } from "./taste-design-lab.js";
import { CAMERA_CALIBRATION_CONFIG, createCameraCalibrationRecord, type CameraCalibrationRecord } from "../camera/calibration-service.js";
import { applyDevObservationOverrides, EMPTY_DEV_OVERRIDES, type DevOverrides } from "../camera/dev-overrides.js";
import { DevPanelController } from "./dev-panel.js";
import { evaluateCompanionCycle, getCompanionModeProfile } from "../work-session/companion-cycle.js";
import { buildWorkRhythm, type WorkRhythmSummary } from "../personal-intelligence/work-rhythm.js";
import { renderEnterpriseDemo } from "./enterprise-demo.js";
import { createPersonalDemoSnapshot } from "./personal-demo-data.js";
import type { RuntimeInfo } from "../shared/runtime-contract.js";

type RouteId = "home" | "checkup" | "companion" | "intelligence" | "reports" | "privacy" | "settings" | "design-lab" | "taste-design-lab" | "enterprise-demo";
type ReportTab = "overview" | "week" | "month" | "history";

const routes: readonly RouteId[] = ["home", "checkup", "companion", "intelligence", "reports", "privacy", "settings", "design-lab", "taste-design-lab"];
const view = document.querySelector<HTMLElement>("#view");
const main = document.querySelector<HTMLElement>("#app-main");
const modalRoot = document.querySelector<HTMLElement>("#modal-root");
const toastRegion = document.querySelector<HTMLElement>("#toast-region");
let checkupStep = 1;
let checkupResult: CheckupSummary | null = null;
let reportTab: ReportTab = "overview";
let intelligenceRange: 7 | 30 = 7;
let currentNudgeId: string | null = null;
let selectedCompanionMode: WorkSession["modeId"] = "TIMER_ONLY";
let scheduledCompanionSessionId: string | null = null;
let nextAutomaticNudgeAtElapsedMs: number | null = null;
let companionNudgeRequestInFlight = false;
let latestCompanionElapsedMs = 0;
let sessionTicker: number | null = null;
let companionMonitor: number | null = null;
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
let checkupCalibrationSamples: number[] | null = null;
let checkupCalibrationStartedAt: number | null = null;
let checkupCalibrationTicker: number | null = null;
let activeDevOverrides: DevOverrides = EMPTY_DEV_OVERRIDES;
let designLabMascotState = "WELCOME";
let designLabReducedMotion = false;
let designLabDestination = "Hôm nay";
let runtimeInfoPromise: Promise<RuntimeInfo> | null = null;

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
    if (checkupCalibrationSamples !== null && observationQuality(effectiveObservation).acceptable && effectiveObservation.interEyeDistancePx !== null) checkupCalibrationSamples.push(effectiveObservation.interEyeDistancePx);
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
  if (path === "enterprise-demo" || path.startsWith("enterprise-demo/")) return "enterprise-demo";
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
  return `<div class="clarity-home-artwork" aria-hidden="true"><svg viewBox="0 0 460 150" focusable="false">
    <defs>
      <linearGradient id="home-sky-haze" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f9fff0" stop-opacity=".16"/><stop offset=".58" stop-color="#e2eddf" stop-opacity=".72"/><stop offset="1" stop-color="#d7e4d2" stop-opacity=".1"/></linearGradient>
      <linearGradient id="home-hill-front" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dce9d9" stop-opacity=".92"/><stop offset="1" stop-color="#eef4ea" stop-opacity=".28"/></linearGradient>
      <radialGradient id="home-sun" cx=".5" cy=".48" r=".62"><stop stop-color="#ffdf86" stop-opacity=".7"/><stop offset="1" stop-color="#ffecc0" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="330" cy="69" r="43" fill="url(#home-sun)"></circle>
    <path class="clarity-art-trace trace-back" d="M18 97C88 66 143 68 206 46C238 35 255 8 287 20C334 38 348 70 451 25"></path>
    <path class="clarity-art-lens" d="M0 116C74 87 139 89 207 70C272 52 318 62 461 37V150H0Z" fill="url(#home-sky-haze)"></path>
    <path class="clarity-art-trace trace-front" d="M96 115C166 83 218 86 273 76C338 64 372 85 460 66"></path>
    <path d="M0 124C96 104 159 108 219 95C282 82 357 88 460 72V150H0Z" fill="url(#home-hill-front)"></path>
    <path class="home-bird" d="M378 31c5-5 10-5 15 0M398 22c6-5 12-5 18 0"></path>
  </svg></div>`;
}

function sessionProgressRing(value: string, progress: number | null, note: string, targetMinutes: number): string {
  const angle = progress === null ? 0 : Math.round(Math.max(0, Math.min(100, progress)) * 3.6);
  const progressLabel = progress === null ? "Chưa có phiên hôm nay" : `${Math.round(Math.max(0, Math.min(100, progress)))}% của preset ${targetMinutes} phút`;
  return `<div class="clarity-session-ring ${progress === null ? "is-missing" : ""}" style="--session-angle:${angle}deg" role="img" aria-label="${escapeHtml(progressLabel)}"><div><small>Phiên hôm nay</small><strong>${value}</strong><span>Preset ${targetMinutes} phút</span></div></div><p>${escapeHtml(note)}</p>`;
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
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    CAMERA_FAILED: "Camera lỗi",
    TIMEOUT: "Hết thời gian đo",
    NOT_MEASURED: "Chưa đo",
    NEAR: "Gần",
    COMFORT: "Phù hợp",
    FAR: "Xa",
    UNKNOWN: "Chưa rõ",
    SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT: "Wellness self-report, không phải công cụ lâm sàng",
    SELF_REPORTED_COMFORT: "Tự ghi nhận cảm giác mắt",
    BLINK_BEHAVIOR: "Hành vi chớp mắt",
    VIEWING_DISTANCE: "Khoảng cách nhìn",
    VISUAL_WORKLOAD: "Tải thị giác",
    DATA_CONFIDENCE: "Độ tin cậy dữ liệu",
    SUPPORTIVE: "Hỗ trợ",
    WATCH: "Theo dõi",
    ADJUST: "Cần điều chỉnh",
    PAUSE_AND_RECHECK: "Nghỉ và kiểm tra lại",
    MISSING: "Thiếu dữ liệu",
    LOW_BLINK_OBSERVATION_WINDOW: "blink rate thấp trong cửa sổ đo",
    NEAR_VIEWING_DISTANCE_OBSERVED: "quan sát thấy khoảng cách gần",
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

function homeTrendSparkline(points: readonly number[], labels: readonly string[], label: string): string {
  const width = 238;
  const height = 122;
  const min = 0;
  const safePoints = points.length ? points : [0];
  const max = Math.max(30, ...safePoints);
  const step = width / Math.max(1, safePoints.length - 1);
  const coordinates = safePoints.map((point, index) => {
    const normalized = Math.max(0, Math.min(1, (point - min) / (max - min)));
    return { x: Math.round(index * step), y: Math.round(height - normalized * (height - 16) - 8), value: point };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const axisLabels = labels.map((item) => item.split(",", 1)[0]?.trim() || item);
  return `<figure class="home-trend" aria-label="${escapeHtml(label)}">
    <figcaption><span>Thời lượng phiên 7 ngày</span><small>${max} phút</small></figcaption>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(label)}">
      <defs><linearGradient id="home-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a9dc32" stop-opacity=".28"/><stop offset="1" stop-color="#a9dc32" stop-opacity="0"/></linearGradient></defs>
      <path class="home-trend-area" d="M${area}Z"></path>
      <polyline class="home-trend-line" points="${line}"></polyline>
      ${coordinates.map((point, index) => `<circle class="home-trend-point" cx="${point.x}" cy="${point.y}" r="${index === coordinates.length - 1 ? 5 : 3.6}"><title>${labels[index] ?? `Ngày ${index + 1}`}: ${Math.round(point.value)}</title></circle>`).join("")}
    </svg>
    <div class="home-trend-axis" aria-hidden="true">${axisLabels.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
  </figure>`;
}

function homeMeditationIllustration(): string {
  return `<div class="home-meditation-art" aria-hidden="true">
    <img src="./assets/illustrations/companion-meditation-card.png" alt="" loading="eager" decoding="async" />
  </div>`;
}

function homeSparkIcon(): string {
  return `<svg viewBox="0 0 36 36" focusable="false" aria-hidden="true"><path d="M16.5 2.8 20 12.6l9.8 3.4-9.8 3.5-3.5 9.7-3.5-9.7-9.8-3.5 9.8-3.4 3.5-9.8Z"></path><path d="M28.6 5.8 30 9.4l3.6 1.4-3.6 1.3-1.4 3.7-1.3-3.7-3.7-1.3 3.7-1.4 1.3-3.6Z"></path></svg>`;
}

function homeSettingsIcon(): string {
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 7h8M16 7h4M14 5v4M4 17h4M12 17h8M10 15v4"></path></svg>`;
}

function homePeopleIcon(): string {
  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M8.5 12.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM15.8 11.8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.8 18.5c.9-2.8 2.5-4.2 4.8-4.2s3.9 1.4 4.8 4.2M12.6 16.2c.8-1.2 1.9-1.8 3.3-1.8 2 0 3.4 1.2 4.2 3.6"></path></svg>`;
}

function homeMetricBars(progress: number | null): string {
  const seed = progress === null ? [18, 24, 16, 28, 21, 24, 19, 27, 22, 17] : [24, 42, 34, 58, 47, 70, 50, 62, 45, 39];
  return `<div class="home-micro-bars" aria-hidden="true">${seed.map((value, index) => `<i style="--bar:${Math.round((progress ?? value) * (0.48 + index * 0.035))}%"></i>`).join("")}</div>`;
}

function homeHabitDays(rhythm: WorkRhythmSummary): string {
  return `<div class="home-habit-days" aria-label="${rhythm.activeDays} ngày có dữ liệu trong tuần">${rhythm.days.map((day) => `<span class="${day.sessionCount > 0 ? "done" : "pending"}"><b>${day.sessionCount > 0 ? "✓" : ""}</b><small>${escapeHtml(day.label)}</small></span>`).join("")}</div>`;
}

function homeLocalDateKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function homeRecentCompletedSummaries(summaries: readonly StoredSessionSummaryListItem[], dayCount = 7): readonly StoredSessionSummaryListItem[] {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayCount + 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return summaries.filter((summary) => {
    const createdAt = new Date(summary.createdAt);
    return summary.status === "COMPLETED" && !Number.isNaN(createdAt.valueOf()) && createdAt >= start && createdAt < end;
  });
}

function homeWorkMetrics(rhythm: WorkRhythmSummary, summaries: readonly StoredSessionSummaryListItem[]): { readonly screenValue: string; readonly screenNote: string; readonly breakValue: string; readonly breakNote: string; readonly sessionValue: string; readonly sessionNote: string } {
  const recent = homeRecentCompletedSummaries(summaries, rhythm.dayCount);
  const todayMinutes = rhythm.days.at(-1)?.minutes ?? 0;
  const acceptedBreakCount = recent.reduce((sum, summary) => sum + summary.acceptedBreakCount, 0);
  const interventionCount = recent.reduce((sum, summary) => sum + summary.interventionCount, 0);
  const durationBackfilled = recent.length > rhythm.completedSessions;
  const screenValue = todayMinutes > 0 ? formatMinutesHuman(todayMinutes) : rhythm.totalMinutes > 0 ? formatMinutesHuman(rhythm.totalMinutes) : recent.length > 0 ? "Chưa rõ" : "Chưa có";
  const screenNote = todayMinutes > 0 ? "Hôm nay · từ phiên đã hoàn tất" : rhythm.totalMinutes > 0 ? `${rhythm.activeDays}/${rhythm.dayCount} ngày có duration` : recent.length > 0 ? "Phiên cũ thiếu duration hợp lệ" : "Chưa có phiên hoàn tất";
  const breakValue = acceptedBreakCount > 0 ? String(acceptedBreakCount) : interventionCount > 0 ? "Chưa rõ" : "Chưa lưu";
  const breakNote = acceptedBreakCount > 0 ? "lời nhắc nghỉ đã chấp nhận" : interventionCount > 0 ? "có lời nhắc nhưng chưa có phản hồi nghỉ" : "chưa lưu sự kiện nghỉ riêng";
  const sessionValue = rhythm.completedSessions > 0 ? String(rhythm.completedSessions) : recent.length > 0 ? "Chưa rõ" : "0";
  const sessionNote = durationBackfilled ? `${rhythm.completedSessions}/${recent.length} phiên có duration hợp lệ` : `${rhythm.activeDays}/${rhythm.dayCount} ngày có phiên`;
  return { screenValue, screenNote, breakValue, breakNote, sessionValue, sessionNote };
}

function personalDemoBanner(): string {
  return `<aside class="personal-demo-banner" role="status"><strong>Dữ liệu mẫu</strong><span>Snapshot synthetic chỉ để trình bày giao diện và báo cáo. Không đọc, ghi hoặc trộn với dữ liệu cá nhân.</span></aside>`;
}

function getRuntimeInfoCached(): Promise<RuntimeInfo> {
  runtimeInfoPromise ??= window.eyeMate.getRuntimeInfo();
  return runtimeInfoPromise;
}

function applyRuntimePresentation(runtime: RuntimeInfo): void {
  const demo = runtime.dataMode === "SYNTHETIC_DEMO";
  document.body.classList.toggle("personal-demo-active", demo);
  const badge = document.querySelector<HTMLElement>(".local-badge");
  if (badge) badge.innerHTML = demo ? `<span aria-hidden="true">●</span> Dữ liệu mẫu` : `<span aria-hidden="true">●</span> Local only`;
  document.querySelector<HTMLElement>(".titlebar-caption")!.textContent = demo ? "Chế độ trình bày dữ liệu mẫu · không dùng dữ liệu cá nhân" : "Local companion for healthier screen time";
}

function homeEvidenceBarsFromRhythm(rhythm: WorkRhythmSummary, summaries: readonly StoredSessionSummaryListItem[]): string {
  const acceptedByDate = new Map<string, number>();
  for (const summary of homeRecentCompletedSummaries(summaries, rhythm.dayCount)) {
    const key = homeLocalDateKey(summary.createdAt);
    if (key !== null) acceptedByDate.set(key, (acceptedByDate.get(key) ?? 0) + summary.acceptedBreakCount);
  }
  const maxBreaks = Math.max(1, ...rhythm.days.map((day) => acceptedByDate.get(day.date) ?? 0));
  const maxMinutes = Math.max(30, ...rhythm.days.map((day) => day.minutes));
  const maxSessions = Math.max(1, ...rhythm.days.map((day) => day.sessionCount));
  return `<div class="home-evidence-bars" aria-label="Bằng chứng 7 ngày qua">${rhythm.days.map((day) => {
    const breaks = acceptedByDate.get(day.date) ?? 0;
    const breakHeight = Math.round(breaks / maxBreaks * 100);
    const screenHeight = Math.round(day.minutes / maxMinutes * 100);
    const sessionHeight = Math.round(day.sessionCount / maxSessions * 100);
    return `<span title="${escapeHtml(`${day.label}: ${breaks} nghỉ mắt đã phản hồi, ${day.minutes} phút phiên, ${day.sessionCount} phiên`)}"><i class="break" style="--h:${breakHeight}%"></i><i class="screen" style="--h:${screenHeight}%"></i><i class="session" style="--h:${sessionHeight}%"></i><small>${escapeHtml(day.label)}</small></span>`;
  }).join("")}</div>`;
}

function homeEvidenceLegend(): string {
  return `<div class="home-evidence-legend" aria-label="Chú thích màu biểu đồ"><span class="legend-break">Nghỉ mắt đã phản hồi</span><span class="legend-screen">Phút phiên</span><span class="legend-session">Số phiên</span></div>`;
}

function homeNextActionClock(): string {
  return `<div class="home-action-clock" aria-hidden="true"><svg viewBox="0 0 96 96" focusable="false"><circle cx="48" cy="48" r="36"></circle><path d="M48 23v25l17 10"></path><path class="clock-ring" d="M48 10a38 38 0 1 1-1 0"></path></svg><strong>20:20:20</strong></div>`;
}

async function renderHome(): Promise<void> {
  const [runtime, reports, summaries, m3Reports, session, privacy, preferences] = await withOperationTimeout(Promise.all([
    window.eyeMate.getRuntimeInfo(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries(), window.eyeMate.listM3Reports(), window.eyeMate.getWorkSession(), window.eyeMate.getPrivacySummary(), window.eyeMate.getUserPreferences()
  ]));
  const homeProfile = companionProfile(session?.modeId ?? preferences.defaultMode, preferences);
  const latest = m3Reports.at(-1);
  const completedSummaries = summaries.filter((summary) => summary.status === "COMPLETED");
  const sessionCount = completedSummaries.length;
  const latestSummary = completedSummaries[0];
  const todaySummary = completedSummaries.find((summary) => {
    const createdAt = new Date(summary.createdAt);
    const today = new Date();
    return !Number.isNaN(createdAt.valueOf()) && createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth() && createdAt.getDate() === today.getDate();
  });
  const sessionElapsedMs = session?.state === "ACTIVE" ? session.elapsedActiveMs : todaySummary?.elapsedActiveMs ?? null;
  const sessionValue = sessionElapsedMs === null ? "Chưa có" : formatDuration(sessionElapsedMs);
  const sessionProgress = sessionElapsedMs === null ? null : sessionElapsedMs / (homeProfile.workDurationMinutes * 60_000) * 100;
  const sessionNote = session?.state === "ACTIVE" ? `Phiên ${homeProfile.label} đang hoạt động.` : todaySummary ? `${humanLabel(todaySummary.status)}. ${safeDate(todaySummary.createdAt)}.` : latestSummary ? `Chưa có phiên hôm nay. Phiên gần nhất: ${safeDate(latestSummary.createdAt)}.` : `Bắt đầu ${homeProfile.label} để tạo Session Summary đầu tiên.`;
  const blinkMetric = checkupResult ? latestCheckupBlinkMetric(checkupResult) : storedCheckupBlinkMetric(reports[0]);
  const distanceMetric = checkupResult ? latestCheckupDistanceMetric(checkupResult) : storedCheckupDistanceMetric(reports[0]);
  const currentCameraEvidence = checkupResult?.cameraEvidence;
  const blinkCoverage = currentCameraEvidence && currentCameraEvidence.status !== "NOT_MEASURED" && currentCameraEvidence.blinkRatePerMinute !== null ? currentCameraEvidence.validSampleRatio * 100 : reports[0]?.blinkRatePerMinute !== null && reports[0]?.blinkRatePerMinute !== undefined ? (reports[0].validSampleRatio ?? 0) * 100 : null;
  const distanceCoverage = currentCameraEvidence && currentCameraEvidence.status !== "NOT_MEASURED" && currentCameraEvidence.distanceZone !== "UNKNOWN" ? currentCameraEvidence.validSampleRatio * 100 : reports[0]?.distanceZone && reports[0].distanceZone !== "UNKNOWN" ? (reports[0].validSampleRatio ?? 0) * 100 : null;
  const vli = latest?.daily.vli.score;
  const evidenceItems: readonly HomeEvidenceItem[] = [
    { id: "session", label: "Phiên", coverage: sessionCount > 0 || session?.state === "ACTIVE" ? 100 : null, detail: sessionCount > 0 ? `${sessionCount} phiên hoàn tất đã lưu.` : session?.state === "ACTIVE" ? `Phiên ${homeProfile.label} đang hoạt động.` : "Chưa có phiên hoàn tất." },
    { id: "checkup", label: "Checkup", coverage: reports.length > 0 ? 100 : null, detail: reports.length > 0 ? `${reports.length} checkup tự báo cáo đã lưu.` : "Chưa có checkup tự báo cáo." },
    { id: "blink", label: "Blink", coverage: blinkCoverage, detail: blinkCoverage === null ? "Không suy đoán khi chưa có measurement hợp lệ." : `Checkup gần nhất có ${Math.round(blinkCoverage)}% frame hợp lệ.` },
    { id: "distance", label: "Khoảng cách", coverage: distanceCoverage, detail: distanceCoverage === null ? "Chưa có distance zone hợp lệ." : `Checkup gần nhất có distance zone và ${Math.round(distanceCoverage)}% frame hợp lệ.` },
    { id: "vli", label: "Tải", coverage: latest?.daily.vli.status === "AVAILABLE" ? Math.round(latest.daily.vli.dataConfidence * 100) : null, detail: latest?.daily.vli.status === "AVAILABLE" ? `Tải thị giác tổng hợp có ${Math.round(latest.daily.vli.dataConfidence * 100)}% thành phần dữ liệu.` : "Chưa đủ thành phần để tổng hợp tải thị giác." }
  ];
  const homeRhythm = buildWorkRhythm(completedSummaries, 7);
  const visibleWorkMetrics = homeWorkMetrics(homeRhythm, completedSummaries);
  const availableEvidenceCount = evidenceItems.filter((item) => item.coverage !== null).length;
  const evidenceNote = `${availableEvidenceCount}/5 nhóm có dữ liệu trực tiếp. ${homeRhythm.activeDays}/7 ngày gần nhất có phiên hoàn tất.`;
  const weeklyValue = `${homeRhythm.activeDays}/7 ngày`;
  const weeklyNote = `${formatMinutesHuman(homeRhythm.totalMinutes)} trong ${homeRhythm.completedSessions} phiên hoàn tất.`;
  setView(`<section class="clarity-home" aria-label="Tổng quan Hôm nay">${pageHeading("Hôm nay", "Chào bạn, mình bắt đầu nhẹ nhàng nhé.", `EyeMate ${escapeHtml(runtime.applicationVersion)} giữ rõ điều đã ghi nhận, điều chưa đo và bước tiếp theo.`, productionHomeArtwork())}
    <div class="clarity-home-grid">
      <article class="card clarity-overview-panel"><div class="clarity-panel-heading"><div><span class="clarity-section-mark"></span><p>Tổng quan hôm nay</p></div><small>LOCAL EVIDENCE</small></div><div class="clarity-overview-main"><div class="clarity-session-stat">${sessionProgressRing(sessionValue, sessionProgress, sessionNote, homeProfile.workDurationMinutes)}</div>${productionEvidenceTrace(evidenceItems, evidenceNote)}</div><div class="actions clarity-quick-actions" aria-label="Hành động nhanh"><a class="btn btn-primary" href="#/companion">${session?.state === "ACTIVE" ? "Tiếp tục phiên" : "Bắt đầu phiên"}</a><a class="btn" href="#/checkup">Khám mắt</a><a class="text-link" href="#/reports">Xem báo cáo</a></div></article>
      <article class="clarity-focus-card"><div class="clarity-panel-heading"><div><span class="clarity-section-mark"></span><p>Đồng hành</p></div><small>QUIET MODE</small></div><p>${session?.state === "ACTIVE" ? "Phiên đang chạy" : "Phiên đề xuất"}</p><strong>${session?.state === "ACTIVE" ? formatDuration(session.elapsedActiveMs) : `${String(homeProfile.workDurationMinutes).padStart(2, "0")}:00`}</strong><span>${escapeHtml(homeProfile.label)} · Camera đang tắt</span><a href="#/companion">${session?.state === "ACTIVE" ? "Tiếp tục" : "Mở phiên"}<b aria-hidden="true">→</b></a></article>
      ${metricCard("blink", "Nhịp chớp mắt", blinkMetric.value, blinkMetric.note, blinkMetric.progress)}
      ${metricCard("distance", "Khoảng cách", distanceMetric.value, distanceMetric.note, distanceMetric.progress)}
      ${metricCard("load", "Tải thị giác", vli === null || vli === undefined ? "Chưa đủ" : String(Math.round(vli)), vli === null || vli === undefined ? "Cần thêm dữ liệu về phiên, nghỉ và cảm nhận mắt." : `Đã có ${Math.round((latest?.daily.vli.dataConfidence ?? 0) * 100)}% thành phần dữ liệu.`, vli ?? null, "accent")}
      <article class="card clarity-next-panel"><div><span class="clarity-section-mark"></span><p>Bước tiếp theo</p></div><h2>Một việc nhỏ là đủ.</h2><p class="subtle">${sessionCount} phiên đã lưu. ${reports.length} lần checkup. Consent camera: ${humanLabel(privacy.cameraConsentDecision)}.</p><div class="actions"><a class="text-link" href="#/privacy">Privacy Center</a><a class="clarity-round-action" href="#/reports" aria-label="Xem báo cáo">↗</a></div></article>
      <article class="card clarity-week-panel"><span class="label">Dấu vết tuần này</span><strong>${weeklyValue}</strong><span>${weeklyNote}</span><a class="text-link" href="#/reports">Đối chiếu báo cáo</a></article>
    </div>
  </section>`);
}

function metricCard(kind: "blink" | "distance" | "load", label: string, value: string, note: string, progress: number | null, tone: "default" | "accent" = "default"): string {
  return `<article class="card metric-card clarity-metric-panel clarity-metric-${kind} ${tone === "accent" ? "accent" : ""}"><div class="clarity-metric-heading"><span class="clarity-metric-icon ${progress === null ? "is-missing" : "is-available"}" aria-hidden="true">${metricIcon(kind)}</span><span class="label">${label}</span><span class="trend ${progress === null ? "unknown" : ""}">${progress === null ? "Chưa đo" : "Local"}</span></div><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span><div class="metric-progress ${progress === null ? "is-missing" : ""}" aria-hidden="true"><span style="--progress:${progress === null ? 0 : Math.max(0, Math.min(100, progress))}%"></span></div></article>`;
}

function latestCheckupBlinkMetric(summary: CheckupSummary | null): { readonly value: string; readonly note: string; readonly progress: number | null } {
  const evidence = summary?.cameraEvidence;
  if (!evidence || evidence.status === "NOT_MEASURED") return { value: "Chưa đo", note: "NOT_MEASURED. Camera đang tắt.", progress: null };
  if (evidence.blinkRatePerMinute === null) return { value: "Chưa đủ", note: `${humanLabel(evidence.status)}. ${cameraReasonSummary(evidence.reasonCodes)}`, progress: evidence.validSampleRatio * 100 };
  if (evidence.blinkRatePerMinute === 0) return { value: "Chưa rõ", note: "Checkup gần nhất chưa bắt được blink event rõ; nên đo lại nếu bạn có chớp mắt.", progress: evidence.validSampleRatio * 100 };
  return { value: `${evidence.blinkRatePerMinute}/phút`, note: `Từ checkup gần nhất · ${formatPercent(evidence.validSampleRatio)} frame đủ chất lượng.`, progress: evidence.validSampleRatio * 100 };
}

function latestCheckupDistanceMetric(summary: CheckupSummary | null): { readonly value: string; readonly note: string; readonly progress: number | null } {
  const evidence = summary?.cameraEvidence;
  if (!evidence || evidence.status === "NOT_MEASURED") return { value: "Chưa đo", note: "NOT_MEASURED. Không suy đoán.", progress: null };
  if (evidence.distanceZone === "UNKNOWN") return { value: "Chưa đủ", note: `${humanLabel(evidence.status)}. ${cameraReasonSummary(evidence.reasonCodes)}`, progress: evidence.validSampleRatio * 100 };
  return { value: humanLabel(evidence.distanceZone), note: `Từ checkup gần nhất · ${formatPercent(evidence.validSampleRatio)} frame đủ chất lượng.`, progress: evidence.validSampleRatio * 100 };
}

function storedCheckupBlinkMetric(report: StoredCheckupListItem | undefined): { readonly value: string; readonly note: string; readonly progress: number | null } {
  if (!report || report.cameraStatus === "NOT_MEASURED") return { value: "Chưa đo", note: "NOT_MEASURED. Camera đang tắt.", progress: null };
  const progress = typeof report.validSampleRatio === "number" ? report.validSampleRatio * 100 : null;
  if (report.blinkRatePerMinute === null || report.blinkRatePerMinute === undefined) return { value: "Chưa đủ", note: `${humanLabel(report.cameraStatus ?? "INSUFFICIENT_DATA")}. ${cameraReasonSummary(report.cameraReasonCodes ?? [])}`, progress };
  if (report.blinkRatePerMinute === 0) return { value: "Chưa rõ", note: "Checkup gần nhất chưa bắt được blink event rõ; nên đo lại nếu bạn có chớp mắt.", progress };
  return { value: `${report.blinkRatePerMinute}/phút`, note: `Từ checkup đã lưu · ${formatPercent(report.validSampleRatio ?? 0)} frame đủ chất lượng.`, progress };
}

function storedCheckupDistanceMetric(report: StoredCheckupListItem | undefined): { readonly value: string; readonly note: string; readonly progress: number | null } {
  if (!report || report.cameraStatus === "NOT_MEASURED") return { value: "Chưa đo", note: "NOT_MEASURED. Không suy đoán.", progress: null };
  const progress = typeof report.validSampleRatio === "number" ? report.validSampleRatio * 100 : null;
  if (!report.distanceZone || report.distanceZone === "UNKNOWN") return { value: "Chưa đủ", note: `${humanLabel(report.cameraStatus ?? "INSUFFICIENT_DATA")}. ${cameraReasonSummary(report.cameraReasonCodes ?? [])}`, progress };
  return { value: humanLabel(report.distanceZone), note: `Từ checkup đã lưu · ${formatPercent(report.validSampleRatio ?? 0)} frame đủ chất lượng.`, progress };
}

function cameraReasonSummary(reasonCodes: readonly string[]): string {
  const relevant = reasonCodes.filter((reason) => !["CALIBRATION_MISSING", "DISTANCE_INSUFFICIENT_VALID_SAMPLES"].includes(reason));
  return relevant.length ? relevant.map(cameraReasonLabel).slice(0, 2).join("; ") : "Chưa đủ bằng chứng camera rõ.";
}

function cameraStatusMessage(): string {
  const messages: Readonly<Record<string, string>> = {
    CAMERA_NOT_STARTED: "Camera chỉ mở sau thao tác rõ ràng của bạn.", CAMERA_STARTING: "Đang khởi tạo model cục bộ…", CAMERA_ACTIVE: "Camera đang xử lý cục bộ; không lưu hình ảnh.",
    CAMERA_PERMISSION_DENIED: "Quyền camera bị từ chối. Hãy cấp lại trong Windows Settings > Privacy & security > Camera.", CAMERA_UNAVAILABLE: "Không tìm thấy camera phù hợp.",
    CAMERA_API_UNAVAILABLE: "Thiết bị này không cung cấp camera API.", CAMERA_BUSY: "Camera đang được ứng dụng khác sử dụng.", CAMERA_DISCONNECTED: "Camera đã ngắt kết nối.",
    CAMERA_DEVICE_CHANGED: "Danh sách camera đã thay đổi; cần hiệu chỉnh lại.", CAMERA_RUNTIME_FAILED: "Không thể khởi tạo camera.", CAMERA_INFERENCE_FAILED: "Model camera cục bộ gặp lỗi.",
    CAMERA_PREVIEW_REATTACH_FAILED: "Không thể nối lại luồng camera vào màn hình đo.",
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
  if (cameraCalibration === null) return "Có thể đo blink ngay. Nếu muốn phân loại khoảng cách NEAR/COMFORT/FAR, hãy nhập khoảng cách thật rồi hiệu chỉnh 5 giây.";
  return "Hiệu chỉnh khoảng cách đã sẵn sàng. Bước 4: nhấn “Tiếp tục đo”, sau đó bắt đầu cửa sổ 30 giây.";
}

function cameraLiveReadingsMarkup(): string {
  return `<div class="camera-reading camera-live-readings"><span><small>Khuôn mặt</small><strong id="camera-live-face">—</strong></span><span><small>Ánh sáng</small><strong id="camera-live-light">—</strong></span><span><small>Pose</small><strong id="camera-live-pose">—</strong></span><span><small>IOD</small><strong id="camera-live-iod">—</strong></span><span><small>EAR</small><strong id="camera-live-ear">—</strong></span><span><small>Blink L/R</small><strong id="camera-live-blink">—</strong></span></div>`;
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
  const faceElement = document.querySelector<HTMLElement>("#camera-live-face");
  if (faceElement) faceElement.textContent = latestCameraObservation === null ? "—" : String(latestCameraObservation.faceCount);
  const lightElement = document.querySelector<HTMLElement>("#camera-live-light");
  if (lightElement) lightElement.textContent = latestCameraObservation === null ? "—" : formatPercent(latestCameraObservation.lightingScore);
  const poseElement = document.querySelector<HTMLElement>("#camera-live-pose");
  if (poseElement) poseElement.textContent = latestCameraObservation === null ? "—" : formatPercent(latestCameraObservation.poseScore);
  const iodElement = document.querySelector<HTMLElement>("#camera-live-iod");
  if (iodElement) iodElement.textContent = latestCameraObservation?.interEyeDistancePx === null || latestCameraObservation?.interEyeDistancePx === undefined ? "—" : `${latestCameraObservation.interEyeDistancePx.toFixed(1)} px`;
  const blinkElement = document.querySelector<HTMLElement>("#camera-live-blink");
  if (blinkElement) {
    const leftBlink = latestCameraObservation?.leftBlinkScore;
    const rightBlink = latestCameraObservation?.rightBlinkScore;
    if (leftBlink === null || leftBlink === undefined || rightBlink === null || rightBlink === undefined) blinkElement.textContent = "EAR dự phòng";
    else blinkElement.textContent = `${Math.min(leftBlink, rightBlink) >= 0.42 ? "Đang chớp" : "Mắt mở"} · ${leftBlink.toFixed(2)} / ${rightBlink.toFixed(2)}`;
  }
  const calibrateButton = document.querySelector<HTMLButtonElement>("#checkup-calibrate");
  if (calibrateButton) calibrateButton.disabled = cameraState !== "ACTIVE" || !quality.acceptable;
  const measureButton = document.querySelector<HTMLButtonElement>("#checkup-measure-next");
  if (measureButton) measureButton.disabled = cameraState !== "ACTIVE" || !quality.acceptable;
}

async function populateCameraDevices(): Promise<void> {
  const select = document.querySelector<HTMLSelectElement>("#camera-device");
  if (!select) return;
  try {
    const devices = await cameraRuntime.enumerateDevices();
    select.replaceChildren(...devices.map((device) => {
      const option = document.createElement("option"); option.value = device.deviceId; option.textContent = device.label; return option;
    }));
    const activeLabel = cameraRuntime.context?.label;
    if (activeLabel) {
      const activeOption = Array.from(select.options).find((option) => option.textContent === activeLabel);
      if (activeOption) select.value = activeOption.value;
    }
    if (devices.length === 0) { const option = document.createElement("option"); option.textContent = "Camera mặc định"; select.append(option); }
  } catch { showToast("Không thể đọc danh sách camera. Bạn vẫn có thể thử camera mặc định.", "warning"); }
}

async function stopCameraFlow(): Promise<void> {
  if (cameraMeasurementTicker !== null) window.clearInterval(cameraMeasurementTicker);
  cameraMeasurementTicker = null;
  if (checkupCalibrationTicker !== null) window.clearInterval(checkupCalibrationTicker);
  checkupCalibrationTicker = null;
  checkupCalibrationStartedAt = null;
  checkupCalibrationSamples = null;
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
  const result = await runMutation(null, window.eyeMate.runCheckup({ ...pendingSurvey, cameraMeasurement }));
  if (result !== null) { checkupResult = result; checkupStep = 5; renderCheckup(); }
}

function wellnessQuestionLabel(id: string): string {
  return wellnessQuestions.find((question) => question.id === id)?.wording ?? humanLabel(id);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function confidenceLabel(value: string): string {
  if (value === "HIGH") return "Cao";
  if (value === "MEDIUM") return "Vừa";
  if (value === "LOW") return "Thấp";
  return "Thiếu dữ liệu";
}

function signalLabel(value: string): string {
  if (value === "SUPPORTIVE") return "Ổn định";
  if (value === "WATCH") return "Theo dõi";
  if (value === "ADJUST") return "Nên điều chỉnh";
  if (value === "PAUSE_AND_RECHECK") return "Nghỉ và kiểm tra lại";
  return "Thiếu dữ liệu";
}

function signalToneClass(value: string): string {
  if (value === "SUPPORTIVE") return "supportive";
  if (value === "WATCH") return "watch";
  if (value === "ADJUST") return "adjust";
  if (value === "PAUSE_AND_RECHECK") return "pause";
  return "missing";
}

function actionLabel(id: string): string {
  const labels: Record<string, string> = {
    LOOK_AWAY_BREAK: "Nghỉ nhìn xa theo nhịp ngắn",
    CONSCIOUS_BLINK: "Chớp mắt chủ động vài lần",
    ADJUST_SCREEN_SETUP: "Điều chỉnh màn hình và ánh sáng",
    RECHECK_AFTER_REST: "Kiểm tra lại sau khi nghỉ",
    CONSIDER_PROFESSIONAL_GUIDANCE: "Cân nhắc gặp chuyên gia nếu triệu chứng kéo dài"
  };
  return labels[id] ?? humanLabel(id);
}

function actionReasonLabel(reasonCode: string): string {
  const labels: Record<string, string> = {
    MAINTAIN_SUPPORTIVE_ROUTINE: "duy trì thói quen hỗ trợ",
    ADD_SUPPORTIVE_BREAKS: "cần thêm nhịp nghỉ",
    REVIEW_SCREEN_SETUP: "nên rà soát vị trí màn hình",
    PRIORITIZE_REST: "ưu tiên nghỉ và theo dõi lại",
    RECHECK_SELF_REPORTED_EXPERIENCE: "tự báo cáo cần được kiểm tra lại",
    INSUFFICIENT_SELF_REPORTED_DATA: "câu trả lời chưa đủ để tính điểm",
    LOW_BLINK_OBSERVATION_WINDOW: "camera chưa thấy đủ lần chớp rõ",
    NEAR_VIEWING_DISTANCE_OBSERVED: "khoảng cách có xu hướng gần",
    SAFETY_GATE_STOP: "có tín hiệu cần dừng"
  };
  return labels[reasonCode] ?? humanLabel(reasonCode);
}

function evidenceSourceLabel(source: string): string {
  if (source === "CAMERA_OBSERVATION") return "Camera cục bộ";
  if (source === "SAFETY_GATE") return "Safety Gate";
  return "Tự báo cáo";
}

function cameraReasonLabel(reasonCode: string): string {
  const labels: Record<string, string> = {
    CAMERA_NOT_MEASURED: "Camera không được dùng trong lần checkup này",
    MEASUREMENT_WINDOW_TOO_SHORT: "Cửa sổ đo ngắn hơn 30 giây",
    BLINK_INSUFFICIENT_VALID_SAMPLES: "Blink chưa đủ frame hợp lệ để ước tính chắc chắn",
    BLINK_SIGNAL_NOT_RESPONSIVE: "Tín hiệu mí mắt không thay đổi đủ rõ khi chớp; không xuất kết quả 0 giả",
    CAMERA_FRAME_STREAM_STOPPED: "Luồng frame camera đã dừng trước hoặc trong cửa sổ đo",
    DISTANCE_INSUFFICIENT_VALID_SAMPLES: "Distance chưa đủ frame ổn định để phân loại zone",
    CALIBRATION_MISSING: "Chưa có calibration nên distance giữ UNKNOWN",
    CALIBRATION_DEVICE_CHANGED: "Calibration không khớp camera/resolution hiện tại",
    DISTANCE_OUTLIERS_REJECTED: "Một số frame distance bị loại vì lệch quá lớn",
    DISTANCE_FILTER_INSUFFICIENT_DATA: "Bộ lọc distance chưa đủ dữ liệu sau khi loại nhiễu",
    MEASUREMENT_CAMERA_FAILED: "Camera bị lỗi trong lúc đo",
    MEASUREMENT_TIMEOUT: "Cửa sổ đo bị timeout",
    MEASUREMENT_CANCELLED: "Người dùng đã hủy đo",
    MEASUREMENT_INSUFFICIENT_DATA: "Measurement được đánh dấu thiếu dữ liệu"
  };
  return labels[reasonCode] ?? humanLabel(reasonCode);
}

function qualityReasonLabel(reasonCode: string): string {
  const labels: Record<string, string> = {
    NO_FACE: "không thấy mặt",
    MULTIPLE_FACES: "nhiều mặt",
    LOW_VISIBILITY: "mắt/landmark chưa rõ",
    POSE_UNSTABLE: "pose chưa ổn định",
    LOW_LIGHT: "thiếu sáng",
    INVALID_GEOMETRY: "hình học khuôn mặt chưa đủ"
  };
  return labels[reasonCode] ?? humanLabel(reasonCode);
}

function cameraDiagnostics(summary: CheckupSummary): string {
  const evidence = summary.cameraEvidence;
  const items: string[] = [];
  for (const reasonCode of evidence.reasonCodes) items.push(cameraReasonLabel(reasonCode));
  if (evidence.qualityDistribution !== null) {
    const topQualityReasons = Object.entries(evidence.qualityDistribution)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([reason, count]) => `${qualityReasonLabel(reason)}: ${count} frame`);
    items.push(...topQualityReasons);
  }
  if (items.length === 0) return "<p class=\"subtle\">Không có lý do thiếu dữ liệu đáng kể.</p>";
  return `<ul class="camera-diagnostics">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function cameraEvidenceLabel(summary: CheckupSummary | null): string {
  const evidence = summary?.cameraEvidence;
  if (!evidence || evidence.status === "NOT_MEASURED") return "Không dùng camera trong lần checkup này.";
  const blink = evidence.blinkRatePerMinute === null
    ? "Chưa ước tính được nhịp chớp"
    : evidence.blinkRatePerMinute === 0
      ? "Chưa ghi nhận blink event rõ"
      : `Ước tính ${evidence.blinkRatePerMinute}/phút`;
  const distance = evidence.distanceZone === "UNKNOWN" ? "Khoảng cách chưa rõ" : `Khoảng cách: ${humanLabel(evidence.distanceZone)}`;
  const status = evidence.status === "COMPLETED" ? "" : ` · ${humanLabel(evidence.status)}`;
  return `${blink} · ${distance}${status}`;
}

function renderSymptomResultCard(summary: CheckupSummary): string {
  const missing = summary.missingData.map(wellnessQuestionLabel);
  if (summary.discomfortLoad.score === null) {
    return `<article class="result-metric-card missing"><p class="label">EyeMate Symptom Check</p><h3>Chưa tính được điểm triệu chứng</h3><p>Còn ${missing.length} câu chưa có câu trả lời định lượng.</p><ul>${missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><button class="text-link" id="checkup-answer-missing" type="button">Quay lại trả lời câu còn thiếu</button></article>`;
  }
  const score = summary.discomfortLoad.score;
  const percent = score / summary.discomfortLoad.maximumScore;
  return `<article class="result-metric-card"><p class="label">EyeMate Symptom Check</p><div class="score-row"><strong>${score}</strong><span>/ ${summary.discomfortLoad.maximumScore}</span></div><div class="score-bar" aria-label="Điểm triệu chứng ${score} trên ${summary.discomfortLoad.maximumScore}"><span style="width:${Math.round(percent * 100)}%"></span></div><p>${escapeHtml(summary.discomfortLoad.label)}</p><small>5/5 câu tự báo cáo · thang wellness nội bộ, không phải công cụ chẩn đoán.</small></article>`;
}

function renderCameraResultCard(summary: CheckupSummary): string {
  const evidence = summary.cameraEvidence;
  const quality = evidence.sampleCount > 0 ? `${formatPercent(evidence.validSampleRatio)} khung hình đủ chất lượng` : "Không có dữ liệu camera";
  return `<article class="result-metric-card"><p class="label">Quan sát camera cục bộ</p><h3>${escapeHtml(cameraEvidenceLabel(summary))}</h3><p>${quality}. Raw frame, video và landmark không được lưu.</p>${cameraDiagnostics(summary)}<small>Camera chỉ bổ sung bằng chứng hành vi; không xác nhận bệnh và không thay thế khám lâm sàng.</small></article>`;
}

function assessmentMarkup(summary: CheckupSummary): string {
  const rows = summary.assessment.rows.map((row) => `<article class="assessment-row ${signalToneClass(row.signal)}" role="row"><div class="assessment-row-title"><span class="signal-dot" aria-hidden="true"></span><strong>${humanLabel(row.dimension)}</strong><span>${signalLabel(row.signal)}</span></div><p>${escapeHtml(row.observation)}</p><small>Độ tin cậy: ${confidenceLabel(row.confidence)} · Bằng chứng: ${escapeHtml(row.evidence)}</small><small>Hành động: ${escapeHtml(row.action)}</small></article>`).join("");
  return `<section class="result-report" aria-label="Báo cáo wellness tổng hợp"><div class="result-hero"><div><p class="eyebrow">Tổng kết wellness</p><h2>${escapeHtml(summary.assessment.overallLabel)}</h2><p>Độ tin cậy dữ liệu ${formatPercent(summary.assessment.dataConfidence)}. Đây là báo cáo hỗ trợ wellness, không phải chẩn đoán y tế.</p></div><span class="result-stamp ${signalToneClass(summary.assessment.overallSignal)}">${signalLabel(summary.assessment.overallSignal)}</span></div><div class="result-metric-grid">${renderSymptomResultCard(summary)}${renderCameraResultCard(summary)}</div><h3 class="section-heading">Phân tích chi tiết</h3><div class="assessment-table" role="table" aria-label="Bảng đánh giá wellness tích hợp">${rows}</div></section>`;
}

function renderCheckupResultContent(summary: CheckupSummary): string {
  const missing = summary.missingData.map(wellnessQuestionLabel);
  const actions = summary.actions.map((action) => `<li><strong>${actionLabel(action.id)}</strong><span>${evidenceSourceLabel(action.evidenceSource)} · ${actionReasonLabel(action.reasonCode)}</span></li>`).join("");
  const missingText = missing.length ? `Chưa đủ ở: ${missing.map(escapeHtml).join(", ")}.` : "Không có câu tự báo cáo bị thiếu.";
  return `<div><p class="eyebrow">Bước 5 / 5</p><h2>Kết quả checkup hôm nay</h2><span class="status-pill ${summary.status === "SAFETY_STOP" ? "warning" : ""}">${humanLabel(summary.status)}</span>${assessmentMarkup(summary)}<h3 class="section-heading">Gợi ý wellness có thể làm ngay</h3><ul class="wellness-action-list">${actions}</ul><h3 class="section-heading">Dữ liệu thiếu và giới hạn</h3><div class="clinical-note"><strong>Giới hạn cần đọc</strong><p>${missingText} ${humanLabel(summary.limitation)}. EyeMate không hợp nhất survey và camera thành kết luận bệnh.</p><p>${escapeHtml(WELLNESS_DISCLAIMER)}</p></div></div><div class="actions result-actions"><button class="btn btn-primary" id="checkup-done" type="button">Về tổng quan</button><button class="btn" data-checkup-export="PDF" type="button">Export PDF</button><button class="btn" data-checkup-export="MARKDOWN" type="button">Export Markdown</button><button class="btn" data-checkup-export="JSON" type="button">Export JSON</button><button class="btn btn-ghost" id="checkup-repeat" type="button">Làm lại</button></div>`;
}

function renderCheckup(): void {
  const titles = ["EyeMate Symptom Check", "Năm câu tự báo cáo", "Kiểm tra camera", "Đo với camera", "Kết quả"];
  const stepBars = titles.map((title, index) => `<span class="step ${index + 1 < checkupStep ? "done" : index + 1 === checkupStep ? "active" : ""}"><b>${index + 1 < checkupStep ? "✓" : index + 1}</b><small>${title}</small></span>`).join("");
  let content = "";
  if (checkupStep === 1) content = `<div><p class="eyebrow">Bước 1 / 5</p><h2>${titles[0]}</h2><div class="callout disclaimer" role="note"><strong>Lưu ý quan trọng</strong><br>${escapeHtml(WELLNESS_DISCLAIMER)}</div><p class="subtle">Questionnaire này do EyeMate tự phát triển cho mục đích wellness. Camera chỉ mở sau lựa chọn rõ ràng của bạn.</p><div class="callout success"><strong>Local Only</strong><br>Model và xử lý chạy trên máy. Không upload, không lưu raw frame, video hoặc landmark.</div></div><div class="actions"><button class="btn btn-primary" id="checkup-camera-consent" type="button">Cho phép dùng camera</button><button class="btn" id="checkup-consent" type="button">Tiếp tục không camera</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 2) content = `<div><p class="eyebrow">Bước 2 / 5</p><h2>${titles[1]}</h2><p class="subtle">Trong 7 ngày gần đây, hãy ghi lại trải nghiệm của bạn. EyeMate Symptom Check gồm 5 câu tự phát triển, không phải công cụ lâm sàng đã được validation.</p>${surveyValidationMessage ? `<div class="callout warning survey-validation" role="alert">${escapeHtml(surveyValidationMessage)}</div>` : ""}${wellnessSurveyFields()}<label class="label" for="safety-response">Tín hiệu cần dừng</label><select class="field" id="safety-response"><option value="NEGATIVE">Không có tín hiệu cần dừng</option><option value="CONFIRMED">Có tín hiệu cần dừng</option><option value="UNSURE">Chưa chắc</option><option value="PREFER_NOT_TO_ANSWER">Không muốn trả lời</option></select></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-survey-next" type="button">Tiếp tục</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 3) content = cameraRequested ? `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><p class="subtle">Chỉ cần làm lần lượt bốn bước bên dưới. Blink có thể đo trước; khoảng cách chỉ được phân loại khi có calibration phù hợp.</p><ol class="camera-steps" aria-label="Các bước hiệu chỉnh camera"><li class="${cameraState === "ACTIVE" ? "done" : "active"}">Mở camera</li><li class="${observationQuality(latestCameraObservation).acceptable ? "done" : ""}">Đưa khuôn mặt vào khung hình</li><li class="${cameraCalibration !== null ? "done" : ""}">Hiệu chỉnh distance nếu cần</li><li class="${observationQuality(latestCameraObservation).acceptable ? "active" : ""}">Bắt đầu đo 30 giây</li></ol><div class="camera-calibration"><video id="camera-preview" aria-label="Xem trước camera cục bộ"></video><div><label class="label" for="camera-device">Camera đang dùng</label><select class="field" id="camera-device"><option>Camera mặc định</option></select><p class="callout" id="camera-runtime-state" aria-live="polite">${cameraStatusMessage()}</p><p class="callout" id="camera-quality-state" aria-live="polite">${observationQuality(latestCameraObservation).label}</p><p class="camera-guidance" id="camera-guidance" aria-live="polite">${cameraGuidance()}</p>${cameraLiveReadingsMarkup()}<label class="label" for="calibration-distance">Khoảng cách thật từ mắt đến camera/webcam (cm)</label><input class="field" id="calibration-distance" type="number" min="20" max="150" value="60" inputmode="decimal" aria-describedby="calibration-help"><p class="subtle" id="calibration-help">Giá trị này chỉ dùng để phân loại distance zone cục bộ. Nếu bỏ qua calibration, EyeMate vẫn đo blink và giữ khoảng cách là UNKNOWN.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-open-camera" type="button">1. Mở camera</button><button class="btn" id="checkup-calibrate" type="button" disabled title="Hoàn tất bước 1 và 2 trước">3. Hiệu chỉnh distance 5 giây</button><button class="btn btn-primary" id="checkup-measure-next" type="button" disabled title="Cần camera và khuôn mặt đủ chất lượng">4. Tiếp tục đo</button><button class="btn btn-ghost" id="checkup-camera-next" type="button">Bỏ qua camera</button></div>` : `<div><p class="eyebrow">Bước 3 / 5</p><h2>${titles[2]}</h2><div class="callout warning"><strong>Camera đang tắt</strong><br>Bạn chưa cấp consent camera. EyeMate sẽ tiếp tục survey-only và không suy đoán chỉ số camera.</div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-camera-next" type="button">Dùng survey-only</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 4) content = cameraRequested && cameraRuntime.active ? `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="camera-calibration camera-measurement"><video id="camera-preview" aria-label="Camera đang đo cục bộ"></video><div><div class="measurement-countdown" aria-live="polite"><strong id="camera-countdown">00:30</strong><span>giữ tư thế tự nhiên</span></div>${cameraLiveReadingsMarkup()}<p class="subtle">${cameraCalibration === null ? "Chưa có calibration: EyeMate sẽ chỉ dùng blink nếu đủ dữ liệu và giữ distance là UNKNOWN." : "Calibration đã sẵn sàng: EyeMate sẽ tổng hợp blink và distance zone nếu đủ chất lượng."} Quan sát per-frame chỉ tồn tại trong RAM trong cửa sổ 30 giây và bị xóa ngay sau khi tổng hợp.</p></div></div></div><div class="actions"><button class="btn btn-primary" id="checkup-measure-start" type="button" disabled>Đang nối camera…</button><button class="btn btn-danger" data-checkup-cancel type="button">Hủy đo</button></div>` : `<div><p class="eyebrow">Bước 4 / 5</p><h2>${titles[3]}</h2><div class="empty-state"><div><div class="empty-icon" aria-hidden="true">◉</div><h3>Đo camera đã được bỏ qua an toàn</h3><p class="subtle">EAR, khoảng cách và blink counter không được suy đoán khi camera tắt.</p></div></div></div><div class="actions"><button class="btn" id="checkup-back" type="button">Quay lại</button><button class="btn btn-primary" id="checkup-finish" type="button">Xem kết quả</button><button class="btn btn-ghost" data-checkup-cancel type="button">Hủy</button></div>`;
  if (checkupStep === 5) content = checkupResult ? renderCheckupResultContent(checkupResult) : `<div class="empty-state"><div><div class="empty-icon">!</div><h2>Chưa có kết quả</h2><button class="btn" id="checkup-repeat" type="button">Bắt đầu lại</button></div></div>`;
  setView(`${pageHeading("Checkup", "Một phút để lắng nghe đôi mắt", "Flow từng bước, camera-off an toàn và không đưa ra chẩn đoán.")}<section class="wizard"><div class="stepper" aria-label="Tiến trình checkup">${stepBars}</div><article class="card wizard-card">${content}</article></section>`);
  bindCheckupControls();
  const preview = document.querySelector<HTMLVideoElement>("#camera-preview");
  if (preview && cameraRuntime.active && checkupStep === 4) {
    void cameraRuntime.attachPreview(preview).then((attached) => {
      const startButton = document.querySelector<HTMLButtonElement>("#checkup-measure-start");
      if (!startButton) return;
      startButton.disabled = !attached;
      startButton.textContent = attached ? "Bắt đầu 30 giây" : "Không thể nối camera";
    }).catch(() => {
      cameraState = "FAILED";
      cameraReason = "CAMERA_PREVIEW_REATTACH_FAILED";
      void cameraRuntime.stop();
      updateCameraLiveUi();
    });
  }
}

function wellnessSurveyFields(): string {
  return wellnessQuestions.map((question, index) => {
    const current = pendingSurvey.answers[question.id];
    return `<fieldset class="option-grid" data-wellness-question="${question.id}"><legend class="label">${index + 1}. ${question.wording}</legend>${question.responseScale.map((label, value) => `<label class="option"><input type="radio" name="wellness-${question.id}" value="${value}" ${current === value ? "checked" : ""}> <span>${value} · ${label}</span></label>`).join("")}<label class="option"><input type="radio" name="wellness-${question.id}" value="UNKNOWN"> <span>Chưa chắc / bỏ qua câu này</span></label>${question.supportsNotApplicable ? `<label class="option"><input type="radio" name="wellness-${question.id}" value="NOT_APPLICABLE"> <span>Không áp dụng</span></label>` : ""}</fieldset>`;
  }).join("");
}

async function startCheckupCalibration(button: HTMLButtonElement): Promise<void> {
  const context = cameraRuntime.context;
  const observation = latestCameraObservation;
  const referenceDistanceCm = Number(document.querySelector<HTMLInputElement>("#calibration-distance")?.value);
  if (!context || !observation || !observationQuality(observation).acceptable || observation.interEyeDistancePx === null) {
    showToast("Chưa đủ chất lượng để hiệu chỉnh.", "warning");
    return;
  }
  if (!Number.isFinite(referenceDistanceCm) || referenceDistanceCm < 20 || referenceDistanceCm > 150) {
    showToast("Khoảng cách hiệu chỉnh phải từ 20 đến 150 cm.", "warning");
    return;
  }
  if (checkupCalibrationStartedAt !== null) return;
  checkupCalibrationSamples = [];
  checkupCalibrationStartedAt = performance.now();
  button.disabled = true;
  button.textContent = "Đang hiệu chỉnh 5 giây…";
  checkupCalibrationTicker = window.setInterval(() => {
    if (checkupCalibrationStartedAt === null) return;
    if (performance.now() - checkupCalibrationStartedAt >= CAMERA_CALIBRATION_CONFIG.captureDurationMs) void finishCheckupCalibration(context, referenceDistanceCm, button);
  }, 100);
}

async function finishCheckupCalibration(context: { readonly deviceBinding: string; readonly width: number; readonly height: number }, referenceDistanceCm: number, button: HTMLButtonElement): Promise<void> {
  const samples = checkupCalibrationSamples ?? [];
  checkupCalibrationStartedAt = null;
  checkupCalibrationSamples = null;
  if (checkupCalibrationTicker !== null) window.clearInterval(checkupCalibrationTicker);
  checkupCalibrationTicker = null;
  try {
    const record = createCameraCalibrationRecord({ ...context, referenceDistanceCm, interEyeDistanceSamplesPx: samples, calibratedAt: new Date().toISOString() });
    const saved = await window.eyeMate.saveCameraCalibration(record);
    cameraCalibration = saved.profile;
    button.textContent = "Đã hiệu chỉnh";
    showToast(`Đã lưu calibration ${saved.confidence}; ${saved.validSampleCount} mẫu hợp lệ.`);
    updateCameraLiveUi();
  } catch {
    cameraCalibration = null;
    button.disabled = false;
    button.textContent = "3. Hiệu chỉnh 5 giây";
    showToast(`Chưa đủ dữ liệu hiệu chỉnh: ${samples.length}/${CAMERA_CALIBRATION_CONFIG.minimumValidSamples} mẫu hợp lệ.`, "warning");
    updateCameraLiveUi();
  }
}

let pendingSurvey: { answers: Record<WellnessQuestionId, SurveyResponse>; safety: SafetyResponse } = {
  answers: Object.fromEntries(wellnessQuestions.map((question) => [question.id, "UNKNOWN"])) as Record<WellnessQuestionId, SurveyResponse>,
  safety: "NEGATIVE"
};
let surveyValidationMessage: string | null = null;
function bindCheckupControls(): void {
  document.querySelector<HTMLButtonElement>("#checkup-camera-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.grantCameraConsent()); if (result !== null) { cameraRequested = true; checkupStep = 2; renderCheckup(); } });
  document.querySelector<HTMLButtonElement>("#checkup-consent")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.completeOnboardingWithoutCamera()); if (result !== null) { checkupStep = 2; renderCheckup(); } });
  document.querySelector("#checkup-back")?.addEventListener("click", () => { if (checkupStep <= 3) { void stopCameraFlow(); cameraCalibration = null; } checkupStep = Math.max(1, checkupStep - 1); renderCheckup(); });
  document.querySelector("#checkup-survey-next")?.addEventListener("click", () => {
    const missingRequired = wellnessQuestions.filter((question) => document.querySelector<HTMLInputElement>(`input[name='wellness-${question.id}']:checked`) === null);
    if (missingRequired.length > 0) {
      surveyValidationMessage = `Bạn còn ${missingRequired.length} câu chưa chọn: ${missingRequired.map((question) => `${wellnessQuestions.indexOf(question) + 1}. ${question.wording}`).join("; ")}. Chọn 0–3 để tính điểm, hoặc chọn “Chưa chắc / bỏ qua câu này” nếu thật sự chưa có dữ liệu.`;
      showToast("Còn câu chưa trả lời nên EyeMate chưa thể tính điểm.", "warning");
      renderCheckup();
      return;
    }
    const answers = Object.fromEntries(wellnessQuestions.map((question) => {
      const value = document.querySelector<HTMLInputElement>(`input[name='wellness-${question.id}']:checked`)?.value ?? "UNKNOWN";
      return [question.id, /^[0-3]$/.test(value) ? Number(value) as SurveyResponse : "UNKNOWN" as SurveyResponse];
    })) as Record<WellnessQuestionId, SurveyResponse>;
    surveyValidationMessage = null;
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
    if (context !== null) {
      const saved = await window.eyeMate.getCameraCalibration().catch(() => null);
      if (saved?.profile.deviceBinding === context.deviceBinding) {
        cameraCalibration = saved.profile;
        showToast("Đã dùng calibration đã lưu cho camera hiện tại.");
      } else if (saved !== null) {
        showToast("Calibration đã lưu không khớp camera/resolution hiện tại; cần hiệu chỉnh lại.", "warning");
      }
      await populateCameraDevices(); updateCameraLiveUi();
    }
  });
  document.querySelector<HTMLSelectElement>("#camera-device")?.addEventListener("change", () => {
    if (!cameraRuntime.active) return;
    showToast("Đang chuyển camera và kiểm tra lại calibration…");
    document.querySelector<HTMLButtonElement>("#checkup-open-camera")?.click();
  });
  document.querySelector<HTMLButtonElement>("#checkup-calibrate")?.addEventListener("click", (event) => void startCheckupCalibration(event.currentTarget as HTMLButtonElement));
  document.querySelector("#checkup-measure-next")?.addEventListener("click", () => { checkupStep = 4; renderCheckup(); });
  document.querySelector<HTMLButtonElement>("#checkup-measure-start")?.addEventListener("click", (event) => {
    if (!cameraRuntime.active || cameraMeasurementStartedAt !== null) return;
    const button = event.currentTarget as HTMLButtonElement; button.disabled = true; button.textContent = "Đang đo…";
    cameraFrames.length = 0; cameraMeasurement = null; cameraMeasurementStartedAt = performance.now();
    cameraMeasurementTicker = window.setInterval(() => {
      if (cameraMeasurementStartedAt === null) return;
      const elapsed = performance.now() - cameraMeasurementStartedAt;
      if (elapsed >= 3_000 && cameraFrames.length === 0) { void finishCameraMeasurement("CAMERA_FAILED"); return; }
      const remaining = Math.max(0, 30_000 - elapsed);
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
  document.querySelector("#checkup-answer-missing")?.addEventListener("click", () => { surveyValidationMessage = "Hoàn tất các câu còn thiếu để EyeMate tính điểm 0–15."; checkupStep = 2; renderCheckup(); });
  document.querySelector("#checkup-repeat")?.addEventListener("click", () => { void stopCameraFlow(); checkupStep = 1; checkupResult = null; cameraMeasurement = null; surveyValidationMessage = null; renderCheckup(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-checkup-cancel]"))) button.addEventListener("click", () => { void stopCameraFlow(); checkupStep = 1; checkupResult = null; cameraMeasurement = null; surveyValidationMessage = null; location.hash = "#/home"; });
  if (checkupStep === 3 && cameraRequested) void populateCameraDevices();
}

async function renderCompanion(): Promise<void> {
  const [session, preferences] = await withOperationTimeout(Promise.all([window.eyeMate.getWorkSession(), window.eyeMate.getUserPreferences()]));
  currentPreferences = preferences;
  if (session && !["COMPLETED", "CANCELLED", "FAILED"].includes(session.state)) selectedCompanionMode = session.modeId;
  else selectedCompanionMode = preferences.defaultMode;
  setView(`${pageHeading("Work Companion", "Ở đây khi bạn cần tập trung", "Nhịp làm việc local, tự nhắc đúng mốc và không phụ thuộc camera.")}
    ${companionModeSelector(session, preferences)}
    <div class="callout companion-policy"><strong>Chính sách nhắc</strong> · ${preferences.breakReminderEnabled ? "Break reminder bật" : "Break reminder tắt"} · ${preferences.quietHoursEnabled ? `Quiet hours ${minutesToTime(preferences.quietStartMinute)}–${minutesToTime(preferences.quietEndMinute)}` : "Quiet hours tắt"}</div>
    <section class="card session-panel" id="session-panel">${sessionMarkup(session, preferences)}</section>`);
  bindSessionControls(session, preferences);
}

function customTiming(preferences: UserPreferences): Pick<UserPreferences, "customWorkDurationMinutes" | "customBreakDurationMinutes" | "customReminderAtMinutes"> {
  return { customWorkDurationMinutes: preferences.customWorkDurationMinutes, customBreakDurationMinutes: preferences.customBreakDurationMinutes, customReminderAtMinutes: preferences.customReminderAtMinutes };
}

function companionProfile(mode: WorkSession["modeId"], preferences: UserPreferences = currentPreferences ?? { defaultMode: "TIMER_ONLY", customWorkDurationMinutes: 30, customBreakDurationMinutes: 5, customReminderAtMinutes: 25, soundEnabled: false, breakReminderEnabled: true, quietHoursEnabled: false, quietStartMinute: 1320, quietEndMinute: 420, reducedMotion: false }) {
  const timing = customTiming(preferences);
  return getCompanionModeProfile(mode, { workDurationMinutes: timing.customWorkDurationMinutes, breakDurationMinutes: timing.customBreakDurationMinutes, reminderAtMinutes: timing.customReminderAtMinutes });
}

function companionModeSelector(session: WorkSession | null, preferences: UserPreferences): string {
  const locked = session !== null && !["COMPLETED", "CANCELLED", "FAILED"].includes(session.state);
  const modes: readonly WorkSession["modeId"][] = ["BALANCED", "DEEP_FOCUS", "HIGH_SUPPORT", "TIMER_ONLY", "CUSTOM"];
  const items = modes.map((mode) => {
    const profile = companionProfile(mode, preferences);
    const active = mode === selectedCompanionMode;
    return `<button class="mode ${active ? "active" : ""}" data-companion-mode="${mode}" type="button" ${locked ? "disabled" : ""} aria-pressed="${active}"><strong>${escapeHtml(profile.label)}</strong><small>${profile.workDurationMinutes} phút · nhắc ở phút ${profile.reminderAtMinutes}</small></button>`;
  }).join("");
  const editor = selectedCompanionMode === "CUSTOM" ? `<section class="card custom-companion-editor" aria-label="Tùy chỉnh thời gian Work Companion"><label>Thời gian tập trung (phút)<input class="field" id="custom-work-minutes" type="number" min="5" max="180" value="${preferences.customWorkDurationMinutes}" ${locked ? "disabled" : ""}></label><label>Nghỉ gợi ý (phút)<input class="field" id="custom-break-minutes" type="number" min="1" max="60" value="${preferences.customBreakDurationMinutes}" ${locked ? "disabled" : ""}></label><label>Nhắc ở phút<input class="field" id="custom-reminder-minutes" type="number" min="1" max="${preferences.customWorkDurationMinutes}" value="${preferences.customReminderAtMinutes}" ${locked ? "disabled" : ""}></label>${locked ? `<span class="status-pill">Khóa khi phiên đang chạy</span>` : `<button class="btn btn-primary" id="custom-timing-save" type="button">Lưu nhịp tùy chỉnh</button>`}<p class="subtle" id="custom-timing-status" aria-live="polite">Tập trung 5–180 phút; thời điểm nhắc không được vượt quá thời gian tập trung.</p></section>` : "";
  return `<section class="mode-selector" aria-label="Chọn nhịp Work Companion">${items}</section>${editor}`;
}

function sessionMarkup(session: WorkSession | null, preferences: UserPreferences): string {
  const profile = companionProfile(session && !["COMPLETED", "CANCELLED", "FAILED"].includes(session.state) ? session.modeId : selectedCompanionMode, preferences);
  if (session === null || ["COMPLETED", "CANCELLED", "FAILED"].includes(session.state)) return `<div><p class="label">Sẵn sàng · ${escapeHtml(profile.label)}</p><div class="session-timer">${String(profile.workDurationMinutes).padStart(2, "0")}:00</div><p class="subtle">${escapeHtml(profile.description)} Nghỉ gợi ý ${profile.breakDurationMinutes} phút; camera không bắt buộc.</p><button class="btn btn-primary" id="session-start" type="button">Bắt đầu phiên</button></div>`;
  if (session.state === "RECOVERY_REQUIRED") return `<div><p class="label">Khôi phục phiên</p><div class="session-timer">${formatDuration(session.elapsedActiveMs)}</div><p class="callout warning">EyeMate đã lưu phiên đang dở. Thời gian trong lúc ứng dụng đóng không được suy thành thời gian làm việc hoặc nghỉ.</p><div class="actions"><button class="btn btn-primary" id="session-recover" type="button">Tiếp tục phiên</button><button class="btn btn-danger" id="session-cancel" type="button">Hủy phiên cũ</button></div></div>`;
  const active = session.state === "ACTIVE";
  activeElapsedBase = session.elapsedActiveMs;
  if (active && activeStartedAt === null) activeStartedAt = performance.now();
  if (!active) activeStartedAt = null;
  const cycle = evaluateCompanionCycle(session.modeId, session.elapsedActiveMs, { workDurationMinutes: preferences.customWorkDurationMinutes, breakDurationMinutes: preferences.customBreakDurationMinutes, reminderAtMinutes: preferences.customReminderAtMinutes });
  return `<div class="${session.state === "PAUSED" ? "session-paused" : ""}"><p class="label">${session.state === "PAUSED" ? "Đang tạm dừng" : `Đang hoạt động · ${escapeHtml(profile.label)}`}</p>${sessionTimerRing(session.elapsedActiveMs, cycle.targetMs)}<p class="subtle">Mục tiêu ${profile.workDurationMinutes} phút · tự nhắc ở phút ${profile.reminderAtMinutes} · nghỉ gợi ý ${profile.breakDurationMinutes} phút · Camera không bắt buộc</p><div class="actions"><button class="btn" id="session-toggle" type="button">${active ? "Tạm dừng" : "Tiếp tục"}</button><button class="btn" id="session-nudge" type="button" ${active && preferences.breakReminderEnabled ? "" : `disabled title=\"${preferences.breakReminderEnabled ? "Chỉ khả dụng khi phiên đang chạy" : "Break reminder đang tắt trong Cài đặt"}\"`}>Nghỉ mắt ngay</button><button class="btn btn-primary" id="session-end" type="button">Hoàn thành</button><button class="btn btn-danger" id="session-cancel" type="button">Hủy phiên</button></div></div>`;
}

const SESSION_RING_CIRCUMFERENCE = 2 * Math.PI * 48;
function sessionTimerRing(elapsedMs: number, targetMs: number): string {
  const progress = Math.min(1, Math.max(0, elapsedMs / targetMs));
  const offset = SESSION_RING_CIRCUMFERENCE * (1 - progress);
  return `<div class="companion-timer-ring" id="companion-timer-ring" role="timer" data-target-ms="${targetMs}" aria-label="Đã làm việc ${formatDuration(elapsedMs)} trên mục tiêu ${formatDuration(targetMs)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="companion-ring-track" cx="60" cy="60" r="48"></circle><circle class="companion-ring-progress" id="session-ring-progress" cx="60" cy="60" r="48" stroke-dasharray="${SESSION_RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}"></circle></svg><div><strong class="session-timer" id="session-timer">${formatDuration(elapsedMs)}</strong><small>ĐÃ TẬP TRUNG</small></div></div>`;
}

function updateSessionTimerVisual(elapsedMs: number): void {
  const timer = document.querySelector<HTMLElement>("#session-timer"); if (timer) timer.textContent = formatDuration(elapsedMs);
  const ring = document.querySelector<HTMLElement>("#companion-timer-ring");
  const targetMs = Number(ring?.dataset.targetMs ?? 25 * 60_000);
  const progress = Math.min(1, Math.max(0, elapsedMs / targetMs));
  document.querySelector<SVGCircleElement>("#session-ring-progress")?.setAttribute("stroke-dashoffset", String(SESSION_RING_CIRCUMFERENCE * (1 - progress)));
  ring?.setAttribute("aria-label", `Đã làm việc ${formatDuration(elapsedMs)} trên mục tiêu ${formatDuration(targetMs)}`);
}

function bindSessionControls(session: WorkSession | null, preferences: UserPreferences): void {
  if (sessionTicker !== null) window.clearInterval(sessionTicker);
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-companion-mode]"))) button.addEventListener("click", async () => {
    selectedCompanionMode = button.dataset.companionMode as WorkSession["modeId"];
    if (currentPreferences) currentPreferences = await runMutation(button, window.eyeMate.updateUserPreferences({ ...currentPreferences, defaultMode: selectedCompanionMode }));
    await renderCompanion();
  });
  document.querySelector<HTMLButtonElement>("#custom-timing-save")?.addEventListener("click", async (event) => {
    const workDurationMinutes = Number(document.querySelector<HTMLInputElement>("#custom-work-minutes")?.value);
    const breakDurationMinutes = Number(document.querySelector<HTMLInputElement>("#custom-break-minutes")?.value);
    const reminderAtMinutes = Number(document.querySelector<HTMLInputElement>("#custom-reminder-minutes")?.value);
    const status = document.querySelector<HTMLElement>("#custom-timing-status");
    if (!Number.isInteger(workDurationMinutes) || workDurationMinutes < 5 || workDurationMinutes > 180 || !Number.isInteger(breakDurationMinutes) || breakDurationMinutes < 1 || breakDurationMinutes > 60 || !Number.isInteger(reminderAtMinutes) || reminderAtMinutes < 1 || reminderAtMinutes > workDurationMinutes) {
      if (status) status.textContent = "Giá trị chưa hợp lệ: mốc nhắc phải nằm trong thời gian tập trung.";
      return;
    }
    const saved = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.updateUserPreferences({ ...preferences, defaultMode: "CUSTOM", customWorkDurationMinutes: workDurationMinutes, customBreakDurationMinutes: breakDurationMinutes, customReminderAtMinutes: reminderAtMinutes }), "Đã lưu nhịp tùy chỉnh cục bộ.");
    if (saved) { currentPreferences = saved; selectedCompanionMode = "CUSTOM"; await renderCompanion(); }
  });
  if (session?.state === "ACTIVE") {
    const profile = companionProfile(session.modeId, preferences);
    if (scheduledCompanionSessionId !== session.id) {
      scheduledCompanionSessionId = session.id;
      nextAutomaticNudgeAtElapsedMs = profile.reminderAtMinutes * 60_000;
    }
    latestCompanionElapsedMs = session.elapsedActiveMs;
    sessionTicker = window.setInterval(() => {
      if (activeStartedAt === null) return;
      const elapsedMs = activeElapsedBase + performance.now() - activeStartedAt;
      latestCompanionElapsedMs = elapsedMs;
      updateSessionTimerVisual(elapsedMs);
      void maybeRequestAutomaticNudge(session, elapsedMs);
    }, 250);
  }
  document.querySelector<HTMLButtonElement>("#session-start")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.startWorkSession(selectedCompanionMode)); if (result) { activeStartedAt = performance.now(); scheduledCompanionSessionId = null; await renderCompanion(); } });
  document.querySelector<HTMLButtonElement>("#session-toggle")?.addEventListener("click", async (event) => { if (!session) return; const result = await runMutation(event.currentTarget as HTMLButtonElement, session.state === "ACTIVE" ? window.eyeMate.pauseWorkSession() : window.eyeMate.resumeWorkSession()); if (result) { activeElapsedBase = result.elapsedActiveMs; activeStartedAt = null; await renderCompanion(); } });
  document.querySelector<HTMLButtonElement>("#session-recover")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.resumeWorkSession(), "Phiên đã được khôi phục."); if (result) await renderCompanion(); });
  document.querySelector<HTMLButtonElement>("#session-nudge")?.addEventListener("click", async (event) => { await requestCompanionNudge(event.currentTarget as HTMLButtonElement, false); });
  document.querySelector("#session-end")?.addEventListener("click", () => {
    showModal("Kết thúc phiên?", "<p class=\"subtle\">EyeMate sẽ lưu Session Summary cục bộ. Dữ liệu camera không tồn tại trong phiên Timer Only.</p>", "<button class=\"btn btn-primary\" id=\"confirm-session-end\" type=\"button\">Lưu và kết thúc</button>");
    document.querySelector<HTMLButtonElement>("#confirm-session-end")?.addEventListener("click", async (event) => { const finished = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.finishWorkSession()); if (!finished) return; closeModal(); activeStartedAt = null; showSessionSummary(finished); });
  });
  document.querySelector("#session-cancel")?.addEventListener("click", () => {
    showModal("Hủy phiên này?", "<p class=\"subtle\">Phiên sẽ được đánh dấu CANCELLED và không được diễn giải như một phiên hoàn thành.</p>", "<button class=\"btn btn-danger\" id=\"confirm-session-cancel\" type=\"button\">Hủy phiên</button>");
    document.querySelector<HTMLButtonElement>("#confirm-session-cancel")?.addEventListener("click", async (event) => { const cancelled = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.cancelWorkSession()); if (!cancelled) return; closeModal(); activeStartedAt = null; showToast("Phiên đã hủy; không tạo kết luận hoàn thành."); await renderCompanion(); });
  });
}

async function maybeRequestAutomaticNudge(session: WorkSession, elapsedMs: number): Promise<void> {
  if (session.state !== "ACTIVE" || nextAutomaticNudgeAtElapsedMs === null || elapsedMs < nextAutomaticNudgeAtElapsedMs || companionNudgeRequestInFlight) return;
  nextAutomaticNudgeAtElapsedMs = null;
  await requestCompanionNudge(null, true);
}

async function monitorCompanionSession(): Promise<void> {
  try {
    const session = await window.eyeMate.getWorkSession();
    if (!session || session.state !== "ACTIVE") {
      if (!session || ["COMPLETED", "CANCELLED", "FAILED"].includes(session.state)) {
        scheduledCompanionSessionId = null;
        nextAutomaticNudgeAtElapsedMs = null;
      }
      return;
    }
    const preferences = currentPreferences ?? await window.eyeMate.getUserPreferences();
    currentPreferences = preferences;
    selectedCompanionMode = session.modeId;
    if (scheduledCompanionSessionId !== session.id) {
      const profile = companionProfile(session.modeId, preferences);
      scheduledCompanionSessionId = session.id;
      nextAutomaticNudgeAtElapsedMs = profile.reminderAtMinutes * 60_000;
    }
    latestCompanionElapsedMs = session.elapsedActiveMs;
    if (routeFromHash() === "companion") updateSessionTimerVisual(session.elapsedActiveMs);
    await maybeRequestAutomaticNudge(session, session.elapsedActiveMs);
  } catch {
    // Route-level error handling remains authoritative; background monitoring retries.
  }
}

function startCompanionMonitor(): void {
  if (companionMonitor !== null) return;
  companionMonitor = window.setInterval(() => void monitorCompanionSession(), 1_000);
  void monitorCompanionSession();
}

async function requestCompanionNudge(button: HTMLButtonElement | null, automatic: boolean): Promise<void> {
  if (companionNudgeRequestInFlight) return;
  companionNudgeRequestInFlight = true;
  try {
    const decision = await runMutation(button, window.eyeMate.requestBreakNudge());
    if (!decision) return;
    if (decision.action === "EMIT") {
      currentNudgeId = decision.nudgeId;
      showNudge();
      return;
    }
    if (automatic) {
      if (decision.reason === "COOLDOWN" && decision.cooldownRemainingMs > 0) nextAutomaticNudgeAtElapsedMs = latestCompanionElapsedMs + decision.cooldownRemainingMs;
      else if (!["NUDGE_DISABLED", "FREQUENCY_CAP"].includes(decision.reason)) nextAutomaticNudgeAtElapsedMs = latestCompanionElapsedMs + 60_000;
    } else showToast(`Chưa nhắc lúc này: ${humanLabel(decision.reason)}${decision.cooldownRemainingMs > 0 ? ` (${Math.ceil(decision.cooldownRemainingMs / 60_000)} phút)` : ""}.`);
  } finally {
    companionNudgeRequestInFlight = false;
  }
}

function showNudge(): void {
  if (toastRegion === null || currentNudgeId === null) return;
  const profile = companionProfile(selectedCompanionMode);
  toastRegion.innerHTML = `<aside class="toast" aria-label="Nhắc nghỉ"><p class="label">Một chút cho đôi mắt · ${escapeHtml(profile.label)}</p><strong>Nhìn xa và thả lỏng trong 20 giây?</strong><div class="actions" style="margin-top:12px"><button class="btn btn-primary" data-nudge="ACCEPTED" type="button">Nghỉ ngay</button><button class="btn" data-nudge="SNOOZED" type="button">Nhắc sau ${profile.snoozeMinutes} phút</button><button class="btn btn-ghost" data-nudge="DISMISSED" type="button">Bỏ qua</button></div></aside>`;
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
async function respondNudge(response: NudgeResponse): Promise<void> {
  if (currentNudgeId === null) return;
  const handled = await runMutation(null, window.eyeMate.respondToNudge(currentNudgeId, response));
  currentNudgeId = null;
  toastRegion?.replaceChildren();
  if (handled !== true) return;
  const profile = companionProfile(selectedCompanionMode);
  if (response === "SNOOZED") {
    nextAutomaticNudgeAtElapsedMs = latestCompanionElapsedMs + profile.snoozeMinutes * 60_000;
    showToast(`Sẽ nhắc lại sau ${profile.snoozeMinutes} phút làm việc.`);
    return;
  }
  if (response === "DISMISSED") {
    nextAutomaticNudgeAtElapsedMs = latestCompanionElapsedMs + profile.cooldownMinutes * 60_000;
    showToast("Đã bỏ qua lời nhắc; cooldown vẫn được tôn trọng.");
    return;
  }
  if (response === "ACCEPTED") {
    const paused = await runMutation(null, window.eyeMate.pauseWorkSession());
    if (paused) { activeStartedAt = null; showEyeRestBreak(profile.breakDurationMinutes); }
  }
}

function showEyeRestBreak(suggestedBreakMinutes: number): void {
  let remainingSeconds = 20;
  showModal("Nghỉ mắt 20 giây", `<div class="eye-rest-break"><strong id="eye-rest-countdown">00:20</strong><p>Nhìn ra xa, thả lỏng vai và chớp mắt tự nhiên.</p><small>Phiên đang tạm dừng. Sau nhịp ngắn này, bạn có thể nghỉ tiếp đến ${suggestedBreakMinutes} phút.</small></div>`, `<button class="btn btn-primary" id="eye-rest-resume" type="button" disabled>Tiếp tục sau 20 giây</button>`);
  const countdown = window.setInterval(() => {
    remainingSeconds -= 1;
    const output = document.querySelector<HTMLElement>("#eye-rest-countdown");
    if (output) output.textContent = `00:${String(Math.max(0, remainingSeconds)).padStart(2, "0")}`;
    if (remainingSeconds > 0) return;
    window.clearInterval(countdown);
    const resume = document.querySelector<HTMLButtonElement>("#eye-rest-resume");
    if (resume) { resume.disabled = false; resume.textContent = "Tiếp tục phiên"; }
  }, 1_000);
  document.querySelector<HTMLButtonElement>("#eye-rest-resume")?.addEventListener("click", async (event) => {
    const resumed = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.resumeWorkSession());
    if (!resumed) return;
    closeModal();
    activeStartedAt = performance.now();
    activeElapsedBase = resumed.elapsedActiveMs;
    await renderCompanion();
  });
}
function showSessionSummary(session: WorkSession): void { showModal("Phiên đã hoàn thành", `<div class="grid grid-2"><div class="callout success"><span class="label">Tổng thời gian</span><strong class="metric-value">${formatDuration(session.elapsedActiveMs)}</strong></div><div class="callout"><span class="label">Dữ liệu camera</span><strong>Không đo</strong></div></div><p class="subtle" style="margin-top:16px">Session Summary đã lưu cục bộ. So sánh baseline cần thêm dữ liệu hợp lệ.</p>`, "<a class=\"btn btn-primary\" href=\"#/reports\">Xem báo cáo</a>"); document.querySelector(".modal a")?.addEventListener("click", closeModal); }

async function renderIntelligence(): Promise<void> {
  const [runtime, reports, summaries] = await withOperationTimeout(Promise.all([getRuntimeInfoCached(), window.eyeMate.listM3Reports(), window.eyeMate.listSessionSummaries()]));
  const demoSnapshot = runtime.dataMode === "SYNTHETIC_DEMO" ? createPersonalDemoSnapshot() : null;
  const report = (demoSnapshot?.reports ?? reports).at(-1);
  const rhythm = buildWorkRhythm(demoSnapshot?.sessionSummaries ?? summaries, intelligenceRange);
  const refreshAction = demoSnapshot ? `<button class="btn" type="button" disabled title="Dữ liệu mẫu được cố định cho phiên demo">Dữ liệu mẫu cố định</button>` : `<button class="btn" id="intelligence-refresh" type="button">Cập nhật dữ liệu</button>`;
  setView(`${pageHeading("Personal Intelligence", "Hiểu nhịp làm việc của riêng bạn", "Tóm tắt các phiên EyeMate đã ghi nhận, giải thích bằng ngôn ngữ đời thường và không suy đoán thời gian ngoài ứng dụng.", refreshAction)}${demoSnapshot ? personalDemoBanner() : ""}<div class="tabs intelligence-range" role="tablist" aria-label="Khoảng thời gian thấu hiểu"><button class="tab ${intelligenceRange === 7 ? "active" : ""}" data-intelligence-range="7" role="tab" aria-selected="${intelligenceRange === 7}" type="button">7 ngày gần nhất</button><button class="tab ${intelligenceRange === 30 ? "active" : ""}" data-intelligence-range="30" role="tab" aria-selected="${intelligenceRange === 30}" type="button">30 ngày gần nhất</button></div>${intelligenceContent(report, rhythm)}`);
  document.querySelector<HTMLButtonElement>("#intelligence-refresh")?.addEventListener("click", async (event) => {
    const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.generateM3Report(), "Đã tạo dữ liệu tổng hợp cục bộ.");
    if (result) await renderIntelligence();
  });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-intelligence-range]"))) button.addEventListener("click", () => { intelligenceRange = Number(button.dataset.intelligenceRange) === 30 ? 30 : 7; void renderIntelligence(); });
  const resetButton = document.querySelector<HTMLButtonElement>("#intelligence-reset");
  if (demoSnapshot && resetButton) { resetButton.disabled = true; resetButton.title = "Demo không thay đổi baseline cá nhân"; }
  else resetButton?.addEventListener("click", showResetBaselineDialog);
}

function intelligenceContent(report: PersonalReport | undefined, rhythm: WorkRhythmSummary): string {
  const load = trackedLoadCopy(rhythm);
  const baselineReady = report?.baseline.state === "READY";
  const baselineText = baselineReady ? `Đã có ${report.baseline.sampleCount} phiên hợp lệ để hình thành nhịp tham chiếu; thời lượng thường thấy khoảng ${Math.round(report.baseline.meanSessionDurationMinutes ?? 0)} phút.` : `Baseline vẫn đang học${report ? ` từ ${report.baseline.sampleCount} phiên hợp lệ` : ""}. Cần ít nhất 3 phiên hoàn tất để bắt đầu so sánh.`;
  const vliText = report?.daily.vli.score === null || report?.daily.vli.score === undefined ? "Chưa đủ thành phần để tính tải thị giác tổng hợp; EyeMate không biến dữ liệu thiếu thành điểm 0." : `Chỉ số tải thị giác tổng hợp gần nhất là ${Math.round(report.daily.vli.score)}/100 với độ phủ ${Math.round(report.daily.vli.dataConfidence * 100)}%.`;
  const scheduleText = rhythm.preferredPeriod && rhythm.mostActiveWeekday ? `Các phiên thường bắt đầu vào buổi ${rhythm.preferredPeriod.toLocaleLowerCase("vi-VN")}; ${rhythm.mostActiveWeekday} là ngày có nhiều phút được ghi nhận nhất.` : "Chưa đủ ngày có phiên để nhận ra khung giờ hoặc ngày làm việc thường gặp.";
  const longSessionText = rhythm.longSessionCount > 0 ? `${rhythm.longSessionCount} phiên kéo dài từ 90 phút trở lên; phiên dài nhất ${formatMinutesHuman(rhythm.longestSessionMinutes)}.` : rhythm.completedSessions > 0 ? `Phiên dài nhất ${formatMinutesHuman(rhythm.longestSessionMinutes)}; chưa thấy phiên nào từ 90 phút trở lên trong khoảng này.` : "Chưa có phiên hoàn tất trong khoảng đã chọn.";
  return `<section class="intelligence-summary-band ${load.tone}"><div><p class="eyebrow">Nhận định từ dữ liệu đã ghi nhận</p><h2>${load.title}</h2><p>${load.detail}</p></div><span class="result-stamp">${rhythm.activeDays}/${rhythm.dayCount} ngày có phiên</span></section>
    <div class="intelligence-stats"><article class="card"><span class="label">Tổng thời gian</span><strong>${formatMinutesHuman(rhythm.totalMinutes)}</strong><small>${rhythm.completedSessions} phiên hoàn tất</small></article><article class="card"><span class="label">Mỗi ngày có phiên</span><strong>${formatMinutesHuman(rhythm.averageActiveDayMinutes)}</strong><small>Không tính ngày không mở phiên</small></article><article class="card"><span class="label">Một phiên trung bình</span><strong>${formatMinutesHuman(rhythm.averageSessionMinutes)}</strong><small>Phiên dài nhất ${formatMinutesHuman(rhythm.longestSessionMinutes)}</small></article><article class="card"><span class="label">So với 7 ngày trước</span><strong>${trendLabel(rhythm)}</strong><small>Chỉ so thời gian EyeMate ghi nhận</small></article></div>
    <section class="card intelligence-chart-panel"><div class="intelligence-section-heading"><div><p class="label">Thời gian làm việc đã ghi nhận</p><h2>${rhythm.dayCount} ngày gần nhất</h2></div><span>${rhythm.activeDays} ngày có dữ liệu</span></div>${workRhythmChart(rhythm)}<p class="subtle">Mỗi cột là tổng phút của các phiên hoàn tất trong ngày. Ngày trống có thể là không dùng EyeMate, không có nghĩa là bạn không làm việc.</p></section>
    <div class="grid grid-2 intelligence-story"><article class="card"><p class="label">Lịch thường thấy</p><h2>${rhythm.preferredPeriod ? `Nghiêng về buổi ${rhythm.preferredPeriod.toLocaleLowerCase("vi-VN")}` : "Chưa hình thành lịch rõ"}</h2><p>${scheduleText}</p></article><article class="card"><p class="label">Phiên liên tục</p><h2>${rhythm.longSessionCount > 0 ? "Nên chia nhỏ một số phiên" : rhythm.completedSessions ? "Chưa thấy phiên quá dài" : "Chưa đủ dữ liệu"}</h2><p>${longSessionText}</p></article></div>
    <details class="card intelligence-method"><summary>Dữ liệu này được hiểu như thế nào?</summary><div class="grid grid-2"><div><h3>Nhịp tham chiếu cá nhân</h3><p>${baselineText}</p></div><div><h3>Tải thị giác tổng hợp</h3><p>${vliText}</p></div></div><p>Biểu đồ chỉ đọc Session Summary của phiên hoàn tất. Phiên hủy bị loại; giờ bắt đầu được ước tính từ thời điểm kết thúc và thời lượng phiên. Checkup camera vẫn được lưu trong payload checkup nhưng chưa được dùng để suy lịch làm việc.</p><p class="callout warning">“Khối lượng cao” chỉ được gắn khi trung bình ngày có phiên đạt 4 giờ hoặc một ngày đạt 6 giờ trong dữ liệu EyeMate. Đây không phải kết luận y tế hay khẳng định bạn làm việc quá sức.</p>${report ? `<div class="actions"><button class="btn btn-ghost" id="intelligence-reset" type="button">Reset nhịp tham chiếu</button><a class="text-link" href="#/reports">Xem report kỹ thuật</a></div>` : ""}</details>`;
}

function trackedLoadCopy(rhythm: WorkRhythmSummary): { readonly title: string; readonly detail: string; readonly tone: string } {
  if (rhythm.loadSignal === "HIGH_TRACKED_LOAD") return { title: "Khối lượng EyeMate ghi nhận đang cao", detail: "Ưu tiên chia thời gian thành các phiên ngắn hơn và tạo khoảng nghỉ thật giữa các phiên. Đây chỉ là phần thời gian bạn đã bật EyeMate.", tone: "is-high" };
  if (rhythm.loadSignal === "LONG_SESSIONS") return { title: "Có phiên liên tục khá dài", detail: "Tổng thời gian chưa nhất thiết cao, nhưng phiên từ 90 phút trở lên nên được chia nhỏ để có nhịp nghỉ rõ hơn.", tone: "is-watch" };
  if (rhythm.loadSignal === "STEADY") return { title: "Nhịp ghi nhận tương đối đều", detail: "Chưa thấy tín hiệu phiên quá dài hoặc khối lượng cao theo ngưỡng của EyeMate trong khoảng đã chọn.", tone: "is-steady" };
  return { title: "Cần thêm ngày để hiểu nhịp của bạn", detail: "EyeMate cần ít nhất 3 ngày có phiên hoàn tất trong khoảng đã chọn trước khi nhận xét về khối lượng hoặc sự ổn định.", tone: "is-learning" };
}

function formatMinutesHuman(minutes: number): string { const safe = Math.max(0, Math.round(minutes)); return safe >= 60 ? `${Math.floor(safe / 60)} giờ ${safe % 60 ? `${safe % 60} phút` : ""}`.trim() : `${safe} phút`; }
function trendLabel(rhythm: WorkRhythmSummary): string { if (rhythm.trend === "NO_COMPARISON" || rhythm.trendPercent === null) return "Chưa đủ để so"; if (rhythm.trend === "STABLE") return "Gần như ổn định"; return `${rhythm.trend === "UP" ? "Tăng" : "Giảm"} ${Math.abs(rhythm.trendPercent)}%`; }
function workRhythmChart(rhythm: WorkRhythmSummary): string {
  const maximum = Math.max(1, ...rhythm.days.map((day) => day.minutes));
  const bars = rhythm.days.map((day, index) => { const height = day.minutes === 0 ? 2 : Math.max(6, Math.round(day.minutes / maximum * 100)); const showLabel = rhythm.dayCount === 7 || index === 0 || index === rhythm.days.length - 1 || index % 5 === 0; return `<span class="rhythm-day" tabindex="0" role="img" aria-label="${escapeHtml(day.label)}: ${day.minutes} phút, ${day.sessionCount} phiên"><i style="--bar-height:${height}%"></i><small>${showLabel ? escapeHtml(day.label) : ""}</small><title>${escapeHtml(day.label)} · ${day.minutes} phút · ${day.sessionCount} phiên</title></span>`; }).join("");
  return `<div class="work-rhythm-chart ${rhythm.dayCount === 30 ? "is-month" : ""}" style="--rhythm-days:${rhythm.dayCount}" role="group" aria-label="Biểu đồ thời gian làm việc ${rhythm.dayCount} ngày">${bars}</div>`;
}

async function renderReports(): Promise<void> {
  const [runtime, reports, surveyReports, summaries] = await withOperationTimeout(Promise.all([getRuntimeInfoCached(), window.eyeMate.listM3Reports(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries()]));
  const demoSnapshot = runtime.dataMode === "SYNTHETIC_DEMO" ? createPersonalDemoSnapshot() : null;
  const visibleReports = demoSnapshot?.reports ?? reports;
  const visibleSurveyReports = demoSnapshot?.checkups ?? surveyReports;
  const visibleSummaries = demoSnapshot?.sessionSummaries ?? summaries;
  const latest = visibleReports.at(-1);
  const tabs: readonly [ReportTab, string][] = [["overview", "Tổng quan"], ["week", "7 ngày"], ["month", "30 ngày"], ["history", "Lịch sử"]];
  const updateAction = demoSnapshot ? `<button class="btn" type="button" disabled title="Dữ liệu mẫu được cố định cho phiên demo">Dữ liệu mẫu cố định</button>` : `<button class="btn btn-primary" id="report-generate" type="button">Cập nhật báo cáo</button>`;
  setView(`${pageHeading("Reports", "Nhìn lại mà không phán xét", "Daily summary, checkup history và bản tóm tắt local có provenance.", updateAction)}
    ${demoSnapshot ? personalDemoBanner() : ""}
    <div class="tabs" role="tablist" aria-label="Khoảng thời gian báo cáo">${tabs.map(([id, label]) => `<button class="tab ${reportTab === id ? "active" : ""}" data-report-tab="${id}" role="tab" aria-selected="${reportTab === id}" type="button">${label}</button>`).join("")}</div>
    <div id="report-content">${reportContent(reportTab, latest, visibleSurveyReports, visibleSummaries, demoSnapshot !== null)}</div>`);
  document.querySelector("#report-export-json")?.insertAdjacentHTML("afterend", `<button class="btn" id="report-export-pdf" type="button" ${demoSnapshot ? "disabled title=\"Demo không xuất file để tránh nhầm với báo cáo cá nhân\"" : ""}>Preview PDF</button>`);
  document.querySelector<HTMLButtonElement>("#report-generate")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.generateM3Report(), "Báo cáo local đã được cập nhật."); if (result) await renderReports(); });
  for (const tab of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-report-tab]"))) tab.addEventListener("click", () => { reportTab = tab.dataset.reportTab as ReportTab; void renderReports(); });
  document.querySelector<HTMLButtonElement>("#report-preview")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "MARKDOWN"));
  document.querySelector<HTMLButtonElement>("#report-export-json")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "JSON"));
  document.querySelector<HTMLButtonElement>("#report-export-pdf")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, "PDF"));
  document.querySelector("#report-delete")?.addEventListener("click", showDeleteReportsDialog);
}

function reportContent(tab: ReportTab, report: PersonalReport | undefined, surveys: readonly StoredCheckupListItem[], summaries: readonly StoredSessionSummaryListItem[], demoMode = false): string {
  if (tab === "month") {
    const rhythm = buildWorkRhythm(summaries, 30);
    return rhythm.completedSessions > 0 ? `<section class="card intelligence-chart-panel"><div class="intelligence-section-heading"><div><p class="label">Thời gian phiên đã ghi nhận</p><h2>30 ngày gần nhất</h2></div><span>${rhythm.activeDays} ngày có dữ liệu</span></div>${workRhythmChart(rhythm)}<p class="subtle">Ngày trống là chưa có phiên EyeMate, không được hiểu thành 0 giờ làm việc. ${demoMode ? "Toàn bộ cột đang hiển thị là dữ liệu synthetic." : ""}</p></section>` : `<section class="card empty-state"><div><div class="empty-icon" aria-hidden="true">30</div><h2>Chưa đủ dữ liệu 30 ngày</h2><p class="subtle">EyeMate không nội suy dữ liệu còn thiếu.</p><a class="btn btn-primary" href="#/companion">Bắt đầu một phiên</a></div></section>`;
  }
  if (tab === "history") { const rows = [...surveys.map((item) => ({ title: `Checkup · ${humanLabel(item.status)}`, note: humanLabel(item.action), date: item.createdAt })), ...summaries.map((item) => ({ title: `Work session · ${humanLabel(item.status)}`, note: formatDuration(item.elapsedActiveMs), date: item.createdAt }))].sort((a,b) => b.date.localeCompare(a.date)); return rows.length ? `<div class="grid">${rows.map((item) => `<article class="card"><span class="label">${safeDate(item.date)}</span><h3>${item.title}</h3><p class="subtle">${item.note}</p></article>`).join("")}</div>` : emptyReport(); }
  if (!report) return emptyReport();
  if (tab === "week") return `<div class="grid grid-2"><article class="card"><p class="label">Weekly digest</p><strong class="metric-value">${report.weekly.daysWithData}/7 ngày</strong><p class="subtle">${report.weekly.missingDays} ngày chưa có dữ liệu. EyeMate không gắn nhãn “tốt/xấu” khi evidence chưa đủ.</p></article><article class="card"><p class="label">Nhịp làm việc</p>${heatmap(report.weekly.daysWithData)}</article></div>`;
  const latestSurvey = surveys[0];
  const demoDisabled = demoMode ? `disabled title="Demo không thao tác trên dữ liệu hoặc file cá nhân"` : "";
  const primaryMetric = demoMode ? `<p class="label">Tổng quan 7 ngày · dữ liệu mẫu</p><strong class="metric-value">${formatMinutesHuman(report.weekly.totalSessionMinutes)}</strong><p class="subtle">${report.weekly.daysWithData}/7 ngày có phiên · 6 lời nhắc nghỉ đã phản hồi.</p>${demoReportTrendChart()}` : `<p class="label">Daily summary · ${escapeHtml(report.daily.localDate)}</p><strong class="metric-value">${report.daily.totalSessionMinutes} phút</strong><p class="subtle">Phiên dài nhất ${report.daily.longestSessionMinutes} phút · nguồn ${humanLabel(report.dataSource)}.</p>${lineChart(report.daily.vli.score)}`;
  const checkupMetric = latestSurvey ? demoMode ? `<div class="report-demo-checkup"><div><span>Nhịp chớp mắt</span><strong>${latestSurvey.blinkRatePerMinute ?? "—"}/phút</strong></div><div><span>Khoảng cách nhìn</span><strong>${latestSurvey.distanceZone === "COMFORT" ? "Phù hợp" : "Chưa rõ"}</strong></div></div><p class="subtle">96% frame synthetic đủ chất lượng · không phải phép đo người thật.</p>` : `<h2>${humanLabel(latestSurvey.status)}</h2><p class="subtle">${humanLabel(latestSurvey.action)} · ${safeDate(latestSurvey.createdAt)}</p>` : `<h2>Chưa có checkup</h2><p class="subtle">Camera-off survey vẫn khả dụng.</p>`;
  return `<div class="grid grid-2 report-overview-grid"><article class="card report-primary-metric">${primaryMetric}</article><article class="card"><p class="label">Checkup gần nhất</p>${checkupMetric}<a class="text-link" href="#/checkup">Mở checkup</a></article><article class="card"><p class="label">Coverage & missing data</p><h2>${report.weekly.daysWithData} ngày có dữ liệu</h2><p class="subtle">Thiếu: ${report.missingData.map(humanLabel).join(", ") || "không có"}. Không nội suy ngày thiếu.</p><a class="text-link" href="#/intelligence">Xem baseline và pattern</a></article><article class="card"><p class="label">Professional Summary</p><p class="subtle">${demoMode ? "Các nút xuất bị khóa vì đây là snapshot synthetic dùng để trình bày." : "Preview trước khi chọn destination. EyeMate không tự gửi file."}</p><div class="actions"><button class="btn btn-primary" id="report-preview" type="button" ${demoDisabled}>Preview Markdown</button><button class="btn" id="report-export-json" type="button" ${demoDisabled}>Preview JSON</button><button class="btn btn-danger" id="report-delete" type="button" ${demoDisabled}>Xóa report snapshots</button></div></article></div>`;
}

function demoReportTrendChart(): string {
  const values = [38, 32, 44, 36, 48, 31, 26];
  const labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const points = values.map((value, index) => `${24 + index * 72},${150 - value * 2}`).join(" ");
  return `<figure class="report-demo-trend" aria-label="Xu hướng thời lượng phiên synthetic trong 7 ngày"><svg viewBox="0 0 480 170" role="img"><path class="chart-grid" d="M24 42H456M24 92H456M24 142H456"></path><polygon class="report-demo-area" points="24,154 ${points} 456,154"></polygon><polyline class="report-demo-line" points="${points}"></polyline>${values.map((value, index) => `<circle cx="${24 + index * 72}" cy="${150 - value * 2}" r="4"><title>${labels[index]}: ${value} phút</title></circle>`).join("")}</svg><figcaption>${labels.map((label, index) => `<span><b>${label}</b><small>${values[index]} phút</small></span>`).join("")}</figcaption></figure>`;
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
    <section class="inventory-section"><p class="label">Dữ liệu đang lưu</p><div class="grid grid-4">${inventory.map(inventoryCard).join("")}</div><p class="subtle">Các con số là số thực thể người dùng nhìn thấy: một phiên chỉ được đếm một lần, không cộng lại Session Summary hoặc aggregate kỹ thuật đi kèm. Sensitive payload được mã hóa local bằng AES-256-GCM; khóa được Windows bảo vệ.</p></section>
    <section class="card data-actions"><p class="label">Quản lý dữ liệu</p><div class="actions"><button class="btn" id="privacy-export" type="button">Preview & export</button><select class="field" id="privacy-export-format" aria-label="Định dạng export"><option value="MARKDOWN">Markdown</option><option value="JSON">JSON</option></select><button class="btn" id="privacy-reset-baseline" type="button">Reset baseline</button><button class="btn" id="privacy-reset-calibration" type="button">Reset calibration</button><button class="btn btn-danger" id="privacy-delete" type="button">Xóa toàn bộ dữ liệu</button></div><p class="subtle section-note">File export bên ngoài ứng dụng không được xóa tự động. Reset và delete là các action độc lập.</p></section>`);
  const pdfOption = document.createElement("option"); pdfOption.value = "PDF"; pdfOption.textContent = "PDF"; document.querySelector<HTMLSelectElement>("#privacy-export-format")?.append(pdfOption);
  document.querySelector<HTMLButtonElement>("#camera-consent-toggle")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.withdrawCameraConsent()); if (result !== null) { showToast("Consent camera đã được rút. History cũ chưa bị xóa."); await renderPrivacy(); } });
  document.querySelector<HTMLButtonElement>("#privacy-export")?.addEventListener("click", (event) => void openExportPreview(event.currentTarget as HTMLButtonElement, (document.querySelector<HTMLSelectElement>("#privacy-export-format")?.value ?? "MARKDOWN") as LocalExportFormat));
  document.querySelector("#privacy-reset-baseline")?.addEventListener("click", showResetBaselineDialog);
  document.querySelector("#privacy-reset-calibration")?.addEventListener("click", showResetCalibrationDialog);
  document.querySelector("#privacy-delete")?.addEventListener("click", showDeleteStepOne);
}

function inventoryCard(item: DataInventoryItem): string {
  const units: Readonly<Record<DataInventoryItem["category"], string>> = { CHECKUP: "lần checkup", SESSION: "phiên", NUDGE: "lời nhắc", REPORT: "ngày có report", PREFERENCE: "bộ cài đặt", CALIBRATION: "profile" };
  return `<article class="card inventory-card"><span class="label">${humanLabel(item.category)}</span><strong class="metric-value">${item.recordCount}</strong><span>${units[item.category]}</span><p class="subtle">${escapeHtml(item.purpose)}<br>Local · đến khi bạn xóa</p></article>`;
}

function showDeleteStepOne(): void { showModal("Xóa toàn bộ dữ liệu cục bộ?", "<p class=\"subtle\">Hành động này xóa onboarding, consent, session, report và aggregate do EyeMate quản lý. File export ngoài ứng dụng không bị xóa.</p><p class=\"callout warning\">Bước 1/2 · Không thể hoàn tác trong ứng dụng.</p>", "<button class=\"btn btn-danger\" id=\"delete-next\" type=\"button\">Tôi hiểu, tiếp tục</button>"); document.querySelector("#delete-next")?.addEventListener("click", showDeleteStepTwo); }
function showDeleteStepTwo(): void { showModal("Xác nhận lần cuối", "<p class=\"subtle\">Chọn “Xóa dữ liệu” để thực hiện ngay trên storage cục bộ.</p><p class=\"callout error\">Bước 2/2 · EyeMate sẽ báo kết quả thật.</p>", "<button class=\"btn btn-danger\" id=\"delete-confirm\" type=\"button\">Xóa dữ liệu</button>"); document.querySelector<HTMLButtonElement>("#delete-confirm")?.addEventListener("click", async (event) => { const result = await runMutation(event.currentTarget as HTMLButtonElement, window.eyeMate.deleteAllLocalData()); if (!result) return; closeModal(); showToast(`Kết quả xóa: ${result}.`, result === "DELETED" ? "default" : "warning"); await renderPrivacy(); }); }

async function renderSettings(): Promise<void> {
  const [preferences, runtime, calibration] = await withOperationTimeout(Promise.all([window.eyeMate.getUserPreferences(), window.eyeMate.getRuntimeInfo(), window.eyeMate.getCameraCalibration()]));
  currentPreferences = preferences;
  applyPreferences(preferences);
  setView(`${pageHeading("Settings", "Điều chỉnh theo nhịp của bạn", "Mọi preference được tự lưu vào SQLite cục bộ sau 500ms.")}
    <div class="grid grid-2"><section class="card setting-group"><p class="label">Appearance & accessibility</p><div class="setting-row"><div><strong>Giao diện</strong><small>Clarity Grid light đang là giao diện production</small></div><span class="status-pill">Clarity light</span></div><div class="setting-row"><div><label>Giảm chuyển động</label><small>Tắt reveal, ripple và chuyển động không thiết yếu</small></div><button class="toggle" id="reduced-motion-toggle" type="button" aria-label="Bật giảm chuyển động" aria-pressed="${preferences.reducedMotion}"></button></div></section>
    <section class="card setting-group"><p class="label">Notifications</p><div class="setting-row"><div><label>Break reminder</label><small>Nối trực tiếp vào nudge policy</small></div><button class="toggle" id="break-reminder-toggle" type="button" aria-label="Bật nhắc nghỉ" aria-pressed="${preferences.breakReminderEnabled}"></button></div><div class="setting-row"><div><label>Âm thanh nudge</label><small>Âm báo ngắn được tạo cục bộ; tắt mặc định</small></div><button class="toggle" id="sound-toggle" type="button" aria-label="Bật âm thanh nudge" aria-pressed="${preferences.soundEnabled}"></button></div></section>
    <section class="card setting-group"><p class="label">Quiet hours</p><div class="setting-row"><div><label>Không làm phiền</label><small>Nudge không khẩn sẽ bị policy abstain</small></div><button class="toggle" id="quiet-toggle" type="button" aria-label="Bật quiet hours" aria-pressed="${preferences.quietHoursEnabled}"></button></div><div class="setting-row"><label for="quiet-start">Bắt đầu</label><input class="field" id="quiet-start" type="time" value="${minutesToTime(preferences.quietStartMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div><div class="setting-row"><label for="quiet-end">Kết thúc</label><input class="field" id="quiet-end" type="time" value="${minutesToTime(preferences.quietEndMinute)}" ${preferences.quietHoursEnabled ? "" : "disabled"}></div></section>
    <section class="card setting-group"><p class="label">Work session</p><div class="setting-row"><div><strong>Mode mặc định</strong><small>Chọn trực tiếp tại màn hình Đồng hành</small></div><a class="text-link" href="#/companion">${escapeHtml(companionProfile(preferences.defaultMode, preferences).label)}</a></div><div class="callout success">Mọi mode Work Companion hoạt động không cần camera.</div></section>
    <section class="card setting-group" id="settings-camera-calibration"><p class="label">Hiệu chỉnh camera</p><div class="setting-row"><div><strong>${calibration === null ? "Chưa hiệu chỉnh" : `Đã hiệu chỉnh · ${humanLabel(calibration.confidence)}`}</strong><small>${calibration === null ? "Profile gắn với camera giúp phân loại zone; không xuất centimet." : `${calibration.validSampleCount} mẫu hợp lệ · ${safeDate(calibration.profile.calibratedAt)}`}</small></div><span class="status-pill ${calibration === null ? "warning" : ""}">${calibration === null ? "UNKNOWN" : "LOCAL"}</span></div><div class="actions"><button class="btn btn-primary" id="settings-calibrate-camera" type="button">${calibration === null ? "Hiệu chỉnh camera" : "Hiệu chỉnh lại"}</button>${calibration === null ? "" : `<button class="btn" id="settings-reset-calibration" type="button">Reset</button>`}</div><p class="subtle">Camera chỉ mở sau hành động này và consent rõ ràng. Raw frame/landmark không được lưu; chỉ aggregate profile được mã hóa cục bộ.</p></section>
    <section class="card setting-group"><p class="label">Data & reset</p><div class="setting-row"><div><strong>Retention</strong><small>Giữ local đến khi người dùng xóa; D-013 chưa final</small></div><span class="status-pill">Đến khi tôi xóa</span></div><div class="actions"><button class="btn" id="settings-reset-baseline" type="button">Reset baseline</button><a class="btn btn-danger" href="#/privacy">Quản lý/xóa dữ liệu</a></div></section>
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
  return { defaultMode: currentPreferences?.defaultMode ?? "TIMER_ONLY", customWorkDurationMinutes: currentPreferences?.customWorkDurationMinutes ?? 30, customBreakDurationMinutes: currentPreferences?.customBreakDurationMinutes ?? 5, customReminderAtMinutes: currentPreferences?.customReminderAtMinutes ?? 25, soundEnabled: document.querySelector("#sound-toggle")?.getAttribute("aria-pressed") === "true", breakReminderEnabled: document.querySelector("#break-reminder-toggle")?.getAttribute("aria-pressed") === "true", quietHoursEnabled: document.querySelector("#quiet-toggle")?.getAttribute("aria-pressed") === "true", quietStartMinute: timeToMinutes(document.querySelector<HTMLInputElement>("#quiet-start")?.value ?? "22:00"), quietEndMinute: timeToMinutes(document.querySelector<HTMLInputElement>("#quiet-end")?.value ?? "07:00"), reducedMotion: document.querySelector("#reduced-motion-toggle")?.getAttribute("aria-pressed") === "true" };
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
  document.querySelector(".aurora-wordmark")?.addEventListener("click", () => { designLabDestination = "Hôm nay"; designLabMascotState = "WELCOME"; renderDesignLab(); });
  document.querySelector(".aurora-link")?.addEventListener("click", () => { designLabDestination = "Đồng hành"; designLabMascotState = "FOCUS"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-aurora-destination]"))) button.addEventListener("click", () => { designLabDestination = button.dataset.auroraDestination ?? "Hôm nay"; designLabMascotState = designLabDestination === "Đồng hành" ? "FOCUS" : "WELCOME"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-aurora-utility]"))) button.addEventListener("click", () => { designLabMascotState = button.dataset.auroraUtility === "PRIVACY" ? "PRIVACY" : "IDLE"; renderDesignLab(); });
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>("[data-lumi-state]"))) button.addEventListener("click", () => { designLabMascotState = button.dataset.lumiState ?? "IDLE"; renderDesignLab(); });
  document.querySelector<HTMLInputElement>("#aurora-reduced-motion")?.addEventListener("change", (event) => { designLabReducedMotion = (event.currentTarget as HTMLInputElement).checked; renderDesignLab(); });
}

async function renderHomePremium(): Promise<void> {
  const [runtime, reports, summaries, m3Reports, session, privacy, preferences] = await withOperationTimeout(Promise.all([
    getRuntimeInfoCached(), window.eyeMate.listSurveyOnlyReports(), window.eyeMate.listSessionSummaries(), window.eyeMate.listM3Reports(), window.eyeMate.getWorkSession(), window.eyeMate.getPrivacySummary(), window.eyeMate.getUserPreferences()
  ]));
  const demoSnapshot = runtime.dataMode === "SYNTHETIC_DEMO" ? createPersonalDemoSnapshot() : null;
  const visibleReports = demoSnapshot?.checkups ?? reports;
  const visibleSummaries = demoSnapshot?.sessionSummaries ?? summaries;
  const visibleM3Reports = demoSnapshot?.reports ?? m3Reports;
  const homeProfile = companionProfile(session?.modeId ?? preferences.defaultMode, preferences);
  const latest = visibleM3Reports.at(-1);
  const completedSummaries = visibleSummaries.filter((summary) => summary.status === "COMPLETED");
  const sessionCount = completedSummaries.length;
  const todaySummary = completedSummaries.find((summary) => {
    const createdAt = new Date(summary.createdAt);
    const today = new Date();
    return !Number.isNaN(createdAt.valueOf()) && createdAt.getFullYear() === today.getFullYear() && createdAt.getMonth() === today.getMonth() && createdAt.getDate() === today.getDate();
  });
  const sessionElapsedMs = session?.state === "ACTIVE" ? session.elapsedActiveMs : todaySummary?.elapsedActiveMs ?? null;
  const visibleCheckupResult = demoSnapshot ? null : checkupResult;
  const blinkMetric = visibleCheckupResult ? latestCheckupBlinkMetric(visibleCheckupResult) : storedCheckupBlinkMetric(visibleReports[0]);
  const distanceMetric = visibleCheckupResult ? latestCheckupDistanceMetric(visibleCheckupResult) : storedCheckupDistanceMetric(visibleReports[0]);
  const currentCameraEvidence = visibleCheckupResult?.cameraEvidence;
  const blinkCoverage = currentCameraEvidence && currentCameraEvidence.status !== "NOT_MEASURED" && currentCameraEvidence.blinkRatePerMinute !== null ? currentCameraEvidence.validSampleRatio * 100 : visibleReports[0]?.blinkRatePerMinute !== null && visibleReports[0]?.blinkRatePerMinute !== undefined ? (visibleReports[0].validSampleRatio ?? 0) * 100 : null;
  const distanceCoverage = currentCameraEvidence && currentCameraEvidence.status !== "NOT_MEASURED" && currentCameraEvidence.distanceZone !== "UNKNOWN" ? currentCameraEvidence.validSampleRatio * 100 : visibleReports[0]?.distanceZone && visibleReports[0].distanceZone !== "UNKNOWN" ? (visibleReports[0].validSampleRatio ?? 0) * 100 : null;
  const evidenceItems: readonly HomeEvidenceItem[] = [
    { id: "session", label: "Phiên", coverage: sessionCount > 0 || session?.state === "ACTIVE" ? 100 : null, detail: sessionCount > 0 ? `${sessionCount} phiên hoàn tất đã lưu.` : session?.state === "ACTIVE" ? `Phiên ${homeProfile.label} đang hoạt động.` : "Chưa có phiên hoàn tất." },
    { id: "checkup", label: "Checkup", coverage: visibleReports.length > 0 ? 100 : null, detail: visibleReports.length > 0 ? `${visibleReports.length} checkup tự báo cáo đã lưu.` : "Chưa có checkup tự báo cáo." },
    { id: "blink", label: "Blink", coverage: blinkCoverage, detail: blinkCoverage === null ? "Không suy đoán khi chưa có measurement hợp lệ." : `Checkup gần nhất có ${Math.round(blinkCoverage)}% frame hợp lệ.` },
    { id: "distance", label: "Khoảng cách", coverage: distanceCoverage, detail: distanceCoverage === null ? "Chưa có distance zone hợp lệ." : `Checkup gần nhất có distance zone và ${Math.round(distanceCoverage)}% frame hợp lệ.` },
    { id: "vli", label: "Tải", coverage: latest?.daily.vli.status === "AVAILABLE" ? Math.round(latest.daily.vli.dataConfidence * 100) : null, detail: latest?.daily.vli.status === "AVAILABLE" ? `Tải thị giác tổng hợp có ${Math.round(latest.daily.vli.dataConfidence * 100)}% thành phần dữ liệu.` : "Chưa đủ thành phần để tổng hợp tải thị giác." }
  ];
  const homeRhythm = buildWorkRhythm(completedSummaries, 7);
  const availableEvidenceCount = evidenceItems.filter((item) => item.coverage !== null).length;
  const evidenceNote = `${availableEvidenceCount}/5 nhóm có dữ liệu trực tiếp. ${homeRhythm.activeDays}/7 ngày gần nhất có phiên hoàn tất.`;
  const weeklyValue = `${homeRhythm.activeDays}/7 ngày`;
  const weeklyNote = `${formatMinutesHuman(homeRhythm.totalMinutes)} trong ${homeRhythm.completedSessions} phiên hoàn tất.`;
  const vli = latest?.daily.vli;
  const wellnessScore = vli?.status === "AVAILABLE" && vli.score !== null && vli.dataConfidence >= 0.6 ? 100 - vli.score : null;
  const wellnessLabel = wellnessScore === null ? "Chưa đủ dữ liệu" : wellnessScore >= 76 ? "Nhịp hỗ trợ tốt" : wellnessScore >= 58 ? "Nên cân bằng hơn" : "Ưu tiên nghỉ";
  const wellnessNote = wellnessScore === null ? "Cần ít nhất 60% thành phần dữ liệu để hiển thị điểm nhịp chăm sóc; dữ liệu thiếu không được tính như trạng thái tốt." : wellnessScore >= 76 ? "Các tín hiệu đã ghi nhận cho thấy nhịp nghỉ và phiên làm việc đang được duy trì khá đều." : "Giảm phiên liên tục và thêm khoảng nghỉ ngắn trước khi tiếp tục.";
  const trendPoints = homeRhythm.days.map((day) => day.minutes);
  const trendLabels = homeRhythm.days.map((day) => day.label);
  const sessionValue = sessionElapsedMs === null ? "Chưa có" : formatDuration(sessionElapsedMs);
  const companionDurationLabel = session?.state === "ACTIVE" ? sessionValue : "30:00 phút";
  const visibleWorkMetrics = homeWorkMetrics(homeRhythm, completedSummaries);

  setView(`<section class="clarity-home premium-home" aria-label="Tổng quan Hôm nay">
    <header class="home-hero page-heading">
      <div class="home-hero-copy"><span class="home-spark">${homeSparkIcon()}</span><div><p class="eyebrow">Hôm nay</p><h1>Chào bạn, mình bắt đầu nhẹ nhàng nhé.</h1><p>EyeMate ở đây để đồng hành cùng đôi mắt của bạn mỗi ngày.</p></div></div>
      ${productionHomeArtwork()}
    </header>
    ${demoSnapshot ? personalDemoBanner() : ""}
    <div class="clarity-home-grid">
      <article class="card clarity-overview-panel">
        <div class="clarity-panel-heading"><div><span class="clarity-section-mark"></span><p>Tổng quan hôm nay</p></div><small>LOCAL EVIDENCE</small></div>
        <div class="home-overview-layout">
          <div class="clarity-session-ring home-score-ring" style="--score-angle:${Math.round((wellnessScore ?? 0) * 3.6)}deg" role="img" aria-label="${wellnessScore === null ? "Chưa đủ dữ liệu để tính điểm nhịp chăm sóc mắt" : `Điểm nhịp chăm sóc mắt ${Math.round(wellnessScore)} trên 100`}"><div class="home-eye-mark" aria-hidden="true">${metricIcon("blink")}</div></div>
          <div class="home-score-copy"><span>Điểm nhịp chăm sóc mắt</span><strong>${wellnessScore === null ? "—" : Math.round(wellnessScore)}</strong><small>${wellnessScore === null ? "" : "/100"}</small><b>${escapeHtml(wellnessLabel)}</b><p>${escapeHtml(wellnessNote)}</p></div>
          ${homeTrendSparkline(trendPoints, trendLabels, "Thời lượng phiên EyeMate trong 7 ngày")}
        </div>
        <div class="home-stat-strip">
          <div><span>${metricIcon("load")}</span><p>Thời gian phiên</p><strong>${visibleWorkMetrics.screenValue}</strong><small>${visibleWorkMetrics.screenNote}</small></div>
          <div><span>${metricIcon("blink")}</span><p>Số lần nghỉ mắt</p><strong>${visibleWorkMetrics.breakValue}</strong><small>${visibleWorkMetrics.breakNote}</small></div>
          <div><span>${metricIcon("distance")}</span><p>Phiên theo dõi</p><strong>${visibleWorkMetrics.sessionValue}</strong><small>${visibleWorkMetrics.sessionNote}</small></div>
        </div>
        <p class="home-vli-note">Tải thị giác: ${latest?.daily.vli.status === "AVAILABLE" ? `đã tổng hợp với ${Math.round(latest.daily.vli.dataConfidence * 100)}% thành phần dữ liệu.` : "chưa đủ dữ liệu để tổng hợp thành điểm."}</p>
        <div class="actions clarity-quick-actions home-primary-actions" aria-label="Hành động nhanh"><a class="btn btn-primary" href="#/companion">${session?.state === "ACTIVE" ? "Tiếp tục phiên" : "Bắt đầu phiên"}</a><a class="btn" href="#/checkup">Khám mắt</a><a class="text-link" href="#/reports">Xem báo cáo</a><a class="text-link" href="#/privacy">Privacy Center</a></div>
        <div class="home-evidence-compact">${productionEvidenceTrace(evidenceItems, evidenceNote)}</div>
      </article>
      <article class="clarity-focus-card">
        <div class="clarity-panel-heading"><div><span class="home-eyebrow-icon">${homePeopleIcon()}</span><p>Đồng hành cùng bạn</p></div></div>
        <div class="home-companion-copy"><p>Phiên đồng hành thư giãn</p><strong>${companionDurationLabel}</strong><span class="home-companion-description">Kết hợp nhắc nghỉ mắt và âm thanh thư giãn</span><span class="home-local-annotation">${metricIcon("load")} Không ghi hình · Chạy cục bộ</span><div class="home-companion-actions"><a class="home-start-button" href="#/companion"><b aria-hidden="true">▶</b>${session?.state === "ACTIVE" ? "Tiếp tục" : "Bắt đầu ngay"}</a><a class="home-settings-button" href="#/settings" aria-label="Tùy chỉnh phiên đồng hành">${homeSettingsIcon()}</a></div></div>
        ${homeMeditationIllustration()}
      </article>
      ${premiumMetricCard("blink", "Nhịp chớp mắt", blinkMetric.value, blinkMetric.note, blinkMetric.progress)}
      ${premiumMetricCard("distance", "Khoảng cách nhìn", distanceMetric.value, distanceMetric.note, distanceMetric.progress)}
      <article class="card home-habit-panel"><div><span class="clarity-section-mark"></span><p>Thói quen liên tục</p></div><strong>${homeRhythm.activeDays}</strong><span>ngày trong 7 ngày gần nhất</span>${homeHabitDays(homeRhythm)}</article>
      <article class="card home-evidence-panel"><div><span class="clarity-section-mark"></span><p>Bằng chứng 7 ngày qua</p></div>${homeEvidenceBarsFromRhythm(homeRhythm, completedSummaries)}${homeEvidenceLegend()}</article>
      <article class="card clarity-next-panel"><div><span class="clarity-section-mark"></span><p>Việc nên làm tiếp theo</p></div><h2>Nghỉ mắt 20-20-20</h2><p class="subtle">Cứ mỗi 20 phút, nhìn xa khoảng 20 feet trong 20 giây để thư giãn mắt.</p><div class="actions"><a class="btn btn-primary" href="#/companion">Nhắc tôi sau 20 phút</a><a class="btn" href="#/reports">Xem thêm</a></div>${homeNextActionClock()}</article>
      <article class="card clarity-week-panel"><span class="label">Đang hoạt động cục bộ</span><strong>${weeklyValue}</strong><span>${weeklyNote}</span><a class="text-link" href="#/reports">Đối chiếu báo cáo</a></article>
    </div>
  </section>`);
  void runtime;
  void privacy;
}

function premiumMetricCard(kind: "blink" | "distance" | "load", label: string, value: string, note: string, progress: number | null, tone: "default" | "accent" = "default"): string {
  return `<article class="card metric-card clarity-metric-panel clarity-metric-${kind} ${tone === "accent" ? "accent" : ""}"><div class="clarity-metric-heading"><span class="clarity-metric-icon ${progress === null ? "is-missing" : "is-available"}" aria-hidden="true">${metricIcon(kind)}</span><span class="label">${label}</span><span class="trend ${progress === null ? "unknown" : ""}">${progress === null ? "Chưa đo" : "Local"}</span></div><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span>${homeMetricBars(progress)}<div class="metric-progress ${progress === null ? "is-missing" : ""}" aria-hidden="true"><span style="--progress:${progress === null ? 0 : Math.max(0, Math.min(100, progress))}%"></span></div></article>`;
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
  const productionRoute = route !== "design-lab" && route !== "taste-design-lab" && route !== "enterprise-demo";
  document.body.classList.toggle("production-clarity-active", productionRoute);
  document.body.dataset.route = route;
  document.body.classList.toggle("design-lab-active", route === "design-lab");
  document.body.classList.toggle("taste-design-lab-active", route === "taste-design-lab");
  document.body.classList.toggle("enterprise-demo-active", route === "enterprise-demo");
  if (productionRoute) applyRuntimePresentation(await getRuntimeInfoCached());
  if (route !== "checkup" && cameraRuntime.active) await stopCameraFlow();
  skeletonPage(route);
  try {
    if (route === "enterprise-demo") renderEnterpriseDemo(setView);
    else if (route === "design-lab") renderDesignLab();
    else if (route === "taste-design-lab") renderTasteDesignLab();
    else if (route === "home") await renderHomePremium();
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
const bootsEnterpriseDemo = routeFromHash() === "enterprise-demo";
if (!bootsEnterpriseDemo) {
  bindProductionShell();
  void window.eyeMate.getUserPreferences().then(applyPreferences).catch(() => { /* Route error UI handles unavailable storage. */ });
  startCompanionMonitor();
  void getRuntimeInfoCached().then(async (runtime) => { applyRuntimePresentation(runtime); if (!runtime.developerPanelEnabled) return; cameraCalibration = await window.eyeMate.getCameraCalibration().then((record) => record?.profile ?? null).catch(() => null); devPanel.enable(); }).catch(() => { /* Production remains without developer controls. */ });
}
void renderRoute();
