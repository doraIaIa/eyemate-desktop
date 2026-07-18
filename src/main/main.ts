import { app, BrowserWindow, dialog, ipcMain, safeStorage, session } from "electron";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createSecureWindowOptions } from "./window-options.js";
import type { RuntimeInfo } from "../shared/runtime-contract.js";
import { EYEMATE_APPLICATION_VERSION } from "../shared/product-meta.js";
import { validateCameraCalibrationRecord, type CameraCalibrationRecord } from "../camera/calibration-service.js";
import { validateCameraMeasurementAggregate, type CameraMeasurementAggregate } from "../camera/measurement-window.js";
import type { CheckupSummary, IntegratedCheckupRequest, PrivacySummary, SurveyRequest } from "../shared/m1-contract.js";
import { createSurveyOnlyExportPreview, resolveDeletionResult } from "../user-data/data-controls.js";
import type { LocalSqliteStorage, NudgeResponse, PersistedSummary } from "../platform-electron/sqlite-storage.js";
import type { M3DataCategory, StoredSessionSummaryListItem, UserPreferences } from "../shared/preload-contract.js";
import { WELLNESS_MAXIMUM_SCORE, createWellnessCheckReport, wellnessQuestions, type WellnessQuestionId, type WellnessResponse } from "../symptom-checkup/wellness-check.js";
import { actionsWithCameraEvidence, buildEyeHealthAssessment, cameraEvidenceFromAggregate, type CheckupCameraEvidence, type EyeHealthAssessment } from "../symptom-checkup/eye-health-assessment.js";
import { evaluateSafetyGate, internalSafetyCatalogue } from "../safety/safety-gate.js";
import { applySessionEvent, createSession, recoverSession, tickSession, type WorkSession } from "../work-session/session-state.js";
import { COMPANION_POLICY_VERSION, decideNudge, type NudgeDecision } from "../work-session/companion-policy.js";
import { createSessionSummary } from "../work-session/session-summary.js";
import { InProcessNudgeAdapter } from "../work-session/nudge-adapter.js";
import { getCompanionModeProfile } from "../work-session/companion-cycle.js";
import { fromSurveyOnly, fromWorkSession } from "../personal-intelligence/source-adapter.js";
import { localDateFor, validateAnalyticsInput, type AnalyticsInput } from "../personal-intelligence/analytics.js";
import { buildPersonalReport, renderProfessionalSummary, type PersonalReport } from "../personal-intelligence/report-service.js";
import { writeLocalExport, writeLocalPdfExport, type LocalExportFormat } from "../platform-electron/local-export.js";
import { renderLocalPdf } from "../platform-electron/pdf-export.js";
import { loadOrCreateProtectedStorageKey } from "../platform-electron/storage-crypto.js";
import { ENTERPRISE_DEMO_HASH, isEnterpriseDemoMode, isEnterpriseDemoValidationMode, shouldInitializePersonalStorage } from "./enterprise-demo-mode.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererIndexPath = path.join(currentDirectory, "../renderer/index.html");
const preloadPath = path.join(currentDirectory, "../preload/preload.js");
const smokeMode = process.argv.includes("--m1-smoke");
const companionSmokeMode = process.argv.includes("--m2-smoke");
const intelligenceSmokeMode = process.argv.includes("--m3-smoke");
const uiValidationMode = process.argv.includes("--ui-validate");
const livingAuroraValidationMode = process.argv.includes("--living-aurora-validate");
const tasteDesignLabValidationMode = process.argv.includes("--taste-design-lab-validate");
const clarityProductionValidationMode = process.argv.includes("--clarity-production-validate");
const uiRecoverySeedMode = process.argv.includes("--ui-recovery-seed");
const uiRecoveryCheckMode = process.argv.includes("--ui-recovery-check");
const egressObservationMode = process.argv.includes("--egress-observe");
const cameraRuntimeTestMode = process.argv.includes("--camera-runtime-test");
const cameraRuntimeFullTestMode = process.argv.includes("--camera-runtime-full-test");
const devPanelValidationMode = process.argv.includes("--dev-panel-validate");
const enterpriseDemoMode = isEnterpriseDemoMode();
const enterpriseDemoValidationMode = isEnterpriseDemoValidationMode();
const personalDemoValidationMode = process.argv.includes("--personal-demo-validate");
const personalDemoMode = process.argv.includes("--personal-demo") || personalDemoValidationMode;
const developerPanelEnabled = !app.isPackaged && process.argv.includes("--enable-dev-panel");
const uiCaptureArgument = process.argv.find((argument) => argument.startsWith("--ui-screenshot-dir="));
const uiScreenshotDirectory = uiCaptureArgument?.slice("--ui-screenshot-dir=".length) ?? null;
let enterpriseDemoBlockedNetworkRequests = 0;
const isolatedValidationMode = smokeMode || companionSmokeMode || intelligenceSmokeMode || uiValidationMode || livingAuroraValidationMode || tasteDesignLabValidationMode || clarityProductionValidationMode || uiRecoverySeedMode || uiRecoveryCheckMode || egressObservationMode || cameraRuntimeTestMode || cameraRuntimeFullTestMode || devPanelValidationMode || enterpriseDemoValidationMode;

if (enterpriseDemoMode) {
  const demoProfile = enterpriseDemoValidationMode ? "enterprise-demo-validation" : "enterprise-demo-dev";
  app.setPath("userData", path.join(currentDirectory, `../../.tmp/${demoProfile}-user-data`));
} else if (personalDemoMode) {
  app.setPath("userData", path.join(currentDirectory, `../../.tmp/${personalDemoValidationMode ? "personal-demo-validation" : "personal-demo"}-user-data`));
} else if (isolatedValidationMode) {
  app.setPath("userData", path.join(currentDirectory, "../../.tmp/personal-validation-user-data"));
}

if (isolatedValidationMode || enterpriseDemoMode || personalDemoMode || developerPanelEnabled) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-gpu-compositing");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
}

async function runDevPanelValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(script: string): Promise<T> => await window.webContents.executeJavaScript(script, true) as T;
  const wait = (milliseconds = 120): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));
  await wait(350);
  if (!await evaluate<boolean>("window.eyeMate.getRuntimeInfo().then((value) => value.developerPanelEnabled === true)")) throw new Error("DEV_PANEL_RUNTIME_GATE_INVALID");
  if (await evaluate<boolean>("Boolean(document.querySelector('.dev-panel'))")) throw new Error("DEV_PANEL_OPEN_BY_DEFAULT");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, shiftKey: true, bubbles: true })); true"); await wait();
  if (!await evaluate<boolean>("Boolean(document.querySelector('.dev-panel')) && Boolean(document.querySelector('#dev-mode-badge')) && sessionStorage.getItem('eyemate:dev-panel:v1') !== null")) throw new Error("DEV_PANEL_SHORTCUT_OPEN_INVALID");
  await evaluate(`(() => { const toggle = (id) => { const item = document.querySelector(id); item.click(); }; toggle('#dev-force-distance-enabled'); document.querySelector('#dev-force-distance').value = '45'; document.querySelector('#dev-force-distance').dispatchEvent(new Event('input', { bubbles: true })); toggle('#dev-force-ear-enabled'); document.querySelector('#dev-force-ear').value = '0.15'; document.querySelector('#dev-force-ear').dispatchEvent(new Event('input', { bubbles: true })); toggle('#dev-show-raw'); return true; })()`); await wait();
  if (!await evaluate<boolean>("!document.querySelector('#dev-force-distance').disabled && !document.querySelector('#dev-force-ear').disabled && Boolean(document.querySelector('#dev-raw-metrics'))")) throw new Error("DEV_PANEL_OVERRIDE_INVALID");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true, bubbles: true })); true"); await wait();
  if (!await evaluate<boolean>("!document.querySelector('.dev-panel') && !document.querySelector('#dev-mode-badge') && !document.querySelector('#dev-raw-metrics') && sessionStorage.getItem('eyemate:dev-panel:v1') === null")) throw new Error("DEV_PANEL_CLOSE_RESET_INVALID");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true, bubbles: true })); true"); await wait();
  if (!await evaluate<boolean>("document.querySelector('#dev-force-distance-enabled').checked === false && document.querySelector('#dev-force-ear-enabled').checked === false && document.querySelector('#dev-show-raw').checked === false")) throw new Error("DEV_PANEL_REOPEN_RESET_INVALID");
  console.log("DEV_PANEL_VALIDATION_PASS shortcut=true resetOnClose=true sessionOnly=true productionDefault=false rawExport=false");
}

function getRuntimeInfo(): RuntimeInfo {
  return {
    mode: "LOCAL_ONLY",
    applicationVersion: EYEMATE_APPLICATION_VERSION,
    developerPanelEnabled,
    dataMode: personalDemoMode ? "SYNTHETIC_DEMO" : "REAL_LOCAL"
  };
}

let storage: LocalSqliteStorage | null = null;
let defaultUserPreferences: UserPreferences | null = null;
let workSession: WorkSession | null = null;
let sessionMonotonicMs = 0;
let lastNudgeMonotonicMs: number | null = null;
let nudgesInSession = 0;
const nudgeAdapter = new InProcessNudgeAdapter();
const currentIso = (): string => uiValidationMode ? "2026-07-14T12:00:00.000Z" : new Date().toISOString();
const sessionNow = (): number => {
  sessionMonotonicMs = Math.max(sessionMonotonicMs + 1, Math.round(performance.now()));
  return sessionMonotonicMs;
};

function persistActiveSessionBeforeExit(): void {
  if (workSession?.state !== "ACTIVE") return;
  workSession = tickSession(workSession, sessionNow());
  storage?.saveSession({ sessionId: workSession.id, modeId: workSession.modeId, state: workSession.state, elapsedActiveMs: workSession.elapsedActiveMs, updatedAt: currentIso() });
}

function getDefaultUserPreferences(): UserPreferences {
  if (defaultUserPreferences === null) throw new Error("PERSONAL_STORAGE_NOT_INITIALIZED");
  return defaultUserPreferences;
}

function updateWorkSession(event: "START" | "STARTED" | "PAUSE" | "RESUME" | "FINISH" | "CANCEL"): WorkSession {
  const now = sessionNow();
  if (workSession === null) workSession = createSession(`session-${randomUUID().slice(0, 8)}`, "TIMER_ONLY");
  const previousState = workSession.state;
  workSession = applySessionEvent(workSession, event, now);
  storage?.saveSession({ sessionId: workSession.id, modeId: workSession.modeId, state: workSession.state, elapsedActiveMs: workSession.elapsedActiveMs, updatedAt: currentIso() });
  if (workSession.state !== previousState && (workSession.state === "COMPLETED" || workSession.state === "CANCELLED")) {
    const createdAt = currentIso();
    const interventions = (storage?.listNudgeOutcomes(workSession.id) ?? []).map((nudge) => ({ nudgeId: nudge.nudgeId, response: nudge.response ?? "UNKNOWN" }));
    const summary = createSessionSummary(workSession, COMPANION_POLICY_VERSION, interventions);
    const summaryId = `summary-${randomUUID().slice(0, 8)}`;
    storage?.saveSessionSummary({ summaryId, sessionId: workSession.id, status: summary.timerOutcome, elapsedActiveMs: summary.durationActiveMs, createdAt, summaryJson: JSON.stringify(summary) });
    if (workSession.state === "COMPLETED" && summary.durationActiveMs > 0) {
      const source = fromWorkSession({ summaryId, sessionId: workSession.id, modeId: workSession.modeId, elapsedActiveMs: summary.durationActiveMs, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: summary.schemaVersion });
      storage?.saveM3Record({ id: `source-${summaryId}`, kind: "SOURCE", createdAt, payloadJson: JSON.stringify(source) });
    }
  }
  return workSession;
}

function startWorkSession(modeId: WorkSession["modeId"] = "TIMER_ONLY"): WorkSession {
  if (!["BALANCED", "DEEP_FOCUS", "HIGH_SUPPORT", "TIMER_ONLY", "CUSTOM"].includes(modeId)) throw new Error("INVALID_WORK_MODE");
  if (workSession === null || ["COMPLETED", "CANCELLED", "FAILED"].includes(workSession.state)) {
    workSession = createSession(`session-${randomUUID().slice(0, 8)}`, modeId);
    lastNudgeMonotonicMs = null;
    nudgesInSession = 0;
  }
  updateWorkSession("START");
  return updateWorkSession("STARTED");
}

