import type { RuntimeInfo } from "./runtime-contract.js";
import type { CheckupSummary, PrivacySummary, SurveyResponse } from "./m1-contract.js";

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  getPrivacySummary(): Promise<PrivacySummary>;
  runSurveyOnly(response: SurveyResponse): Promise<CheckupSummary>;
  completeOnboardingWithoutCamera(): Promise<void>;
}
