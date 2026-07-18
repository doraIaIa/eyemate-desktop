import assert from "node:assert/strict";
import test from "node:test";
import { createPersonalDemoSnapshot } from "../../renderer/personal-demo-data.js";
import { buildWorkRhythm } from "../../personal-intelligence/work-rhythm.js";

test("personal demo tạo snapshot synthetic nhất quán và không có dữ liệu raw", () => {
  const snapshot = createPersonalDemoSnapshot(new Date("2026-07-18T09:00:00+07:00"));
  const rhythm = buildWorkRhythm(snapshot.sessionSummaries, 7, new Date("2026-07-18T09:00:00+07:00"));
  assert.equal(snapshot.sessionSummaries.length, 7);
  assert.equal(snapshot.sessionSummaries.reduce((sum, item) => sum + item.acceptedBreakCount, 0), 6);
  assert.equal(rhythm.activeDays, 7);
  assert.equal(rhythm.totalMinutes, 255);
  assert.equal(snapshot.checkups[0]?.blinkRatePerMinute, 20);
  assert.equal(snapshot.checkups[0]?.distanceZone, "COMFORT");
  assert.equal(snapshot.reports[0]?.limitations.includes("SYNTHETIC_DEMO_DATA"), true);
  assert.deepEqual(Object.keys(snapshot).sort(), ["checkups", "reports", "sessionSummaries"]);
  assert.deepEqual(Object.keys(snapshot.checkups[0] ?? {}).sort(), ["action", "blinkRatePerMinute", "cameraReasonCodes", "cameraStatus", "createdAt", "distanceZone", "source", "status", "validSampleRatio"]);
});
