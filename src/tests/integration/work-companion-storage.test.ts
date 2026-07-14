import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openLocalSqliteStorage } from "../../platform-electron/sqlite-storage.js";

test("session persistence is idempotent and recovery-safe", () => {
  const root = mkdtempSync(join(tmpdir(), "eyemate-m2-"));
  try {
    const opened = openLocalSqliteStorage(join(root, "state.sqlite"));
    assert.equal(opened.state, "READY");
    if (opened.state !== "READY") return;
    const session = { sessionId: "session-0001", modeId: "TIMER_ONLY", state: "ACTIVE", elapsedActiveMs: 1200, updatedAt: "2026-07-14T00:00:00.000Z" } as const;
    opened.storage.saveSession(session);
    assert.deepEqual(opened.storage.loadSession(session.sessionId), session);
    assert.deepEqual(opened.storage.loadLatestSession(), session);
    assert.equal(opened.storage.recordNudge({ nudgeId: "nudge-0001", sessionId: session.sessionId, decision: "EMIT", reason: "EMIT", policyVersion: "m2-companion-policy/0.1.0", createdAt: session.updatedAt }), true);
    assert.equal(opened.storage.recordNudge({ nudgeId: "nudge-0001", sessionId: session.sessionId, decision: "EMIT", reason: "EMIT", policyVersion: "m2-companion-policy/0.1.0", createdAt: session.updatedAt }), false);
    assert.equal(opened.storage.countEmittedNudges(session.sessionId), 1);
    assert.equal(opened.storage.recordNudgeResponse("nudge-0001", "ACCEPTED", session.updatedAt), true);
    assert.equal(opened.storage.recordNudgeResponse("nudge-0001", "DISMISSED", session.updatedAt), false);
    const summary = { summaryId: "summary-001", sessionId: session.sessionId, status: "COMPLETED", elapsedActiveMs: 1200, createdAt: session.updatedAt } as const;
    assert.equal(opened.storage.saveSessionSummary(summary), true);
    assert.equal(opened.storage.saveSessionSummary(summary), false);
    assert.equal(opened.storage.listSessionSummaries()[0]?.summaryJson, undefined);
    assert.equal(opened.storage.deleteAllLocalData(), "DELETED");
    assert.equal(opened.storage.loadSession(session.sessionId), null);
    opened.storage.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
