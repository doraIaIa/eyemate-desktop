import type { RuntimeInfo } from "./runtime-contract.js";
import type { CheckupSummary, PrivacySummary, SurveyRequest } from "./m1-contract.js";
import type { WorkSession } from "../work-session/session-state.js";
import type { NudgeDecision } from "../work-session/companion-policy.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
export type LocalExportFormat = "JSON" | "MARKDOWN";
export interface LocalExportResult { readonly status: "EXPORTED" | "CANCELLED" | "FAILED"; readonly reason: string; }
export type M3DataCategory = "BASELINE" | "PATTERN" | "SUMMARY" | "REPORT" | "ALL";
export type NudgeResponse = "AUTO_CORRECTED" | "ACCEPTED" | "SNOOZED" | "DISMISSED" | "IGNORED" | "UNKNOWN";

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  getPrivacySummary(): Promise<PrivacySummary>;
  runSurveyOnly(request: SurveyRequest): Promise<CheckupSummary>;
  completeOnboardingWithoutCamera(): Promise<void>;
  withdrawCameraConsent(): Promise<void>;
  deleteAllLocalData(): Promise<"DELETED" | "PARTIALLY_DELETED" | "FAILED">;
  listSurveyOnlyReports(): Promise<readonly { readonly status: string; readonly action: string; readonly createdAt: string }[]>;
  startWorkSession(modeId?: WorkSession["modeId"]): Promise<WorkSession>;
  pauseWorkSession(): Promise<WorkSession>;
  resumeWorkSession(): Promise<WorkSession>;
  finishWorkSession(): Promise<WorkSession>;
  cancelWorkSession(): Promise<WorkSession>;
  getWorkSession(): Promise<WorkSession | null>;
  listSessionSummaries(): Promise<readonly { readonly summaryId: string; readonly sessionId: string; readonly status: string; readonly elapsedActiveMs: number; readonly createdAt: string }[]>;
  requestBreakNudge(): Promise<NudgeDecision & { readonly nudgeId: string }>;
  respondToNudge(nudgeId: string, response: NudgeResponse): Promise<boolean>;
  generateM3Report(): Promise<PersonalReport>;
  listM3Reports(): Promise<readonly PersonalReport[]>;
  previewProfessionalSummary(): Promise<string>;
  resetM3Baseline(): Promise<"DELETED">;
  deleteM3Data(): Promise<"DELETED">;
  deleteM3Category(category: M3DataCategory): Promise<"DELETED">;
  exportM3Report(destination: string, format: LocalExportFormat, includeEvidence: boolean): Promise<LocalExportResult>;
}
