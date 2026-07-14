import assert from "node:assert/strict";
import test from "node:test";
import { acceptCalibration, applyDistanceObservation, initialDistanceZoneState } from "../../distance/distance-zone.js";

test("distance chỉ xuất zone sau calibration và dwell, không có centimet", () => {
  let state = acceptCalibration(initialDistanceZoneState());
  state = applyDistanceObservation(state, { zone: "NEAR", qualityAccepted: true, deviceProfileMatches: true });
  assert.equal(state.zone, "UNKNOWN");
  state = applyDistanceObservation(state, { zone: "NEAR", qualityAccepted: true, deviceProfileMatches: true });
  assert.equal(state.zone, "NEAR");
});
test("quality lỗi hoặc đổi thiết bị chuyển UNKNOWN, không suy recovered", () => {
  const comfort = { zone: "COMFORT" as const, consecutiveValidSamples: 2, calibrationRequired: false };
  assert.equal(applyDistanceObservation(comfort, { zone: "COMFORT", qualityAccepted: false, deviceProfileMatches: true }).zone, "UNKNOWN");
  assert.equal(applyDistanceObservation(comfort, { zone: "COMFORT", qualityAccepted: true, deviceProfileMatches: false }).calibrationRequired, true);
});
