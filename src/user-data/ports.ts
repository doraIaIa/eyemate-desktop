export type OnboardingStage = "NOT_STARTED" | "INTRO_SEEN" | "PRIVACY_SEEN" | "CAMERA_DECIDED" | "COMPLETE";

export interface OnboardingProgress {
  readonly stage: OnboardingStage;
  readonly updatedAt: string;
}

export interface OnboardingProgressRepository {
  load(): OnboardingProgress | null;
  save(progress: OnboardingProgress): void;
}
