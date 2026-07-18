import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCompanionCycle, getCompanionModeProfile, validateCustomCompanionTiming } from "../../work-session/companion-cycle.js";

test("mode companion có cadence hữu hạn và nhắc trước target", () => {
  for (const mode of ["BALANCED", "DEEP_FOCUS", "HIGH_SUPPORT", "TIMER_ONLY", "CUSTOM"] as const) {
    const profile = getCompanionModeProfile(mode);
    assert.ok(profile.reminderAtMinutes <= profile.workDurationMinutes);
    assert.ok(profile.snoozeMinutes < profile.workDurationMinutes);
    assert.ok(profile.maxNudgesPerSession > 0);
  }
});

test("cycle chuyển focus sang reminder rồi target theo elapsed active", () => {
  assert.equal(evaluateCompanionCycle("TIMER_ONLY", 19 * 60_000).phase, "FOCUS");
  assert.equal(evaluateCompanionCycle("TIMER_ONLY", 20 * 60_000).phase, "REMINDER_DUE");
  const target = evaluateCompanionCycle("TIMER_ONLY", 25 * 60_000);
  assert.equal(target.phase, "TARGET_REACHED");
  assert.equal(target.progress, 1);
  assert.equal(target.remainingToTargetMs, 0);
});

test("deep focus giữ flow lâu hơn nhưng vẫn có mốc nghỉ", () => {
  assert.equal(evaluateCompanionCycle("DEEP_FOCUS", 25 * 60_000).phase, "FOCUS");
  assert.equal(evaluateCompanionCycle("DEEP_FOCUS", 40 * 60_000).phase, "REMINDER_DUE");
  assert.equal(evaluateCompanionCycle("DEEP_FOCUS", 50 * 60_000).phase, "TARGET_REACHED");
});

test("cycle từ chối thời gian không hợp lệ", () => {
  assert.throws(() => evaluateCompanionCycle("BALANCED", -1), /INVALID_COMPANION_CYCLE_TIME/);
});

test("mode tùy chỉnh dùng thời gian người dùng đặt", () => {
  const timing = { workDurationMinutes: 75, breakDurationMinutes: 12, reminderAtMinutes: 55 };
  const profile = getCompanionModeProfile("CUSTOM", timing);
  assert.equal(profile.workDurationMinutes, 75);
  assert.equal(profile.breakDurationMinutes, 12);
  assert.equal(evaluateCompanionCycle("CUSTOM", 55 * 60_000, timing).phase, "REMINDER_DUE");
  assert.throws(() => validateCustomCompanionTiming({ ...timing, reminderAtMinutes: 76 }), /INVALID_CUSTOM_COMPANION_TIMING/);
});