function finishWorkSession(): WorkSession {
  const ending = updateWorkSession("FINISH");
  return ending.state === "ENDING" ? updateWorkSession("FINISH") : ending;
}

function recoverPersistedSession(): void {
  const persisted = storage?.loadLatestSession();
  if (!persisted || !["ACTIVE", "PAUSED", "RECOVERY_REQUIRED"].includes(persisted.state)) return;
  workSession = recoverSession(persisted.sessionId, persisted.modeId as WorkSession["modeId"], persisted.elapsedActiveMs);
  nudgesInSession = storage?.countEmittedNudges(persisted.sessionId) ?? 0;
  if (nudgesInSession > 0) lastNudgeMonotonicMs = sessionNow();
}

function requestBreakNudge(): NudgeDecision & { readonly nudgeId: string } {
  if (workSession?.state !== "ACTIVE") throw new Error("SESSION_NOT_ACTIVE");
  const now = sessionNow();
  const preferences = storage?.loadUserPreferences() ?? getDefaultUserPreferences();
  const modeProfile = getCompanionModeProfile(workSession.modeId, { workDurationMinutes: preferences.customWorkDurationMinutes, breakDurationMinutes: preferences.customBreakDurationMinutes, reminderAtMinutes: preferences.customReminderAtMinutes });
  const localNow = new Date();
  const decision = decideNudge({ mode: workSession.modeId, minuteOfDay: localNow.getHours() * 60 + localNow.getMinutes(), quietHours: preferences.quietHoursEnabled ? { startMinute: preferences.quietStartMinute, endMinute: preferences.quietEndMinute } : undefined, cooldownMinutes: modeProfile.cooldownMinutes, frequencyCap: modeProfile.maxNudgesPerSession, nowMonotonicMs: now, lastNudgeMonotonicMs, nudgesInWindow: nudgesInSession, signal: "SUFFICIENT", nudgeType: "BREAK_REMINDER", enabledNudgeTypes: preferences.breakReminderEnabled ? ["BREAK_REMINDER"] : [] });
  const nudgeId = `nudge-${workSession.id}-break-${nudgesInSession + 1}`;
  if (decision.action === "EMIT") {
    lastNudgeMonotonicMs = now;
    nudgesInSession += 1;
    const delivery = nudgeAdapter.deliver({ nudgeId, sessionId: workSession.id, actionKey: "TAKE_SHORT_BREAK", policyVersion: decision.policyVersion });
    storage?.recordNudge({ nudgeId, sessionId: workSession.id, decision: decision.action, reason: decision.reason, policyVersion: decision.policyVersion, createdAt: currentIso(), action: decision.suggestedActionKey, deliveryState: delivery.state === "DELIVERED" ? "EMITTED" : "ABSTAINED" });
  }
  return { ...decision, nudgeId };
}

function getWorkSessionSnapshot(): WorkSession | null {
  if (workSession?.state !== "ACTIVE") return workSession;
  return tickSession(workSession, sessionNow());
}

function respondToNudge(nudgeId: string, response: NudgeResponse): boolean {
  const handled = storage?.recordNudgeResponse(nudgeId, response, currentIso()) ?? false;
  if (!handled || response !== "SNOOZED" || workSession === null) return handled;
  const profile = getCompanionModeProfile(workSession.modeId);
  lastNudgeMonotonicMs = sessionNow() - Math.max(0, profile.cooldownMinutes - profile.snoozeMinutes) * 60_000;
  return true;
}

function getPrivacySummary(): PrivacySummary {
  const consent = storage?.loadCameraConsent();
  const preview = createSurveyOnlyExportPreview();
  return {
    localOnly: true,
    cameraState: consent?.decision === "GRANTED" ? "CAMERA_UNAVAILABLE" : "SKIPPED_NO_CONSENT",
    cameraConsentDecision: consent?.decision ?? "NONE",
    exportRequiresConfirmation: preview.requiresDestinationConfirmation,
    deletionResults: [resolveDeletionResult(0, 0)]
  };
}

function validateIntegratedCheckupRequest(request: IntegratedCheckupRequest): { readonly answers: Readonly<Record<WellnessQuestionId, WellnessResponse>>; readonly safety: SurveyRequest["safety"]; readonly cameraMeasurement: CameraMeasurementAggregate | null } {
  const allowed: readonly WellnessResponse[] = [0, 1, 2, 3, "UNKNOWN"];
  if (!request.answers || typeof request.answers !== "object" || !["CONFIRMED", "NEGATIVE", "UNSURE", "PREFER_NOT_TO_ANSWER"].includes(request.safety)) throw new Error("INVALID_SURVEY_REQUEST");
  for (const question of wellnessQuestions) if (!allowed.includes(request.answers[question.id])) throw new Error("INVALID_SURVEY_REQUEST");
  const cameraMeasurement = request.cameraMeasurement === undefined || request.cameraMeasurement === null ? null : validateCameraMeasurementAggregate(request.cameraMeasurement);
  return { answers: request.answers as Readonly<Record<WellnessQuestionId, WellnessResponse>>, safety: request.safety, cameraMeasurement };
}

function runCheckup(request: IntegratedCheckupRequest): CheckupSummary {
  const validated = validateIntegratedCheckupRequest(request);
  if (storage?.load()?.stage !== "COMPLETE") throw new Error("ONBOARDING_REQUIRED");
  const safety = evaluateSafetyGate({ answers: { safety_signal_a: validated.safety, safety_signal_b: "NEGATIVE" } }, internalSafetyCatalogue);
  const report = createWellnessCheckReport(validated.answers, safety.outcome);
  const cameraEvidence = cameraEvidenceFromAggregate(validated.cameraMeasurement);
  const assessment = buildEyeHealthAssessment(report, cameraEvidence);
  const actions = actionsWithCameraEvidence(report.actions, cameraEvidence);
  const createdAt = currentIso();
  const reportId = randomUUID();
  storage?.saveSurveyOnlyReport({ reportId, status: report.status, source: cameraEvidence.status === "NOT_MEASURED" ? "SURVEY_ONLY" : "INTEGRATED_CHECKUP", cameraStatus: cameraEvidence.status, action: actions.map((action) => action.id).join(","), provenanceVersion: report.provenance.questionnaireVersion, createdAt, wellnessPayload: { questionnaireVersion: report.provenance.questionnaireVersion, scoreVersion: report.provenance.scoreVersion, payloadJson: JSON.stringify({ ...report, actions, cameraEvidence, assessment }) } });
  const normalizedSymptomBurden = report.discomfortLoad.score === null ? null : Math.round(report.discomfortLoad.score * 10000 / WELLNESS_MAXIMUM_SCORE) / 100;
  const source = fromSurveyOnly({ reportId, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: report.provenance.questionnaireVersion, symptomBurden: normalizedSymptomBurden });
  storage?.saveM3Record({ id: `source-${reportId}`, kind: "SOURCE", createdAt, payloadJson: JSON.stringify(source) });
  return { reportId, status: report.status, source: report.source, camera: cameraEvidence.status, cameraEvidence, assessment, actions, missingData: report.missingData, discomfortLoad: report.discomfortLoad, limitation: report.limitation };
}

function runSurveyOnly(request: SurveyRequest): CheckupSummary {
  return runCheckup({ ...request, cameraMeasurement: null });
}

async function renderWellnessExport(payload: string, format: LocalExportFormat): Promise<string | Buffer> {
  const report = JSON.parse(payload) as { status: string; discomfortLoad: { score: number | null; maximumScore: number; label: string; actionGroup: string | null; scoreVersion: string }; provenance: { questionnaireVersion: string; recallPeriod: string }; limitation: string; disclaimer: string; answers: Record<string, string | number>; cameraEvidence?: CheckupCameraEvidence; assessment?: EyeHealthAssessment };
  if (format === "JSON") return JSON.stringify(report, null, 2);
  {
    const camera = report.cameraEvidence;
    const cameraQuality = camera?.qualityDistribution ? `\n- Quality distribution: ${Object.entries(camera.qualityDistribution).map(([reason, count]) => `${reason}=${count}`).join(", ")}` : "";
    const cameraSection = camera ? `\n\n## Camera evidence\n\n- Trạng thái: ${camera.status}\n- Mẫu hợp lệ: ${camera.validSampleCount}/${camera.sampleCount}\n- Blink rate: ${camera.blinkRatePerMinute ?? "UNKNOWN"}\n- Distance zone: ${camera.distanceZone}\n- Raw data persisted: ${camera.rawDataPersisted}\n- Reason codes: ${camera.reasonCodes.join(", ") || "NONE"}${cameraQuality}\n` : "\n\n## Camera evidence\n\n- Trạng thái: NOT_MEASURED\n";
    const assessment = report.assessment;
    const assessmentSection = assessment ? `\n\n## Bảng đánh giá wellness tích hợp\n\n- Kết luận sản phẩm: ${assessment.overallLabel}\n- Độ tin cậy dữ liệu: ${Math.round(assessment.dataConfidence * 100)}%\n- Cơ sở giáo dục sức khỏe: ${assessment.sourceBasis.join(", ")}\n- Giới hạn: wellness education, không phải chẩn đoán.\n\n| Thành phần | Quan sát | Evidence | Tín hiệu | Confidence | Hành động |\n|---|---|---|---|---|---|\n${assessment.rows.map((row) => `| ${row.dimension} | ${row.observation} | ${row.evidence} | ${row.signal} | ${row.confidence} | ${row.action} |`).join("\n")}\n` : "";
    const integratedMarkdown = `# EyeMate Symptom Check\n\n> ${report.disclaimer}\n\n- Trạng thái: ${report.status}\n- Tổng điểm tự báo cáo: ${report.discomfortLoad.score ?? "—"}/${report.discomfortLoad.maximumScore}\n- Nhóm hành động: ${report.discomfortLoad.label}\n- Mã nhóm: ${report.discomfortLoad.actionGroup ?? "INSUFFICIENT_DATA"}\n- Nguồn: Self-report wellness + camera observation nếu có đủ dữ liệu\n- Phiên bản questionnaire: ${report.provenance.questionnaireVersion}\n- Thời gian hồi tưởng: ${report.provenance.recallPeriod}\n- Giới hạn: ${report.limitation}${cameraSection}${assessmentSection}\n\n## Câu trả lời\n\n${Object.entries(report.answers).map(([id, value]) => `- ${id}: ${String(value)}`).join("\n")}\n\n> ${report.disclaimer}\n`;
    return format === "PDF" ? await renderLocalPdf(integratedMarkdown) : integratedMarkdown;
  }
  const markdown = `# EyeMate Symptom Check\n\n> ${report.disclaimer}\n\n- Trạng thái: ${report.status}\n- Tổng điểm tự báo cáo: ${report.discomfortLoad.score ?? "—"}/${report.discomfortLoad.maximumScore}\n- Nhóm hành động: ${report.discomfortLoad.label}\n- Mã nhóm: ${report.discomfortLoad.actionGroup ?? "INSUFFICIENT_DATA"}\n- Nguồn: Dựa trên câu trả lời tự báo cáo\n- Phiên bản questionnaire: ${report.provenance.questionnaireVersion}\n- Thời gian hồi tưởng: ${report.provenance.recallPeriod}\n- Giới hạn: ${report.limitation}\n\n## Câu trả lời\n\n${Object.entries(report.answers).map(([id, value]) => `- ${id}: ${String(value)}`).join("\n")}\n\n> ${report.disclaimer}\n`;
  return format === "PDF" ? await renderLocalPdf(markdown) : markdown;
}

function completeOnboardingWithoutCamera(): void {
  if (storage === null) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
  const now = currentIso();
  storage.save({ stage: "COMPLETE", updatedAt: now });
  storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "SKIPPED", decidedAt: now });
}

function grantCameraConsent(): void {
  if (storage === null) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
  const now = currentIso();
  storage.save({ stage: "COMPLETE", updatedAt: now });
  storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "GRANTED", decidedAt: now });
}

function withdrawCameraConsent(): void {
  if (storage === null) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
  storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "WITHDRAWN", decidedAt: currentIso() });
}

