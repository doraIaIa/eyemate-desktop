export const COMPANION_POLICY_VERSION = "m2-companion-policy/0.1.0" as const;

export type CompanionMode = "BALANCED" | "DEEP_FOCUS" | "HIGH_SUPPORT" | "TIMER_ONLY";
export type NudgeReason = "EMIT" | "QUIET_HOURS" | "DEEP_FOCUS" | "COOLDOWN" | "FREQUENCY_CAP" | "TIMER_ONLY" | "INSUFFICIENT_SIGNAL";

export interface CompanionPolicyInput {
  readonly mode: CompanionMode;
  /** Minutes since midnight in the user's local, already-normalized schedule. */
  readonly minuteOfDay: number;
  readonly quietHours?: Readonly<{ startMinute: number; endMinute: number }>;
  readonly cooldownMinutes: number;
  readonly frequencyCap: number;
  readonly nowMonotonicMs: number;
  readonly lastNudgeMonotonicMs: number | null;
  readonly nudgesInWindow: number;
  readonly signal: "SUFFICIENT" | "LOW" | "UNKNOWN";
}

export interface NudgeDecision {
  readonly policyVersion: typeof COMPANION_POLICY_VERSION;
  readonly action: "EMIT" | "ABSTAIN";
  readonly reason: NudgeReason;
}

function validMinute(value: number): boolean { return Number.isInteger(value) && value >= 0 && value < 1440; }
function inQuietHours(minute: number, quiet: CompanionPolicyInput["quietHours"]): boolean {
  if (!quiet) return false;
  if (!validMinute(quiet.startMinute) || !validMinute(quiet.endMinute) || quiet.startMinute === quiet.endMinute) throw new Error("INVALID_QUIET_HOURS");
  return quiet.startMinute < quiet.endMinute ? minute >= quiet.startMinute && minute < quiet.endMinute : minute >= quiet.startMinute || minute < quiet.endMinute;
}

export function decideNudge(input: CompanionPolicyInput): NudgeDecision {
  if (!validMinute(input.minuteOfDay) || !Number.isFinite(input.nowMonotonicMs) || input.nowMonotonicMs < 0 ||
      !Number.isInteger(input.cooldownMinutes) || input.cooldownMinutes < 0 ||
      !Number.isInteger(input.frequencyCap) || input.frequencyCap < 0 ||
      !Number.isInteger(input.nudgesInWindow) || input.nudgesInWindow < 0 ||
      (input.lastNudgeMonotonicMs !== null && (!Number.isFinite(input.lastNudgeMonotonicMs) || input.lastNudgeMonotonicMs < 0))) {
    throw new Error("INVALID_POLICY_INPUT");
  }
  const abstain = (reason: NudgeReason): NudgeDecision => ({ policyVersion: COMPANION_POLICY_VERSION, action: "ABSTAIN", reason });
  if (input.signal !== "SUFFICIENT") return abstain("INSUFFICIENT_SIGNAL");
  if (input.mode === "TIMER_ONLY") return abstain("TIMER_ONLY");
  if (input.mode === "DEEP_FOCUS") return abstain("DEEP_FOCUS");
  if (inQuietHours(input.minuteOfDay, input.quietHours)) return abstain("QUIET_HOURS");
  if (input.nudgesInWindow >= input.frequencyCap) return abstain("FREQUENCY_CAP");
  if (input.lastNudgeMonotonicMs !== null && input.nowMonotonicMs - input.lastNudgeMonotonicMs < input.cooldownMinutes * 60_000) return abstain("COOLDOWN");
  return { policyVersion: COMPANION_POLICY_VERSION, action: "EMIT", reason: "EMIT" };
}
