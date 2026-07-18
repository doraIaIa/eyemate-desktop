import { DISTANCE_RATIO_FILTER_CONFIG, RatioZoneFilter } from "../distance/ratio-zone-filter.js";

export const CAMERA_ALGORITHM_VERSION = "mediapipe-face-landmarker/0.10.35+eyemate-window/0.3.0";
export const CAMERA_CONFIG_VERSION = `camera-quality/0.2.0+blink-hybrid/1.0.0+${DISTANCE_RATIO_FILTER_CONFIG.version}` as const;

export type CameraQualityReason = "NO_FACE" | "MULTIPLE_FACES" | "LOW_VISIBILITY" | "POSE_UNSTABLE" | "LOW_LIGHT" | "INVALID_GEOMETRY";
export type DistanceZone = "NEAR" | "COMFORT" | "FAR" | "UNKNOWN";

export interface CameraFrameObservation {
  readonly timestampMs: number;
  readonly faceCount: number;
  readonly eyeVisibility: number;
  readonly poseScore: number;
  readonly lightingScore: number;
  readonly leftEar: number | null;
  readonly rightEar: number | null;
  readonly leftBlinkScore: number | null;
  readonly rightBlinkScore: number | null;
  readonly interEyeDistancePx: number | null;
}

export interface CameraCalibrationProfile {
  readonly profileVersion: "camera-calibration/0.1.0";
  readonly deviceBinding: string;
  readonly width: number;
  readonly height: number;
  readonly groundTruthCm: number;
  readonly referenceInterEyePx: number;
  readonly calibratedAt: string;
}

export interface CameraMeasurementAggregate {
  readonly schemaVersion: "camera-measurement-aggregate/0.1.0";
  readonly status: "COMPLETED" | "INSUFFICIENT_DATA" | "CANCELLED" | "CAMERA_FAILED" | "TIMEOUT";
  readonly durationMs: number;
  readonly sampleCount: number;
  readonly validSampleCount: number;
  readonly validSampleRatio: number;
  readonly qualityDistribution: Readonly<Record<CameraQualityReason, number>>;
  readonly confidence: number;
  readonly blinkSummary: { readonly status: "OBSERVED"; readonly count: number; readonly ratePerMinute: number } | { readonly status: "UNKNOWN" };
  readonly distanceSummary: { readonly status: "OBSERVED"; readonly dominantZone: Exclude<DistanceZone, "UNKNOWN">; readonly zoneDistribution: Readonly<Record<Exclude<DistanceZone, "UNKNOWN">, number>> } | { readonly status: "UNKNOWN" };
  readonly reasonCodes: readonly string[];
  readonly algorithmVersion: typeof CAMERA_ALGORITHM_VERSION;
  readonly configVersion: typeof CAMERA_CONFIG_VERSION;
  readonly calibrationProfileVersion: CameraCalibrationProfile["profileVersion"] | null;
  readonly rawDataPersisted: false;
}

export function validateCameraMeasurementAggregate(value: CameraMeasurementAggregate): CameraMeasurementAggregate {
  if (value.schemaVersion !== "camera-measurement-aggregate/0.1.0"
    || !["COMPLETED", "INSUFFICIENT_DATA", "CANCELLED", "CAMERA_FAILED", "TIMEOUT"].includes(value.status)
    || !Number.isFinite(value.durationMs) || value.durationMs < 0 || value.durationMs > 120_000
    || !Number.isInteger(value.sampleCount) || value.sampleCount < 0 || value.sampleCount > 10_000
    || !Number.isInteger(value.validSampleCount) || value.validSampleCount < 0 || value.validSampleCount > value.sampleCount
    || !Number.isFinite(value.validSampleRatio) || value.validSampleRatio < 0 || value.validSampleRatio > 1
    || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1
    || value.algorithmVersion !== CAMERA_ALGORITHM_VERSION || value.configVersion !== CAMERA_CONFIG_VERSION
    || !(value.calibrationProfileVersion === null || value.calibrationProfileVersion === "camera-calibration/0.1.0")
    || value.rawDataPersisted !== false || !Array.isArray(value.reasonCodes)) throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
  for (const reason of QUALITY_REASONS) {
    if (!Number.isInteger(value.qualityDistribution[reason]) || value.qualityDistribution[reason] < 0) throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
  }
  if (value.blinkSummary.status === "OBSERVED") {
    if (!Number.isInteger(value.blinkSummary.count) || value.blinkSummary.count < 0 || !Number.isFinite(value.blinkSummary.ratePerMinute) || value.blinkSummary.ratePerMinute < 0 || value.blinkSummary.ratePerMinute > 120) throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
  } else if (value.blinkSummary.status !== "UNKNOWN") throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
  if (value.distanceSummary.status === "OBSERVED") {
    if (!["NEAR", "COMFORT", "FAR"].includes(value.distanceSummary.dominantZone)) throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
    for (const zone of ["NEAR", "COMFORT", "FAR"] as const) {
      if (!Number.isInteger(value.distanceSummary.zoneDistribution[zone]) || value.distanceSummary.zoneDistribution[zone] < 0) throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
    }
  } else if (value.distanceSummary.status !== "UNKNOWN") throw new Error("INVALID_CAMERA_MEASUREMENT_AGGREGATE");
  return Object.freeze({ ...value, reasonCodes: Object.freeze([...value.reasonCodes]) });
}

