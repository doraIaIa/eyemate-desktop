import { contextBridge, ipcRenderer } from "electron";
import type { EyeMatePreloadApi } from "../shared/preload-contract.js";
import { isRuntimeInfo } from "../shared/runtime-contract.js";
import { isCheckupSummary, isPrivacySummary, type SurveyRequest } from "../shared/m1-contract.js";

const eyeMateApi: EyeMatePreloadApi = {
  async getRuntimeInfo() {
    const result: unknown = await ipcRenderer.invoke("runtime:get-info");
    if (!isRuntimeInfo(result)) {
      throw new Error("PRELOAD_RUNTIME_CONTRACT_INVALID");
    }
    return result;
  },
  async getPrivacySummary() {
    const result: unknown = await ipcRenderer.invoke("privacy:get-summary");
    if (!isPrivacySummary(result)) throw new Error("PRELOAD_PRIVACY_CONTRACT_INVALID");
    return result;
  },
  async runSurveyOnly(request: SurveyRequest) {
    const result: unknown = await ipcRenderer.invoke("checkup:run-survey-only", request);
    if (!isCheckupSummary(result)) throw new Error("PRELOAD_CHECKUP_CONTRACT_INVALID");
    return result;
  },
  async completeOnboardingWithoutCamera() {
    await ipcRenderer.invoke("onboarding:complete-without-camera");
  },
  async withdrawCameraConsent() {
    await ipcRenderer.invoke("privacy:withdraw-camera-consent");
  },
  async deleteAllLocalData() {
    const result: unknown = await ipcRenderer.invoke("privacy:delete-all-local-data");
    if (result !== "DELETED" && result !== "PARTIALLY_DELETED" && result !== "FAILED") throw new Error("PRELOAD_DELETE_RESULT_INVALID");
    return result;
  },
  async listSurveyOnlyReports() {
    const result: unknown = await ipcRenderer.invoke("reports:list-survey-only");
    if (!Array.isArray(result) || !result.every((value) => typeof value === "object" && value !== null)) throw new Error("PRELOAD_REPORT_LIST_INVALID");
    return result as readonly { readonly status: string; readonly action: string; readonly createdAt: string }[];
  },
  async startWorkSession() { return await ipcRenderer.invoke("work-session:start"); },
  async pauseWorkSession() { return await ipcRenderer.invoke("work-session:pause"); },
  async resumeWorkSession() { return await ipcRenderer.invoke("work-session:resume"); },
  async finishWorkSession() { return await ipcRenderer.invoke("work-session:finish"); },
  async getWorkSession() { return await ipcRenderer.invoke("work-session:get"); },
  async listSessionSummaries() { const result: unknown = await ipcRenderer.invoke("work-session:list-summaries"); if (!Array.isArray(result)) throw new Error("PRELOAD_SUMMARY_LIST_INVALID"); return result as readonly { readonly summaryId: string; readonly sessionId: string; readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]; }
};

contextBridge.exposeInMainWorld("eyeMate", Object.freeze(eyeMateApi));