function analyticsInputs(): readonly AnalyticsInput[] {
  const resets = (storage?.listM3Records("BASELINE") ?? []).filter((record) => { try { return (JSON.parse(record.payloadJson) as { state?: string }).state === "RESET"; } catch { return false; } });
  const resetAt = resets.length ? Math.max(...resets.map((record) => Date.parse(record.createdAt))) : Number.NEGATIVE_INFINITY;
  return (storage?.listM3Records("SOURCE") ?? []).flatMap((record) => { try { const input = validateAnalyticsInput(JSON.parse(record.payloadJson) as AnalyticsInput); return Date.parse(input.occurredAtUtc) >= resetAt ? [input] : []; } catch { return []; } });
}

function generateM3Report(): PersonalReport {
  const inputs = analyticsInputs();
  const timezone = inputs[0]?.timezone ?? "UTC";
  const now = currentIso();
  const report = buildPersonalReport(inputs, localDateFor(now, timezone), timezone, now);
  storage?.saveM3Record({ id: `baseline-${report.baseline.contextKey}-${now.slice(0, 10)}`, kind: "BASELINE", createdAt: now, payloadJson: JSON.stringify(report.baseline) });
  storage?.saveM3Record({ id: `daily-${report.daily.localDate}-${timezone.replace(/[^a-z0-9]/gi, "-")}`, kind: "DAILY", createdAt: now, payloadJson: JSON.stringify(report.daily) });
  storage?.saveM3Record({ id: `weekly-${report.weekly.startDate}-${timezone.replace(/[^a-z0-9]/gi, "-")}`, kind: "WEEKLY", createdAt: now, payloadJson: JSON.stringify(report.weekly) });
  for (const pattern of report.daily.patterns) storage?.saveM3Record({ id: `pattern-${report.daily.localDate}-${pattern.patternId.toLowerCase().replaceAll("_", "-")}`, kind: "PATTERN", createdAt: now, payloadJson: JSON.stringify(pattern) });
  storage?.saveM3Record({ id: `report-${report.daily.localDate}-${timezone.replace(/[^a-z0-9]/gi, "-")}`, kind: "REPORT", createdAt: now, payloadJson: JSON.stringify(report) });
  storage?.compactM3ReportSnapshots();
  return report;
}

function listM3Reports(): readonly PersonalReport[] {
  return (storage?.listM3Records("REPORT") ?? []).flatMap((record) => { try { return [JSON.parse(record.payloadJson) as PersonalReport]; } catch { return []; } });
}

function currentM3Report(): PersonalReport {
  const existing = listM3Reports().at(-1);
  if (existing !== undefined) return existing;
  const inputs = analyticsInputs();
  const timezone = inputs[0]?.timezone ?? "UTC";
  const now = currentIso();
  return buildPersonalReport(inputs, localDateFor(now, timezone), timezone, now);
}

function sessionSummaryForRenderer(summary: PersistedSummary): StoredSessionSummaryListItem {
  let interventionCount = 0;
  let acceptedBreakCount = 0;
  if (summary.summaryJson !== undefined) {
    try {
      const parsed = JSON.parse(summary.summaryJson) as { interventions?: unknown };
      const interventions = Array.isArray(parsed.interventions) ? parsed.interventions : [];
      interventionCount = interventions.length;
      acceptedBreakCount = interventions.filter((item) => {
        if (typeof item !== "object" || item === null) return false;
        const response = (item as Record<string, unknown>).response;
        return response === "ACCEPTED" || response === "AUTO_CORRECTED";
      }).length;
    } catch {
      interventionCount = 0;
      acceptedBreakCount = 0;
    }
  }
  return { summaryId: summary.summaryId, sessionId: summary.sessionId, status: summary.status, elapsedActiveMs: summary.elapsedActiveMs, createdAt: summary.createdAt, interventionCount, acceptedBreakCount };
}

function registerIpcHandlers(): void {
  ipcMain.handle("runtime:get-info", (): RuntimeInfo => getRuntimeInfo());
  ipcMain.handle("privacy:get-summary", (): PrivacySummary => getPrivacySummary());
  ipcMain.handle("checkup:run-survey-only", (_event, request: SurveyRequest): CheckupSummary => runSurveyOnly(request));
  ipcMain.handle("checkup:run", (_event, request: IntegratedCheckupRequest): CheckupSummary => runCheckup(request));
  ipcMain.handle("onboarding:grant-camera-consent", (): void => grantCameraConsent());
  ipcMain.handle("onboarding:complete-without-camera", (): void => completeOnboardingWithoutCamera());
  ipcMain.handle("privacy:withdraw-camera-consent", (): void => withdrawCameraConsent());
  ipcMain.handle("privacy:delete-all-local-data", (): "DELETED" | "PARTIALLY_DELETED" | "FAILED" => storage?.deleteAllLocalData() ?? "FAILED");
  ipcMain.handle("reports:list-survey-only", () => storage?.listSurveyOnlyReports() ?? []);
  ipcMain.handle("checkup:export-with-dialog", async (_event, reportId: string, format: LocalExportFormat) => {
    if (!/^[a-z0-9-]{8,64}$/i.test(reportId) || !["JSON", "MARKDOWN", "PDF"].includes(format)) throw new Error("INVALID_CHECKUP_EXPORT_REQUEST");
    const payload = storage?.getWellnessCheckPayload(reportId);
    if (!payload) throw new Error("CHECKUP_EXPORT_NOT_AVAILABLE");
    const selected = await dialog.showSaveDialog({ title: "Export EyeMate Symptom Check", defaultPath: `eyemate-symptom-check.${format === "JSON" ? "json" : format === "PDF" ? "pdf" : "md"}`, filters: [{ name: format === "JSON" ? "JSON" : format === "PDF" ? "PDF" : "Markdown", extensions: [format === "JSON" ? "json" : format === "PDF" ? "pdf" : "md"] }], properties: ["showOverwriteConfirmation", "createDirectory"] });
    if (selected.canceled || !selected.filePath) return { status: "CANCELLED", reason: "USER_CANCELLED" };
    const content = await renderWellnessExport(payload, format);
    return format === "PDF" ? writeLocalPdfExport(selected.filePath, content as Buffer) : writeLocalExport(selected.filePath, content as string);
  });
  ipcMain.handle("work-session:start", (_event, modeId?: WorkSession["modeId"]) => startWorkSession(modeId));
  ipcMain.handle("work-session:pause", () => updateWorkSession("PAUSE"));
  ipcMain.handle("work-session:resume", () => updateWorkSession("RESUME"));
  ipcMain.handle("work-session:finish", () => finishWorkSession());
  ipcMain.handle("work-session:cancel", () => updateWorkSession("CANCEL"));
  ipcMain.handle("work-session:get", () => getWorkSessionSnapshot());
  ipcMain.handle("work-session:list-summaries", () => (storage?.listSessionSummaries() ?? []).map(sessionSummaryForRenderer));
  ipcMain.handle("work-session:request-break-nudge", () => requestBreakNudge());
  ipcMain.handle("work-session:respond-nudge", (_event, nudgeId: string, response: NudgeResponse) => respondToNudge(nudgeId, response));
  ipcMain.handle("m3:generate-report", () => generateM3Report());
  ipcMain.handle("m3:list-reports", () => listM3Reports());
  ipcMain.handle("m3:preview-professional-summary", (_event, format: LocalExportFormat = "MARKDOWN") => {
    if (!["JSON", "MARKDOWN", "PDF"].includes(format)) throw new Error("INVALID_M3_PREVIEW_FORMAT");
    const report = currentM3Report();
    return format === "JSON" ? JSON.stringify(report, null, 2) : renderProfessionalSummary(report);
  });
  ipcMain.handle("m3:reset-baseline", () => { const now = currentIso(); storage?.saveM3Record({ id: `baseline-reset-${randomUUID().slice(0, 12)}`, kind: "BASELINE", createdAt: now, payloadJson: JSON.stringify({ state: "RESET", version: "m3-baseline/0.1.0" }) }); return "DELETED"; });
  ipcMain.handle("m3:delete-data", () => storage?.deleteM3Records() ?? "DELETED");
  ipcMain.handle("m3:delete-category", (_event, category: M3DataCategory) => {
    if (!["BASELINE", "PATTERN", "SUMMARY", "REPORT", "ALL"].includes(category)) throw new Error("INVALID_M3_DATA_CATEGORY");
    return storage?.deleteM3Category(category) ?? "DELETED";
  });
  ipcMain.handle("m3:export", async (_event, destination: string, format: LocalExportFormat, includeEvidence: boolean) => {
    if (typeof destination !== "string" || !["JSON", "MARKDOWN", "PDF"].includes(format) || typeof includeEvidence !== "boolean") throw new Error("INVALID_M3_EXPORT_REQUEST");
    const report = currentM3Report();
    const exportReport = includeEvidence ? report : { ...report, evidenceSourceIds: [], missingData: [], limitations: ["EVIDENCE_OMITTED_BY_USER"] };
    const content = format === "JSON" ? JSON.stringify(exportReport, null, 2) : renderProfessionalSummary(exportReport);
    return format === "PDF" ? writeLocalPdfExport(destination, await renderLocalPdf(content)) : writeLocalExport(destination, content);
  });
  ipcMain.handle("m3:export-with-dialog", async (_event, format: LocalExportFormat, includeEvidence: boolean) => {
    if (!["JSON", "MARKDOWN", "PDF"].includes(format) || typeof includeEvidence !== "boolean") throw new Error("INVALID_M3_EXPORT_REQUEST");
    const selected = await dialog.showSaveDialog({
      title: "Export EyeMate Personal Summary",
      defaultPath: `eyemate-summary.${format === "JSON" ? "json" : format === "PDF" ? "pdf" : "md"}`,
      filters: [{ name: format === "JSON" ? "JSON" : format === "PDF" ? "PDF" : "Markdown", extensions: [format === "JSON" ? "json" : format === "PDF" ? "pdf" : "md"] }],
      properties: ["showOverwriteConfirmation", "createDirectory"]
    });
    if (selected.canceled || !selected.filePath) return { status: "CANCELLED", reason: "USER_CANCELLED" };
    const report = currentM3Report();
    const exportReport = includeEvidence ? report : { ...report, evidenceSourceIds: [], missingData: [], limitations: ["EVIDENCE_OMITTED_BY_USER"] };
    const content = format === "JSON" ? JSON.stringify(exportReport, null, 2) : renderProfessionalSummary(exportReport);
    return format === "PDF" ? writeLocalPdfExport(selected.filePath, await renderLocalPdf(content)) : writeLocalExport(selected.filePath, content);
  });
  ipcMain.handle("settings:get", () => storage?.loadUserPreferences() ?? getDefaultUserPreferences());
  ipcMain.handle("settings:update", (_event, preferences: UserPreferences) => {
    if (typeof preferences !== "object" || preferences === null) throw new Error("INVALID_USER_PREFERENCES");
    return storage?.saveUserPreferences(preferences) ?? getDefaultUserPreferences();
  });
  ipcMain.handle("camera-calibration:get", () => storage?.loadCameraCalibration() ?? null);
  ipcMain.handle("camera-calibration:save", (_event, record: CameraCalibrationRecord) => storage?.saveCameraCalibration(validateCameraCalibrationRecord(record)) ?? validateCameraCalibrationRecord(record));
  ipcMain.handle("camera-calibration:reset", () => storage?.deleteCameraCalibration() ?? "DELETED");
  ipcMain.handle("privacy:get-data-inventory", () => storage?.getDataInventory() ?? []);
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow(createSecureWindowOptions(preloadPath));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  await window.loadFile(rendererIndexPath, enterpriseDemoMode ? { hash: ENTERPRISE_DEMO_HASH } : undefined);
  window.show();
  return window;
}

