import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createSecureWindowOptions } from "./window-options.js";
import type { RuntimeInfo } from "../shared/runtime-contract.js";
import type { CheckupSummary, PrivacySummary, SurveyRequest } from "../shared/m1-contract.js";
import { createSurveyOnlyExportPreview, resolveDeletionResult } from "../user-data/data-controls.js";
import { openLocalSqliteStorage, resolveDatabasePath, type LocalSqliteStorage } from "../platform-electron/sqlite-storage.js";
import { createSurveyDraft, createSurveyOnlyReport, recordSurveyAnswer } from "../symptom-checkup/survey-only.js";
import { evaluateSafetyGate, internalSafetyCatalogue } from "../safety/safety-gate.js";
import { applySessionEvent, createSession, recoverSession, type WorkSession } from "../work-session/session-state.js";
import { decideNudge, type NudgeDecision } from "../work-session/companion-policy.js";
import { createSessionSummary } from "../work-session/session-summary.js";
import { InProcessNudgeAdapter } from "../work-session/nudge-adapter.js";
import { DEFAULT_TIMER_ONLY_CONFIG } from "../work-session/companion-config.js";
import { fromSurveyOnly, fromWorkSession } from "../personal-intelligence/source-adapter.js";
import { validateAnalyticsInput, type AnalyticsInput } from "../personal-intelligence/analytics.js";
import { buildPersonalReport, renderProfessionalSummary, type PersonalReport } from "../personal-intelligence/report-service.js";
import { writeLocalExport, type LocalExportFormat } from "../platform-electron/local-export.js";
import type { NudgeResponse } from "../platform-electron/sqlite-storage.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererIndexPath = path.join(currentDirectory, "../renderer/index.html");
const preloadPath = path.join(currentDirectory, "../preload/preload.js");
const smokeMode = process.argv.includes("--m1-smoke");
const companionSmokeMode = process.argv.includes("--m2-smoke");

if (smokeMode || companionSmokeMode) {
  app.disableHardwareAcceleration();
}

function getRuntimeInfo(): RuntimeInfo {
  return {
    mode: "LOCAL_ONLY",
    applicationVersion: app.getVersion()
  };
}

let storage: LocalSqliteStorage | null = null;
let workSession: WorkSession | null = null;
let sessionMonotonicMs = 0;
let lastNudgeMonotonicMs: number | null = null;
let nudgesInSession = 0;
const nudgeAdapter = new InProcessNudgeAdapter();
const sessionNow = (): number => { sessionMonotonicMs += 1; return sessionMonotonicMs; };

function updateWorkSession(event: "START" | "STARTED" | "PAUSE" | "RESUME" | "FINISH" | "CANCEL"): WorkSession {
  const now = sessionNow();
  if (workSession === null) workSession = createSession(`session-${randomUUID().slice(0, 8)}`, "TIMER_ONLY");
  workSession = applySessionEvent(workSession, event, now);
  storage?.saveSession({ sessionId: workSession.id, modeId: workSession.modeId, state: workSession.state, elapsedActiveMs: workSession.elapsedActiveMs, updatedAt: new Date().toISOString() });
  if (workSession.state === "COMPLETED" || workSession.state === "CANCELLED") {
    const createdAt = new Date().toISOString();
    const summary = createSessionSummary(workSession, "m2-companion-policy/0.1.0");
    const summaryId = `summary-${randomUUID().slice(0, 8)}`;
    storage?.saveSessionSummary({ summaryId, sessionId: workSession.id, status: summary.timerOutcome, elapsedActiveMs: summary.durationActiveMs, createdAt, summaryJson: JSON.stringify(summary) });
    const source = fromWorkSession({ summaryId, sessionId: workSession.id, elapsedActiveMs: summary.durationActiveMs, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: summary.schemaVersion });
    storage?.saveM3Record({ id: `source-${summaryId}`, kind: "SOURCE", createdAt, payloadJson: JSON.stringify(source) });
  }
  return workSession;
}

