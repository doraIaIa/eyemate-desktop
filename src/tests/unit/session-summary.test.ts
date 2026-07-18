import assert from "node:assert/strict";
import test from "node:test";
import { createSessionSummary } from "../../work-session/session-summary.js";
import { applySessionEvent, createSession } from "../../work-session/session-state.js";

test("Session Summary ghi rõ timer source và missing camera", () => {
  let session = createSession("session-0100", "TIMER_ONLY");
  session = applySessionEvent(session, "START", 0);
  session = applySessionEvent(session, "STARTED", 1);
  session = applySessionEvent(session, "FINISH", 2);
  session = applySessionEvent(session, "FINISH", 3);
  const summary = createSessionSummary(session, "m2-companion-policy/0.1.0");
  assert.equal(summary.schemaVersion, "m2-session-summary/0.1.0");
  assert.deepEqual(summary.dataSources, ["TIMER"]);
  assert.deepEqual(summary.missingData, ["CAMERA_NOT_MEASURED"]);
});

test("Session Summary giữ phản hồi nudge thay vì tạo danh sách intervention rỗng", () => {
  let session = createSession("session-0101", "BALANCED");
  session = applySessionEvent(session, "START", 0);
  session = applySessionEvent(session, "STARTED", 1);
  session = applySessionEvent(session, "FINISH", 2);
  session = applySessionEvent(session, "FINISH", 3);
  const summary = createSessionSummary(session, "m2-companion-policy/0.2.0", [
    { nudgeId: "nudge-session-0101-break-1", response: "SNOOZED" },
    { nudgeId: "nudge-session-0101-break-2", response: "ACCEPTED" }
  ]);
  assert.deepEqual(summary.interventions.map((item) => item.response), ["SNOOZED", "ACCEPTED"]);
});
