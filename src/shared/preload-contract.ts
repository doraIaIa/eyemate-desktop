import type { RuntimeInfo } from "./runtime-contract.js";
import type { CheckupSummary, PrivacySummary, SurveyRequest } from "./m1-contract.js";
import type { WorkSession } from "../work-session/session-state.js";

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  getPrivacySummary(): Promise<PrivacySummary>;
  runSurveyOnly(request: SurveyRequest): Promise<CheckupSummary>;
  completeOnboardingWithoutCamera(): Promise<void>;
  withdrawCameraConsent(): Promise<void>;
  deleteAllLocalData(): Promise<"DELETED" | "PARTIALLY_DELETED" | "FAILED">;
  listSurveyOnlyReports(): Promise<readonly { readonly status: string; readonly action: string; readonly createdAt: string }[]>;
  startWorkSession(): Promise<WorkSession>;
  pauseWorkSession(): Promise<WorkSession>;
  resumeWorkSession(): Promise<WorkSession>;
  finishWorkSession(): Promise<WorkSession>;
  getWorkSession(): Promise<WorkSession | null>;
  listSessionSummaries(): Promise<readonly { readonly summaryId: string; readonly sessionId: string; readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]>;
}
