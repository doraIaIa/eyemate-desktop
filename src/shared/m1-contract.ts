export interface PrivacySummary {
  readonly localOnly: true;
  readonly cameraState: "SKIPPED_NO_CONSENT" | "CAMERA_UNAVAILABLE";
  readonly cameraConsentDecision: "NONE" | "GRANTED" | "SKIPPED" | "WITHDRAWN";
  readonly exportRequiresConfirmation: true;
  readonly deletionResults: readonly ("DELETED" | "PARTIALLY_DELETED" | "FAILED")[];
}

export type SurveyResponse = "NONE" | "MILD" | "NOTICEABLE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";
export type SafetyResponse = "CONFIRMED" | "NEGATIVE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";
export interface SurveyRequest { readonly response: SurveyResponse; readonly safety: SafetyResponse; }
export interface CheckupSummary { readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP"; readonly source: "SURVEY_ONLY"; readonly camera: "NOT_MEASURED"; readonly action: string; readonly missingData: readonly string[]; }
export function isCheckupSummary(value: unknown): value is CheckupSummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return ["COMPLETED", "INSUFFICIENT_DATA", "SAFETY_STOP"].includes(String(candidate.status)) && candidate.source === "SURVEY_ONLY" && candidate.camera === "NOT_MEASURED" && typeof candidate.action === "string" && Array.isArray(candidate.missingData);
}

export function isPrivacySummary(value: unknown): value is PrivacySummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.localOnly === true && (candidate.cameraState === "SKIPPED_NO_CONSENT" || candidate.cameraState === "CAMERA_UNAVAILABLE")
    && ["NONE", "GRANTED", "SKIPPED", "WITHDRAWN"].includes(String(candidate.cameraConsentDecision))
    && candidate.exportRequiresConfirmation === true && Array.isArray(candidate.deletionResults);
}
