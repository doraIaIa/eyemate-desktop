import assert from "node:assert/strict";
import test from "node:test";
import { resolveApprovedOsdi12, resolveQuestionnaire, scoreApprovedOsdi12, syntheticQuestionnaire, type ApprovedOsdi12Configuration } from "../../symptom-checkup/questionnaire-registry.js";

test("questionnaire synthetic có definition và scoring adapter versioned", () => {
  const result = resolveQuestionnaire({ requestedId: "internal-comfort-check", clinicalOwnerApproved: false });
  assert.equal(result.state, "ENABLED_INTERNAL_ONLY");
  if (result.state === "ENABLED_INTERNAL_ONLY") {
    assert.equal(result.definition.version, "m1-synthetic-0.1.0");
    assert.deepEqual(result.adapter.requiredQuestionIds({ comfort_now: "NOTICEABLE" }), ["comfort_now", "screen_interruption"]);
    assert.equal(Object.isFrozen(syntheticQuestionnaire), true);
  }
});

test("registry nội bộ không nhận instrument lâm sàng qua đường survey wellness", () => {
  assert.deepEqual(resolveQuestionnaire({ requestedId: "osdi-12", clinicalOwnerApproved: false }), { state: "DISABLED", reason: "UNSUPPORTED_QUESTIONNAIRE" });
  assert.deepEqual(resolveQuestionnaire({ requestedId: "không-hỗ-trợ", clinicalOwnerApproved: true }), { state: "DISABLED", reason: "UNSUPPORTED_QUESTIONNAIRE" });
});

const approvedConfiguration: ApprovedOsdi12Configuration = {
  questionnaireId: "osdi-12", definitionVersion: "licensed-vi-1.0.0", sourceReference: "licensed-source-record/2026-01", licenseApprovalId: "license/approved-1", translationApprovalId: "translation/approved-1", clinicalApprovalId: "clinical/approved-1", featureEnabled: true,
  items: Array.from({ length: 12 }, (_, index) => ({ id: `item_${index + 1}`, licensedText: `licensed item ${index + 1}` }))
};

test("OSDI 12 mục chỉ bật với cấu hình được cấp quyền và feature flag", () => {
  assert.deepEqual(resolveApprovedOsdi12(undefined), { state: "DISABLED", reason: "CLINICAL_CONTENT_NOT_APPROVED" });
  assert.deepEqual(resolveApprovedOsdi12({ ...approvedConfiguration, translationApprovalId: "" }), { state: "DISABLED", reason: "LICENSE_OR_TRANSLATION_NOT_APPROVED" });
  assert.deepEqual(resolveApprovedOsdi12({ ...approvedConfiguration, featureEnabled: false }), { state: "DISABLED", reason: "FEATURE_FLAG_DISABLED" });
  assert.equal(resolveApprovedOsdi12(approvedConfiguration).state, "ENABLED");
});

test("OSDI 12 mục tính 0–4, loại N/A và fail-closed khi bỏ trống", () => {
  const completeAnswers = Object.fromEntries(approvedConfiguration.items.map((item, index) => [item.id, index === 0 ? "NOT_APPLICABLE" : 2])) as Record<string, 0 | 1 | 2 | 3 | 4 | "NOT_APPLICABLE">;
  assert.deepEqual(scoreApprovedOsdi12(approvedConfiguration, completeAnswers), { state: "COMPLETE", formulaVersion: "osdi-12-standard-0.1.0", answeredItemCount: 11, notApplicableItemCount: 1, score: 50 });
  const incomplete = scoreApprovedOsdi12(approvedConfiguration, { item_1: 0 });
  assert.equal(incomplete.state, "INSUFFICIENT_DATA");
  if (incomplete.state === "INSUFFICIENT_DATA") assert.equal(incomplete.missingItemIds.length, 11);
});
