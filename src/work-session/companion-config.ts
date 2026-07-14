import type { CompanionMode, NudgeType } from "./companion-policy.js";

export interface CompanionConfig {
  readonly mode: CompanionMode;
  readonly workDurationMinutes: number;
  readonly breakDurationMinutes: number;
  readonly cooldownMinutes: number;
  readonly maxNudgesPerHour: number;
  readonly maxNudgesPerSession: number;
  readonly quietHours: Readonly<{ startMinute: number; endMinute: number }> | null;
  readonly notificationsEnabled: boolean;
  readonly cameraParticipation: "OFF" | "OPTIONAL";
  readonly enabledNudgeTypes: readonly NudgeType[];
}

export function validateCompanionConfig(config: CompanionConfig): CompanionConfig {
  const integerFields: readonly (keyof CompanionConfig)[] = ["workDurationMinutes", "breakDurationMinutes", "cooldownMinutes", "maxNudgesPerHour", "maxNudgesPerSession"];
  if (!integerFields.every((field) => Number.isInteger(config[field]) && Number(config[field]) >= 0) || config.workDurationMinutes === 0 || config.maxNudgesPerSession === 0 || config.maxNudgesPerHour === 0) throw new Error("INVALID_COMPANION_CONFIG");
  if (config.quietHours !== null && (!Number.isInteger(config.quietHours.startMinute) || !Number.isInteger(config.quietHours.endMinute) || config.quietHours.startMinute < 0 || config.quietHours.startMinute >= 1440 || config.quietHours.endMinute < 0 || config.quietHours.endMinute >= 1440 || config.quietHours.startMinute === config.quietHours.endMinute)) throw new Error("INVALID_COMPANION_CONFIG");
  if (config.enabledNudgeTypes.length === 0 || config.enabledNudgeTypes.some((type) => type !== "DISTANCE_NEAR" && type !== "BREAK_REMINDER")) throw new Error("INVALID_COMPANION_CONFIG");
  return Object.freeze({ ...config, enabledNudgeTypes: Object.freeze([...config.enabledNudgeTypes]) });
}

export const DEFAULT_TIMER_ONLY_CONFIG: CompanionConfig = validateCompanionConfig({ mode: "TIMER_ONLY", workDurationMinutes: 25, breakDurationMinutes: 5, cooldownMinutes: 10, maxNudgesPerHour: 3, maxNudgesPerSession: 3, quietHours: null, notificationsEnabled: true, cameraParticipation: "OFF", enabledNudgeTypes: ["BREAK_REMINDER"] });