function startWorkSession(modeId: WorkSession["modeId"] = "TIMER_ONLY"): WorkSession {
  if (!["BALANCED", "DEEP_FOCUS", "HIGH_SUPPORT", "TIMER_ONLY", "CUSTOM"].includes(modeId)) throw new Error("INVALID_WORK_MODE");
  if (workSession === null || ["COMPLETED", "CANCELLED", "FAILED"].includes(workSession.state)) workSession = createSession(`session-${randomUUID().slice(0, 8)}`, modeId);
  updateWorkSession("START");
  return updateWorkSession("STARTED");
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
  const decision = decideNudge({ mode: workSession.modeId, minuteOfDay: 600, cooldownMinutes: DEFAULT_TIMER_ONLY_CONFIG.cooldownMinutes, frequencyCap: DEFAULT_TIMER_ONLY_CONFIG.maxNudgesPerSession, nowMonotonicMs: now, lastNudgeMonotonicMs, nudgesInWindow: nudgesInSession, signal: "SUFFICIENT", nudgeType: "BREAK_REMINDER", enabledNudgeTypes: DEFAULT_TIMER_ONLY_CONFIG.enabledNudgeTypes });
  const nudgeId = `nudge-${workSession.id}-break-${nudgesInSession + 1}`;
  if (decision.action === "EMIT") {
    lastNudgeMonotonicMs = now;
    nudgesInSession += 1;
    const delivery = nudgeAdapter.deliver({ nudgeId, sessionId: workSession.id, actionKey: "TAKE_SHORT_BREAK", policyVersion: decision.policyVersion });
    storage?.recordNudge({ nudgeId, sessionId: workSession.id, decision: decision.action, reason: decision.reason, policyVersion: decision.policyVersion, createdAt: new Date().toISOString(), action: decision.suggestedActionKey, deliveryState: delivery.state === "DELIVERED" ? "EMITTED" : "ABSTAINED" });
  }
  return { ...decision, nudgeId };
}

