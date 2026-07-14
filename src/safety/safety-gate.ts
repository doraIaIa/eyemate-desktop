export type SafetyAnswer = "CONFIRMED" | "NEGATIVE" | "UNSURE" | "PREFER_NOT_TO_ANSWER";
export type SafetyOutcome = "CONTINUE_SELF_CHECK" | "STOP_WITH_PROFESSIONAL_GUIDANCE" | "RETRY_REQUIRED" | "UNAVAILABLE_SAFE_STOP";

export interface SafetyGateInput {
  readonly answers: Readonly<Record<"safety_signal_a" | "safety_signal_b", SafetyAnswer>>;
}

export interface SafetyCatalogue {
  readonly catalogueId: "m1-internal-placeholder";
  readonly version: "0.1.0";
  readonly reviewStatus: "INTERNAL_PLACEHOLDER_NOT_CLINICALLY_APPROVED";
  readonly compatible: boolean;
}

export interface SafetyGateResult {
  readonly outcome: SafetyOutcome;
  readonly ruleId: string;
  readonly ruleVersion: "0.1.0";
  readonly catalogueVersion: string;
  readonly guidanceKey: "INTERNAL_PLACEHOLDER_REVIEW_REQUIRED" | null;
}

export const internalSafetyCatalogue: SafetyCatalogue = {
  catalogueId: "m1-internal-placeholder",
  version: "0.1.0",
  reviewStatus: "INTERNAL_PLACEHOLDER_NOT_CLINICALLY_APPROVED",
  compatible: true
};

export function evaluateSafetyGate(input: SafetyGateInput, catalogue: SafetyCatalogue): SafetyGateResult {
  const base = { ruleVersion: "0.1.0" as const, catalogueVersion: catalogue.version };
  if (!catalogue.compatible || catalogue.reviewStatus !== "INTERNAL_PLACEHOLDER_NOT_CLINICALLY_APPROVED") {
    return { ...base, outcome: "UNAVAILABLE_SAFE_STOP", ruleId: "SAFE-GATE-CATALOGUE-UNAVAILABLE", guidanceKey: null };
  }
  const answers = Object.values(input.answers);
  if (answers.includes("CONFIRMED")) {
    return { ...base, outcome: "STOP_WITH_PROFESSIONAL_GUIDANCE", ruleId: "SAFE-GATE-INTERNAL-STOP-001", guidanceKey: "INTERNAL_PLACEHOLDER_REVIEW_REQUIRED" };
  }
  if (answers.includes("UNSURE") || answers.includes("PREFER_NOT_TO_ANSWER")) {
    return { ...base, outcome: "RETRY_REQUIRED", ruleId: "SAFE-GATE-UNCERTAIN-001", guidanceKey: null };
  }
  return { ...base, outcome: "CONTINUE_SELF_CHECK", ruleId: "SAFE-GATE-CONTINUE-001", guidanceKey: null };
}