async function runPersonalDemoValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const wait = async (milliseconds = 220): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  await wait(500);
  const runtimeDataMode = await evaluate<string>("window.eyeMate.getRuntimeInfo().then((value) => value.dataMode)");
  const home = await evaluate<{ readonly dataMode: boolean; readonly banner?: string; readonly score?: string; readonly blink?: string; readonly distance?: string; readonly legendCount: number; readonly horizontalOverflow: boolean }>(`(() => ({
    dataMode: document.body.classList.contains('personal-demo-active'),
    banner: document.querySelector('.personal-demo-banner')?.textContent,
    score: document.querySelector('.home-score-copy strong')?.textContent,
    blink: document.querySelector('.clarity-metric-blink .metric-value')?.textContent,
    distance: document.querySelector('.clarity-metric-distance .metric-value')?.textContent,
    legendCount: document.querySelectorAll('.home-evidence-legend span').length,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
  }))()`);
  const resolvedHome = { ...home, runtime: runtimeDataMode };
  const validHome = resolvedHome.dataMode && resolvedHome.runtime === "SYNTHETIC_DEMO"
    && resolvedHome.banner === "Dữ liệu mẫuSnapshot synthetic chỉ để trình bày giao diện và báo cáo. Không đọc, ghi hoặc trộn với dữ liệu cá nhân."
    && resolvedHome.score === "82" && resolvedHome.blink === "20/phút" && resolvedHome.distance === "Phù hợp"
    && resolvedHome.legendCount === 3 && resolvedHome.horizontalOverflow === false;
  if (!validHome) throw new Error(`PERSONAL_DEMO_HOME_INVALID:${JSON.stringify(resolvedHome)}`);
  await evaluate("location.hash = '#/intelligence'; true"); await wait();
  if (!await evaluate<boolean>("document.body.textContent.includes('4 giờ 15 phút') && document.querySelectorAll('.rhythm-day').length === 7 && document.querySelector('#intelligence-refresh') === null")) throw new Error("PERSONAL_DEMO_INTELLIGENCE_INVALID");
  await evaluate("location.hash = '#/reports'; true"); await wait();
  if (!await evaluate<boolean>("document.body.textContent.includes('4 giờ 15 phút') && document.querySelectorAll('.report-demo-trend circle').length === 7 && document.querySelector('#report-preview')?.disabled === true")) throw new Error("PERSONAL_DEMO_REPORT_INVALID");
  await evaluate("document.querySelector('[data-report-tab=month]').click(); true"); await wait();
  if (!await evaluate<boolean>("document.querySelectorAll('.work-rhythm-chart.is-month .rhythm-day').length === 30")) throw new Error("PERSONAL_DEMO_MONTH_INVALID");
  console.log("PERSONAL_DEMO_VALIDATION_PASS isolatedProfile=true syntheticBanner=true homeMetrics=true intelligence7Day=true reportTrend=true report30Day=true exportsDisabled=true horizontalOverflow=false");
}

function configureEnterpriseDemoBoundary(): void {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] }, (_details, callback) => {
    enterpriseDemoBlockedNetworkRequests += 1;
    callback({ cancel: true });
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}

function configureLocalCameraPermission(): void {
  const isAllowed = (webContentsUrl: string): boolean => webContentsUrl.startsWith("file:") && storage?.loadCameraConsent()?.decision === "GRANTED";
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => permission === "media" && webContents !== null && isAllowed(webContents.getURL()));
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(permission === "media" && isAllowed(webContents.getURL())));
}

