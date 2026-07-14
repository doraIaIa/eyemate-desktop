import type { CameraConsentDecision, OnboardingStage } from "../user-data/ports.js";

export type OnboardingAction = "VIEW_INTRO" | "VIEW_PRIVACY" | "SKIP_CAMERA" | "GRANT_CAMERA_CONSENT" | "WITHDRAW_CAMERA_CONSENT";
export type CameraAvailability = "SKIPPED_NO_CONSENT" | "CAMERA_UNAVAILABLE";

export interface OnboardingState {
  readonly stage: OnboardingStage;
  readonly cameraDecision: CameraConsentDecision | "UNKNOWN";
}

export function applyOnboardingAction(state: OnboardingState, action: OnboardingAction): OnboardingState {
  if (action === "VIEW_INTRO" && state.stage === "NOT_STARTED") return { ...state, stage: "INTRO_SEEN" };
  if (action === "VIEW_PRIVACY" && state.stage === "INTRO_SEEN") return { ...state, stage: "PRIVACY_SEEN" };
  if ((action === "SKIP_CAMERA" || action === "GRANT_CAMERA_CONSENT") && state.stage === "PRIVACY_SEEN") {
    return { stage: "COMPLETE", cameraDecision: action === "SKIP_CAMERA" ? "SKIPPED" : "GRANTED" };
  }
  if (action === "WITHDRAW_CAMERA_CONSENT" && state.cameraDecision === "GRANTED") {
    return { ...state, cameraDecision: "WITHDRAWN" };
  }
  return state;
}

export function getCameraAvailability(state: OnboardingState): CameraAvailability {
  return state.cameraDecision === "GRANTED" ? "CAMERA_UNAVAILABLE" : "SKIPPED_NO_CONSENT";
}
