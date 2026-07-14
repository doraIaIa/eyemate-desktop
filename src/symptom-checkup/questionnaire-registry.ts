export type QuestionnaireAnswer = "NONE" | "MILD" | "NOTICEABLE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";

export interface QuestionnaireQuestion {
  readonly id: string;
  readonly responseOptions: readonly QuestionnaireAnswer[];
  readonly required: boolean;
}

export interface QuestionnaireDefinition {
  readonly questionnaireId: string;
  readonly version: string;
  readonly purpose: "INTERNAL_SYNTHETIC" | "CLINICAL_OWNER_APPROVED";
  readonly ownerApprovalId: string | null;
  readonly questions: readonly QuestionnaireQuestion[];
  readonly scoringAdapterVersion: string;
}

export interface QuestionnaireScoreAdapter {
  readonly version: string;
  requiredQuestionIds(answers: Readonly<Record<string, QuestionnaireAnswer | undefined>>): readonly string[];
}

/**
 * Cấu hình này chỉ nhận nội dung đã được cấp quyền từ bên ngoài repository.
 * EyeMate không phân phối nguyên văn câu hỏi hoặc bản dịch của instrument lâm sàng.
 */
export type StandardizedResponse = 0 | 1 | 2 | 3 | 4 | "NOT_APPLICABLE";

export interface ApprovedOsdi12Item {
  readonly id: string;
  readonly licensedText: string;
}

export interface ApprovedOsdi12Configuration {
  readonly questionnaireId: "osdi-12";
  readonly definitionVersion: string;
  readonly sourceReference: string;
  readonly licenseApprovalId: string;
  readonly translationApprovalId: string;
  readonly clinicalApprovalId: string;
  readonly featureEnabled: boolean;
  readonly items: readonly ApprovedOsdi12Item[];
}

export type ApprovedOsdi12Score =
  | { readonly state: "COMPLETE"; readonly formulaVersion: "osdi-12-standard-0.1.0"; readonly answeredItemCount: number; readonly notApplicableItemCount: number; readonly score: number }
  | { readonly state: "INSUFFICIENT_DATA"; readonly formulaVersion: "osdi-12-standard-0.1.0"; readonly answeredItemCount: number; readonly notApplicableItemCount: number; readonly score: null; readonly missingItemIds: readonly string[] };

export type ClinicalQuestionnaireResolution =
  | { readonly state: "ENABLED"; readonly configuration: Readonly<ApprovedOsdi12Configuration> }
  | { readonly state: "DISABLED"; readonly reason: "CLINICAL_CONTENT_NOT_APPROVED" | "LICENSE_OR_TRANSLATION_NOT_APPROVED" | "FEATURE_FLAG_DISABLED" | "INVALID_APPROVED_CONFIGURATION" };

export const SYNTHETIC_QUESTIONNAIRE_VERSION = "m1-synthetic-0.1.0" as const;
const SYNTHETIC_RESPONSE_OPTIONS: readonly QuestionnaireAnswer[] = Object.freeze(["NONE", "MILD", "NOTICEABLE", "UNSURE", "PREFER_NOT_TO_ANSWER"]);

export const syntheticQuestionnaire: QuestionnaireDefinition = Object.freeze({
  questionnaireId: "internal-comfort-check",
  version: SYNTHETIC_QUESTIONNAIRE_VERSION,
  purpose: "INTERNAL_SYNTHETIC",
  ownerApprovalId: null,
  scoringAdapterVersion: "synthetic-completeness/0.1.0",
  questions: Object.freeze([
    Object.freeze({ id: "comfort_now", responseOptions: SYNTHETIC_RESPONSE_OPTIONS, required: true }),
    Object.freeze({ id: "screen_interruption", responseOptions: SYNTHETIC_RESPONSE_OPTIONS, required: false })
  ])
});

export const syntheticScoreAdapter: QuestionnaireScoreAdapter = Object.freeze({
  version: "synthetic-completeness/0.1.0",
  requiredQuestionIds(answers: Readonly<Record<string, QuestionnaireAnswer | undefined>>) { return answers.comfort_now === "NOTICEABLE" ? ["comfort_now", "screen_interruption"] : ["comfort_now"]; }
});

export type QuestionnaireFeatureResolution =
  | { readonly state: "ENABLED_INTERNAL_ONLY"; readonly definition: QuestionnaireDefinition; readonly adapter: QuestionnaireScoreAdapter }
  | { readonly state: "DISABLED"; readonly reason: "CLINICAL_CONTENT_NOT_APPROVED" | "APPROVED_DEFINITION_MISSING" | "UNSUPPORTED_QUESTIONNAIRE" };

