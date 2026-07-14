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
  readonly requestedId: "internal-comfort-check" | "osdi-6" | string;
  readonly clinicalOwnerApproved: boolean;
  readonly approvedDefinition?: QuestionnaireDefinition;
  readonly approvedAdapter?: QuestionnaireScoreAdapter;
}): QuestionnaireFeatureResolution {
  if (input.requestedId === syntheticQuestionnaire.questionnaireId) return { state: "ENABLED_INTERNAL_ONLY", definition: syntheticQuestionnaire, adapter: syntheticScoreAdapter };
  if (input.requestedId !== "osdi-6") return { state: "DISABLED", reason: "UNSUPPORTED_QUESTIONNAIRE" };
  if (!input.clinicalOwnerApproved) return { state: "DISABLED", reason: "CLINICAL_CONTENT_NOT_APPROVED" };
  if (!input.approvedDefinition || !input.approvedAdapter) return { state: "DISABLED", reason: "APPROVED_DEFINITION_MISSING" };
  validateApprovedQuestionnaire(input.approvedDefinition, input.approvedAdapter);
  return { state: "ENABLED_INTERNAL_ONLY", definition: Object.freeze(input.approvedDefinition), adapter: Object.freeze(input.approvedAdapter) };
}

function validateApprovedQuestionnaire(definition: QuestionnaireDefinition, adapter: QuestionnaireScoreAdapter): void {
  if (definition.questionnaireId !== "osdi-6" || definition.purpose !== "CLINICAL_OWNER_APPROVED" || !/^[a-z0-9._/-]{3,120}$/i.test(definition.version)
    || !/^[a-z0-9._/-]{3,160}$/i.test(definition.ownerApprovalId ?? "") || definition.scoringAdapterVersion !== adapter.version
    || definition.questions.length === 0 || new Set(definition.questions.map((question) => question.id.toLocaleLowerCase("en-US"))).size !== definition.questions.length) {
    throw new Error("INVALID_APPROVED_QUESTIONNAIRE_DEFINITION");
  }
  for (const question of definition.questions) {
    if (!/^[a-z0-9_-]{2,80}$/i.test(question.id) || question.responseOptions.length === 0 || new Set(question.responseOptions).size !== question.responseOptions.length) throw new Error("INVALID_APPROVED_QUESTIONNAIRE_DEFINITION");
  }
}