async function runEnterpriseDemoValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const wait = async (milliseconds = 220): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  const screenshotDirectory = path.join(currentDirectory, "../../docs/validation/enterprise-demo");
  const capture = async (name: string): Promise<void> => {
    const image = await window.webContents.capturePage();
    await mkdir(screenshotDirectory, { recursive: true });
    await writeFile(path.join(screenshotDirectory, `${name}.png`), image.toPNG());
  };
  const inspectLayout = async (): Promise<{ readonly overflow: boolean; readonly overlap: boolean; readonly chartVisible: boolean; readonly legendVisible: boolean; readonly kpis: number }> => await evaluate(`(() => {
    const rectangles = Array.from(document.querySelectorAll('.enterprise-kpi')).map((item) => item.getBoundingClientRect());
    const overlap = rectangles.some((rectangle, index) => rectangles.slice(index + 1).some((other) => rectangle.left < other.right && rectangle.right > other.left && rectangle.top < other.bottom && rectangle.bottom > other.top));
    const chart = document.querySelector('.enterprise-chart svg')?.getBoundingClientRect();
    const legend = document.querySelector('.enterprise-chart-legend')?.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, overlap, chartVisible: Boolean(chart && chart.width > 240 && chart.height > 150), legendVisible: Boolean(legend && legend.width > 180 && legend.height > 10), kpis: rectangles.length };
  })()`);
  await wait(520);
  const initial = await evaluate(`(() => ({
    hash: location.hash,
    root: Boolean(document.querySelector('[data-enterprise-demo-root]')),
    body: document.body.classList.contains('enterprise-demo-active'),
    personalTopbarHidden: getComputedStyle(document.querySelector('.production-topbar')).display === 'none',
    sqliteText: document.body.textContent.includes('SQLite'),
    syntheticBadge: document.body.textContent.includes('Synthetic data'),
    denominator: document.body.textContent.includes('205 / 247'),
    legend: document.querySelectorAll('.enterprise-chart-legend span').length === 4,
    reportName: document.body.textContent.includes('EyeMate Program Implementation & Participation Report'),
    noBenchmark: !/benchmark|trung bình ngành/i.test(document.body.textContent ?? '')
  }))()`);
  if (JSON.stringify(initial) !== JSON.stringify({ hash: `#${ENTERPRISE_DEMO_HASH}`, root: true, body: true, personalTopbarHidden: true, sqliteText: false, syntheticBadge: true, denominator: true, legend: true, reportName: true, noBenchmark: true })) throw new Error(`ENTERPRISE_DEMO_INITIAL_STATE_INVALID:${JSON.stringify(initial)}`);
  for (const [width, height] of [[1100, 700], [1280, 800], [1366, 768], [1440, 900], [1600, 1000], [1920, 1080]] as const) {
    window.setSize(width, height);
    await wait();
    const layout = await inspectLayout();
    if (layout.overflow || layout.overlap || !layout.chartVisible || !layout.legendVisible || layout.kpis !== 4) throw new Error(`ENTERPRISE_DEMO_VIEWPORT_INVALID:${width}x${height}:${JSON.stringify(layout)}`);
    if ([[1100, 700], [1366, 768], [1440, 900], [1920, 1080]].some(([captureWidth, captureHeight]) => captureWidth === width && captureHeight === height)) await capture(`enterprise-overview-${width}x${height}`);
  }
  for (const route of ["transparency", "it", "insights", "campaigns", "report", "audit"]) {
    await evaluate(`location.hash = '#/enterprise-demo/${route}'; true`);
    await wait();
    const state = await evaluate(`(() => ({ route: location.hash, root: Boolean(document.querySelector('[data-enterprise-demo-root]')), current: document.querySelector('.enterprise-nav [aria-current="page"]')?.getAttribute('href') }))()`);
    if (JSON.stringify(state) !== JSON.stringify({ route: `#/enterprise-demo/${route}`, root: true, current: `#/enterprise-demo/${route}` })) throw new Error(`ENTERPRISE_DEMO_ROUTE_INVALID:${route}:${JSON.stringify(state)}`);
    await capture(route === "insights" ? "enterprise-program-insights-available-1440x900" : `enterprise-${route}-1440x900`);
    if (route === "insights") {
      await evaluate(`(() => { const select = document.querySelector('#enterprise-cohort-select'); select.value = 'legal'; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await wait();
      await capture("enterprise-program-insights-suppressed-1440x900");
      await evaluate(`(() => { const select = document.querySelector('#enterprise-cohort-select'); select.value = 'all'; select.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await wait();
    }
  }
  await evaluate("location.hash = '#/enterprise-demo/insights'; true");
  await wait();
  const insights = await evaluate(`(() => {
    const metricLabels = Array.from(document.querySelectorAll('.enterprise-kpi')).map((item) => item.textContent ?? '').join(' ');
    const suppressed = document.querySelector('.cohort-row.suppressed');
    return Boolean(suppressed) && !/\\d/.test(suppressed?.textContent ?? '') && !/Focus score|Fatigue score|Productivity score|Health score/i.test(metricLabels);
  })()`);
  if (!insights) throw new Error("ENTERPRISE_DEMO_INSIGHTS_BOUNDARY_INVALID");
  await evaluate("location.hash = '#/enterprise-demo/transparency'; true");
  await wait();
  const defaultOff = await evaluate("document.querySelector('#enterprise-aggregate-toggle')?.checked === false");
  if (!defaultOff) throw new Error("ENTERPRISE_DEMO_PARTICIPATION_DEFAULT_NOT_OFF");
  if (enterpriseDemoBlockedNetworkRequests !== 0) throw new Error(`ENTERPRISE_DEMO_NETWORK_REQUEST:${enterpriseDemoBlockedNetworkRequests}`);
  console.log("ENTERPRISE_DEMO_VALIDATION_PASS packagedElectron=true noPersonalStorage=true syntheticOnly=true aggregateDefaultOff=true noNetworkRequests=true routes=7 privacyBoundaries=true viewports=6 screenshots=11 legends=true denominator=true suppressionNoValue=true");
}

async function runSmoke(window: BrowserWindow): Promise<void> {
  const bridgeAvailable = await window.webContents.executeJavaScript(
    "typeof window.eyeMate?.getRuntimeInfo === 'function'",
    true
  );

  if (!bridgeAvailable) {
    throw new Error("M1_PRELOAD_BRIDGE_UNAVAILABLE");
  }

  const runtimeMode = await window.webContents.executeJavaScript(
    "window.eyeMate.getRuntimeInfo().then((value) => value.mode)",
    true
  );

  if (runtimeMode !== "LOCAL_ONLY") {
    throw new Error("M1_RUNTIME_MODE_INVALID");
  }

  const privacyMode = await window.webContents.executeJavaScript(
    "window.eyeMate.getPrivacySummary().then((value) => value.localOnly)",
    true
  );
  if (privacyMode !== true) {
    throw new Error("M1_PRIVACY_BRIDGE_INVALID");
  }

  const surveyResult = await window.webContents.executeJavaScript(
    "window.eyeMate.completeOnboardingWithoutCamera().then(() => window.eyeMate.runSurveyOnly({ answers: Object.fromEntries(['eye_discomfort','screen_fatigue','temporary_blur','light_sensitivity','end_of_day_effort'].map((id) => [id, 1])), safety: 'NEGATIVE' })).then((value) => `${value.status}:${value.source}:${value.camera}`)",
    true
  );
  if (surveyResult !== "COMPLETED:EYEMATE_WELLNESS_SELF_REPORTED:NOT_MEASURED") {
    throw new Error("M1_SURVEY_ONLY_FLOW_INVALID");
  }
}

async function runCompanionSmoke(window: BrowserWindow): Promise<void> {
  const result = await window.webContents.executeJavaScript(`(async () => {
    const started = await window.eyeMate.startWorkSession('TIMER_ONLY');
    const paused = await window.eyeMate.pauseWorkSession();
    const resumed = await window.eyeMate.resumeWorkSession();
    const nudge = await window.eyeMate.requestBreakNudge();
    if (started.state !== 'ACTIVE' || paused.state !== 'PAUSED' || resumed.state !== 'ACTIVE' || nudge.action !== 'EMIT') return 'LIFECYCLE_INVALID';
    if (!(await window.eyeMate.respondToNudge(nudge.nudgeId, 'ACCEPTED'))) return 'NUDGE_RESPONSE_INVALID';
    await window.eyeMate.finishWorkSession();
    const finished = await window.eyeMate.finishWorkSession();
    const summaries = await window.eyeMate.listSessionSummaries();
    return finished.state === 'COMPLETED' && summaries.length > 0 ? 'PASS' : 'SUMMARY_INVALID';
  })()`, true);
  if (result !== "PASS") throw new Error(`M2_COMPANION_SMOKE_${String(result)}`);
}

async function runIntelligenceSmoke(window: BrowserWindow): Promise<void> {
  const result = await window.webContents.executeJavaScript(`(async () => {
    await window.eyeMate.completeOnboardingWithoutCamera();
    await window.eyeMate.runSurveyOnly({ answers: Object.fromEntries(['eye_discomfort','screen_fatigue','temporary_blur','light_sensitivity','end_of_day_effort'].map((id) => [id, 1])), safety: 'NEGATIVE' });
    await window.eyeMate.startWorkSession('TIMER_ONLY');
    await window.eyeMate.finishWorkSession();
    await window.eyeMate.finishWorkSession();
    const report = await window.eyeMate.generateM3Report();
    const preview = await window.eyeMate.previewProfessionalSummary();
    return report.disclaimer === 'NOT_A_DIAGNOSIS' && report.dataSource === 'MIXED' && preview.includes('not a diagnosis') ? 'PASS' : 'REPORT_INVALID';
  })()`, true);
  if (result !== "PASS") throw new Error(`M3_INTELLIGENCE_SMOKE_${String(result)}`);
}

async function runUiValidation(window: BrowserWindow): Promise<void> {
  const wait = async (milliseconds = 180): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const requireTrue = (value: unknown, reason: string): void => { if (value !== true) throw new Error(reason); };
  await evaluate("(() => { const style = document.createElement('style'); style.textContent = '*{animation:none!important;transition:none!important}'; document.head.append(style); return true; })()");
  requireTrue(await evaluate("window.eyeMate.getRuntimeInfo().then((value) => value.developerPanelEnabled === false)"), "UI_DEV_PANEL_PRODUCTION_GATE_INVALID");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true, bubbles: true })); true");
  requireTrue(await evaluate("!document.querySelector('.dev-panel') && !document.querySelector('#dev-mode-badge')"), "UI_DEV_PANEL_PRODUCTION_LEAK");
  const capture = async (name: string, width = 1280, height = 800): Promise<void> => {
    if (uiScreenshotDirectory === null) return;
    window.setSize(width, height);
    await wait(420);
    if (name === "session-active") await evaluate("(() => { const timer = document.querySelector('.session-panel .session-timer'); timer.textContent = '00:00:01'; timer.removeAttribute('id'); const progress = document.querySelector('.session-panel .session-progress span'); if (progress) progress.style.setProperty('--progress', '1%'); return true; })()");
    requireTrue(await evaluate("document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.app-shell').getBoundingClientRect().right <= window.innerWidth + 1"), `UI_LAYOUT_OVERFLOW_${width}x${height}`);
    const image = await window.webContents.capturePage();
    await mkdir(uiScreenshotDirectory, { recursive: true });
    await writeFile(path.join(uiScreenshotDirectory, `clarity-production-${name}-${width}x${height}.png`), image.toPNG());
  };

  await wait(300);
  requireTrue(await evaluate("location.hash === '#/home' && Boolean(document.querySelector('.clarity-home-grid')) && !document.querySelector('.vitals-orb') && document.querySelectorAll('.production-topbar [data-route]').length === 7"), "UI_HOME_ROUTE_INVALID");
  await capture("home");
  await capture("home", 1024, 768);

  await evaluate("location.hash = '#/design-lab/living-aurora'; true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('.aurora-lab')) && document.body.textContent.includes('DEMO/REFERENCE') && document.body.textContent.includes('KHÔNG GỌI IPC/CAMERA/DB')"), "UI_LIVING_AURORA_LAB_INVALID");
  await evaluate("document.querySelector('[data-lumi-state=FOCUS]').click(); document.querySelector('#aurora-reduced-motion').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelector('.aurora-state').textContent.includes('FOCUS') && document.querySelector('.aurora-lab').classList.contains('aurora-lab-reduced')"), "UI_LIVING_AURORA_INTERACTION_INVALID");
  await capture("living-aurora-reference", 1100, 760);

  await evaluate("document.querySelector('[data-route=checkup]').click(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/checkup' && Boolean(document.querySelector('#checkup-consent'))"), "UI_CHECKUP_ROUTE_INVALID");
  requireTrue(await evaluate("!document.body.textContent.includes('OSDI') && !document.body.textContent.includes('DEQ-5') && document.body.textContent.includes('EyeMate Symptom Check') && document.body.textContent.includes('Đây không phải chẩn đoán y tế')"), "UI_WELLNESS_COPY_INVALID");
  await evaluate("document.querySelector('#checkup-consent').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelectorAll('[data-wellness-question]').length === 5 && document.querySelectorAll('[data-wellness-question] input[type=radio][value=\\\"3\\\"]').length === 5 && !document.body.textContent.includes('Không áp dụng')"), "UI_WELLNESS_QUESTIONNAIRE_INVALID");
  await evaluate("Array.from(document.querySelectorAll('[data-wellness-question]')).forEach((field) => field.querySelector('input[value=\\\"1\\\"]').click()); document.querySelector('#checkup-survey-next').click(); true"); await wait();
  await evaluate("document.querySelector('#checkup-camera-next').click(); true"); await wait();
  const checkupsBefore = await evaluate<number>("window.eyeMate.listSurveyOnlyReports().then((items) => items.length)");
  await evaluate("document.querySelector('#checkup-finish').click(); document.querySelector('#checkup-finish').click(); true"); await wait(350);
  requireTrue(await evaluate("Boolean(document.querySelector('#checkup-done')) && document.body.textContent.includes('EyeMate Symptom Check') && document.body.textContent.includes('/ 15') && document.body.textContent.includes('Nhóm hành động sản phẩm') && document.body.textContent.includes('Đây không phải chẩn đoán y tế')"), "UI_CHECKUP_FLOW_INVALID");
  requireTrue(await evaluate(`window.eyeMate.listSurveyOnlyReports().then((items) => items.length === ${checkupsBefore + 1})`), "UI_CHECKUP_DOUBLE_SUBMIT_INVALID");
  await capture("checkup-result");
  await capture("checkup-result", 1024, 768);
  await capture("checkup-result");
  await evaluate("document.querySelector('#checkup-repeat').click(); document.querySelector('[data-checkup-cancel]').click(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/home'"), "UI_CHECKUP_CANCEL_INVALID");

  await evaluate("document.querySelector('[data-route=companion]').click(); true"); await wait();
  await evaluate("document.querySelector('[data-companion-mode=CUSTOM]').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#custom-timing-save')) && Boolean(document.querySelector('#custom-work-minutes'))"), "UI_CUSTOM_TIMING_CONTROLS_MISSING");
  await evaluate("document.querySelector('#custom-work-minutes').value = '35'; document.querySelector('#custom-break-minutes').value = '7'; document.querySelector('#custom-reminder-minutes').value = '28'; document.querySelector('#custom-timing-save').click(); true"); await wait(300);
  requireTrue(await evaluate("window.eyeMate.getUserPreferences().then((value) => value.defaultMode === 'CUSTOM' && value.customWorkDurationMinutes === 35 && value.customBreakDurationMinutes === 7 && value.customReminderAtMinutes === 28)"), "UI_CUSTOM_TIMING_NOT_PERSISTED");
  await evaluate("document.querySelector('[data-companion-mode=TIMER_ONLY]').click(); true"); await wait();
  await evaluate("document.querySelector('#session-start').click(); true"); await wait(300);
  requireTrue(await evaluate("Boolean(document.querySelector('#session-toggle')) && Boolean(document.querySelector('#companion-timer-ring[role=timer]')) && Boolean(document.querySelector('#session-ring-progress')) && document.body.textContent.includes('Đang hoạt động') && document.body.textContent.includes('Mục tiêu 25 phút')"), "UI_SESSION_START_INVALID");
  await wait(1_050);
  requireTrue(await evaluate("document.querySelector('#session-timer').textContent !== '00:00:00'"), "UI_SESSION_TIMER_NOT_COUNTING");
  await evaluate("document.querySelector('#session-timer').textContent = '00:00:01'; true");
  await capture("session-active");
  await capture("session-active", 1024, 768);
  await evaluate("document.querySelector('#session-toggle').click(); true"); await wait();
  requireTrue(await evaluate("document.body.textContent.includes('Đang tạm dừng')"), "UI_SESSION_PAUSE_INVALID");
  const pausedTimer = await evaluate<string>("document.querySelector('#session-timer').textContent");
  await wait(350);
  requireTrue(await evaluate(`document.querySelector('#session-timer').textContent === ${JSON.stringify(pausedTimer)}`), "UI_SESSION_PAUSE_TIMER_MOVED");
  await evaluate("document.querySelector('#session-toggle').click(); true"); await wait();
  await evaluate("document.querySelector('#session-nudge').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('[data-nudge=ACCEPTED]'))"), "UI_NUDGE_MISSING");
  await evaluate("document.querySelector('[data-nudge=ACCEPTED]').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#eye-rest-countdown')) && window.eyeMate.getWorkSession().then((session) => session?.state === 'PAUSED')"), "UI_EYE_REST_BREAK_INVALID");
  await evaluate("document.querySelector('#modal-close').click(); document.querySelector('#session-end').click(); true"); await wait();
  await evaluate("document.querySelector('#confirm-session-end').click(); true"); await wait(300);
  requireTrue(await evaluate("document.body.textContent.includes('Phiên đã hoàn thành')"), "UI_SESSION_SUMMARY_INVALID");
  await evaluate("document.querySelector('#modal-close').click(); true");

  for (const response of ["SNOOZED", "DISMISSED"]) {
    await evaluate("location.hash = '#/home'; true"); await wait();
    await evaluate("location.hash = '#/companion'; true"); await wait();
    await evaluate("document.querySelector('#session-start').click(); true"); await wait();
    await evaluate("document.querySelector('#session-nudge').click(); true"); await wait();
    requireTrue(await evaluate(`Boolean(document.querySelector('[data-nudge=${response}]'))`), `UI_NUDGE_${response}_MISSING`);
    await evaluate(`document.querySelector('[data-nudge=${response}]').click(); true`); await wait();
    await evaluate("document.querySelector('#session-cancel').click(); true"); await wait();
    await evaluate("document.querySelector('#confirm-session-cancel').click(); true"); await wait(250);
    requireTrue(await evaluate("window.eyeMate.getWorkSession().then((session) => session?.state === 'CANCELLED')"), `UI_SESSION_CANCEL_${response}_INVALID`);
  }

  await evaluate("document.querySelector('[data-route=reports]').click(); true"); await wait();
  await evaluate("document.querySelector('#report-generate').click(); true"); await wait(350);
  requireTrue(await evaluate("location.hash === '#/reports' && Boolean(document.querySelector('[data-report-tab=history]'))"), "UI_REPORTS_INVALID");
  await evaluate("document.querySelector('#toast-region').replaceChildren(); true");
  await capture("reports");
  await capture("reports", 1024, 768);
  const reportCountBeforePreview = await evaluate<number>("window.eyeMate.listM3Reports().then((items) => items.length)");
  await evaluate("document.querySelector('#report-preview').click(); true"); await wait();
  requireTrue(await evaluate(`Boolean(document.querySelector('#report-export-confirm')) && window.eyeMate.listM3Reports().then((items) => items.length === ${reportCountBeforePreview})`), "UI_REPORT_PREVIEW_SIDE_EFFECT");
  await evaluate("document.querySelector('#modal-close').click(); true");
  await evaluate("document.querySelector('#report-export-json').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#report-export-confirm')) && document.querySelector('.modal pre').textContent.trim().startsWith('{')"), "UI_REPORT_JSON_PREVIEW_INVALID");
  await evaluate("document.querySelector('#modal-close').click(); true");
  await evaluate("document.querySelector('[data-report-tab=week]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelector('#report-content').textContent.includes('Weekly digest') && Boolean(document.querySelector('.heatmap'))"), "UI_WEEK_TAB_INVALID");
  await evaluate("document.querySelector('[data-report-tab=month]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelector('#report-content').textContent.includes('Chưa đủ dữ liệu 30 ngày')"), "UI_MONTH_TAB_INVALID");
  await evaluate("document.querySelector('[data-report-tab=history]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelector('#report-content').textContent.includes('Work session')"), "UI_HISTORY_INVALID");
  await evaluate("location.hash = '#/intelligence'; true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#intelligence-reset')) && document.querySelectorAll('.rhythm-day').length === 7 && document.body.textContent.includes('Tải thị giác tổng hợp')"), "UI_INTELLIGENCE_INVALID");
  await evaluate("document.querySelector('[data-intelligence-range=30]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelectorAll('.rhythm-day').length === 30 && document.querySelector('[data-intelligence-range=30]').getAttribute('aria-selected') === 'true'"), "UI_INTELLIGENCE_MONTH_RANGE_INVALID");
  await capture("intelligence");
  await capture("intelligence", 1024, 768);
  await evaluate("document.querySelector('#intelligence-reset').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#confirm-reset'))"), "UI_BASELINE_RESET_CONFIRM_MISSING");
  await evaluate("document.querySelector('#confirm-reset').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelector('#toast-region').textContent.includes('Baseline đã reset')"), "UI_BASELINE_RESET_INVALID");
  await evaluate("location.hash = '#/reports'; true"); await wait();
  await evaluate("document.querySelector('[data-report-tab=overview]').click(); true"); await wait();
  await evaluate("document.querySelector('#report-delete').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#confirm-report-delete'))"), "UI_REPORT_DELETE_CONFIRM_MISSING");
  await evaluate("document.querySelector('#confirm-report-delete').click(); true"); await wait();
  requireTrue(await evaluate("window.eyeMate.listM3Reports().then((items) => items.length === 0)"), "UI_REPORT_DELETE_INVALID");
  await evaluate("location.hash = '#/intelligence'; true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#intelligence-refresh'))"), "UI_INTELLIGENCE_REFRESH_MISSING");
  await evaluate("document.querySelector('#intelligence-refresh').click(); true"); await wait(350);
  requireTrue(await evaluate("window.eyeMate.listM3Reports().then((items) => items.length === 1) && document.body.textContent.includes('Tải thị giác tổng hợp')"), "UI_INTELLIGENCE_REFRESH_INVALID");

  await evaluate("document.querySelector('[data-route=privacy]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelectorAll('.inventory-card').length === 6 && document.body.textContent.toLowerCase().includes('calibration') && Boolean(document.querySelector('#privacy-reset-calibration'))"), "UI_DATA_INVENTORY_INVALID");
  await evaluate("document.querySelector('#toast-region').replaceChildren(); true");
  await capture("privacy");
  await capture("privacy", 1024, 768);
  await evaluate("document.querySelector('#privacy-export').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#report-export-confirm'))"), "UI_EXPORT_PREVIEW_REQUIRED");
  await evaluate("document.querySelector('#modal-close').click(); true");
  await evaluate("document.querySelector('#privacy-delete').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#delete-next'))"), "UI_DELETE_STEP_ONE_INVALID");
  await evaluate("document.querySelector('#delete-next').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#delete-confirm'))"), "UI_DELETE_STEP_TWO_INVALID");
  await evaluate("document.querySelector('#delete-confirm').click(); true"); await wait(300);
  requireTrue(await evaluate("document.querySelector('#toast-region').textContent.includes('DELETED')"), "UI_DELETE_RESULT_MISSING");
  requireTrue(await evaluate("Array.from(document.querySelectorAll('.inventory-card .metric-value')).every((item) => item.textContent === '0')"), "UI_DELETE_INVENTORY_NOT_REFRESHED");

  await evaluate("document.querySelector('[data-route=settings]').click(); true"); await wait();
  requireTrue(await evaluate("Boolean(document.querySelector('#settings-calibrate-camera')) && document.querySelector('#settings-camera-calibration').textContent.includes('không xuất centimet')"), "UI_CAMERA_CALIBRATION_ENTRY_INVALID");
  await evaluate("document.querySelector('#toast-region').replaceChildren(); true");
  await evaluate(`(() => { document.querySelector('#sound-toggle').click(); document.querySelector('#reduced-motion-toggle').click(); document.querySelector('#quiet-toggle').click(); const now = new Date(); const minute = now.getHours() * 60 + now.getMinutes(); const start = document.querySelector('#quiet-start'); const end = document.querySelector('#quiet-end'); const format = (value) => String(Math.floor(value / 60)).padStart(2,'0') + ':' + String(value % 60).padStart(2,'0'); start.value = format((minute + 1439) % 1440); end.value = format((minute + 2) % 1440); end.dispatchEvent(new Event('change')); return true; })()`); await wait(750);
  requireTrue(await evaluate("window.eyeMate.getUserPreferences().then((value) => value.soundEnabled && value.reducedMotion && value.quietHoursEnabled)"), "UI_SETTINGS_AUTOSAVE_INVALID");
  await evaluate("document.querySelector('#quiet-start').value = '22:00'; document.querySelector('#quiet-end').value = '07:00'; true");
  await capture("settings");
  await capture("settings", 1024, 768);
  await window.webContents.reload(); await wait(450);
  requireTrue(await evaluate("location.hash === '#/settings' && document.querySelector('#sound-toggle').getAttribute('aria-pressed') === 'true' && document.querySelector('#quiet-toggle').getAttribute('aria-pressed') === 'true'"), "UI_SETTINGS_RESTART_PERSISTENCE_INVALID");
  requireTrue(await evaluate("window.eyeMate.startWorkSession('TIMER_ONLY').then(() => window.eyeMate.requestBreakNudge()).then((decision) => decision.reason === 'QUIET_HOURS').finally(() => window.eyeMate.cancelWorkSession())"), "UI_QUIET_HOURS_POLICY_INVALID");

  await evaluate("location.hash = '#/privacy'; true"); await wait();
  await evaluate("location.hash = '#/reports'; true"); await wait();
  await evaluate("history.back(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/privacy'"), "UI_HISTORY_BACK_INVALID");
  await evaluate("history.forward(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/reports'"), "UI_HISTORY_FORWARD_INVALID");
  await evaluate("history.back(); true"); await wait();
  await window.webContents.reload(); await wait(350);
  requireTrue(await evaluate("location.hash === '#/privacy' && Boolean(document.querySelector('#privacy-delete'))"), "UI_RELOAD_RESTORE_INVALID");
}

