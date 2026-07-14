import assert from "node:assert/strict";
import test from "node:test";
import { applySessionEvent, createSession, recoverSession, tickSession } from "../../work-session/session-state.js";

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

test("lặp lại event đã áp dụng là idempotent", () => {
  let session = applySessionEvent(createSession("session-0004", "TIMER_ONLY"), "START", 0);
  assert.equal(applySessionEvent(session, "START", 1), session);
  session = applySessionEvent(session, "STARTED", 2);
  assert.equal(applySessionEvent(session, "STARTED", 3), session);
  session = applySessionEvent(session, "CANCEL", 4);
  assert.equal(applySessionEvent(session, "CANCEL", 5), session);
});

test("active persisted session recovers explicitly instead of auto-resuming", () => {
  const recovered = recoverSession("session-0005", "TIMER_ONLY", 9000);
  assert.equal(recovered.state, "RECOVERY_REQUIRED");
  assert.equal(recovered.elapsedActiveMs, 9000);
  assert.throws(() => recoverSession("bad", "TIMER_ONLY", 0), /INVALID_RECOVERY_SESSION/);
});
