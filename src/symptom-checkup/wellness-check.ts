import type { SafetyOutcome } from "../safety/safety-gate.js";

export const WELLNESS_QUESTIONNAIRE_ID = "eyemate-symptom-check" as const;
export const WELLNESS_QUESTIONNAIRE_VERSION = "eyemate-symptom-check/1.0.0" as const;
export const WELLNESS_SCORE_VERSION = "eyemate-symptom-check-total/1.0.0" as const;
export const WELLNESS_MAXIMUM_SCORE = 15 as const;

export const WELLNESS_DISCLAIMER = "EyeMate đo hành vi thị giác và ghi nhận triệu chứng tự báo cáo. Đây không phải chẩn đoán y tế và không thay thế khám lâm sàng. Nếu triệu chứng kéo dài hoặc nghiêm trọng, hãy gặp bác sĩ nhãn khoa." as const;

export type WellnessResponse = 0 | 1 | 2 | 3 | "UNKNOWN";
export type WellnessQuestionId =
  | "eye_discomfort"
  | "screen_fatigue"
  | "temporary_blur"
  | "light_sensitivity"
  | "end_of_day_effort";

export type WellnessActionGroup = "MAINTAIN_ROUTINE" | "ADD_SUPPORT" | "PAUSE_AND_RECHECK";

export interface WellnessQuestion {
  readonly id: WellnessQuestionId;
  readonly wording: string;
  readonly responseScale: readonly [string, string, string, string];
  readonly supportsNotApplicable: false;
}

const responseScale = ["Không", "Đôi khi", "Thường xuyên", "Hầu như luôn luôn"] as const;
const wellnessQuestionDefinitions: readonly WellnessQuestion[] = [
  { id: "eye_discomfort", wording: "Cảm giác khô, rát hoặc khó chịu ở mắt", responseScale, supportsNotApplicable: false },
  { id: "screen_fatigue", wording: "Mắt mỏi sau khi nhìn màn hình một lúc", responseScale, supportsNotApplicable: false },
  { id: "temporary_blur", wording: "Mắt bị mờ thoáng qua rồi tự hết", responseScale, supportsNotApplicable: false },
  { id: "light_sensitivity", wording: "Mắt nhạy cảm hơn với ánh sáng bình thường", responseScale, supportsNotApplicable: false },
  { id: "end_of_day_effort", wording: "Phải cố gắng nhiều hơn để nhìn rõ cuối ngày", responseScale, supportsNotApplicable: false }
];
export const wellnessQuestions: readonly WellnessQuestion[] = Object.freeze([...wellnessQuestionDefinitions]);

export interface SelfReportedDiscomfortLoad {
  readonly state: "COMPLETE" | "INSUFFICIENT_DATA";
  readonly score: number | null;
  readonly maximumScore: typeof WELLNESS_MAXIMUM_SCORE;
  readonly scoreVersion: typeof WELLNESS_SCORE_VERSION;
  readonly answeredItemCount: number;
  readonly excludedItemCount: 0;
  readonly missingItemIds: readonly WellnessQuestionId[];
  readonly actionGroup: WellnessActionGroup | null;
  readonly label: "Duy trì thói quen hỗ trợ" | "Thêm nhịp nghỉ và điều chỉnh" | "Ưu tiên nghỉ và theo dõi lại" | "Chưa đủ dữ liệu tự báo cáo";
}

export interface WellnessAction {
  readonly id: "LOOK_AWAY_BREAK" | "CONSCIOUS_BLINK" | "ADJUST_SCREEN_SETUP" | "RECHECK_AFTER_REST" | "CONSIDER_PROFESSIONAL_GUIDANCE";
  readonly reasonCode: string;
  readonly evidenceSource: "SELF_REPORTED" | "CAMERA_OBSERVATION" | "SAFETY_GATE";
}

export interface WellnessCheckReport {
  readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "SAFETY_STOP";
  readonly source: "EYEMATE_WELLNESS_SELF_REPORTED";
  readonly answers: Readonly<Record<WellnessQuestionId, WellnessResponse>>;
  readonly discomfortLoad: SelfReportedDiscomfortLoad;
  readonly actions: readonly WellnessAction[];
  readonly missingData: readonly WellnessQuestionId[];
  readonly disclaimer: typeof WELLNESS_DISCLAIMER;
  readonly limitation: "SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT";
  readonly provenance: {
    readonly questionnaireId: typeof WELLNESS_QUESTIONNAIRE_ID;
    readonly questionnaireVersion: typeof WELLNESS_QUESTIONNAIRE_VERSION;
    readonly scoreVersion: typeof WELLNESS_SCORE_VERSION;
    readonly recallPeriod: "LAST_7_DAYS";
    readonly safetyOutcome: SafetyOutcome;
  };
}