export function resolveQuestionnaire(input: {
  readonly requestedId: string;
  readonly clinicalOwnerApproved: boolean;
  readonly approvedDefinition?: QuestionnaireDefinition;
  readonly approvedAdapter?: QuestionnaireScoreAdapter;
}): QuestionnaireFeatureResolution {
  if (input.requestedId === syntheticQuestionnaire.questionnaireId) return { state: "ENABLED_INTERNAL_ONLY", definition: syntheticQuestionnaire, adapter: syntheticScoreAdapter };
  return { state: "DISABLED", reason: "UNSUPPORTED_QUESTIONNAIRE" };
}

/** Xác nhận contract 12 mục, không đưa nội dung có bản quyền vào app. */
export function resolveApprovedOsdi12(configuration: ApprovedOsdi12Configuration | undefined): ClinicalQuestionnaireResolution {
  if (configuration === undefined) return { state: "DISABLED", reason: "CLINICAL_CONTENT_NOT_APPROVED" };
  if (configuration.licenseApprovalId.length === 0 || configuration.translationApprovalId.length === 0 || configuration.clinicalApprovalId.length === 0) {
    return { state: "DISABLED", reason: "LICENSE_OR_TRANSLATION_NOT_APPROVED" };
  }
  try { validateApprovedOsdi12Configuration(configuration); }
  catch { return { state: "DISABLED", reason: "INVALID_APPROVED_CONFIGURATION" }; }
  if (!configuration.featureEnabled) return { state: "DISABLED", reason: "FEATURE_FLAG_DISABLED" };
  return { state: "ENABLED", configuration: Object.freeze({ ...configuration, items: Object.freeze([...configuration.items]) }) };
}

export function scoreApprovedOsdi12(configuration: ApprovedOsdi12Configuration, answers: Readonly<Record<string, StandardizedResponse | undefined>>): ApprovedOsdi12Score {
  validateApprovedOsdi12Configuration(configuration);
  const missingItemIds: string[] = [];
  let answeredItemCount = 0;
  let notApplicableItemCount = 0;
  let sum = 0;
  for (const item of configuration.items) {
    const answer = answers[item.id];
    if (answer === undefined) { missingItemIds.push(item.id); continue; }
    if (answer === "NOT_APPLICABLE") { notApplicableItemCount += 1; continue; }
    if (!Number.isInteger(answer) || answer < 0 || answer > 4) throw new Error("INVALID_STANDARDIZED_RESPONSE");
    answeredItemCount += 1;
    sum += answer;
  }
  if (missingItemIds.length > 0 || answeredItemCount === 0) {
    return Object.freeze({ state: "INSUFFICIENT_DATA", formulaVersion: "osdi-12-standard-0.1.0", answeredItemCount, notApplicableItemCount, score: null, missingItemIds: Object.freeze(missingItemIds) });
  }
  return Object.freeze({ state: "COMPLETE", formulaVersion: "osdi-12-standard-0.1.0", answeredItemCount, notApplicableItemCount, score: Math.round((sum * 100 / (answeredItemCount * 4)) * 100) / 100 });
}

function validateApprovedOsdi12Configuration(configuration: ApprovedOsdi12Configuration): void {
  if (configuration.questionnaireId !== "osdi-12" || !/^[a-z0-9._/-]{3,120}$/i.test(configuration.definitionVersion)
    || !/^.{3,500}$/u.test(configuration.sourceReference) || !/^[a-z0-9._/-]{3,160}$/i.test(configuration.licenseApprovalId)
    || !/^[a-z0-9._/-]{3,160}$/i.test(configuration.translationApprovalId) || !/^[a-z0-9._/-]{3,160}$/i.test(configuration.clinicalApprovalId)
    || configuration.items.length !== 12 || new Set(configuration.items.map((item) => item.id.toLocaleLowerCase("en-US"))).size !== 12) {
    throw new Error("INVALID_APPROVED_OSDI12_CONFIGURATION");
  }
  for (const item of configuration.items) {
    if (!/^[a-z0-9_-]{2,80}$/i.test(item.id) || item.licensedText.trim().length === 0 || item.licensedText.length > 2_000) {
      throw new Error("INVALID_APPROVED_OSDI12_CONFIGURATION");
    }
  }
}
