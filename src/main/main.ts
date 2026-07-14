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
import { applySessionEvent, createSession, type WorkSession } from "../work-session/session-state.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const rendererIndexPath = path.join(currentDirectory, "../renderer/index.html");
const preloadPath = path.join(currentDirectory, "../preload/preload.js");
const smokeMode = process.argv.includes("--m1-smoke");

if (smokeMode) {
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
const sessionNow = (): number => { sessionMonotonicMs += 1; return sessionMonotonicMs; };

function updateWorkSession(event: "START" | "STARTED" | "PAUSE" | "RESUME" | "FINISH"): WorkSession {
  const now = sessionNow();
  if (workSession === null) workSession = createSession(`session-${randomUUID().slice(0, 8)}`, "TIMER_ONLY");
  workSession = applySessionEvent(workSession, event, now);
  storage?.saveSession({ sessionId: workSession.id, modeId: workSession.modeId, state: workSession.state, elapsedActiveMs: workSession.elapsedActiveMs, updatedAt: new Date().toISOString() });
  if (workSession.state === "COMPLETED") storage?.saveSessionSummary({ summaryId: `summary-${randomUUID().slice(0, 8)}`, sessionId: workSession.id, status: "COMPLETED", elapsedActiveMs: workSession.elapsedActiveMs, createdAt: new Date().toISOString() });
  return workSession;
}

function startWorkSession(): WorkSession {
  updateWorkSession("START");
  return updateWorkSession("STARTED");
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
  storage?.saveSurveyOnlyReport({ reportId: randomUUID(), status: report.status, action: report.action, provenanceVersion: report.provenance.reportSchemaVersion, createdAt: new Date().toISOString() });
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

function registerIpcHandlers(): void {
  ipcMain.handle("runtime:get-info", (): RuntimeInfo => getRuntimeInfo());
  ipcMain.handle("privacy:get-summary", (): PrivacySummary => getPrivacySummary());
  ipcMain.handle("checkup:run-survey-only", (_event, request: SurveyRequest): CheckupSummary => runSurveyOnly(request));
  ipcMain.handle("onboarding:complete-without-camera", (): void => completeOnboardingWithoutCamera());
  ipcMain.handle("privacy:withdraw-camera-consent", (): void => withdrawCameraConsent());
  ipcMain.handle("privacy:delete-all-local-data", (): "DELETED" | "PARTIALLY_DELETED" | "FAILED" => storage?.deleteAllLocalData() ?? "FAILED");
  ipcMain.handle("reports:list-survey-only", () => storage?.listSurveyOnlyReports() ?? []);
  ipcMain.handle("work-session:start", () => startWorkSession());
  ipcMain.handle("work-session:pause", () => updateWorkSession("PAUSE"));
  ipcMain.handle("work-session:resume", () => updateWorkSession("RESUME"));
  ipcMain.handle("work-session:finish", () => updateWorkSession("FINISH"));
  ipcMain.handle("work-session:get", () => workSession);
  ipcMain.handle("work-session:list-summaries", () => storage?.listSessionSummaries() ?? []);
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

app.whenReady().then(async () => {
  const openedStorage = openLocalSqliteStorage(resolveDatabasePath(app.getPath("userData")));
  if (openedStorage.state === "READY") storage = openedStorage.storage;
  registerIpcHandlers();
  const window = await createMainWindow();

  if (smokeMode) {
    try {
      await runSmoke(window);
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
