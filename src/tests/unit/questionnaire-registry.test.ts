import assert from "node:assert/strict";
import test from "node:test";
import { resolveQuestionnaire, syntheticQuestionnaire } from "../../symptom-checkup/questionnaire-registry.js";

test("questionnaire synthetic có definition và scoring adapter versioned", () => {
  const result = resolveQuestionnaire({ requestedId: "internal-comfort-check", clinicalOwnerApproved: false });
  assert.equal(result.state, "ENABLED_INTERNAL_ONLY");
  if (result.state === "ENABLED_INTERNAL_ONLY") {
    assert.equal(result.definition.version, "m1-synthetic-0.1.0");
    assert.deepEqual(result.adapter.requiredQuestionIds({ comfort_now: "NOTICEABLE" }), ["comfort_now", "screen_interruption"]);
    assert.equal(Object.isFrozen(syntheticQuestionnaire), true);
  }
});

test("OSDI-6 fail-closed khi chưa có clinical approval hoặc approved definition", () => {
  assert.deepEqual(resolveQuestionnaire({ requestedId: "osdi-6", clinicalOwnerApproved: false }), { state: "DISABLED", reason: "CLINICAL_CONTENT_NOT_APPROVED" });
  assert.deepEqual(resolveQuestionnaire({ requestedId: "osdi-6", clinicalOwnerApproved: true }), { state: "DISABLED", reason: "APPROVED_DEFINITION_MISSING" });
  assert.deepEqual(resolveQuestionnaire({ requestedId: "không-hỗ-trợ", clinicalOwnerApproved: true }), { state: "DISABLED", reason: "UNSUPPORTED_QUESTIONNAIRE" });
});

test("approved questionnaire adapter phải khớp provenance và definition", () => {
  const invalid = { ...syntheticQuestionnaire, questionnaireId: "osdi-6", purpose: "CLINICAL_OWNER_APPROVED" as const, ownerApprovalId: "clinical-owner/approval-1" };
  assert.throws(() => resolveQuestionnaire({ requestedId: "osdi-6", clinicalOwnerApproved: true, approvedDefinition: invalid, approvedAdapter: { version: "wrong/1", requiredQuestionIds: () => [] } }), /INVALID_APPROVED_QUESTIONNAIRE_DEFINITION/);
});
