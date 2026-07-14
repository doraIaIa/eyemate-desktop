import type { SafetyOutcome } from "../safety/safety-gate.js";

export const questionnaireVersion = "m1-synthetic-0.1.0" as const;
export type SurveyAnswer = "NONE" | "MILD" | "NOTICEABLE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";
export type CheckupState = "INTRO" | "SYMPTOMS" | "REPORT" | "INSUFFICIENT_REPORT" | "CANCELLED" | "PARTIAL" | "SAFETY_STOP";

export interface CheckupDraft {
  readonly state: CheckupState;
  readonly answers: Readonly<Partial<Record<"comfort_now" | "screen_interruption", SurveyAnswer>>>;
}

export interface SurveyOnlyReport {
  readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP";
  readonly source: "SURVEY_ONLY";
  readonly coverage: { readonly survey: "COMPLETE" | "PARTIAL"; readonly camera: "NOT_MEASURED" };
  readonly pattern: "SURVEY_RECORDED" | "NOT_AVAILABLE";
  readonly confidence: "LIMITED" | "NOT_AVAILABLE";
  readonly missingData: readonly string[];
  readonly action: "REVIEW_YOUR_RESPONSES" | "COMPLETE_REQUIRED_ANSWERS" | "FOLLOW_INTERNAL_SAFETY_GUIDANCE";
  readonly limitation: "SYNTHETIC_QUESTIONNAIRE_NOT_CLINICALLY_APPROVED";
  readonly provenance: { readonly reportSchemaVersion: "m1-report-0.1.0"; readonly questionnaireVersion: typeof questionnaireVersion; readonly safetyOutcome: SafetyOutcome; readonly methodVersion: "survey-only-0.1.0" };
}

export function createSurveyDraft(): CheckupDraft { return { state: "INTRO", answers: {} }; }

export function recordSurveyAnswer(draft: CheckupDraft, questionId: "comfort_now" | "screen_interruption", answer: SurveyAnswer): CheckupDraft {
  if (draft.state === "CANCELLED" || draft.state === "SAFETY_STOP") return draft;
  return { state: "SYMPTOMS", answers: { ...draft.answers, [questionId]: answer } };
}

export function cancelCheckup(draft: CheckupDraft): CheckupDraft { return { ...draft, state: "CANCELLED" }; }
export function recoverInterruptedCheckup(draft: CheckupDraft): CheckupDraft {
  return ["REPORT", "INSUFFICIENT_REPORT", "SAFETY_STOP", "CANCELLED"].includes(draft.state) ? draft : { ...draft, state: "PARTIAL" };
}

export function createSurveyOnlyReport(draft: CheckupDraft, safetyOutcome: SafetyOutcome): SurveyOnlyReport {
  const provenance = { reportSchemaVersion: "m1-report-0.1.0" as const, questionnaireVersion, safetyOutcome, methodVersion: "survey-only-0.1.0" as const };
  if (safetyOutcome !== "CONTINUE_SELF_CHECK") return { status: "SAFETY_STOP", source: "SURVEY_ONLY", coverage: { survey: "PARTIAL", camera: "NOT_MEASURED" }, pattern: "NOT_AVAILABLE", confidence: "NOT_AVAILABLE", missingData: [], action: "FOLLOW_INTERNAL_SAFETY_GUIDANCE", limitation: "SYNTHETIC_QUESTIONNAIRE_NOT_CLINICALLY_APPROVED", provenance };
  const required = draft.answers.comfort_now === "NOTICEABLE" ? ["comfort_now", "screen_interruption"] : ["comfort_now"];
  const missingData = required.filter((question) => draft.answers[question as keyof typeof draft.answers] === undefined);
  if (missingData.length > 0) return { status: "INSUFFICIENT_DATA", source: "SURVEY_ONLY", coverage: { survey: "PARTIAL", camera: "NOT_MEASURED" }, pattern: "NOT_AVAILABLE", confidence: "NOT_AVAILABLE", missingData, action: "COMPLETE_REQUIRED_ANSWERS", limitation: "SYNTHETIC_QUESTIONNAIRE_NOT_CLINICALLY_APPROVED", provenance };
  return { status: "COMPLETED", source: "SURVEY_ONLY", coverage: { survey: "COMPLETE", camera: "NOT_MEASURED" }, pattern: "SURVEY_RECORDED", confidence: "LIMITED", missingData: [], action: "REVIEW_YOUR_RESPONSES", limitation: "SYNTHETIC_QUESTIONNAIRE_NOT_CLINICALLY_APPROVED", provenance };
}
