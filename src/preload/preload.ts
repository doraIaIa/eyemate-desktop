import { contextBridge, ipcRenderer } from "electron";
import type { EyeMatePreloadApi } from "../shared/preload-contract.js";
import { isRuntimeInfo } from "../shared/runtime-contract.js";
import { isCheckupSummary, isPrivacySummary, type SurveyResponse } from "../shared/m1-contract.js";

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
  async runSurveyOnly(response: SurveyResponse) {
    const result: unknown = await ipcRenderer.invoke("checkup:run-survey-only", response);
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
  }
};

contextBridge.exposeInMainWorld("eyeMate", Object.freeze(eyeMateApi));
