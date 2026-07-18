import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUserPreferences } from "../../platform-electron/sqlite-storage.js";

test("preference cũ được bổ sung thời gian tùy chỉnh mặc định", () => {
  const preferences = normalizeUserPreferences({ defaultMode: "TIMER_ONLY", soundEnabled: false, breakReminderEnabled: true, quietHoursEnabled: false, quietStartMinute: 1320, quietEndMinute: 420, reducedMotion: false });
  assert.equal(preferences.customWorkDurationMinutes, 30);
  assert.equal(preferences.customBreakDurationMinutes, 5);
  assert.equal(preferences.customReminderAtMinutes, 25);
});

test("preference từ chối mốc nhắc vượt thời gian tập trung", () => {
  assert.throws(() => normalizeUserPreferences({ defaultMode: "CUSTOM", customWorkDurationMinutes: 20, customBreakDurationMinutes: 5, customReminderAtMinutes: 21, soundEnabled: false, breakReminderEnabled: true, quietHoursEnabled: false, quietStartMinute: 1320, quietEndMinute: 420, reducedMotion: false }), /INVALID_USER_PREFERENCES/);
});