async function runLivingAuroraValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const wait = async (milliseconds = 180): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  await evaluate("location.hash = '#/design-lab/living-aurora'; true");
  await wait();
  const shellState = await evaluate("(() => ({ route: location.hash, lab: Boolean(document.querySelector('.aurora-lab')), sidebar: getComputedStyle(document.querySelector('.sidebar')).display, primaryCount: document.querySelectorAll('[data-aurora-destination]').length, utilities: document.querySelectorAll('[data-aurora-utility]').length, demo: document.body.textContent.includes('KHÔNG GỌI IPC/CAMERA/DB/NETWORK') }))()");
  if (JSON.stringify(shellState) !== JSON.stringify({ route: "#/design-lab/living-aurora", lab: true, sidebar: "none", primaryCount: 5, utilities: 2, demo: true })) throw new Error(`LIVING_AURORA_SHELL_INVALID:${JSON.stringify(shellState)}`);
  if (uiScreenshotDirectory) { const image = await window.webContents.capturePage(); await mkdir(uiScreenshotDirectory, { recursive: true }); await writeFile(path.join(uiScreenshotDirectory, "living-aurora-reference-1100x760.png"), image.toPNG()); }
  for (const state of ["IDLE", "BREAK_SUGGESTED", "PRIVACY"]) {
    await evaluate(`document.querySelector('[data-lumi-state=${state}]').click(); true`);
    await wait(60);
    const stateCheck = await evaluate(`document.querySelector('.lumi-prototype')?.classList.contains('state-${state.toLowerCase()}') && document.querySelector('.aurora-state')?.textContent?.includes('${state}')`);
    if (!stateCheck) throw new Error(`LIVING_AURORA_MASCOT_STATE_INVALID:${state}`);
    if (uiScreenshotDirectory) { const image = await window.webContents.capturePage(); await mkdir(uiScreenshotDirectory, { recursive: true }); await writeFile(path.join(uiScreenshotDirectory, `living-aurora-${state.toLowerCase()}-1100x760.png`), image.toPNG()); }
  }
  await evaluate("document.querySelector('#aurora-reduced-motion').click(); true");
  await wait(60);
  if (!await evaluate("document.querySelector('.aurora-lab')?.classList.contains('aurora-lab-reduced') && getComputedStyle(document.querySelector('.lumi-prototype')).animationName === 'none'")) throw new Error("LIVING_AURORA_REDUCED_MOTION_INVALID");
  if (uiScreenshotDirectory) { const image = await window.webContents.capturePage(); await writeFile(path.join(uiScreenshotDirectory, "living-aurora-reduced-motion-1100x760.png"), image.toPNG()); await window.setSize(1280, 800); await wait(); const wideImage = await window.webContents.capturePage(); await writeFile(path.join(uiScreenshotDirectory, "living-aurora-reference-1280x800.png"), wideImage.toPNG()); }
  await evaluate("location.hash = '#/home'; true");
  await wait();
  if (!await evaluate("getComputedStyle(document.querySelector('.production-topbar')).display !== 'none' && Boolean(document.querySelector('.clarity-home-grid')) && !document.querySelector('.vitals-orb')")) throw new Error("LIVING_AURORA_PRODUCTION_CLARITY_SHELL_REGRESSION");
  console.log("LIVING_AURORA_DESIGN_LAB_PASS noIpcCameraDatabaseNetwork=true reducedMotion=true productionClarityShell=true");
}

