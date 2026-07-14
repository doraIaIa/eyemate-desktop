export interface PrivacySummary {
  readonly localOnly: true;
  readonly cameraState: "SKIPPED_NO_CONSENT" | "CAMERA_UNAVAILABLE";
  readonly exportRequiresConfirmation: true;
  readonly deletionResults: readonly ("DELETED" | "PARTIALLY_DELETED" | "FAILED")[];
}

export function isPrivacySummary(value: unknown): value is PrivacySummary {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.localOnly === true && (candidate.cameraState === "SKIPPED_NO_CONSENT" || candidate.cameraState === "CAMERA_UNAVAILABLE")
    && candidate.exportRequiresConfirmation === true && Array.isArray(candidate.deletionResults);
}
