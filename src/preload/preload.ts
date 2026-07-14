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
  async startWorkSession(modeId) { return await ipcRenderer.invoke("work-session:start", modeId); },
  async pauseWorkSession() { return await ipcRenderer.invoke("work-session:pause"); },
  async resumeWorkSession() { return await ipcRenderer.invoke("work-session:resume"); },
  async finishWorkSession() { return await ipcRenderer.invoke("work-session:finish"); },
  async cancelWorkSession() { return await ipcRenderer.invoke("work-session:cancel"); },
  async getWorkSession() { return await ipcRenderer.invoke("work-session:get"); },
  async listSessionSummaries() { const result: unknown = await ipcRenderer.invoke("work-session:list-summaries"); if (!Array.isArray(result)) throw new Error("PRELOAD_SUMMARY_LIST_INVALID"); return result as readonly { readonly summaryId: string; readonly sessionId: string; readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]; }
  ,async requestBreakNudge() { return await ipcRenderer.invoke("work-session:request-break-nudge"); }
  ,async respondToNudge(nudgeId, response) { return await ipcRenderer.invoke("work-session:respond-nudge", nudgeId, response); }
  ,async generateM3Report() { return await ipcRenderer.invoke("m3:generate-report"); }
  ,async listM3Reports() { const result: unknown = await ipcRenderer.invoke("m3:list-reports"); if (!Array.isArray(result)) throw new Error("PRELOAD_M3_REPORTS_INVALID"); return result as readonly import("../personal-intelligence/report-service.js").PersonalReport[]; }
  ,async previewProfessionalSummary() { const result: unknown = await ipcRenderer.invoke("m3:preview-professional-summary"); if (typeof result !== "string") throw new Error("PRELOAD_M3_PREVIEW_INVALID"); return result; }
  ,async resetM3Baseline() { const result: unknown = await ipcRenderer.invoke("m3:reset-baseline"); if (result !== "DELETED") throw new Error("PRELOAD_M3_RESET_INVALID"); return result; }
  ,async deleteM3Data() { const result: unknown = await ipcRenderer.invoke("m3:delete-data"); if (result !== "DELETED") throw new Error("PRELOAD_M3_DELETE_INVALID"); return result; }
  ,async deleteM3Category(category) { const result: unknown = await ipcRenderer.invoke("m3:delete-category", category); if (result !== "DELETED") throw new Error("PRELOAD_M3_CATEGORY_DELETE_INVALID"); return result; }
  ,async exportM3Report(destination, format, includeEvidence) { const result: unknown = await ipcRenderer.invoke("m3:export", destination, format, includeEvidence); if (typeof result !== "object" || result === null) throw new Error("PRELOAD_M3_EXPORT_INVALID"); return result as import("../shared/preload-contract.js").LocalExportResult; }
};

contextBridge.exposeInMainWorld("eyeMate", Object.freeze(eyeMateApi));
