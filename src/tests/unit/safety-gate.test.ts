import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSafetyGate, internalSafetyCatalogue } from "../../safety/safety-gate.js";

const negativeInput = { answers: { safety_signal_a: "NEGATIVE", safety_signal_b: "NEGATIVE" } } as const;

test("Safety Gate tiếp tục khi có câu trả lời âm tính rõ ràng", () => {
  assert.equal(evaluateSafetyGate(negativeInput, internalSafetyCatalogue).outcome, "CONTINUE_SELF_CHECK");
});

test("Safety Gate dừng trước scoring khi có trigger xác nhận", () => {
  const result = evaluateSafetyGate({ answers: { safety_signal_a: "CONFIRMED", safety_signal_b: "NEGATIVE" } }, internalSafetyCatalogue);
  assert.deepEqual(result, {
    outcome: "STOP_WITH_PROFESSIONAL_GUIDANCE",
    ruleId: "SAFE-GATE-INTERNAL-STOP-001",
    ruleVersion: "0.1.0",
    catalogueVersion: "0.1.0",
    guidanceKey: "INTERNAL_PLACEHOLDER_REVIEW_REQUIRED"
  });
});

test("Safety Gate không map unsure thành negative và catalogue lỗi safe-stop", () => {
  assert.equal(evaluateSafetyGate({ answers: { safety_signal_a: "UNSURE", safety_signal_b: "NEGATIVE" } }, internalSafetyCatalogue).outcome, "RETRY_REQUIRED");
  assert.equal(evaluateSafetyGate(negativeInput, { ...internalSafetyCatalogue, compatible: false }).outcome, "UNAVAILABLE_SAFE_STOP");
});
