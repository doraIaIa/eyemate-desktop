import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMeasurementWindow, validateCalibrationProfile, type CameraFrameObservation } from "../../camera/measurement-window.js";
import { buildEyeHealthAssessment, cameraEvidenceFromAggregate, actionsWithCameraEvidence } from "../../symptom-checkup/eye-health-assessment.js";
import { createWellnessCheckReport, wellnessQuestions, type WellnessQuestionId, type WellnessResponse } from "../../symptom-checkup/wellness-check.js";

const binding = "d".repeat(64);
const calibration = validateCalibrationProfile({ profileVersion: "camera-calibration/0.1.0", deviceBinding: binding, width: 640, height: 480, groundTruthCm: 60, referenceInterEyePx: 100, calibratedAt: "2026-07-15T00:00:00.000Z" });
const frame = (timestampMs: number, ear = 0.3, iod = 100): CameraFrameObservation => ({ timestampMs, faceCount: 1, eyeVisibility: 1, poseScore: 1, lightingScore: 0.8, leftEar: ear, rightEar: ear, leftBlinkScore: null, rightBlinkScore: null, interEyeDistancePx: iod });
const answers = Object.fromEntries(wellnessQuestions.map((question) => [question.id, 2 as WellnessResponse])) as Record<WellnessQuestionId, WellnessResponse>;

test("assessment tích hợp self-report và camera aggregate nhưng không tạo chẩn đoán", () => {
  const frames = Array.from({ length: 30 }, (_, index) => frame(index * 1_000, index < 20 ? 0.3 : 0.15, index < 20 ? 132 : 130));
  const aggregate = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  const camera = cameraEvidenceFromAggregate(aggregate);
  const report = createWellnessCheckReport(answers, "CONTINUE_SELF_CHECK");
  const assessment = buildEyeHealthAssessment(report, camera);
  const actions = actionsWithCameraEvidence(report.actions, camera);

  assert.equal(camera.status, "COMPLETED");
  assert.equal(camera.distanceZone, "NEAR");
  assert.equal(assessment.disclaimer, "WELLNESS_EDUCATION_NOT_DIAGNOSIS");
  assert.ok(assessment.rows.some((row) => row.dimension === "VIEWING_DISTANCE" && row.signal === "ADJUST"));
  assert.ok(actions.some((action) => action.evidenceSource === "CAMERA_OBSERVATION"));
});

test("assessment giữ missing khi camera không đo", () => {
  const camera = cameraEvidenceFromAggregate(null);
  const report = createWellnessCheckReport(answers, "CONTINUE_SELF_CHECK");
  const assessment = buildEyeHealthAssessment(report, camera);
  assert.equal(camera.status, "NOT_MEASURED");
  assert.ok(assessment.missingEvidence.includes("BLINK_BEHAVIOR"));
  assert.ok(assessment.missingEvidence.includes("VIEWING_DISTANCE"));
});

test("không coi zero blink event là bằng chứng camera chắc chắn", () => {
  const frames = Array.from({ length: 30 }, (_, index) => ({ ...frame(index * 1_000, 0.3, 100), leftBlinkScore: index >= 27 ? 0.35 : 0.05, rightBlinkScore: index >= 27 ? 0.35 : 0.05 }));
  const aggregate = aggregateMeasurementWindow({ status: "COMPLETED", startedAtMs: 0, endedAtMs: 30_000, frames, calibration, currentDeviceBinding: binding });
  const camera = cameraEvidenceFromAggregate(aggregate);
  const report = createWellnessCheckReport(answers, "CONTINUE_SELF_CHECK");
  const assessment = buildEyeHealthAssessment(report, camera);
  const blinkRow = assessment.rows.find((row) => row.dimension === "BLINK_BEHAVIOR");

  assert.equal(camera.blinkRatePerMinute, 0);
  assert.equal(camera.distanceZone, "COMFORT");
  assert.equal(blinkRow?.signal, "WATCH");
  assert.equal(blinkRow?.confidence, "LOW");
  assert.ok(assessment.dataConfidence < 1);
  assert.ok(assessment.missingEvidence.includes("BLINK_BEHAVIOR"));
});