interface AcceptedSample { readonly timestampMs: number; readonly ear: number; readonly blinkScore: number | null; readonly interEyeDistancePx: number; }
interface BlinkDetection { readonly count: number; readonly signalResponsive: boolean; }

const QUALITY_REASONS: readonly CameraQualityReason[] = ["NO_FACE", "MULTIPLE_FACES", "LOW_VISIBILITY", "POSE_UNSTABLE", "LOW_LIGHT", "INVALID_GEOMETRY"];
const MINIMUM_COMPLETED_DURATION_MS = 29_000;
const MINIMUM_BLINK_DURATION_MS = 10_000;
const MINIMUM_BLINK_VALID_SAMPLES = 10;
const MINIMUM_BLINK_VALID_RATIO = 0.35;
const MINIMUM_DISTANCE_VALID_SAMPLES = 15;
const MINIMUM_DISTANCE_VALID_RATIO = 0.7;

function qualityReason(frame: CameraFrameObservation): CameraQualityReason | null {
  if (frame.faceCount === 0) return "NO_FACE";
  if (frame.faceCount !== 1) return "MULTIPLE_FACES";
  if (!Number.isFinite(frame.eyeVisibility) || frame.eyeVisibility < 0.55) return "LOW_VISIBILITY";
  if (!Number.isFinite(frame.poseScore) || frame.poseScore < 0.6) return "POSE_UNSTABLE";
  if (!Number.isFinite(frame.lightingScore) || frame.lightingScore < 0.2) return "LOW_LIGHT";
  if (frame.leftEar === null || frame.rightEar === null || frame.interEyeDistancePx === null
    || !Number.isFinite(frame.leftEar) || !Number.isFinite(frame.rightEar) || !Number.isFinite(frame.interEyeDistancePx)
    || frame.leftEar <= 0 || frame.rightEar <= 0 || frame.interEyeDistancePx <= 0) return "INVALID_GEOMETRY";
  return null;
}

function countTransitions(
  samples: readonly AcceptedSample[],
  valueOf: (sample: AcceptedSample) => number | null,
  closes: (value: number) => boolean,
  opens: (value: number) => boolean
): number {
  let closingStartedAt: number | null = null;
  let lastBlinkAt = -Infinity;
  let count = 0;
  for (const sample of samples) {
    const value = valueOf(sample);
    if (value === null) { closingStartedAt = null; continue; }
    if (closingStartedAt === null) {
      if (closes(value)) closingStartedAt = sample.timestampMs;
      continue;
    }
    if (!opens(value)) continue;
    const durationMs = sample.timestampMs - closingStartedAt;
    if (durationMs >= 16 && durationMs <= 800 && sample.timestampMs - lastBlinkAt >= 100) {
      count += 1;
      lastBlinkAt = sample.timestampMs;
    }
    closingStartedAt = null;
  }
  return count;
}

