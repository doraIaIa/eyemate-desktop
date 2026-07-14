import assert from "node:assert/strict";
import test from "node:test";
import { fromSurveyOnly, fromWorkSession } from "../../personal-intelligence/source-adapter.js";

test("M2 and legacy M1 sources preserve unknown rather than inventing metrics", () => {
  const work = fromWorkSession({ summaryId: "summary-0001", sessionId: "session-0001", elapsedActiveMs: 1_800_000, createdAt: "2026-07-14T10:00:00.000Z", timezone: "Asia/Bangkok", schemaVersion: "m2-session-summary/0.1.0" });
  assert.equal(work.sessionDurationMinutes, 30); assert.equal(work.nearLoad, null);
  assert.equal(fromSurveyOnly({ reportId: "report-0001", createdAt: "2026-07-14T10:00:00.000Z", timezone: "Asia/Bangkok", schemaVersion: "m1-report-0.1.0", symptomBurden: null }).quality, "UNKNOWN");
});
