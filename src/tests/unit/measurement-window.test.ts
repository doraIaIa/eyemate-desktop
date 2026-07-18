import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMeasurementWindow, validateCalibrationProfile, type CameraCalibrationProfile, type CameraFrameObservation } from "../../camera/measurement-window.js";

const binding = "a".repeat(64);
const calibration: CameraCalibrationProfile = validateCalibrationProfile({ profileVersion: "camera-calibration/0.1.0", deviceBinding: binding, width: 640, height: 480, groundTruthCm: 60, referenceInterEyePx: 100, calibratedAt: "2026-07-14T00:00:00.000Z" });
const valid = (timestampMs: number, ear = 0.3, iod = 100, blinkScore: number | null = null): CameraFrameObservation => ({ timestampMs, faceCount: 1, eyeVisibility: 1, poseScore: 1, lightingScore: 0.8, leftEar: ear, rightEar: ear, leftBlinkScore: blinkScore, rightBlinkScore: blinkScore, interEyeDistancePx: iod });
const framesWithBlink = (baseEar = 0.3, closedEar = 0.15, iod = 100): CameraFrameObservation[] => {
  const frames = Array.from({ length: 120 }, (_, index) => valid(index * 250, baseEar, iod));
  frames[20] = valid(5_000, closedEar, iod);
  frames[21] = valid(5_250, baseEar, iod);
  return frames;
};

test("window 30 giây chỉ tạo aggregate và đếm blink theo transition", () => {
  const frames = framesWithBlink();
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.equal(result.status, "COMPLETED");
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
  assert.equal(result.distanceSummary.status, "OBSERVED");
  assert.equal("frames" in result, false);
  assert.equal(result.rawDataPersisted, false);
});

test("blink counter dùng ngưỡng thích nghi để không bỏ sót người có EAR nền cao", () => {
  const frames = framesWithBlink(0.34, 0.27);
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
});

test("blink counter bắt được blink nông kiểu V1 thay vì yêu cầu đóng mắt quá sâu", () => {
  const frames = framesWithBlink(0.3, 0.24);
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
});

test("blink counter bắt được blink rất nông khi EAR giảm rồi hồi phục nhanh", () => {
  const frames = framesWithBlink(0.3, 0.282);
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
});

test("ưu tiên blendshape để bắt blink nhanh một frame video khi EAR không đổi", () => {
  const frames = Array.from({ length: 900 }, (_, index) => valid(index * (1_000 / 30), 0.3, 100, index === 150 ? 0.9 : 0.05));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
  assert.ok(!result.reasonCodes.includes("BLINK_SIGNAL_NOT_RESPONSIVE"));
});

test("giữ blink UNKNOWN khi landmark và blendshape đều không phản hồi", () => {
  const frames = Array.from({ length: 900 }, (_, index) => valid(index * (1_000 / 30), 0.3, 100, 0.05));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  assert.deepEqual(result.blinkSummary, { status: "UNKNOWN" });
  assert.ok(result.reasonCodes.includes("BLINK_SIGNAL_NOT_RESPONSIVE"));
});

test("blink evidence không phụ thuộc calibration distance", () => {
  const frames = framesWithBlink().map((frame, index) => index < 48 ? frame : { ...frame, faceCount: 0 });
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration: null, currentDeviceBinding: binding });
  assert.equal(result.status, "COMPLETED");
  assert.deepEqual(result.blinkSummary, { status: "OBSERVED", count: 1, ratePerMinute: 2 });
  assert.deepEqual(result.distanceSummary, { status: "UNKNOWN" });
  assert.ok(result.reasonCodes.includes("CALIBRATION_MISSING"));
  assert.ok(result.reasonCodes.includes("DISTANCE_INSUFFICIENT_VALID_SAMPLES"));
});

test("quality thấp và camera fail không biến missing thành zero", () => {
  const frames = Array.from({ length: 30 }, (_, index) => ({ ...valid(index * 1_000), faceCount: 0 }));
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration: null, currentDeviceBinding: null });
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.deepEqual(result.blinkSummary, { status: "UNKNOWN" });
  assert.deepEqual(result.distanceSummary, { status: "UNKNOWN" });
  assert.equal(result.qualityDistribution.NO_FACE, 30);
});

test("cửa sổ hoàn tất nhưng không nhận frame báo đúng lỗi lifecycle", () => {
  const result = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames: [], calibration, currentDeviceBinding: binding });
  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.ok(result.reasonCodes.includes("CAMERA_FRAME_STREAM_STOPPED"));
});

test("calibration không được dùng lại khi device binding thay đổi", () => {
  const frames = framesWithBlink();
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
  assert.match(result.algorithmVersion, /eyemate-window\/0\.3\.0$/);
  assert.match(result.configVersion, /blink-hybrid\/1\.0\.0/);
  assert.match(result.configVersion, /distance-ratio-filter\/1\.0\.0$/);
});
