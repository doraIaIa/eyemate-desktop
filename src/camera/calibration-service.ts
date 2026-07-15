import { validateCalibrationProfile, type CameraCalibrationProfile } from "./measurement-window.js";

export const CAMERA_CALIBRATION_RECORD_VERSION = "camera-calibration-record/1.0.0" as const;
export const CAMERA_CALIBRATION_ALGORITHM_VERSION = "camera-calibration-median-cv/1.0.0" as const;
export const CAMERA_CALIBRATION_CONFIG = Object.freeze({
  captureDurationMs: 5_000,
  minimumValidSamples: 30,
  highConfidenceMaximumCv: 0.05,
  mediumConfidenceMaximumCv: 0.1
} as const);

export type CameraCalibrationConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface CameraCalibrationRecord {
  readonly schemaVersion: typeof CAMERA_CALIBRATION_RECORD_VERSION;
  readonly algorithmVersion: typeof CAMERA_CALIBRATION_ALGORITHM_VERSION;
  readonly profile: CameraCalibrationProfile;
  readonly validSampleCount: number;
  readonly variance: number;
  readonly coefficientOfVariation: number;
  readonly confidence: CameraCalibrationConfidence;
  readonly rawDataPersisted: false;
}

export interface CameraCalibrationCaptureInput {
  readonly deviceBinding: string;
  readonly width: number;
  readonly height: number;
  readonly referenceDistanceCm: number;
  readonly interEyeDistanceSamplesPx: readonly number[];
  readonly calibratedAt: string;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function createCameraCalibrationRecord(input: CameraCalibrationCaptureInput): CameraCalibrationRecord {
  const samples = input.interEyeDistanceSamplesPx.filter((sample) => Number.isFinite(sample) && sample > 0);
  if (samples.length < CAMERA_CALIBRATION_CONFIG.minimumValidSamples) throw new Error("CALIBRATION_INSUFFICIENT_VALID_SAMPLES");

  const referenceInterEyePx = median(samples);
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const variance = samples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / samples.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;
  const confidence: CameraCalibrationConfidence = coefficientOfVariation < CAMERA_CALIBRATION_CONFIG.highConfidenceMaximumCv
    ? "HIGH"
    : coefficientOfVariation < CAMERA_CALIBRATION_CONFIG.mediumConfidenceMaximumCv ? "MEDIUM" : "LOW";
  const profile = validateCalibrationProfile({
    profileVersion: "camera-calibration/0.1.0",
    deviceBinding: input.deviceBinding,
    width: input.width,
    height: input.height,
    groundTruthCm: input.referenceDistanceCm,
    referenceInterEyePx,
    calibratedAt: input.calibratedAt
  });

  return Object.freeze({
    schemaVersion: CAMERA_CALIBRATION_RECORD_VERSION,
    algorithmVersion: CAMERA_CALIBRATION_ALGORITHM_VERSION,
    profile,
    validSampleCount: samples.length,
    variance: Math.round(variance * 1_000_000) / 1_000_000,
    coefficientOfVariation: Math.round(coefficientOfVariation * 1_000_000) / 1_000_000,
    confidence,
    rawDataPersisted: false
  });
}

export function validateCameraCalibrationRecord(value: CameraCalibrationRecord): CameraCalibrationRecord {
  if (value.schemaVersion !== CAMERA_CALIBRATION_RECORD_VERSION || value.algorithmVersion !== CAMERA_CALIBRATION_ALGORITHM_VERSION
    || !Number.isInteger(value.validSampleCount) || value.validSampleCount < CAMERA_CALIBRATION_CONFIG.minimumValidSamples
    || !Number.isFinite(value.variance) || value.variance < 0
    || !Number.isFinite(value.coefficientOfVariation) || value.coefficientOfVariation < 0
    || !["HIGH", "MEDIUM", "LOW"].includes(value.confidence) || value.rawDataPersisted !== false) {
    throw new Error("INVALID_CAMERA_CALIBRATION_RECORD");
  }
  const profile = validateCalibrationProfile(value.profile);
  return Object.freeze({ ...value, profile });
}