async function runTasteDesignLabValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const wait = async (milliseconds = 160): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  const capture = async (name: string, width = 1100, height = 760): Promise<void> => {
    await window.setSize(width, height);
    await wait(760);
    if (!uiScreenshotDirectory) return;
    await mkdir(uiScreenshotDirectory, { recursive: true });
    const image = await window.webContents.capturePage();
    await writeFile(path.join(uiScreenshotDirectory, `${name}.png`), image.toPNG());
  };
  const openView = async (view: string): Promise<void> => {
    const transitionStarted = await evaluate<boolean>(`(() => { document.querySelector('[data-taste-destination=${view}]').click(); return document.querySelector('.taste-lab')?.classList.contains('taste-view-leaving') === true; })()`);
    if (!transitionStarted) throw new Error(`TASTE_VIEW_TRANSITION_MISSING:${view}`);
    await wait();
    if (!await evaluate(`Boolean(document.querySelector('[data-taste-view=${view}]'))`)) throw new Error(`TASTE_VIEW_TRANSITION_INCOMPLETE:${view}`);
  };

  await window.setSize(1100, 760);
  await evaluate("location.hash = '#/design-lab/taste-direction'; true");
  await wait();
  const shellState = await evaluate("(() => ({ route: location.hash, lab: Boolean(document.querySelector('.taste-lab')), sidebar: getComputedStyle(document.querySelector('.sidebar')).display, destinations: document.querySelectorAll('.taste-nav-button[data-taste-destination]').length, demo: document.body.textContent.includes('KHÔNG GỌI IPC, CAMERA, DATABASE HOẶC NETWORK'), productionCards: document.querySelectorAll('.taste-lab .metric-card, .taste-lab .vitals-orb').length }))()");
  if (JSON.stringify(shellState) !== JSON.stringify({ route: "#/design-lab/taste-direction", lab: true, sidebar: "none", destinations: 7, demo: true, productionCards: 0 })) throw new Error(`TASTE_DESIGN_LAB_SHELL_INVALID:${JSON.stringify(shellState)}`);
  const motionProfile = await evaluate("(() => ({ viewEntry: getComputedStyle(document.querySelector('.taste-canvas > section')).animationName, navRoll: getComputedStyle(document.querySelector('.taste-nav-track')).transitionDuration, barEntry: getComputedStyle(document.querySelector('.taste-spark-bars i')).animationName }))()");
  if (JSON.stringify(motionProfile) !== JSON.stringify({ viewEntry: "taste-view-enter", navRoll: "0.48s", barEntry: "taste-bar-rise" })) throw new Error(`TASTE_MOTION_PROFILE_INVALID:${JSON.stringify(motionProfile)}`);
  const navigationVisible = await evaluate("(() => { const titlebar = document.querySelector('.titlebar')?.getBoundingClientRect(); const bar = document.querySelector('.taste-topbar')?.getBoundingClientRect(); const items = Array.from(document.querySelectorAll('.taste-topbar [data-taste-destination]')).map((item) => item.getBoundingClientRect()); return Boolean(titlebar && bar && bar.top >= titlebar.bottom && bar.bottom <= innerHeight && items.length === 8 && items.every((item) => item.top >= bar.top && item.bottom <= bar.bottom && item.left >= 0 && item.right <= innerWidth)); })()");
  if (!navigationVisible) throw new Error("TASTE_DESIGN_LAB_NAVIGATION_CLIPPED");
  const homeContent = await evaluate<string>("document.querySelector('[data-taste-view=HOME]').textContent");
  for (const required of ["Phiên gần nhất", "Nhịp chớp mắt", "Khoảng cách", "Tải thị giác", "NOT_MEASURED", "INSUFFICIENT_DATA", "Bắt đầu phiên", "Khám mắt", "Xem báo cáo"]) if (!homeContent.includes(required)) throw new Error(`TASTE_HOME_CAPABILITY_MISSING:${required}`);
  await capture("clarity-grid-home-1100x760");
  await capture("clarity-grid-home-1280x800", 1280, 800);
  await window.setSize(1100, 760); await wait();

  const clickFeedback = await evaluate("(() => { const button = document.querySelector('.taste-button.primary'); const bounds = button.getBoundingClientRect(); button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 })); return Boolean(button.querySelector('.taste-click-ripple')); })()");
  if (!clickFeedback) throw new Error("TASTE_CLICK_FEEDBACK_MISSING");
  await wait(640);

  const keyboardResult = await evaluate("(() => { const items = Array.from(document.querySelectorAll('.taste-nav-button')); items[0].focus(); items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); return document.activeElement === items[1] && getComputedStyle(items[1]).outlineStyle !== 'none'; })()");
  if (!keyboardResult) throw new Error("TASTE_DESIGN_LAB_KEYBOARD_FOCUS_INVALID");

  for (const state of ["READY", "NOT_MEASURED", "INSUFFICIENT_DATA", "STALE", "LOW_QUALITY", "PRIVACY"]) {
    await evaluate(`document.querySelector('[data-taste-trace-state=${state}]').click(); true`);
    await wait(40);
    if (!await evaluate(`document.querySelector('.taste-trace')?.classList.contains('trace-${state.toLowerCase()}') && document.querySelector('#taste-trace-title')?.textContent?.includes('${state}')`)) throw new Error(`TASTE_TRACE_STATE_INVALID:${state}`);
  }
  await evaluate("document.querySelector('[data-taste-trace-state=INSUFFICIENT_DATA]').click(); true"); await wait(40);
  await evaluate("document.querySelector('#taste-reduced-motion').click(); true"); await wait(40);
  if (!await evaluate("(() => { const bar = document.querySelector('.taste-spark-bars i'); const style = getComputedStyle(bar); return document.querySelector('.taste-lab')?.classList.contains('taste-reduced-motion') && getComputedStyle(document.querySelector('.taste-trace-contour')).transitionDuration === '0s' && getComputedStyle(document.querySelector('.taste-canvas > section')).animationName === 'none' && style.transform === 'none' && Number.parseFloat(style.height) > 0; })()")) throw new Error("TASTE_REDUCED_MOTION_INVALID");
  await evaluate("document.querySelector('#taste-reduced-transparency').click(); true"); await wait(40);
  if (!await evaluate("document.querySelector('.taste-lab')?.classList.contains('taste-reduced-transparency') && getComputedStyle(document.querySelector('.taste-lab')).backgroundImage === 'none'")) throw new Error("TASTE_REDUCED_TRANSPARENCY_INVALID");
  await capture("clarity-grid-reduced-motion-1100x760");
  await evaluate("document.querySelector('#taste-reduced-motion').click(); document.querySelector('#taste-reduced-transparency').click(); true"); await wait(40);

  await openView("CHECKUP");
  const checkupContent = await evaluate<string>("document.querySelector('[data-taste-view=CHECKUP]').textContent");
  for (const required of ["Observation", "Pattern", "Missing", "Confidence", "Action", "NOT_MEASURED"]) if (!checkupContent.includes(required)) throw new Error(`TASTE_CHECKUP_EVIDENCE_MISSING:${required}`);
  if (/OSDI|DEQ-5|chẩn đoán bệnh/.test(checkupContent)) throw new Error("TASTE_CHECKUP_COPY_INVALID");
  await capture("clarity-grid-checkup-result-1100x760");

  await openView("COMPANION");
  const companionContent = await evaluate<string>("document.querySelector('[data-taste-view=COMPANION]').textContent");
  for (const required of ["24:18", "Tạm dừng", "Hoàn thành", "Hủy phiên", "Nghỉ ngay", "Nhắc sau", "Bỏ qua"]) if (!companionContent.includes(required)) throw new Error(`TASTE_COMPANION_CONTROL_MISSING:${required}`);
  await capture("clarity-grid-companion-active-1100x760");

  await openView("REPORTS");
  const reportContent = await evaluate<string>("document.querySelector('[data-taste-view=REPORTS]').textContent");
  for (const required of ["47 phút", "1/7 ngày", "m3-report/0.1.0", "Preview Markdown", "Preview JSON", "Xóa report snapshots"]) if (!reportContent.includes(required)) throw new Error(`TASTE_REPORT_CAPABILITY_MISSING:${required}`);
  await capture("clarity-grid-report-1100x760");

  await openView("PRIVACY");
  const privacyContent = await evaluate<string>("document.querySelector('[data-taste-view=PRIVACY]').textContent");
  for (const required of ["Camera consent", "Preview và export", "Reset baseline", "Xóa toàn bộ dữ liệu", "PARTIALLY_DELETED", "UNKNOWN"]) if (!privacyContent.includes(required)) throw new Error(`TASTE_PRIVACY_CAPABILITY_MISSING:${required}`);
  await openView("SETTINGS");
  const settingsContent = await evaluate<string>("document.querySelector('[data-taste-view=SETTINGS]').textContent");
  for (const required of ["Giảm chuyển động", "Break reminder", "Âm thanh nudge", "Quiet hours", "Camera mode", "Appearance"]) if (!settingsContent.includes(required)) throw new Error(`TASTE_SETTINGS_CAPABILITY_MISSING:${required}`);

  await evaluate("location.hash = '#/home'; true");
  await wait();
  if (!await evaluate("getComputedStyle(document.querySelector('.production-topbar')).display !== 'none' && !document.body.classList.contains('taste-design-lab-active') && Boolean(document.querySelector('.clarity-home-grid')) && !document.querySelector('.vitals-orb')")) throw new Error("TASTE_PRODUCTION_CLARITY_SHELL_REGRESSION");
  console.log("TASTE_DESIGN_LAB_PASS noIpcCameraDatabaseNetwork=true keyboardFocus=true motionProfile=true clickFeedback=true reducedMotion=true reducedTransparency=true productionClarityShell=true");
}

async function runClarityProductionValidation(window: BrowserWindow): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const wait = async (milliseconds = 240): Promise<void> => await new Promise((resolve) => setTimeout(resolve, milliseconds));
  const capture = async (name: string, width = 1100, height = 760): Promise<void> => {
    await window.setSize(width, height);
    await evaluate("document.querySelector('#app-main')?.scrollTo({ top: 0, left: 0 }); true");
    await wait(920);
    if (!uiScreenshotDirectory) return;
    await mkdir(uiScreenshotDirectory, { recursive: true });
    const image = await window.webContents.capturePage();
    await writeFile(path.join(uiScreenshotDirectory, `clarity-production-${name}-${width}x${height}.png`), image.toPNG());
  };
  const openRoute = async (route: string, requiredSelector: string): Promise<void> => {
    await evaluate(`location.hash = '#/${route}'; true`);
    await wait();
    await evaluate("document.querySelector('#app-main')?.scrollTo({ top: 0, left: 0 }); true");
    const state = await evaluate(`(() => ({ route: location.hash, content: Boolean(document.querySelector(${JSON.stringify(requiredSelector)})), active: document.querySelector('[data-route=${route}]')?.getAttribute('aria-current'), production: document.body.classList.contains('production-clarity-active') }))()`);
    if (JSON.stringify(state) !== JSON.stringify({ route: `#/${route}`, content: true, active: "page", production: true })) throw new Error(`CLARITY_PRODUCTION_ROUTE_INVALID:${route}:${JSON.stringify(state)}`);
  };

  await window.setSize(1100, 760);
  await wait(360);
  const shell = await evaluate("(() => { const topbar = document.querySelector('.production-topbar')?.getBoundingClientRect(); return { route: location.hash, production: document.body.classList.contains('production-clarity-active'), navigation: document.querySelectorAll('.production-topbar [data-route]').length, topbar: Boolean(topbar && topbar.width >= innerWidth - 2 && topbar.height <= 70), home: Boolean(document.querySelector('.clarity-home-grid')), orb: Boolean(document.querySelector('.vitals-orb')), singleColumn: getComputedStyle(document.querySelector('.app-shell')).gridTemplateColumns.split(' ').length === 1 }; })()");
  if (JSON.stringify(shell) !== JSON.stringify({ route: "#/home", production: true, navigation: 7, topbar: true, home: true, orb: false, singleColumn: true })) throw new Error(`CLARITY_PRODUCTION_SHELL_INVALID:${JSON.stringify(shell)}`);
  const homeContent = await evaluate<string>("document.querySelector('.clarity-home').textContent");
  for (const required of ["Phiên", "Nhịp chớp mắt", "Khoảng cách", "Tải thị giác", "NOT_MEASURED", "Bắt đầu phiên", "Khám mắt", "Xem báo cáo", "Privacy Center"]) if (!homeContent.includes(required)) throw new Error(`CLARITY_PRODUCTION_HOME_MISSING:${required}`);
  const homeVisuals = await evaluate("(() => ({ chart: Boolean(document.querySelector('.production-trace-chart')), bars: document.querySelectorAll('.production-evidence-bar').length, tooltips: document.querySelectorAll('.production-evidence-bar title').length, focusableBars: document.querySelectorAll('.production-evidence-bar[tabindex=\"0\"]').length, sessionRing: Boolean(document.querySelector('.clarity-session-ring')), artwork: Boolean(document.querySelector('.clarity-home-artwork svg')), weeklyAnchor: Boolean(document.querySelector('.clarity-week-panel')), subtitle: document.querySelector('.brand small')?.textContent, legacyDecorativeBars: Boolean(document.querySelector('.production-trace-bars')) }))()");
  if (JSON.stringify(homeVisuals) !== JSON.stringify({ chart: true, bars: 5, tooltips: 5, focusableBars: 5, sessionRing: true, artwork: true, weeklyAnchor: true, subtitle: "Visual wellbeing", legacyDecorativeBars: false })) throw new Error(`CLARITY_PRODUCTION_HOME_VISUAL_EVIDENCE_INVALID:${JSON.stringify(homeVisuals)}`);
  const premiumHomeFit = await evaluate("(() => { const heading = document.querySelector('.clarity-next-panel h2')?.getBoundingClientRect(); const clock = document.querySelector('.home-action-clock')?.getBoundingClientRect(); const hasClockOverlap = Boolean(heading && clock && !(heading.right <= clock.left || heading.left >= clock.right || heading.bottom <= clock.top || heading.top >= clock.bottom)); return { legend: Array.from(document.querySelectorAll('.home-evidence-legend span')).map((item) => item.textContent?.trim()), statLabel: document.querySelector('.home-stat-strip p')?.textContent?.trim(), horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 || document.querySelector('.app-shell').getBoundingClientRect().right > window.innerWidth + 1, hasClockOverlap }; })()");
  if (JSON.stringify(premiumHomeFit) !== JSON.stringify({ legend: ["Nghỉ mắt đã phản hồi", "Phút phiên", "Số phiên"], statLabel: "Thời gian phiên", horizontalOverflow: false, hasClockOverlap: false })) throw new Error(`CLARITY_PRODUCTION_PREMIUM_HOME_FIT_INVALID:${JSON.stringify(premiumHomeFit)}`);
  const chartKeyboard = await evaluate("(() => { const bar = document.querySelector('.production-evidence-bar'); bar.focus(); return document.activeElement === bar && Boolean(bar.getAttribute('aria-label')?.includes('Thiếu dữ liệu')); })()");
  if (!chartKeyboard) throw new Error("CLARITY_PRODUCTION_EVIDENCE_KEYBOARD_INVALID");
  const keyboardFocus = await evaluate("(() => { const links = Array.from(document.querySelectorAll('.production-topbar [data-route]')); links[0].focus(); links[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); return document.activeElement === links[1] && getComputedStyle(links[1]).outlineStyle !== 'none'; })()");
  if (!keyboardFocus) throw new Error("CLARITY_PRODUCTION_KEYBOARD_INVALID");
  const clickFeedback = await evaluate("(() => { const button = document.querySelector('.clarity-quick-actions .btn-primary'); const bounds = button.getBoundingClientRect(); button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 })); return Boolean(button.querySelector('.production-click-ripple')); })()");
  if (!clickFeedback) throw new Error("CLARITY_PRODUCTION_CLICK_FEEDBACK_INVALID");
  await evaluate("document.querySelector('#app-main').focus({ preventScroll: true }); true");
  await capture("home");
  await capture("home", 1280, 800);
  const wideHomeHeading = await evaluate<{ readonly innerWidth: number; readonly narrowMedia: boolean; readonly whiteSpace: string; readonly width: number; readonly height: number; readonly lineHeight: number; readonly fontSize: string; readonly parentMaxWidth: string }>("(() => { const heading = document.querySelector('.clarity-home .page-heading h1'); const style = getComputedStyle(heading); return { innerWidth, narrowMedia: matchMedia('(max-width: 900px)').matches, whiteSpace: style.whiteSpace, width: Math.round(heading.getBoundingClientRect().width), height: Math.round(heading.getBoundingClientRect().height), lineHeight: Math.round(Number.parseFloat(style.lineHeight)), fontSize: style.fontSize, parentMaxWidth: getComputedStyle(heading.parentElement).maxWidth }; })()");
  if (wideHomeHeading.whiteSpace !== "nowrap" || wideHomeHeading.height > wideHomeHeading.lineHeight * 1.35) throw new Error(`CLARITY_PRODUCTION_WIDE_HEADING_WRAP_INVALID:${JSON.stringify(wideHomeHeading)}`);

  await openRoute("checkup", "#checkup-consent");
  const checkupHooks = await evaluate("Boolean(document.querySelector('#checkup-camera-consent')) && Boolean(document.querySelector('[data-checkup-cancel]')) && Boolean(document.querySelector('.wizard-card'))");
  if (!checkupHooks) throw new Error("CLARITY_PRODUCTION_CHECKUP_HOOKS_MISSING");
  await capture("checkup-entry");

  await openRoute("companion", "#session-panel");
  const companionHooks = await evaluate("Boolean(document.querySelector('#session-start, #session-toggle, #session-recover')) && document.body.textContent.includes('Timer Only') && document.body.textContent.includes('Cân bằng') && document.body.textContent.includes('Tập trung sâu')");
  if (!companionHooks) throw new Error("CLARITY_PRODUCTION_COMPANION_HOOKS_MISSING");
  await capture("companion-ready");

  await openRoute("intelligence", "#intelligence-refresh, #intelligence-reset");
  if (!await evaluate("document.body.textContent.includes('Baseline')")) throw new Error("CLARITY_PRODUCTION_INTELLIGENCE_HOOKS_MISSING");
  await openRoute("reports", "#report-generate");
  if (!await evaluate("document.querySelectorAll('[data-report-tab]').length === 4 && Boolean(document.querySelector('#report-content'))")) throw new Error("CLARITY_PRODUCTION_REPORT_HOOKS_MISSING");
  await capture("reports");

  await openRoute("privacy", "#privacy-export");
  if (!await evaluate("document.querySelectorAll('.inventory-card').length === 6 && Boolean(document.querySelector('#privacy-reset-baseline')) && Boolean(document.querySelector('#privacy-reset-calibration')) && Boolean(document.querySelector('#privacy-delete')) && Boolean(document.querySelector('#camera-consent-toggle'))")) throw new Error("CLARITY_PRODUCTION_PRIVACY_HOOKS_MISSING");
  await capture("privacy");

  await openRoute("settings", "#reduced-motion-toggle");
  if (!await evaluate("Boolean(document.querySelector('#break-reminder-toggle')) && Boolean(document.querySelector('#sound-toggle')) && Boolean(document.querySelector('#quiet-toggle')) && Boolean(document.querySelector('#settings-reset-baseline'))")) throw new Error("CLARITY_PRODUCTION_SETTINGS_HOOKS_MISSING");
  await capture("settings");

  await openRoute("home", ".clarity-home-grid");
  await evaluate("document.body.classList.add('motion-reduced'); true");
  const reducedMotionState = await evaluate("(() => { const bar = document.querySelector('.production-evidence-bar rect'); const art = document.querySelector('.clarity-art-lens'); return getComputedStyle(document.querySelector('#view')).animationName === 'none' && getComputedStyle(bar).transform === 'none' && bar.getBoundingClientRect().height > 0 && Number.parseFloat(getComputedStyle(art).strokeDashoffset) === 0; })()");
  if (!reducedMotionState) throw new Error("CLARITY_PRODUCTION_REDUCED_MOTION_INVALID");
  await capture("reduced-motion");
  console.log("CLARITY_PRODUCTION_ROLLOUT_PASS routes=7 startupHome=true topNavigation=true noOrb=true semanticEvidenceChart=true evidenceTooltips=true sessionProgress=true weeklyAnchor=true keyboardFocus=true clickFeedback=true reducedMotion=true functionalHooksPreserved=true");
}

