import assert from "node:assert/strict";
import test from "node:test";
import { assessReleaseTransition, type ReleaseDescriptor } from "../../release/update-policy.js";

const beta10: ReleaseDescriptor = { channel: "beta", version: [0, 1, 0, 0], minReadableSchema: 1, maxReadableSchema: 10 };

test("clean install, update N-1 và skipped update có quyết định rõ", () => {
  assert.equal(assessReleaseTransition(null, beta10, null), "CLEAN_INSTALL_ALLOWED");
  assert.equal(assessReleaseTransition({ ...beta10, version: [0, 0, 9, 0], maxReadableSchema: 9 }, beta10, 9), "UPDATE_ALLOWED");
  assert.equal(assessReleaseTransition({ ...beta10, version: [0, 0, 7, 0], maxReadableSchema: 8 }, beta10, 8), "SKIPPED_UPDATE_ALLOWED");
});

test("beta không nhận stable và downgrade schema mới cần backup", () => {
  assert.equal(assessReleaseTransition({ ...beta10, channel: "stable" }, beta10, 9), "CHANNEL_MISMATCH");
  const oldBeta = { ...beta10, version: [0, 0, 9, 0] as const, maxReadableSchema: 9 };
  assert.equal(assessReleaseTransition(beta10, oldBeta, 10), "ROLLBACK_REQUIRES_PREMIGRATION_BACKUP");
});

test("schema ngoài support matrix bị từ chối", () => {
  assert.equal(assessReleaseTransition({ ...beta10, version: [0, 0, 9, 0] }, beta10, 11), "UNSUPPORTED_DATA_SCHEMA");
});
