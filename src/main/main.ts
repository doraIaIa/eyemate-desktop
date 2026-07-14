import { app, BrowserWindow, dialog, ipcMain, safeStorage, session } from "electron";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createSecureWindowOptions } from "./window-options.js";
import type { RuntimeInfo } from "../shared/runtime-contract.js";
import { EYEMATE_APPLICATION_VERSION } from "../shared/product-meta.js";
import type { CheckupSummary, PrivacySummary, SurveyRequest } from "../shared/m1-contract.js";
import { createSurveyOnlyExportPreview, resolveDeletionResult } from "../user-data/data-controls.js";
import { DEFAULT_USER_PREFERENCES, openLocalSqliteStorage, resolveDatabasePath, type LocalSqliteStorage } from "../platform-electron/sqlite-storage.js";
import type { M3DataCategory, UserPreferences } from "../shared/preload-contract.js";
import { createSurveyDraft, createSurveyOnlyReport, recordSurveyAnswer } from "../symptom-checkup/survey-only.js";
import { evaluateSafetyGate, internalSafetyCatalogue } from "../safety/safety-gate.js";
import { applySessionEvent, createSession, recoverSession, tickSession, type WorkSession } from "../work-session/session-state.js";
import { decideNudge, type NudgeDecision } from "../work-session/companion-policy.js";
import { createSessionSummary } from "../work-session/session-summary.js";
import { InProcessNudgeAdapter } from "../work-session/nudge-adapter.js";
import { DEFAULT_TIMER_ONLY_CONFIG } from "../work-session/companion-config.js";
import { fromSurveyOnly, fromWorkSession } from "../personal-intelligence/source-adapter.js";
import { localDateFor, validateAnalyticsInput, type AnalyticsInput } from "../personal-intelligence/analytics.js";
import { buildPersonalReport, renderProfessionalSummary, type PersonalReport } from "../personal-intelligence/report-service.js";
import { writeLocalExport, type LocalExportFormat } from "../platform-electron/local-export.js";
import type { NudgeResponse } from "../platform-electron/sqlite-storage.js";
import { loadOrCreateProtectedStorageKey } from "../platform-electron/storage-crypto.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererIndexPath = path.join(currentDirectory, "../renderer/index.html");
const preloadPath = path.join(currentDirectory, "../preload/preload.js");
const smokeMode = process.argv.includes("--m1-smoke");
const companionSmokeMode = process.argv.includes("--m2-smoke");
const intelligenceSmokeMode = process.argv.includes("--m3-smoke");
const uiValidationMode = process.argv.includes("--ui-validate");
const uiRecoverySeedMode = process.argv.includes("--ui-recovery-seed");
const uiRecoveryCheckMode = process.argv.includes("--ui-recovery-check");
const egressObservationMode = process.argv.includes("--egress-observe");
const cameraRuntimeTestMode = process.argv.includes("--camera-runtime-test");
const uiCaptureArgument = process.argv.find((argument) => argument.startsWith("--ui-screenshot-dir="));
const uiScreenshotDirectory = uiCaptureArgument?.slice("--ui-screenshot-dir=".length) ?? null;

if (smokeMode || companionSmokeMode || intelligenceSmokeMode || uiValidationMode || uiRecoverySeedMode || uiRecoveryCheckMode || egressObservationMode) {
  app.disableHardwareAcceleration();
}

function getRuntimeInfo(): RuntimeInfo {
  return {
    mode: "LOCAL_ONLY",
    applicationVersion: EYEMATE_APPLICATION_VERSION
  };
}

let storage: LocalSqliteStorage | null = null;
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

