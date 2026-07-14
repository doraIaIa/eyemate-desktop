import { contextBridge, ipcRenderer } from "electron";
import type { EyeMatePreloadApi } from "../shared/preload-contract.js";
import { isRuntimeInfo } from "../shared/runtime-contract.js";
import { isPrivacySummary } from "../shared/m1-contract.js";

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
  }
};

contextBridge.exposeInMainWorld("eyeMate", Object.freeze(eyeMateApi));
