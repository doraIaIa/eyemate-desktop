export const CAMERA_ALGORITHM_VERSION = "mediapipe-face-landmarker/0.10.35+eyemate-window/0.1.0";
export const CAMERA_CONFIG_VERSION = "camera-quality/0.1.0";

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

interface AcceptedSample { readonly timestampMs: number; readonly ear: number; readonly interEyeDistancePx: number; }

const QUALITY_REASONS: readonly CameraQualityReason[] = ["NO_FACE", "MULTIPLE_FACES", "LOW_VISIBILITY", "POSE_UNSTABLE", "LOW_LIGHT", "INVALID_GEOMETRY"];

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

function countBlinks(samples: readonly AcceptedSample[]): number {
  let closedFrames = 0;
  let count = 0;
  let closed = false;
  for (const sample of samples) {
    if (sample.ear < 0.2) {
      closedFrames += 1;
      if (!closed && closedFrames >= 2) closed = true;
    } else {
      if (closed) count += 1;
      closed = false;
      closedFrames = 0;
    }
  }
  return count;
}

function distanceZone(sample: AcceptedSample, profile: CameraCalibrationProfile): Exclude<DistanceZone, "UNKNOWN"> {
  const relativeDistance = profile.referenceInterEyePx / sample.interEyeDistancePx;
  if (relativeDistance < 0.85) return "NEAR";
  if (relativeDistance > 1.15) return "FAR";
  return "COMFORT";
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
  for (const frame of input.frames) {
    const reason = qualityReason(frame);
    if (reason !== null) { qualityDistribution[reason] += 1; continue; }
    accepted.push({ timestampMs: frame.timestampMs, ear: (frame.leftEar! + frame.rightEar!) / 2, interEyeDistancePx: frame.interEyeDistancePx! });
  }
  const sampleCount = input.frames.length;
  const validSampleCount = accepted.length;
  const validSampleRatio = sampleCount === 0 ? 0 : validSampleCount / sampleCount;
  const durationMs = input.endedAtMs - input.startedAtMs;
  const enoughEvidence = input.status === "COMPLETED" && durationMs >= 29_000 && validSampleCount >= 15 && validSampleRatio >= 0.7;
  const reasonCodes: string[] = [];
  if (!enoughEvidence && input.status === "COMPLETED") reasonCodes.push("INSUFFICIENT_VALID_SAMPLES");
  if (input.calibration === null) reasonCodes.push("CALIBRATION_MISSING");
  else if (input.currentDeviceBinding !== input.calibration.deviceBinding) reasonCodes.push("CALIBRATION_DEVICE_CHANGED");
  const blinkCount = enoughEvidence ? countBlinks(accepted) : 0;
  const blinkSummary: CameraMeasurementAggregate["blinkSummary"] = enoughEvidence
    ? { status: "OBSERVED", count: blinkCount, ratePerMinute: Math.round((blinkCount * 60_000 / durationMs) * 10) / 10 }
    : { status: "UNKNOWN" };
  let distanceSummary: CameraMeasurementAggregate["distanceSummary"] = { status: "UNKNOWN" };
  if (enoughEvidence && input.calibration !== null && input.currentDeviceBinding === input.calibration.deviceBinding) {
    const zones = { NEAR: 0, COMFORT: 0, FAR: 0 };
    for (const sample of accepted) zones[distanceZone(sample, input.calibration)] += 1;
    const dominantZone = (Object.entries(zones).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "COMFORT") as Exclude<DistanceZone, "UNKNOWN">;
    distanceSummary = { status: "OBSERVED", dominantZone, zoneDistribution: zones };
  }
  return Object.freeze({
    schemaVersion: "camera-measurement-aggregate/0.1.0", status: enoughEvidence ? input.status : input.status === "COMPLETED" ? "INSUFFICIENT_DATA" : input.status,
    durationMs, sampleCount, validSampleCount, validSampleRatio, qualityDistribution, confidence: Math.round(validSampleRatio * 1000) / 1000,
    blinkSummary, distanceSummary, reasonCodes: Object.freeze(reasonCodes), algorithmVersion: CAMERA_ALGORITHM_VERSION, configVersion: CAMERA_CONFIG_VERSION,
    calibrationProfileVersion: input.calibration?.profileVersion ?? null, rawDataPersisted: false
  });
}
