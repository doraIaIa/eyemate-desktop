import assert from "node:assert/strict";
import test from "node:test";
import { applySessionEvent, createSession, tickSession } from "../../work-session/session-state.js";

test("session start pause resume finish giữ elapsed monotonic", () => {
  let session = createSession("session-0001", "TIMER_ONLY");
  session = applySessionEvent(session, "START", 0);
  session = applySessionEvent(session, "STARTED", 100);
  session = tickSession(session, 1100);
  session = applySessionEvent(session, "PAUSE", 1200);
  session = applySessionEvent(session, "RESUME", 5000);
  session = tickSession(session, 6000);
  session = applySessionEvent(session, "FINISH", 6100);
  session = applySessionEvent(session, "FINISH", 6100);
  assert.equal(session.state, "COMPLETED");
  assert.equal(session.elapsedActiveMs, 2200);
});

test("transition không hợp lệ và monotonic regression bị từ chối", () => {
  assert.throws(() => applySessionEvent(createSession("session-0002", "TIMER_ONLY"), "FINISH", 0), /INVALID_SESSION_TRANSITION/);
  let session = applySessionEvent(applySessionEvent(createSession("session-0003", "TIMER_ONLY"), "START", 0), "STARTED", 1);
  assert.throws(() => tickSession(session, 0), /MONOTONIC_CLOCK_REGRESSION/);
});
