import type { CompanionMode } from "./companion-policy.js";

export const COMPANION_CYCLE_VERSION = "companion-cycle/1.0.0" as const;

export interface CompanionModeProfile {
  readonly mode: CompanionMode;
  readonly label: string;
  readonly description: string;
  readonly workDurationMinutes: number;
  readonly breakDurationMinutes: number;
  readonly reminderAtMinutes: number;
  readonly snoozeMinutes: number;
  readonly cooldownMinutes: number;
  readonly maxNudgesPerSession: number;
}

export interface CustomCompanionTiming {
  readonly workDurationMinutes: number;
  readonly breakDurationMinutes: number;
  readonly reminderAtMinutes: number;
}

const profiles: Readonly<Record<CompanionMode, CompanionModeProfile>> = Object.freeze({
  BALANCED: profile("BALANCED", "Cân bằng", "Nhịp 25 phút, nhắc nghỉ nhẹ sau 20 phút.", 25, 5, 20, 5, 10, 3),
  DEEP_FOCUS: profile("DEEP_FOCUS", "Tập trung sâu", "Giữ flow lâu hơn, nhắc nghỉ sau 40 phút.", 50, 10, 40, 5, 15, 2),
  HIGH_SUPPORT: profile("HIGH_SUPPORT", "Hỗ trợ nhiều", "Phiên ngắn hơn, nhắc nghỉ sau 15 phút.", 20, 5, 15, 5, 8, 4),
  TIMER_ONLY: profile("TIMER_ONLY", "Timer Only", "Nhịp 25 phút, không sử dụng camera.", 25, 5, 20, 5, 10, 3),
  CUSTOM: profile("CUSTOM", "Tùy chỉnh", "Nhịp cục bộ mặc định 30 phút.", 30, 5, 25, 5, 10, 3)
});

function profile(mode: CompanionMode, label: string, description: string, workDurationMinutes: number, breakDurationMinutes: number, reminderAtMinutes: number, snoozeMinutes: number, cooldownMinutes: number, maxNudgesPerSession: number): CompanionModeProfile {
  if (reminderAtMinutes <= 0 || reminderAtMinutes > workDurationMinutes) throw new Error("INVALID_COMPANION_MODE_PROFILE");
  return Object.freeze({ mode, label, description, workDurationMinutes, breakDurationMinutes, reminderAtMinutes, snoozeMinutes, cooldownMinutes, maxNudgesPerSession });
}

export function validateCustomCompanionTiming(timing: CustomCompanionTiming): CustomCompanionTiming {
  if (!Number.isInteger(timing.workDurationMinutes) || timing.workDurationMinutes < 5 || timing.workDurationMinutes > 180
    || !Number.isInteger(timing.breakDurationMinutes) || timing.breakDurationMinutes < 1 || timing.breakDurationMinutes > 60
    || !Number.isInteger(timing.reminderAtMinutes) || timing.reminderAtMinutes < 1 || timing.reminderAtMinutes > timing.workDurationMinutes) {
    throw new Error("INVALID_CUSTOM_COMPANION_TIMING");
  }
  return Object.freeze({ ...timing });
}

export function getCompanionModeProfile(mode: CompanionMode, customTiming?: CustomCompanionTiming): CompanionModeProfile {
  if (mode === "CUSTOM" && customTiming) {
    const timing = validateCustomCompanionTiming(customTiming);
    return profile("CUSTOM", "Tùy chỉnh", "Nhịp làm việc do bạn đặt và được lưu cục bộ.", timing.workDurationMinutes, timing.breakDurationMinutes, timing.reminderAtMinutes, 5, 10, 3);
  }
  const value = profiles[mode];
  if (!value) throw new Error("INVALID_COMPANION_MODE");
  return value;
}

export interface CompanionCycleState {
  readonly phase: "FOCUS" | "REMINDER_DUE" | "TARGET_REACHED";
  readonly elapsedActiveMs: number;
  readonly targetMs: number;
  readonly reminderAtMs: number;
  readonly remainingToTargetMs: number;
  readonly progress: number;
  readonly cycleVersion: typeof COMPANION_CYCLE_VERSION;
}

export function evaluateCompanionCycle(mode: CompanionMode, elapsedActiveMs: number, customTiming?: CustomCompanionTiming): CompanionCycleState {
  if (!Number.isFinite(elapsedActiveMs) || elapsedActiveMs < 0) throw new Error("INVALID_COMPANION_CYCLE_TIME");
  const profile = getCompanionModeProfile(mode, customTiming);
  const targetMs = profile.workDurationMinutes * 60_000;
  const reminderAtMs = profile.reminderAtMinutes * 60_000;
  const phase = elapsedActiveMs >= targetMs ? "TARGET_REACHED" : elapsedActiveMs >= reminderAtMs ? "REMINDER_DUE" : "FOCUS";
  return Object.freeze({ phase, elapsedActiveMs, targetMs, reminderAtMs, remainingToTargetMs: Math.max(0, targetMs - elapsedActiveMs), progress: Math.min(1, elapsedActiveMs / targetMs), cycleVersion: COMPANION_CYCLE_VERSION });
}
