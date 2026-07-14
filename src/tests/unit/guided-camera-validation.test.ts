import assert from "node:assert/strict";
import test from "node:test";
import { applyGuidedCameraEvent, createGuidedCameraSummary, type GuidedCameraEvent } from "../../camera/guided-validation.js";

function run(events: readonly GuidedCameraEvent[]) { return events.reduce(applyGuidedCameraEvent, createGuidedCameraSummary()); }

test("camera chỉ bắt đầu sau consent và explicit action", () => {
  assert.throws(() => applyGuidedCameraEvent(createGuidedCameraSummary(), "REQUEST_START"), /INVALID_CAMERA_VALIDATION_TRANSITION/);
  const active = run(["GRANT_CONSENT", "REQUEST_START", "STARTED"]);
  assert.equal(active.state, "ACTIVE");
  assert.equal(active.consentObserved && active.explicitStartObserved, true);
});

test("denied, unavailable và busy đều giải phóng stream", () => {
  for (const event of ["DENY", "UNAVAILABLE", "BUSY"] as const) assert.equal(run(["GRANT_CONSENT", "REQUEST_START", event]).streamReleased, true);
});

test("quality failure và disconnect không tạo accuracy claim", () => {
  const low = run(["GRANT_CONSENT", "REQUEST_START", "STARTED", "REJECT_QUALITY", "STOP"]);
  assert.equal(low.quality, "REJECTED");
  assert.equal(low.accuracy, "NOT_EVALUATED");
  const disconnected = run(["GRANT_CONSENT", "REQUEST_START", "STARTED", "DISCONNECT", "STOP"]);
  assert.equal(disconnected.state, "STOPPED");
  assert.equal(disconnected.rawDataPersisted, false);
});

test("calibration chỉ là operator confirmation và stop idempotence fail-closed", () => {
  const calibrated = run(["GRANT_CONSENT", "REQUEST_START", "STARTED", "CONFIRM_CALIBRATION", "STOP"]);
  assert.equal(calibrated.calibration, "OPERATOR_CONFIRMED");
  assert.equal(calibrated.accuracy, "NOT_EVALUATED");
  assert.throws(() => applyGuidedCameraEvent(calibrated, "STOP"), /INVALID_CAMERA_VALIDATION_TRANSITION/);
});