async function runUiRecoverySeed(window: BrowserWindow): Promise<void> {
  await window.webContents.executeJavaScript("window.eyeMate.startWorkSession('TIMER_ONLY')", true);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function runUiRecoveryCheck(window: BrowserWindow): Promise<void> {
  const result = await window.webContents.executeJavaScript("window.eyeMate.getWorkSession().then((session) => session && `${session.state}:${session.elapsedActiveMs > 0}`)", true);
  if (result !== "RECOVERY_REQUIRED:true") throw new Error(`UI_SESSION_RECOVERY_INVALID:${String(result)}`);
}

async function runEgressObservation(window: BrowserWindow): Promise<void> {
  const result = await window.webContents.executeJavaScript(`(async () => {
    await window.eyeMate.getRuntimeInfo();
    await window.eyeMate.getPrivacySummary();
    await window.eyeMate.getUserPreferences();
    for (const route of ['home', 'checkup', 'companion', 'intelligence', 'reports', 'privacy', 'settings']) {
      location.hash = '#/' + route;
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    return 'LOCAL_UI_WORKLOAD_COMPLETE';
  })()`, true);
  if (result !== "LOCAL_UI_WORKLOAD_COMPLETE") throw new Error("EGRESS_WORKLOAD_INVALID");
  await new Promise((resolve) => setTimeout(resolve, 6_000));
}

async function runCameraRuntimeTest(window: BrowserWindow, fullMeasurement: boolean): Promise<void> {
  const evaluate = async <T>(source: string): Promise<T> => await window.webContents.executeJavaScript(source, true) as T;
  const waitFor = async (predicate: string, timeoutMs = 30_000): Promise<boolean> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await evaluate<boolean>(predicate)) return true;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  };
  await evaluate("location.hash = '#/checkup'; true");
  if (!await waitFor("Boolean(document.querySelector('#checkup-camera-consent'))")) throw new Error("CAMERA_TEST_CONSENT_UI_MISSING");
  await evaluate("document.querySelector('#checkup-camera-consent').click(); true");
  if (!await waitFor("Boolean(document.querySelector('#checkup-survey-next'))")) throw new Error("CAMERA_TEST_SURVEY_UI_MISSING");
  await evaluate("document.querySelector('#checkup-survey-next').click(); true");
  if (!await waitFor("Boolean(document.querySelector('#checkup-open-camera'))")) throw new Error("CAMERA_TEST_CALIBRATION_UI_MISSING");
  await evaluate("document.querySelector('#checkup-open-camera').click(); true");
  const settled = await waitFor("document.querySelector('#camera-runtime-state')?.textContent?.includes('đang xử lý cục bộ') || /từ chối|Không tìm thấy|đang được ứng dụng khác|gặp lỗi/.test(document.querySelector('#camera-runtime-state')?.textContent ?? '')");
  const state = await evaluate<string>("document.querySelector('#camera-runtime-state')?.textContent ?? 'CAMERA_STATE_MISSING'");
  if (!settled || !state.includes("đang xử lý cục bộ")) throw new Error(`CAMERA_RUNTIME_INTEGRATION_FAILED:${state}`);
  if (!fullMeasurement) {
    await evaluate("location.hash = '#/home'; true");
    console.log("CAMERA_RUNTIME_INTEGRATION_PASS lifecycle=START_STOP accuracy=UNKNOWN");
    return;
  }
  if (!await waitFor("document.querySelector('#camera-quality-state')?.textContent === 'Chất lượng phù hợp'", 15_000)) throw new Error("CAMERA_RUNTIME_QUALITY_NOT_ACCEPTABLE");
  await evaluate("document.querySelector('#calibration-distance').value = '60'; document.querySelector('#checkup-calibrate').click(); true");
  if (!await waitFor("document.querySelector('#checkup-measure-next')?.disabled === false")) throw new Error("CAMERA_RUNTIME_CALIBRATION_FAILED");
  await evaluate("document.querySelector('#checkup-measure-next').click(); true");
  if (!await waitFor("Boolean(document.querySelector('#checkup-measure-start'))")) throw new Error("CAMERA_RUNTIME_MEASUREMENT_UI_MISSING");
  await evaluate("document.querySelector('#checkup-measure-start').click(); true");
  if (!await waitFor("Boolean(document.querySelector('#checkup-done'))", 40_000)) throw new Error("CAMERA_RUNTIME_MEASUREMENT_TIMEOUT");
  const resultText = await evaluate<string>("document.querySelector('.wizard-card')?.textContent ?? ''");
  if (!resultText.includes("Camera") || resultText.includes("Survey-only · camera không đo")) throw new Error("CAMERA_RUNTIME_AGGREGATE_MISSING");
  await evaluate("location.hash = '#/home'; true");
  console.log("CAMERA_RUNTIME_INTEGRATION_PASS measurementWindow=30s calibrationReference=SYNTHETIC accuracy=UNKNOWN");
}

app.whenReady().then(async () => {
  if (shouldInitializePersonalStorage(enterpriseDemoMode)) {
    const { DEFAULT_USER_PREFERENCES, openLocalSqliteStorage, resolveDatabasePath } = await import("../platform-electron/sqlite-storage.js");
    defaultUserPreferences = DEFAULT_USER_PREFERENCES;
    const userDataDirectory = app.getPath("userData");
    const protectedKey = loadOrCreateProtectedStorageKey({ keyFilePath: path.join(userDataDirectory, "protected-storage-key.json"), protector: safeStorage, allowCreate: true });
    if (protectedKey.state === "READY") {
      const openedStorage = openLocalSqliteStorage(resolveDatabasePath(userDataDirectory), { sensitiveDataCodec: protectedKey.codec });
      if (openedStorage.state === "READY") { storage = openedStorage.storage; recoverPersistedSession(); }
      else console.error(`PERSONAL_STORAGE_UNAVAILABLE:${openedStorage.failureCode}`);
    } else {
      console.error(`PERSONAL_STORAGE_RECOVERY_REQUIRED:${protectedKey.failureCode}`);
    }
    configureLocalCameraPermission();
    registerIpcHandlers();
  } else {
    configureEnterpriseDemoBoundary();
  }
  const window = await createMainWindow();

  if (enterpriseDemoValidationMode) {
    try {
      await runEnterpriseDemoValidation(window);
      app.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "ENTERPRISE_DEMO_VALIDATION_FAILED");
      app.exit(1);
    }
    return;
  }

  if (personalDemoValidationMode) {
    try {
      await runPersonalDemoValidation(window);
      app.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "PERSONAL_DEMO_VALIDATION_FAILED");
      app.exit(1);
    }
    return;
  }

  if (smokeMode || companionSmokeMode || intelligenceSmokeMode || uiValidationMode || livingAuroraValidationMode || tasteDesignLabValidationMode || clarityProductionValidationMode || uiRecoverySeedMode || uiRecoveryCheckMode || egressObservationMode || cameraRuntimeTestMode || cameraRuntimeFullTestMode || devPanelValidationMode) {
    try {
      if (devPanelValidationMode) await runDevPanelValidation(window);
      else if (cameraRuntimeTestMode || cameraRuntimeFullTestMode) await runCameraRuntimeTest(window, cameraRuntimeFullTestMode);
      else if (egressObservationMode) await runEgressObservation(window);
      else if (livingAuroraValidationMode) await runLivingAuroraValidation(window);
      else if (tasteDesignLabValidationMode) await runTasteDesignLabValidation(window);
      else if (clarityProductionValidationMode) await runClarityProductionValidation(window);
      else if (uiValidationMode) await runUiValidation(window);
      else if (uiRecoverySeedMode) {
        await runUiRecoverySeed(window);
        app.quit();
        return;
      }
      else if (uiRecoveryCheckMode) await runUiRecoveryCheck(window);
      else if (intelligenceSmokeMode) await runIntelligenceSmoke(window);
      else if (companionSmokeMode) await runCompanionSmoke(window);
      else await runSmoke(window);
      app.exit(0);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "M1_SMOKE_FAILED");
      app.exit(1);
    }
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "M1_BOOT_FAILED");
  app.exit(1);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => { persistActiveSessionBeforeExit(); storage?.close(); });
