import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createV8StorageFixture, openLocalSqliteStorage } from "../../platform-electron/sqlite-storage.js";

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
    assert.deepEqual(opened.storage.listNudgeOutcomes(session.sessionId), [{ nudgeId: "nudge-0001", response: "ACCEPTED" }]);
    const summary = { summaryId: "summary-001", sessionId: session.sessionId, status: "COMPLETED", elapsedActiveMs: 1200, createdAt: session.updatedAt } as const;
    assert.equal(opened.storage.saveSessionSummary(summary), true);
    assert.equal(opened.storage.saveSessionSummary(summary), false);
    assert.equal(opened.storage.listSessionSummaries()[0]?.summaryJson, undefined);
    assert.equal(opened.storage.saveM3Record({ id: "source-0001", kind: "SOURCE", createdAt: session.updatedAt, payloadJson: JSON.stringify({ source: "synthetic" }) }), true);
    assert.equal(opened.storage.listM3Records("SOURCE").length, 1);
    assert.equal(opened.storage.deleteAllLocalData(), "DELETED");
    assert.equal(opened.storage.loadSession(session.sessionId), null);
    assert.equal(opened.storage.listM3Records("SOURCE").length, 0);
    opened.storage.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("M3 schema migrates a v8 database and deletes derived categories safely", () => {
  const root = mkdtempSync(join(tmpdir(), "eyemate-m3-migration-"));
  const databasePath = join(root, "state.sqlite");
  try {
    createV8StorageFixture(databasePath);
    const opened = openLocalSqliteStorage(databasePath);
    assert.equal(opened.state, "READY");
    if (opened.state !== "READY") return;
    assert.equal(opened.migrated, true);
    const createdAt = "2026-07-14T00:00:00.000Z";
    for (const kind of ["SOURCE", "BASELINE", "PATTERN", "DAILY", "WEEKLY", "REPORT"] as const) {
      assert.equal(opened.storage.saveM3Record({ id: `${kind.toLowerCase()}-0001`, kind, createdAt, payloadJson: "{}" }), true);
    }
    assert.equal(opened.storage.deleteM3Category("SUMMARY"), "DELETED");
    assert.equal(opened.storage.listM3Records("DAILY").length, 0);
    assert.equal(opened.storage.listM3Records("WEEKLY").length, 0);
    assert.equal(opened.storage.listM3Records("REPORT").length, 0);
    assert.equal(opened.storage.listM3Records("SOURCE").length, 1);
    assert.equal(opened.storage.deleteM3Category("PATTERN"), "DELETED");
    assert.equal(opened.storage.listM3Records("PATTERN").length, 0);
    assert.equal(opened.storage.listM3Records("DAILY").length, 0);
    opened.storage.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("inventory đếm thực thể logic, aggregate được cập nhật và report trùng ngày được gom", () => {
  const root = mkdtempSync(join(tmpdir(), "eyemate-m3-compact-"));
  try {
    const opened = openLocalSqliteStorage(join(root, "state.sqlite"));
    assert.equal(opened.state, "READY");
    if (opened.state !== "READY") return;
    const first = "2026-07-17T10:00:00.000Z";
    const second = "2026-07-17T11:00:00.000Z";
    opened.storage.saveSession({ sessionId: "session-logic-01", modeId: "CUSTOM", state: "COMPLETED", elapsedActiveMs: 60_000, updatedAt: first });
    opened.storage.saveSessionSummary({ summaryId: "summary-logic-01", sessionId: "session-logic-01", status: "COMPLETED", elapsedActiveMs: 60_000, createdAt: first });
    assert.equal(opened.storage.getDataInventory().find((item) => item.category === "SESSION")?.recordCount, 1);
    opened.storage.saveM3Record({ id: "daily-upsert-01", kind: "DAILY", createdAt: first, payloadJson: JSON.stringify({ total: 1 }) });
    opened.storage.saveM3Record({ id: "daily-upsert-01", kind: "DAILY", createdAt: second, payloadJson: JSON.stringify({ total: 2 }) });
    assert.equal(JSON.parse(opened.storage.listM3Records("DAILY")[0]!.payloadJson).total, 2);
    opened.storage.saveM3Record({ id: "report-legacy-01", kind: "REPORT", createdAt: first, payloadJson: JSON.stringify({ daily: { localDate: "2026-07-17" } }) });
    opened.storage.saveM3Record({ id: "report-current-01", kind: "REPORT", createdAt: second, payloadJson: JSON.stringify({ daily: { localDate: "2026-07-17" } }) });
    opened.storage.saveM3Record({ id: "report-current-02", kind: "REPORT", createdAt: second, payloadJson: JSON.stringify({ daily: { localDate: "2026-07-18" } }) });
    assert.equal(opened.storage.getDataInventory().find((item) => item.category === "REPORT")?.recordCount, 2);
    assert.equal(opened.storage.compactM3ReportSnapshots(), 1);
    assert.equal(opened.storage.listM3Records("REPORT").length, 2);
    opened.storage.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
