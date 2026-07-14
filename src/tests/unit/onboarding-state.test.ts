import assert from "node:assert/strict";
import test from "node:test";
import { applyOnboardingAction, getCameraAvailability, type OnboardingState } from "../../onboarding-consent/state.js";

test("onboarding giữ Local Only khi bỏ qua camera và không suy consent", () => {
  let state: OnboardingState = { stage: "NOT_STARTED", cameraDecision: "UNKNOWN" };
  state = applyOnboardingAction(state, "VIEW_INTRO");
  state = applyOnboardingAction(state, "VIEW_PRIVACY");
  const completed = applyOnboardingAction(state, "SKIP_CAMERA");
  assert.deepEqual(completed, { stage: "COMPLETE", cameraDecision: "SKIPPED" });
  assert.equal(getCameraAvailability(completed), "SKIPPED_NO_CONSENT");
});

test("rút consent dừng camera tương lai mà không biến thành consent mới", () => {
  const withdrawn = applyOnboardingAction({ stage: "COMPLETE", cameraDecision: "GRANTED" }, "WITHDRAW_CAMERA_CONSENT");
  assert.equal(withdrawn.cameraDecision, "WITHDRAWN");
  assert.equal(getCameraAvailability(withdrawn), "SKIPPED_NO_CONSENT");
});
