export type CameraState = "IDLE" | "SKIPPED_NO_CONSENT" | "PERMISSION_DENIED" | "CAMERA_UNAVAILABLE" | "CAMERA_BUSY" | "LOW_QUALITY";
export type CameraReason = "EXPLICIT_ACTION_REQUIRED" | "CAMERA_PERMISSION_DENIED" | "CAMERA_UNAVAILABLE" | "CAMERA_BUSY" | "CAMERA_LOW_QUALITY";

export interface CameraStateResult {
  readonly state: CameraState;
  readonly reasonCode: CameraReason | null;
  readonly measurementStatus: "NOT_MEASURED" | "UNKNOWN_LOW_QUALITY";
}

export interface CameraStartIntent { readonly explicitUserAction: boolean; readonly cameraConsentGranted: boolean; }
export interface CameraAdapter { start(): Promise<"DENIED" | "UNAVAILABLE" | "BUSY" | "STARTED">; stop(): Promise<void>; }

export async function requestCameraStart(intent: CameraStartIntent, adapter: CameraAdapter): Promise<CameraStateResult> {
  if (!intent.cameraConsentGranted) return { state: "SKIPPED_NO_CONSENT", reasonCode: "EXPLICIT_ACTION_REQUIRED", measurementStatus: "NOT_MEASURED" };
  if (!intent.explicitUserAction) return { state: "IDLE", reasonCode: "EXPLICIT_ACTION_REQUIRED", measurementStatus: "NOT_MEASURED" };
  const result = await adapter.start();
  if (result === "DENIED") return { state: "PERMISSION_DENIED", reasonCode: "CAMERA_PERMISSION_DENIED", measurementStatus: "NOT_MEASURED" };
  if (result === "UNAVAILABLE") return { state: "CAMERA_UNAVAILABLE", reasonCode: "CAMERA_UNAVAILABLE", measurementStatus: "NOT_MEASURED" };
  if (result === "BUSY") return { state: "CAMERA_BUSY", reasonCode: "CAMERA_BUSY", measurementStatus: "NOT_MEASURED" };
  await adapter.stop();
  return { state: "IDLE", reasonCode: null, measurementStatus: "NOT_MEASURED" };
}

export function rejectLowQuality(): CameraStateResult {
  return { state: "LOW_QUALITY", reasonCode: "CAMERA_LOW_QUALITY", measurementStatus: "UNKNOWN_LOW_QUALITY" };
}
