import type { RuntimeInfo } from "./runtime-contract.js";
import type { PrivacySummary } from "./m1-contract.js";

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  getPrivacySummary(): Promise<PrivacySummary>;
}
