import type { RuntimeInfo } from "./runtime-contract.js";
import type { CheckupSummary, PrivacySummary, SurveyRequest } from "./m1-contract.js";
import type { WorkSession } from "../work-session/session-state.js";
import type { NudgeDecision } from "../work-session/companion-policy.js";
import type { PersonalReport } from "../personal-intelligence/report-service.js";
export type LocalExportFormat = "JSON" | "MARKDOWN" | "PDF";
export interface LocalExportResult { readonly status: "EXPORTED" | "CANCELLED" | "FAILED"; readonly reason: string; }
export type M3DataCategory = "BASELINE" | "PATTERN" | "SUMMARY" | "REPORT" | "ALL";
export type NudgeResponse = "AUTO_CORRECTED" | "ACCEPTED" | "SNOOZED" | "DISMISSED" | "IGNORED" | "UNKNOWN";
export interface UserPreferences {
  readonly defaultMode: "TIMER_ONLY";
  readonly soundEnabled: boolean;
  readonly breakReminderEnabled: boolean;
  readonly quietHoursEnabled: boolean;
  readonly quietStartMinute: number;
  readonly quietEndMinute: number;
  readonly reducedMotion: boolean;
}
export interface DataInventoryItem {
  readonly category: "CHECKUP" | "SESSION" | "NUDGE" | "REPORT" | "PREFERENCE";
  readonly purpose: string;
  readonly recordCount: number;
  readonly retention: "UNTIL_USER_DELETES";
  readonly location: "LOCAL_ONLY";
}

export interface EyeMatePreloadApi {
  getRuntimeInfo(): Promise<RuntimeInfo>;
  getPrivacySummary(): Promise<PrivacySummary>;
  runSurveyOnly(request: SurveyRequest): Promise<CheckupSummary>;
  grantCameraConsent(): Promise<void>;
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
  previewProfessionalSummary(format?: LocalExportFormat): Promise<string>;
  resetM3Baseline(): Promise<"DELETED">;
  deleteM3Data(): Promise<"DELETED">;
  deleteM3Category(category: M3DataCategory): Promise<"DELETED">;
  exportM3Report(destination: string, format: LocalExportFormat, includeEvidence: boolean): Promise<LocalExportResult>;
  exportM3WithDialog(format: LocalExportFormat, includeEvidence: boolean): Promise<LocalExportResult>;
  getUserPreferences(): Promise<UserPreferences>;
  updateUserPreferences(preferences: UserPreferences): Promise<UserPreferences>;
  getDataInventory(): Promise<readonly DataInventoryItem[]>;
}