function getPrivacySummary(): PrivacySummary {
  const consent = storage?.loadCameraConsent();
  const preview = createSurveyOnlyExportPreview();
  return {
    localOnly: true,
    cameraState: consent?.decision === "GRANTED" ? "CAMERA_UNAVAILABLE" : "SKIPPED_NO_CONSENT",
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
  const createdAt = new Date().toISOString();
  const reportId = randomUUID();
  storage?.saveSurveyOnlyReport({ reportId, status: report.status, action: report.action, provenanceVersion: report.provenance.reportSchemaVersion, createdAt });
  const source = fromSurveyOnly({ reportId, createdAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", schemaVersion: report.provenance.reportSchemaVersion, symptomBurden: null });
  storage?.saveM3Record({ id: `source-${reportId}`, kind: "SOURCE", createdAt, payloadJson: JSON.stringify(source) });
  return { status: report.status, source: report.source, camera: report.coverage.camera, action: report.action, missingData: report.missingData };
}

function completeOnboardingWithoutCamera(): void {
  if (storage === null) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
  const now = new Date().toISOString();
  storage.save({ stage: "COMPLETE", updatedAt: now });
  storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "SKIPPED", decidedAt: now });
}

function withdrawCameraConsent(): void {
  if (storage === null) throw new Error("LOCAL_STORAGE_UNAVAILABLE");
  storage.saveCameraConsent({ purpose: "CAMERA_MEASUREMENT", scope: "LOCAL_CAMERA", textVersion: "m1-camera-1", decision: "WITHDRAWN", decidedAt: new Date().toISOString() });
}

function analyticsInputs(): readonly AnalyticsInput[] {
  return (storage?.listM3Records("SOURCE") ?? []).flatMap((record) => { try { return [validateAnalyticsInput(JSON.parse(record.payloadJson) as AnalyticsInput)]; } catch { return []; } });
}

function generateM3Report(): PersonalReport {
  const inputs = analyticsInputs();
  const timezone = inputs[0]?.timezone ?? "UTC";
  const now = new Date().toISOString();
  const report = buildPersonalReport(inputs, now.slice(0, 10), timezone, now);
  storage?.saveM3Record({ id: `report-${randomUUID().slice(0, 12)}`, kind: "REPORT", createdAt: now, payloadJson: JSON.stringify(report) });
  return report;
}

function listM3Reports(): readonly PersonalReport[] {
  return (storage?.listM3Records("REPORT") ?? []).flatMap((record) => { try { return [JSON.parse(record.payloadJson) as PersonalReport]; } catch { return []; } });
}

function registerIpcHandlers(): void {
  ipcMain.handle("runtime:get-info", (): RuntimeInfo => getRuntimeInfo());
  ipcMain.handle("privacy:get-summary", (): PrivacySummary => getPrivacySummary());
  ipcMain.handle("checkup:run-survey-only", (_event, request: SurveyRequest): CheckupSummary => runSurveyOnly(request));
  ipcMain.handle("onboarding:complete-without-camera", (): void => completeOnboardingWithoutCamera());
  ipcMain.handle("privacy:withdraw-camera-consent", (): void => withdrawCameraConsent());
  ipcMain.handle("privacy:delete-all-local-data", (): "DELETED" | "PARTIALLY_DELETED" | "FAILED" => storage?.deleteAllLocalData() ?? "FAILED");
  ipcMain.handle("reports:list-survey-only", () => storage?.listSurveyOnlyReports() ?? []);
  ipcMain.handle("work-session:start", (_event, modeId?: WorkSession["modeId"]) => startWorkSession(modeId));
  ipcMain.handle("work-session:pause", () => updateWorkSession("PAUSE"));
  ipcMain.handle("work-session:resume", () => updateWorkSession("RESUME"));
  ipcMain.handle("work-session:finish", () => updateWorkSession("FINISH"));
  ipcMain.handle("work-session:cancel", () => updateWorkSession("CANCEL"));
  ipcMain.handle("work-session:get", () => workSession);
  ipcMain.handle("work-session:list-summaries", () => storage?.listSessionSummaries() ?? []);
  ipcMain.handle("work-session:request-break-nudge", () => requestBreakNudge());
  ipcMain.handle("work-session:respond-nudge", (_event, nudgeId: string, response: NudgeResponse) => storage?.recordNudgeResponse(nudgeId, response, new Date().toISOString()) ?? false);
  ipcMain.handle("m3:generate-report", () => generateM3Report());
  ipcMain.handle("m3:list-reports", () => listM3Reports());
  ipcMain.handle("m3:preview-professional-summary", () => renderProfessionalSummary(generateM3Report()));
  ipcMain.handle("m3:reset-baseline", () => storage?.deleteM3Records("BASELINE") ?? "DELETED");
  ipcMain.handle("m3:delete-data", () => storage?.deleteM3Records() ?? "DELETED");
  ipcMain.handle("m3:export", (_event, destination: string, format: LocalExportFormat) => { const report = generateM3Report(); const content = format === "JSON" ? JSON.stringify(report, null, 2) : renderProfessionalSummary(report); return writeLocalExport(destination, content); });
}

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow(createSecureWindowOptions(preloadPath));
  await window.loadFile(rendererIndexPath);
  window.show();
  return window;
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

app.whenReady().then(async () => {
  const openedStorage = openLocalSqliteStorage(resolveDatabasePath(app.getPath("userData")));
  if (openedStorage.state === "READY") { storage = openedStorage.storage; recoverPersistedSession(); }
  registerIpcHandlers();
  const window = await createMainWindow();

  if (smokeMode || companionSmokeMode) {
    try {
      if (companionSmokeMode) await runCompanionSmoke(window);
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

app.on("before-quit", () => storage?.close());
