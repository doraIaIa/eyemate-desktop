export type ReleaseChannel = "internal" | "beta" | "stable";
export interface ReleaseDescriptor { readonly channel: ReleaseChannel; readonly version: readonly [number, number, number, number]; readonly minReadableSchema: number; readonly maxReadableSchema: number; }
export type UpdateDecision = "CLEAN_INSTALL_ALLOWED" | "UPDATE_ALLOWED" | "SKIPPED_UPDATE_ALLOWED" | "CHANNEL_MISMATCH" | "DOWNGRADE_BLOCKED" | "ROLLBACK_REQUIRES_PREMIGRATION_BACKUP" | "UNSUPPORTED_DATA_SCHEMA";

function compareVersion(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < 4; index += 1) if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  return 0;
}

export function assessReleaseTransition(current: ReleaseDescriptor | null, target: ReleaseDescriptor, dataSchema: number | null): UpdateDecision {
  if (current === null || dataSchema === null) return "CLEAN_INSTALL_ALLOWED";
  if (current.channel !== target.channel) return "CHANNEL_MISMATCH";
  const ordering = compareVersion(current.version, target.version);
  if (ordering > 0) return dataSchema > target.maxReadableSchema ? "ROLLBACK_REQUIRES_PREMIGRATION_BACKUP" : "DOWNGRADE_BLOCKED";
  if (dataSchema < target.minReadableSchema || dataSchema > target.maxReadableSchema) return "UNSUPPORTED_DATA_SCHEMA";
  if (ordering === 0) return "UPDATE_ALLOWED";
  const skipped = target.maxReadableSchema - dataSchema > 1;
  return skipped ? "SKIPPED_UPDATE_ALLOWED" : "UPDATE_ALLOWED";
}
