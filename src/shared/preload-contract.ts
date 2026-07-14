import type { RuntimeInfo } from "./runtime-contract.js";

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
}
