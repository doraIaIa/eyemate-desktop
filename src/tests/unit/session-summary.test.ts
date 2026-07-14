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
