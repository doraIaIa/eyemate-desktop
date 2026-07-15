import assert from "node:assert/strict";
import test from "node:test";
import { createCameraCalibrationRecord, validateCameraCalibrationRecord } from "../../camera/calibration-service.js";

const base = {
  deviceBinding: "a".repeat(64), width: 640, height: 480, referenceDistanceCm: 50,
  calibratedAt: "2026-07-15T00:00:00.000Z"
};

test("calibration dùng median và chỉ trả aggregate device-bound", () => {
  const samples = [...Array.from({ length: 45 }, (_, index) => 99 + index % 3), 800];
  const record = createCameraCalibrationRecord({ ...base, interEyeDistanceSamplesPx: samples });
  assert.equal(record.profile.referenceInterEyePx, 100);
  assert.equal(record.profile.groundTruthCm, 50);
  assert.equal(record.validSampleCount, 46);
  assert.equal(record.rawDataPersisted, false);
  assert.equal("interEyeDistanceSamplesPx" in record, false);
  assert.deepEqual(validateCameraCalibrationRecord(record), record);
});

test("calibration thiếu sample fail-closed", () => {
  assert.throws(() => createCameraCalibrationRecord({ ...base, interEyeDistanceSamplesPx: Array(29).fill(100) }), /CALIBRATION_INSUFFICIENT_VALID_SAMPLES/);
});

test("confidence phản ánh độ ổn định, không phải xác suất sức khỏe", () => {
  const high = createCameraCalibrationRecord({ ...base, interEyeDistanceSamplesPx: Array(30).fill(100) });
  const low = createCameraCalibrationRecord({ ...base, interEyeDistanceSamplesPx: Array.from({ length: 30 }, (_, index) => index % 2 === 0 ? 80 : 120) });
  assert.equal(high.confidence, "HIGH");
  assert.equal(low.confidence, "LOW");
});

test("record bị sửa hoặc sai device binding bị từ chối", () => {
  const record = createCameraCalibrationRecord({ ...base, interEyeDistanceSamplesPx: Array(30).fill(100) });
  assert.throws(() => validateCameraCalibrationRecord({ ...record, profile: { ...record.profile, deviceBinding: "camera" } }), /INVALID_CAMERA_CALIBRATION_PROFILE/);
  assert.throws(() => validateCameraCalibrationRecord({ ...record, confidence: "UNKNOWN" as never }), /INVALID_CAMERA_CALIBRATION_RECORD/);
});
