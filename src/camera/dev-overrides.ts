import type { CameraFrameObservation, CameraCalibrationProfile } from "./measurement-window.js";

export interface DevOverrides {
  readonly forceDistanceCm: number | null;
  readonly forceEar: number | null;
  readonly forceBlinkRate: number | null;
  readonly showLandmarkOverlay: boolean;
  readonly showRawMetrics: boolean;
  readonly logLevel: "NONE" | "VERBOSE";
}

export const EMPTY_DEV_OVERRIDES: DevOverrides = Object.freeze({
  forceDistanceCm: null,
  forceEar: null,
  forceBlinkRate: null,
  showLandmarkOverlay: false,
  showRawMetrics: false,
  logLevel: "NONE"
});

export function validateDevOverrides(value: DevOverrides): DevOverrides {
  const validNullable = (number: number | null, minimum: number, maximum: number): boolean => number === null || (Number.isFinite(number) && number >= minimum && number <= maximum);
  if (!validNullable(value.forceDistanceCm, 20, 150) || !validNullable(value.forceEar, 0.05, 0.6) || !validNullable(value.forceBlinkRate, 1, 60)
    || typeof value.showLandmarkOverlay !== "boolean" || typeof value.showRawMetrics !== "boolean" || !["NONE", "VERBOSE"].includes(value.logLevel)) {
    throw new Error("INVALID_DEV_OVERRIDES");
  }
  return Object.freeze({ ...value });
}

export function applyDevObservationOverrides(observation: CameraFrameObservation, calibration: CameraCalibrationProfile | null, overrides: DevOverrides): CameraFrameObservation {
  const validated = validateDevOverrides(overrides);
  let leftEar = observation.leftEar;
  let rightEar = observation.rightEar;
  if (validated.forceEar !== null) leftEar = rightEar = validated.forceEar;
  else if (validated.forceBlinkRate !== null) {
    const periodMs = 60_000 / validated.forceBlinkRate;
    const simulatedEar = observation.timestampMs % periodMs < 120 ? 0.15 : 0.3;
    leftEar = rightEar = simulatedEar;
  }

  let interEyeDistancePx = observation.interEyeDistancePx;
  if (validated.forceDistanceCm !== null && calibration !== null) {
    interEyeDistancePx = calibration.referenceInterEyePx * calibration.groundTruthCm / validated.forceDistanceCm;
  }
  return Object.freeze({ ...observation, leftEar, rightEar, interEyeDistancePx });
}
