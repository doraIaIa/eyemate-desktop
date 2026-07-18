import assert from "node:assert/strict";
import test from "node:test";
import { applyDevObservationOverrides, EMPTY_DEV_OVERRIDES, validateDevOverrides } from "../../camera/dev-overrides.js";
import type { CameraCalibrationProfile, CameraFrameObservation } from "../../camera/measurement-window.js";

const observation: CameraFrameObservation = { timestampMs: 1_000, faceCount: 1, eyeVisibility: 1, poseScore: 1, lightingScore: 1, leftEar: 0.28, rightEar: 0.29, leftBlinkScore: null, rightBlinkScore: null, interEyeDistancePx: 100 };
const calibration: CameraCalibrationProfile = { profileVersion: "camera-calibration/0.1.0", deviceBinding: "a".repeat(64), width: 640, height: 480, groundTruthCm: 50, referenceInterEyePx: 100, calibratedAt: "2026-07-15T00:00:00.000Z" };

test("dev overrides rỗng không đổi observation", () => {
  assert.deepEqual(applyDevObservationOverrides(observation, calibration, EMPTY_DEV_OVERRIDES), observation);
});

test("force distance chỉ mô phỏng qua ratio khi có calibration", () => {
  const overrides = { ...EMPTY_DEV_OVERRIDES, forceDistanceCm: 25 };
  assert.equal(applyDevObservationOverrides(observation, calibration, overrides).interEyeDistancePx, 200);
  assert.equal(applyDevObservationOverrides(observation, null, overrides).interEyeDistancePx, 100);
});

test("force EAR và blink rate có giới hạn fail-closed", () => {
  assert.equal(applyDevObservationOverrides(observation, calibration, { ...EMPTY_DEV_OVERRIDES, forceEar: 0.15 }).leftEar, 0.15);
  assert.throws(() => validateDevOverrides({ ...EMPTY_DEV_OVERRIDES, forceBlinkRate: 100 }), /INVALID_DEV_OVERRIDES/);
  assert.throws(() => validateDevOverrides({ ...EMPTY_DEV_OVERRIDES, forceDistanceCm: 0 }), /INVALID_DEV_OVERRIDES/);
});