function updateWorkSession(event: "START" | "STARTED" | "PAUSE" | "RESUME" | "FINISH" | "CANCEL"): WorkSession {
  const now = sessionNow();
  if (workSession === null) workSession = createSession(`session-${randomUUID().slice(0, 8)}`, "TIMER_ONLY");
  const previousState = workSession.state;
  workSession = applySessionEvent(workSession, event, now);
  storage?.saveSession({ sessionId: workSession.id, modeId: workSession.modeId, state: workSession.state, elapsedActiveMs: workSession.elapsedActiveMs, updatedAt: currentIso() });
  if (workSession.state !== previousState && (workSession.state === "COMPLETED" || workSession.state === "CANCELLED")) {
    const createdAt = currentIso();
    const summary = createSessionSummary(workSession, "m2-companion-policy/0.1.0");
    const summaryId = `summary-${randomUUID().slice(0, 8)}`;
    storage?.saveSessionSummary({ summaryId, sessionId: workSession.id, status: summary.timerOutcome, elapsedActiveMs: summary.durationActiveMs, createdAt, summaryJson: JSON.stringify(summary) });
    if (workSession.state === "COMPLETED" && summary.durationActiveMs > 0) {
      const source = fromWorkSession({ summaryId, sessionId: workSession.id, elapsedActiveMs: summary.durationActiveMs, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: summary.schemaVersion });
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
}

function requestBreakNudge(): NudgeDecision & { readonly nudgeId: string } {
  if (workSession?.state !== "ACTIVE") throw new Error("SESSION_NOT_ACTIVE");
  const now = sessionNow();
  const preferences = storage?.loadUserPreferences() ?? DEFAULT_USER_PREFERENCES;
  const localNow = new Date();
  const decision = decideNudge({ mode: workSession.modeId, minuteOfDay: localNow.getHours() * 60 + localNow.getMinutes(), quietHours: preferences.quietHoursEnabled ? { startMinute: preferences.quietStartMinute, endMinute: preferences.quietEndMinute } : undefined, cooldownMinutes: DEFAULT_TIMER_ONLY_CONFIG.cooldownMinutes, frequencyCap: DEFAULT_TIMER_ONLY_CONFIG.maxNudgesPerSession, nowMonotonicMs: now, lastNudgeMonotonicMs, nudgesInWindow: nudgesInSession, signal: "SUFFICIENT", nudgeType: "BREAK_REMINDER", enabledNudgeTypes: preferences.breakReminderEnabled ? ["BREAK_REMINDER"] : [] });
  const nudgeId = `nudge-${workSession.id}-break-${nudgesInSession + 1}`;
  if (decision.action === "EMIT") {
    lastNudgeMonotonicMs = now;
    nudgesInSession += 1;
    const delivery = nudgeAdapter.deliver({ nudgeId, sessionId: workSession.id, actionKey: "TAKE_SHORT_BREAK", policyVersion: decision.policyVersion });
    storage?.recordNudge({ nudgeId, sessionId: workSession.id, decision: decision.action, reason: decision.reason, policyVersion: decision.policyVersion, createdAt: currentIso(), action: decision.suggestedActionKey, deliveryState: delivery.state === "DELIVERED" ? "EMITTED" : "ABSTAINED" });
  }
  return { ...decision, nudgeId };
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

function runSurveyOnly(request: SurveyRequest): CheckupSummary {
  const allowed = ["NONE", "MILD", "NOTICEABLE", "UNSURE", "PREFER_NOT_TO_ANSWER"];
  if (!allowed.includes(request.response) || !["CONFIRMED", "NEGATIVE", "UNSURE", "PREFER_NOT_TO_ANSWER"].includes(request.safety)) throw new Error("INVALID_SURVEY_REQUEST");
  if (storage?.load()?.stage !== "COMPLETE") throw new Error("ONBOARDING_REQUIRED");
  const safety = evaluateSafetyGate({ answers: { safety_signal_a: request.safety, safety_signal_b: "NEGATIVE" } }, internalSafetyCatalogue);
  const draft = recordSurveyAnswer(createSurveyDraft(), "comfort_now", request.response);
  const report = createSurveyOnlyReport(draft, safety.outcome);
  const createdAt = currentIso();
  const reportId = randomUUID();
  storage?.saveSurveyOnlyReport({ reportId, status: report.status, action: report.action, provenanceVersion: report.provenance.reportSchemaVersion, createdAt });
  const source = fromSurveyOnly({ reportId, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: report.provenance.reportSchemaVersion, symptomBurden: null });
  storage?.saveM3Record({ id: `source-${reportId}`, kind: "SOURCE", createdAt, payloadJson: JSON.stringify(source) });
  return { status: report.status, source: report.source, camera: report.coverage.camera, action: report.action, missingData: report.missingData };
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
  storage?.saveM3Record({ id: `report-${randomUUID().slice(0, 12)}`, kind: "REPORT", createdAt: now, payloadJson: JSON.stringify(report) });
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

function registerIpcHandlers(): void {
  ipcMain.handle("runtime:get-info", (): RuntimeInfo => getRuntimeInfo());
  ipcMain.handle("privacy:get-summary", (): PrivacySummary => getPrivacySummary());
  ipcMain.handle("checkup:run-survey-only", (_event, request: SurveyRequest): CheckupSummary => runSurveyOnly(request));
  ipcMain.handle("onboarding:grant-camera-consent", (): void => grantCameraConsent());
  ipcMain.handle("onboarding:complete-without-camera", (): void => completeOnboardingWithoutCamera());
  ipcMain.handle("privacy:withdraw-camera-consent", (): void => withdrawCameraConsent());
  ipcMain.handle("privacy:delete-all-local-data", (): "DELETED" | "PARTIALLY_DELETED" | "FAILED" => storage?.deleteAllLocalData() ?? "FAILED");
  ipcMain.handle("reports:list-survey-only", () => storage?.listSurveyOnlyReports() ?? []);
  ipcMain.handle("work-session:start", (_event, modeId?: WorkSession["modeId"]) => startWorkSession(modeId));
  ipcMain.handle("work-session:pause", () => updateWorkSession("PAUSE"));
  ipcMain.handle("work-session:resume", () => updateWorkSession("RESUME"));
  ipcMain.handle("work-session:finish", () => finishWorkSession());
  ipcMain.handle("work-session:cancel", () => updateWorkSession("CANCEL"));
  ipcMain.handle("work-session:get", () => workSession);
  ipcMain.handle("work-session:list-summaries", () => storage?.listSessionSummaries() ?? []);
  ipcMain.handle("work-session:request-break-nudge", () => requestBreakNudge());
  ipcMain.handle("work-session:respond-nudge", (_event, nudgeId: string, response: NudgeResponse) => storage?.recordNudgeResponse(nudgeId, response, currentIso()) ?? false);
  ipcMain.handle("m3:generate-report", () => generateM3Report());
  ipcMain.handle("m3:list-reports", () => listM3Reports());
  ipcMain.handle("m3:preview-professional-summary", (_event, format: LocalExportFormat = "MARKDOWN") => {
    if (!["JSON", "MARKDOWN"].includes(format)) throw new Error("INVALID_M3_PREVIEW_FORMAT");
    const report = currentM3Report();
    return format === "JSON" ? JSON.stringify(report, null, 2) : renderProfessionalSummary(report);
  });
  ipcMain.handle("m3:reset-baseline", () => { const now = currentIso(); storage?.saveM3Record({ id: `baseline-reset-${randomUUID().slice(0, 12)}`, kind: "BASELINE", createdAt: now, payloadJson: JSON.stringify({ state: "RESET", version: "m3-baseline/0.1.0" }) }); return "DELETED"; });
  ipcMain.handle("m3:delete-data", () => storage?.deleteM3Records() ?? "DELETED");
  ipcMain.handle("m3:delete-category", (_event, category: M3DataCategory) => {
    if (!["BASELINE", "PATTERN", "SUMMARY", "REPORT", "ALL"].includes(category)) throw new Error("INVALID_M3_DATA_CATEGORY");
    return storage?.deleteM3Category(category) ?? "DELETED";
  });
  ipcMain.handle("m3:export", (_event, destination: string, format: LocalExportFormat, includeEvidence: boolean) => {
    if (typeof destination !== "string" || !["JSON", "MARKDOWN"].includes(format) || typeof includeEvidence !== "boolean") throw new Error("INVALID_M3_EXPORT_REQUEST");
    const report = currentM3Report();
    const exportReport = includeEvidence ? report : { ...report, evidenceSourceIds: [], missingData: [], limitations: ["EVIDENCE_OMITTED_BY_USER"] };
    const content = format === "JSON" ? JSON.stringify(exportReport, null, 2) : renderProfessionalSummary(exportReport);
    return writeLocalExport(destination, content);
  });
  ipcMain.handle("m3:export-with-dialog", async (_event, format: LocalExportFormat, includeEvidence: boolean) => {
    if (!["JSON", "MARKDOWN"].includes(format) || typeof includeEvidence !== "boolean") throw new Error("INVALID_M3_EXPORT_REQUEST");
    const selected = await dialog.showSaveDialog({
      title: "Export EyeMate Personal Summary",
      defaultPath: `eyemate-summary.${format === "JSON" ? "json" : "md"}`,
      filters: [{ name: format === "JSON" ? "JSON" : "Markdown", extensions: [format === "JSON" ? "json" : "md"] }],
      properties: ["showOverwriteConfirmation", "createDirectory"]
    });
    if (selected.canceled || !selected.filePath) return { status: "CANCELLED", reason: "USER_CANCELLED" };
    const report = currentM3Report();
    const exportReport = includeEvidence ? report : { ...report, evidenceSourceIds: [], missingData: [], limitations: ["EVIDENCE_OMITTED_BY_USER"] };
    const content = format === "JSON" ? JSON.stringify(exportReport, null, 2) : renderProfessionalSummary(exportReport);
    return writeLocalExport(selected.filePath, content);
  });
  ipcMain.handle("settings:get", () => storage?.loadUserPreferences() ?? DEFAULT_USER_PREFERENCES);
  ipcMain.handle("settings:update", (_event, preferences: UserPreferences) => {
    if (typeof preferences !== "object" || preferences === null) throw new Error("INVALID_USER_PREFERENCES");
    return storage?.saveUserPreferences(preferences) ?? DEFAULT_USER_PREFERENCES;
  });
  ipcMain.handle("privacy:get-data-inventory", () => storage?.getDataInventory() ?? []);
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow(createSecureWindowOptions(preloadPath));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  await window.loadFile(rendererIndexPath);
  window.show();
  return window;
}

function configureLocalCameraPermission(): void {
  const isAllowed = (webContentsUrl: string): boolean => webContentsUrl.startsWith("file:") && storage?.loadCameraConsent()?.decision === "GRANTED";
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => permission === "media" && webContents !== null && isAllowed(webContents.getURL()));
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(permission === "media" && isAllowed(webContents.getURL())));
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
    "window.eyeMate.completeOnboardingWithoutCamera().then(() => window.eyeMate.runSurveyOnly({ response: 'MILD', safety: 'NEGATIVE' })).then((value) => `${value.status}:${value.source}:${value.camera}`)",
    true
  );
  if (surveyResult !== "COMPLETED:SURVEY_ONLY:NOT_MEASURED") {
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
    await window.eyeMate.runSurveyOnly({ response: 'MILD', safety: 'NEGATIVE' });
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
  const capture = async (name: string, width = 1280, height = 800): Promise<void> => {
    if (uiScreenshotDirectory === null) return;
    window.setSize(width, height);
    await wait(420);
    if (name === "session-active") await evaluate("(() => { const timer = document.querySelector('.session-panel .session-timer'); timer.textContent = '00:00:01'; timer.removeAttribute('id'); const progress = document.querySelector('.session-panel .session-progress span'); if (progress) progress.style.setProperty('--progress', '1%'); return true; })()");
    requireTrue(await evaluate("document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.app-shell').getBoundingClientRect().right <= window.innerWidth + 1"), `UI_LAYOUT_OVERFLOW_${width}x${height}`);
    const image = await window.webContents.capturePage();
    await mkdir(uiScreenshotDirectory, { recursive: true });
    await writeFile(path.join(uiScreenshotDirectory, `${name}-${width}x${height}.png`), image.toPNG());
  };

  await wait(300);
  requireTrue(await evaluate("location.hash === '#/home' && Boolean(document.querySelector('.vitals-orb'))"), "UI_HOME_ROUTE_INVALID");
  await capture("home");
  await capture("home", 1024, 768);

  await evaluate("document.querySelector('[data-route=checkup]').click(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/checkup' && Boolean(document.querySelector('#checkup-consent'))"), "UI_CHECKUP_ROUTE_INVALID");
  await evaluate("document.querySelector('#checkup-consent').click(); true"); await wait();
  await evaluate("document.querySelector('input[value=MILD]').click(); document.querySelector('#checkup-survey-next').click(); true"); await wait();
  await evaluate("document.querySelector('#checkup-camera-next').click(); true"); await wait();
  const checkupsBefore = await evaluate<number>("window.eyeMate.listSurveyOnlyReports().then((items) => items.length)");
  await evaluate("document.querySelector('#checkup-finish').click(); document.querySelector('#checkup-finish').click(); true"); await wait(350);
  requireTrue(await evaluate("Boolean(document.querySelector('#checkup-done')) && document.body.textContent.includes('Survey-only')"), "UI_CHECKUP_FLOW_INVALID");
  requireTrue(await evaluate(`window.eyeMate.listSurveyOnlyReports().then((items) => items.length === ${checkupsBefore + 1})`), "UI_CHECKUP_DOUBLE_SUBMIT_INVALID");
  await capture("checkup-result");
  await capture("checkup-result", 1024, 768);
  await capture("checkup-result");
  await evaluate("document.querySelector('#checkup-repeat').click(); document.querySelector('[data-checkup-cancel]').click(); true"); await wait();
  requireTrue(await evaluate("location.hash === '#/home'"), "UI_CHECKUP_CANCEL_INVALID");

  await evaluate("document.querySelector('[data-route=companion]').click(); true"); await wait();
  await evaluate("document.querySelector('#session-start').click(); true"); await wait(300);
  requireTrue(await evaluate("Boolean(document.querySelector('#session-toggle')) && document.body.textContent.includes('Phiên đang hoạt động')"), "UI_SESSION_START_INVALID");
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
  await evaluate("document.querySelector('[data-nudge=ACCEPTED]').click(); document.querySelector('#session-end').click(); true"); await wait();
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
  requireTrue(await evaluate("Boolean(document.querySelector('#intelligence-reset')) && document.body.textContent.includes('Visual Load Index')"), "UI_INTELLIGENCE_INVALID");
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

  await evaluate("document.querySelector('[data-route=privacy]').click(); true"); await wait();
  requireTrue(await evaluate("document.querySelectorAll('.inventory-card').length === 5"), "UI_DATA_INVENTORY_INVALID");
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

async function runCameraRuntimeTest(window: BrowserWindow): Promise<void> {
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
  await evaluate("location.hash = '#/home'; true");
  if (!settled || !state.includes("đang xử lý cục bộ")) throw new Error(`CAMERA_RUNTIME_INTEGRATION_FAILED:${state}`);
  console.log("CAMERA_RUNTIME_INTEGRATION_PASS");
}

app.whenReady().then(async () => {
  const userDataDirectory = app.getPath("userData");
  const protectedKey = loadOrCreateProtectedStorageKey({ keyFilePath: path.join(userDataDirectory, "protected-storage-key.json"), protector: safeStorage, allowCreate: true });
  if (protectedKey.state !== "READY") throw new Error(protectedKey.failureCode);
  const openedStorage = openLocalSqliteStorage(resolveDatabasePath(userDataDirectory), { sensitiveDataCodec: protectedKey.codec });
  if (openedStorage.state === "READY") { storage = openedStorage.storage; recoverPersistedSession(); }
  configureLocalCameraPermission();
  registerIpcHandlers();
  const window = await createMainWindow();

  if (smokeMode || companionSmokeMode || intelligenceSmokeMode || uiValidationMode || uiRecoverySeedMode || uiRecoveryCheckMode || egressObservationMode || cameraRuntimeTestMode) {
    try {
      if (cameraRuntimeTestMode) await runCameraRuntimeTest(window);
      else if (egressObservationMode) await runEgressObservation(window);
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
