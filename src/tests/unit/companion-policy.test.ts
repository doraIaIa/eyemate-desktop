import assert from "node:assert/strict";
import test from "node:test";
import { COMPANION_POLICY_VERSION, decideNudge } from "../../work-session/companion-policy.js";

const base = { mode: "BALANCED" as const, minuteOfDay: 600, cooldownMinutes: 10, frequencyCap: 3, nowMonotonicMs: 1_000_000, lastNudgeMonotonicMs: null, nudgesInWindow: 0, signal: "SUFFICIENT" as const };

test("policy emits versioned nudge when all gates pass", () => assert.deepEqual(decideNudge(base), { policyVersion: COMPANION_POLICY_VERSION, action: "EMIT", reason: "EMIT", suggestedActionKey: "TAKE_SHORT_BREAK", dataSufficiency: "SUFFICIENT", cooldownRemainingMs: 0 }));
test("quiet, deep-focus, cooldown and cap abstain with reasons", () => {
  assert.equal(decideNudge({ ...base, quietHours: { startMinute: 540, endMinute: 660 } }).reason, "QUIET_HOURS");
  assert.equal(decideNudge({ ...base, mode: "DEEP_FOCUS" }).reason, "DEEP_FOCUS");
  assert.equal(decideNudge({ ...base, lastNudgeMonotonicMs: 900_000 }).reason, "COOLDOWN");
  assert.equal(decideNudge({ ...base, nudgesInWindow: 3 }).reason, "FREQUENCY_CAP");
});
test("unknown/low signal and timer-only never emit", () => {
  assert.equal(decideNudge({ ...base, signal: "UNKNOWN" }).action, "ABSTAIN");
  assert.equal(decideNudge({ ...base, mode: "TIMER_ONLY" }).reason, "TIMER_ONLY");
});
test("timer-only can emit bounded break reminder without camera measurement", () => {
  const decision = decideNudge({ ...base, mode: "TIMER_ONLY", nudgeType: "BREAK_REMINDER" });
  assert.equal(decision.action, "EMIT");
  assert.equal(decision.suggestedActionKey, "TAKE_SHORT_BREAK");
});
test("deep focus vẫn cho phép break reminder đúng cadence nhưng chặn distance nudge", () => {
  assert.equal(decideNudge({ ...base, mode: "DEEP_FOCUS", nudgeType: "BREAK_REMINDER" }).action, "EMIT");
  assert.equal(decideNudge({ ...base, mode: "DEEP_FOCUS", nudgeType: "DISTANCE_NEAR" }).reason, "DEEP_FOCUS");
});
test("disabled nudge type abstains explicitly", () => {
  const decision = decideNudge({ ...base, nudgeType: "BREAK_REMINDER", enabledNudgeTypes: ["DISTANCE_NEAR"] });
  assert.equal(decision.reason, "NUDGE_DISABLED");
});
test("invalid policy input fails closed", () => assert.throws(() => decideNudge({ ...base, frequencyCap: -1 }), /INVALID_POLICY_INPUT/));
