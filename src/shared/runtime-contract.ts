export type RuntimeMode = "LOCAL_ONLY";

export interface RuntimeInfo {
  readonly mode: RuntimeMode;
  readonly applicationVersion: string;
  readonly developerPanelEnabled: boolean;
  readonly dataMode: "REAL_LOCAL" | "SYNTHETIC_DEMO";
}

export function isRuntimeInfo(value: unknown): value is RuntimeInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.mode === "LOCAL_ONLY" && typeof candidate.applicationVersion === "string" && typeof candidate.developerPanelEnabled === "boolean"
    && (candidate.dataMode === "REAL_LOCAL" || candidate.dataMode === "SYNTHETIC_DEMO");
}
