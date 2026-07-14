import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TIMER_ONLY_CONFIG, validateCompanionConfig } from "../../work-session/companion-config.js";

test("timer-only config is explicit and immutable", () => {
  assert.equal(DEFAULT_TIMER_ONLY_CONFIG.cameraParticipation, "OFF");
  assert.throws(() => validateCompanionConfig({ ...DEFAULT_TIMER_ONLY_CONFIG, workDurationMinutes: 0 }), /INVALID_COMPANION_CONFIG/);
  assert.throws(() => validateCompanionConfig({ ...DEFAULT_TIMER_ONLY_CONFIG, quietHours: { startMinute: 60, endMinute: 60 } }), /INVALID_COMPANION_CONFIG/);
});
