export type GuidedCameraState = "IDLE" | "CONSENTED" | "STARTING" | "ACTIVE" | "QUALITY_REJECTED" | "CALIBRATED" | "DISCONNECTED" | "STOPPED" | "DENIED" | "UNAVAILABLE" | "BUSY";
export type GuidedCameraEvent = "GRANT_CONSENT" | "REQUEST_START" | "STARTED" | "REJECT_QUALITY" | "CONFIRM_CALIBRATION" | "DISCONNECT" | "STOP" | "DENY" | "UNAVAILABLE" | "BUSY";

export interface GuidedCameraSummary {
  readonly schemaVersion: "pilot-camera-validation/0.1.0";
  readonly state: GuidedCameraState;
  readonly consentObserved: boolean;
  readonly explicitStartObserved: boolean;
  readonly streamReleased: boolean;
  readonly quality: "NOT_OBSERVED" | "ACCEPTED" | "REJECTED";
  readonly calibration: "NOT_ATTEMPTED" | "OPERATOR_CONFIRMED";
  readonly accuracy: "NOT_EVALUATED";
  readonly rawDataPersisted: false;
}

const ALLOWED: Readonly<Record<GuidedCameraState, readonly GuidedCameraEvent[]>> = {
  IDLE: ["GRANT_CONSENT", "STOP"], CONSENTED: ["REQUEST_START", "STOP"], STARTING: ["STARTED", "DENY", "UNAVAILABLE", "BUSY", "STOP"],
  ACTIVE: ["REJECT_QUALITY", "CONFIRM_CALIBRATION", "DISCONNECT", "STOP"], QUALITY_REJECTED: ["STOP"], CALIBRATED: ["DISCONNECT", "STOP"],
  DISCONNECTED: ["STOP"], STOPPED: [], DENIED: ["STOP"], UNAVAILABLE: ["STOP"], BUSY: ["STOP"]
};

export function createGuidedCameraSummary(): GuidedCameraSummary {
  return { schemaVersion: "pilot-camera-validation/0.1.0", state: "IDLE", consentObserved: false, explicitStartObserved: false, streamReleased: true, quality: "NOT_OBSERVED", calibration: "NOT_ATTEMPTED", accuracy: "NOT_EVALUATED", rawDataPersisted: false };
}

export function applyGuidedCameraEvent(summary: GuidedCameraSummary, event: GuidedCameraEvent): GuidedCameraSummary {
  if (!ALLOWED[summary.state].includes(event)) throw new Error(`INVALID_CAMERA_VALIDATION_TRANSITION:${summary.state}:${event}`);
  if (event === "GRANT_CONSENT") return { ...summary, state: "CONSENTED", consentObserved: true };
  if (event === "REQUEST_START") return { ...summary, state: "STARTING", explicitStartObserved: true, streamReleased: false };
  if (event === "STARTED") return { ...summary, state: "ACTIVE", quality: "ACCEPTED" };
  if (event === "REJECT_QUALITY") return { ...summary, state: "QUALITY_REJECTED", quality: "REJECTED" };
  if (event === "CONFIRM_CALIBRATION") return { ...summary, state: "CALIBRATED", calibration: "OPERATOR_CONFIRMED" };
  if (event === "DISCONNECT") return { ...summary, state: "DISCONNECTED", streamReleased: true };
  if (event === "DENY") return { ...summary, state: "DENIED", streamReleased: true };
  if (event === "UNAVAILABLE") return { ...summary, state: "UNAVAILABLE", streamReleased: true };
  if (event === "BUSY") return { ...summary, state: "BUSY", streamReleased: true };
  return { ...summary, state: "STOPPED", streamReleased: true };
}