export function scoreEyeMateSymptomCheck(answers: Readonly<Partial<Record<WellnessQuestionId, WellnessResponse>>>): SelfReportedDiscomfortLoad {
  let total = 0;
  let answeredItemCount = 0;
  const missingItemIds: WellnessQuestionId[] = [];
  for (const question of wellnessQuestions) {
    const answer = answers[question.id];
    if (answer === undefined || answer === "UNKNOWN") {
      missingItemIds.push(question.id);
      continue;
    }
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) throw new Error("INVALID_WELLNESS_RESPONSE");
    answeredItemCount += 1;
    total += answer;
  }
  if (answeredItemCount !== wellnessQuestions.length) {
    return Object.freeze({ state: "INSUFFICIENT_DATA", score: null, maximumScore: WELLNESS_MAXIMUM_SCORE, scoreVersion: WELLNESS_SCORE_VERSION, answeredItemCount, excludedItemCount: 0, missingItemIds: Object.freeze(missingItemIds), actionGroup: null, label: "Chưa đủ dữ liệu tự báo cáo" });
  }
  if (total <= 4) return Object.freeze({ state: "COMPLETE", score: total, maximumScore: WELLNESS_MAXIMUM_SCORE, scoreVersion: WELLNESS_SCORE_VERSION, answeredItemCount, excludedItemCount: 0, missingItemIds: Object.freeze(missingItemIds), actionGroup: "MAINTAIN_ROUTINE", label: "Duy trì thói quen hỗ trợ" });
  if (total <= 9) return Object.freeze({ state: "COMPLETE", score: total, maximumScore: WELLNESS_MAXIMUM_SCORE, scoreVersion: WELLNESS_SCORE_VERSION, answeredItemCount, excludedItemCount: 0, missingItemIds: Object.freeze(missingItemIds), actionGroup: "ADD_SUPPORT", label: "Thêm nhịp nghỉ và điều chỉnh" });
  return Object.freeze({ state: "COMPLETE", score: total, maximumScore: WELLNESS_MAXIMUM_SCORE, scoreVersion: WELLNESS_SCORE_VERSION, answeredItemCount, excludedItemCount: 0, missingItemIds: Object.freeze(missingItemIds), actionGroup: "PAUSE_AND_RECHECK", label: "Ưu tiên nghỉ và theo dõi lại" });
}

export const scoreSelfReportedDiscomfortLoad = scoreEyeMateSymptomCheck;

function actionsForGroup(group: WellnessActionGroup): readonly WellnessAction[] {
  if (group === "MAINTAIN_ROUTINE") return Object.freeze([{ id: "LOOK_AWAY_BREAK", reasonCode: "MAINTAIN_SUPPORTIVE_ROUTINE", evidenceSource: "SELF_REPORTED" }]);
  if (group === "ADD_SUPPORT") return Object.freeze([
    { id: "LOOK_AWAY_BREAK", reasonCode: "ADD_SUPPORTIVE_BREAKS", evidenceSource: "SELF_REPORTED" },
    { id: "ADJUST_SCREEN_SETUP", reasonCode: "REVIEW_SCREEN_SETUP", evidenceSource: "SELF_REPORTED" }
  ]);
  return Object.freeze([
    { id: "LOOK_AWAY_BREAK", reasonCode: "PRIORITIZE_REST", evidenceSource: "SELF_REPORTED" },
    { id: "ADJUST_SCREEN_SETUP", reasonCode: "REVIEW_SCREEN_SETUP", evidenceSource: "SELF_REPORTED" },
    { id: "RECHECK_AFTER_REST", reasonCode: "RECHECK_SELF_REPORTED_EXPERIENCE", evidenceSource: "SELF_REPORTED" }
  ]);
}

export function createWellnessCheckReport(answers: Readonly<Record<WellnessQuestionId, WellnessResponse>>, safetyOutcome: SafetyOutcome): WellnessCheckReport {
  const discomfortLoad = scoreEyeMateSymptomCheck(answers);
  const provenance = Object.freeze({ questionnaireId: WELLNESS_QUESTIONNAIRE_ID, questionnaireVersion: WELLNESS_QUESTIONNAIRE_VERSION, scoreVersion: WELLNESS_SCORE_VERSION, recallPeriod: "LAST_7_DAYS" as const, safetyOutcome });
  const common = { source: "EYEMATE_WELLNESS_SELF_REPORTED" as const, answers: Object.freeze({ ...answers }), discomfortLoad, missingData: discomfortLoad.missingItemIds, disclaimer: WELLNESS_DISCLAIMER, limitation: "SELF_REPORTED_WELLNESS_NOT_CLINICAL_INSTRUMENT" as const, provenance };
  if (safetyOutcome !== "CONTINUE_SELF_CHECK") return Object.freeze({ ...common, status: "SAFETY_STOP", actions: Object.freeze<WellnessAction[]>([{ id: "CONSIDER_PROFESSIONAL_GUIDANCE", reasonCode: "SAFETY_GATE_STOP", evidenceSource: "SAFETY_GATE" }]) });
  if (discomfortLoad.state === "INSUFFICIENT_DATA" || discomfortLoad.actionGroup === null) return Object.freeze({ ...common, status: "INSUFFICIENT_DATA", actions: Object.freeze<WellnessAction[]>([{ id: "RECHECK_AFTER_REST", reasonCode: "INSUFFICIENT_SELF_REPORTED_DATA", evidenceSource: "SELF_REPORTED" }]) });
  return Object.freeze({ ...common, status: "COMPLETED", actions: actionsForGroup(discomfortLoad.actionGroup) });
}