function detectBlinks(samples: readonly AcceptedSample[]): BlinkDetection {
  if (samples.length === 0) return { count: 0, signalResponsive: false };
  const blinkScores = samples.map((sample) => sample.blinkScore).filter((value): value is number => value !== null && Number.isFinite(value));
  if (blinkScores.length >= samples.length * 0.7) {
    const sortedScores = [...blinkScores].sort((left, right) => left - right);
    const openBaseline = sortedScores[Math.floor(sortedScores.length * 0.25)] ?? 0;
    const peak = sortedScores[Math.floor(sortedScores.length * 0.95)] ?? openBaseline;
    const closeThreshold = Math.max(0.42, openBaseline + 0.22);
    const openThreshold = Math.min(closeThreshold - 0.08, Math.max(0.28, openBaseline + 0.1));
    const count = countTransitions(samples, (sample) => sample.blinkScore, (value) => value >= closeThreshold, (value) => value <= openThreshold);
    if (count > 0 || peak - openBaseline >= 0.18) return { count, signalResponsive: true };
  }

  const sortedEar = samples.map((sample) => sample.ear).sort((left, right) => left - right);
  const baselineEar = sortedEar[Math.floor(sortedEar.length * 0.75)] ?? sortedEar.at(-1) ?? 0.3;
  const minimumEar = sortedEar[Math.floor(sortedEar.length * 0.05)] ?? baselineEar;
  const minimumDrop = Math.max(0.006, baselineEar * 0.04);
  const closeThreshold = baselineEar - minimumDrop;
  const openThreshold = baselineEar - minimumDrop * 0.35;
  const count = countTransitions(samples, (sample) => sample.ear, (value) => value <= closeThreshold, (value) => value >= openThreshold);
  return { count, signalResponsive: count > 0 || baselineEar - minimumEar >= minimumDrop };
}

export function validateCalibrationProfile(profile: CameraCalibrationProfile): CameraCalibrationProfile {
  if (profile.profileVersion !== "camera-calibration/0.1.0" || !/^[a-f0-9]{64}$/.test(profile.deviceBinding)
    || !Number.isInteger(profile.width) || profile.width < 320 || profile.width > 7680
    || !Number.isInteger(profile.height) || profile.height < 240 || profile.height > 4320
    || !Number.isFinite(profile.groundTruthCm) || profile.groundTruthCm < 20 || profile.groundTruthCm > 150
    || !Number.isFinite(profile.referenceInterEyePx) || profile.referenceInterEyePx < 5
    || Number.isNaN(Date.parse(profile.calibratedAt))) throw new Error("INVALID_CAMERA_CALIBRATION_PROFILE");
  return Object.freeze({ ...profile });
}

