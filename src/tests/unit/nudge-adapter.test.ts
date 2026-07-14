import assert from "node:assert/strict";
import test from "node:test";
import { InProcessNudgeAdapter } from "../../work-session/nudge-adapter.js";

test("local nudge adapter is idempotent", () => {
  const adapter = new InProcessNudgeAdapter();
  const nudge = { nudgeId: "nudge-0200", sessionId: "session-0200", actionKey: "TAKE_SHORT_BREAK" as const, policyVersion: "m2-companion-policy/0.1.0" };
  assert.equal(adapter.deliver(nudge).state, "DELIVERED");
  assert.equal(adapter.deliver(nudge).state, "DUPLICATE");
});
