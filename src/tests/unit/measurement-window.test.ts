import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMeasurementWindow, validateCalibrationProfile, type CameraCalibrationProfile, type CameraFrameObservation } from "../../camera/measurement-window.js";

const binding = "a".repeat(64);
const calibration: CameraCalibrationProfile = validateCalibrationProfile({ profileVersion: "camera-calibration/0.1.0", deviceBinding: binding, width: 640, height: 480, groundTruthCm: 60, referenceInterEyePx: 100, calibratedAt: "2026-07-14T00:00:00.000Z" });
const valid = (timestampMs: number, ear = 0.3, iod = 100): CameraFrameObservation => ({ timestampMs, faceCount: 1, eyeVisibility: 1, poseScore: 1, lightingScore: 0.8, leftEar: ear, rightEar: ear, interEyeDistancePx: iod });

test("window 30 giây chỉ tạo aggregate và đếm blink theo transition", () => {
  const frames = Array.from({ length: 30 }, (_, index) => valid(index * 1_000));
  frames[4] = valid(4_000, 0.15); frames[5] = valid(5_000, 0.15); frames[6] = valid(6_000, 0.3);
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.equal(result.status, "COMPLETED");
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
  assert.equal(result.distanceSummary.status, "OBSERVED");
  assert.equal("frames" in result, false);
  assert.equal(result.rawDataPersisted, false);
});

test("blink counter dùng ngưỡng thích nghi để không bỏ sót người có EAR nền cao", () => {
  const frames = Array.from({ length: 30 }, (_, index) => valid(index * 1_000, 0.34));
  frames[8] = valid(8_000, 0.23); frames[9] = valid(9_000, 0.22); frames[10] = valid(10_000, 0.34);
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
});

test("quality thấp và camera fail không biến missing thành zero", () => {
  const frames = Array.from({ length: 30 }, (_, index) => ({ ...valid(index * 1_000), faceCount: 0 }));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration: null, currentDeviceBinding: null });
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.deepEqual(result.blinkSummary, { status: "UNKNOWN" });
  assert.deepEqual(result.distanceSummary, { status: "UNKNOWN" });
  assert.equal(result.qualityDistribution.NO_FACE, 30);
});

test("calibration không được dùng lại khi device binding thay đổi", () => {
  const frames = Array.from({ length: 30 }, (_, index) => valid(index * 1_000));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: "b".repeat(64) });
  assert.deepEqual(result.distanceSummary, { status: "UNKNOWN" });
  assert.ok(result.reasonCodes.includes("CALIBRATION_DEVICE_CHANGED"));
  assert.equal(result.blinkSummary.status, "OBSERVED");
});

test("cancel không tạo kết quả hoàn chỉnh", () => {
  const result = aggregateMeasurementWindow({ status: "CANCELLED", startedAtMs: 0, endedAtMs: 5_000, frames: [valid(0)], calibration, currentDeviceBinding: binding });
  assert.equal(result.status, "CANCELLED");
  assert.equal(result.blinkSummary.status, "UNKNOWN");
  assert.deepEqual(result.reasonCodes, ["MEASUREMENT_CANCELLED"]);
});

test("ground truth calibration bị giới hạn và validate nghiêm ngặt", () => {
  assert.throws(() => validateCalibrationProfile({ ...calibration, groundTruthCm: 0 }), /INVALID_CAMERA_CALIBRATION_PROFILE/);
  assert.throws(() => validateCalibrationProfile({ ...calibration, deviceBinding: "camera-name" }), /INVALID_CAMERA_CALIBRATION_PROFILE/);
});

test("distance aggregate loại spike và giữ provenance thuật toán versioned", () => {
  const frames = Array.from({ length: 30 }, (_, index) => valid(index * 1_000, 0.3, index === 10 ? 40 : 100));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.equal(result.distanceSummary.status, "OBSERVED");
  assert.ok(result.reasonCodes.includes("DISTANCE_OUTLIERS_REJECTED"));
  assert.match(result.algorithmVersion, /eyemate-window\/0\.2\.0$/);
  assert.match(result.configVersion, /distance-ratio-filter\/1\.0\.0$/);
});
