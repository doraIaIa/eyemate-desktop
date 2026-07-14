export type OnboardingStage = "NOT_STARTED" | "INTRO_SEEN" | "PRIVACY_SEEN" | "CAMERA_DECIDED" | "COMPLETE";

export interface OnboardingProgress {
  readonly stage: OnboardingStage;
  readonly updatedAt: string;
}

export interface OnboardingProgressRepository {
  load(): OnboardingProgress | null;
  save(progress: OnboardingProgress): void;
}

export type CameraConsentDecision = "GRANTED" | "SKIPPED" | "WITHDRAWN";

export interface CameraConsentRecord {
  readonly purpose: "CAMERA_MEASUREMENT";
  readonly scope: "LOCAL_CAMERA";
  readonly textVersion: string;
  readonly decision: CameraConsentDecision;
  readonly decidedAt: string;
}

export interface CameraConsentRepository {
  loadCameraConsent(): CameraConsentRecord | null;
  saveCameraConsent(record: CameraConsentRecord): void;
}
