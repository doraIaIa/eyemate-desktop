import type { WellnessAction, WellnessActionGroup, WellnessQuestionId, WellnessResponse } from "../symptom-checkup/wellness-check.js";
import type { CameraMeasurementAggregate } from "../camera/measurement-window.js";
import type { CheckupCameraEvidence, EyeHealthAssessment } from "../symptom-checkup/eye-health-assessment.js";

export interface PrivacySummary {
  readonly localOnly: true;
  readonly cameraState: "SKIPPED_NO_CONSENT" | "CAMERA_UNAVAILABLE";
  readonly cameraConsentDecision: "NONE" | "GRANTED" | "SKIPPED" | "WITHDRAWN";
  readonly exportRequiresConfirmation: true;
  readonly deletionResults: readonly ("DELETED" | "PARTIALLY_DELETED" | "FAILED")[];
}

export type SurveyResponse = WellnessResponse;
export type SafetyResponse = "CONFIRMED" | "NEGATIVE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";
export interface SurveyRequest { readonly answers: Readonly<Record<WellnessQuestionId, SurveyResponse>>; readonly safety: SafetyResponse; }
export interface IntegratedCheckupRequest extends SurveyRequest { readonly cameraMeasurement?: CameraMeasurementAggregate | null; }
export interface CheckupSummary {
  readonly reportId: string;
  readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP";
  readonly source: "EYEMATE_WELLNESS_SELF_REPORTED";
  readonly camera: CheckupCameraEvidence["status"];
  readonly cameraEvidence: CheckupCameraEvidence;
  readonly assessment: EyeHealthAssessment;
  readonly actions: readonly WellnessAction[];
  readonly missingData: readonly string[];
  readonly discomfortLoad: { readonly state: "COMPLETE" | "INSUFFICIENT_DATA"; readonly score: number | null; readonly maximumScore: 15; readonly scoreVersion: string; readonly label: string; readonly actionGroup: WellnessActionGroup | null; readonly answeredItemCount: number; readonly excludedItemCount: 0; };
  readonly limitation: "SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT";
}
export function isCheckupSummary(value: unknown): value is CheckupSummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.reportId === "string" && ["COMPLETED", "INSUFFICIENT_DATA", "SAFETY_STOP"].includes(String(candidate.status)) && candidate.source === "EYEMATE_WELLNESS_SELF_REPORTED" && ["NOT_MEASURED", "COMPLETED", "INSUFFICIENT_DATA", "CANCELLED", "CAMERA_FAILED", "TIMEOUT"].includes(String(candidate.camera)) && typeof candidate.cameraEvidence === "object" && candidate.cameraEvidence !== null && typeof candidate.assessment === "object" && candidate.assessment !== null && Array.isArray(candidate.actions) && Array.isArray(candidate.missingData)
    && typeof candidate.discomfortLoad === "object" && candidate.discomfortLoad !== null && candidate.limitation === "SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT";
}

export function isPrivacySummary(value: unknown): value is PrivacySummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.localOnly === true && (candidate.cameraState === "SKIPPED_NO_CONSENT" || candidate.cameraState === "CAMERA_UNAVAILABLE")
    && ["NONE", "GRANTED", "SKIPPED", "WITHDRAWN"].includes(String(candidate.cameraConsentDecision))
    && candidate.exportRequiresConfirmation === true && Array.isArray(candidate.deletionResults);
}