export function aggregateMeasurementWindow(input: {
  readonly status: CameraMeasurementAggregate["status"];
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly frames: readonly CameraFrameObservation[];
  readonly calibration: CameraCalibrationProfile | null;
  readonly currentDeviceBinding: string | null;
}): CameraMeasurementAggregate {
  if (!Number.isFinite(input.startedAtMs) || !Number.isFinite(input.endedAtMs) || input.endedAtMs < input.startedAtMs) throw new Error("INVALID_MEASUREMENT_WINDOW");
  const qualityDistribution = Object.fromEntries(QUALITY_REASONS.map((reason) => [reason, 0])) as Record<CameraQualityReason, number>;
  const accepted: AcceptedSample[] = [];
  const distanceInputs: Array<number | null> = [];
  for (const frame of input.frames) {
    const reason = qualityReason(frame);
    if (reason !== null) { qualityDistribution[reason] += 1; distanceInputs.push(null); continue; }
    const blinkScore = frame.leftBlinkScore !== null && frame.rightBlinkScore !== null
      && Number.isFinite(frame.leftBlinkScore) && Number.isFinite(frame.rightBlinkScore)
      ? Math.min(frame.leftBlinkScore, frame.rightBlinkScore) : null;
    accepted.push({ timestampMs: frame.timestampMs, ear: (frame.leftEar! + frame.rightEar!) / 2, blinkScore, interEyeDistancePx: frame.interEyeDistancePx! });
    distanceInputs.push(frame.interEyeDistancePx!);
  }
  const sampleCount = input.frames.length;
  const validSampleCount = accepted.length;
  const validSampleRatio = sampleCount === 0 ? 0 : validSampleCount / sampleCount;
  const durationMs = input.endedAtMs - input.startedAtMs;
  const completedMeasurement = input.status === "COMPLETED";
  const enoughBlinkEvidence = completedMeasurement && durationMs >= MINIMUM_BLINK_DURATION_MS && validSampleCount >= MINIMUM_BLINK_VALID_SAMPLES && validSampleRatio >= MINIMUM_BLINK_VALID_RATIO;
  const enoughDistanceEvidence = completedMeasurement && durationMs >= MINIMUM_COMPLETED_DURATION_MS && validSampleCount >= MINIMUM_DISTANCE_VALID_SAMPLES && validSampleRatio >= MINIMUM_DISTANCE_VALID_RATIO;
  const reasonCodes: string[] = [];
  if ((completedMeasurement || input.status === "CAMERA_FAILED") && sampleCount === 0) reasonCodes.push("CAMERA_FRAME_STREAM_STOPPED");
  if (completedMeasurement && durationMs < MINIMUM_COMPLETED_DURATION_MS) reasonCodes.push("MEASUREMENT_WINDOW_TOO_SHORT");
  if (completedMeasurement && !enoughBlinkEvidence) reasonCodes.push("BLINK_INSUFFICIENT_VALID_SAMPLES");
  if (completedMeasurement && !enoughDistanceEvidence) reasonCodes.push("DISTANCE_INSUFFICIENT_VALID_SAMPLES");
  if (input.status === "CAMERA_FAILED") reasonCodes.push("MEASUREMENT_CAMERA_FAILED");
  if (input.status === "TIMEOUT") reasonCodes.push("MEASUREMENT_TIMEOUT");
  if (input.status === "CANCELLED") reasonCodes.push("MEASUREMENT_CANCELLED");
  if (input.status === "INSUFFICIENT_DATA") reasonCodes.push("MEASUREMENT_INSUFFICIENT_DATA");
  if (completedMeasurement && input.calibration === null) reasonCodes.push("CALIBRATION_MISSING");
  else if (completedMeasurement && input.calibration !== null && input.currentDeviceBinding !== input.calibration.deviceBinding) reasonCodes.push("CALIBRATION_DEVICE_CHANGED");
  const blinkDetection = enoughBlinkEvidence ? detectBlinks(accepted) : { count: 0, signalResponsive: false };
  if (enoughBlinkEvidence && !blinkDetection.signalResponsive) reasonCodes.push("BLINK_SIGNAL_NOT_RESPONSIVE");
  const blinkSummary: CameraMeasurementAggregate["blinkSummary"] = enoughBlinkEvidence
    && blinkDetection.signalResponsive
    ? { status: "OBSERVED", count: blinkDetection.count, ratePerMinute: Math.round((blinkDetection.count * 60_000 / durationMs) * 10) / 10 }
    : { status: "UNKNOWN" };
  let distanceSummary: CameraMeasurementAggregate["distanceSummary"] = { status: "UNKNOWN" };
  if (enoughDistanceEvidence && input.calibration !== null && input.currentDeviceBinding === input.calibration.deviceBinding) {
    const zones = { NEAR: 0, COMFORT: 0, FAR: 0 };
    const filter = new RatioZoneFilter(input.calibration.referenceInterEyePx);
    let rejectedOutliers = 0;
    for (const interEyeDistancePx of distanceInputs) {
      const filtered = interEyeDistancePx === null ? filter.reject() : filter.push(interEyeDistancePx);
      if (interEyeDistancePx !== null && filtered.status === "OUTLIER_REJECTED") rejectedOutliers += 1;
      else if (filtered.status === "OBSERVED" && filtered.zone !== null) zones[filtered.zone] += 1;
    }
    if (rejectedOutliers > 0) reasonCodes.push("DISTANCE_OUTLIERS_REJECTED");
    const observedZoneCount = zones.NEAR + zones.COMFORT + zones.FAR;
    if (observedZoneCount === 0) reasonCodes.push("DISTANCE_FILTER_INSUFFICIENT_DATA");
    else {
      const dominantZone = Object.entries(zones).sort((left, right) => right[1] - left[1])[0]![0] as Exclude<DistanceZone, "UNKNOWN">;
      distanceSummary = { status: "OBSERVED", dominantZone, zoneDistribution: zones };
    }
  }
  const hasCameraObservation = blinkSummary.status === "OBSERVED" || distanceSummary.status === "OBSERVED";
  return Object.freeze({
    schemaVersion: "camera-measurement-aggregate/0.1.0", status: completedMeasurement && !hasCameraObservation ? "INSUFFICIENT_DATA" : input.status,
    durationMs, sampleCount, validSampleCount, validSampleRatio, qualityDistribution, confidence: Math.round(validSampleRatio * 1000) / 1000,
    blinkSummary, distanceSummary, reasonCodes: Object.freeze(reasonCodes), algorithmVersion: CAMERA_ALGORITHM_VERSION, configVersion: CAMERA_CONFIG_VERSION,
    calibrationProfileVersion: input.calibration?.profileVersion ?? null, rawDataPersisted: false
  });
}
