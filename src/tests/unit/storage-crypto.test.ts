import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createSensitiveDataCodec, loadOrCreateProtectedStorageKey, type OperatingSystemKeyProtector } from "../../platform-electron/storage-crypto.js";

const protector: OperatingSystemKeyProtector = {
  isEncryptionAvailable: () => true,
  encryptString: (plaintext) => Buffer.from(`protected:${plaintext}`, "utf8"),
  decryptString: (encrypted) => {
    const value = encrypted.toString("utf8");
    if (!value.startsWith("protected:")) throw new Error("TEST_PROTECTOR_REJECTED");
    return value.slice("protected:".length);
  }
};

test("AES-256-GCM roundtrip dùng context và phát hiện tamper/wrong key", () => {
  const codec = createSensitiveDataCodec(Buffer.alloc(32, 7));
  const envelope = codec.encrypt("dữ liệu nhạy cảm", "record:one:payload");
  assert.equal(envelope.includes("dữ liệu nhạy cảm"), false);
  assert.equal(codec.decrypt(envelope, "record:one:payload"), "dữ liệu nhạy cảm");
  assert.throws(() => codec.decrypt(`${envelope.slice(0, -1)}A`, "record:one:payload"), /TAMPERED_OR_KEY_INVALID/);
  assert.throws(() => createSensitiveDataCodec(Buffer.alloc(32, 8)).decrypt(envelope, "record:one:payload"), /TAMPERED_OR_KEY_INVALID/);
  assert.throws(() => codec.decrypt(envelope, "record:other:payload"), /TAMPERED_OR_KEY_INVALID/);
});

test("protected key lifecycle tạo atomic, restart được và fail-closed khi thiếu/hỏng", () => {
  const directory = mkdtempSync(join(tmpdir(), "eyemate-key-lifecycle-"));
  const keyFilePath = join(directory, "protected-storage-key.json");
  const created = loadOrCreateProtectedStorageKey({ keyFilePath, protector, allowCreate: true });
  assert.equal(created.state, "READY");
  assert.equal(existsSync(keyFilePath), true);
  assert.equal(existsSync(`${keyFilePath}.tmp-${process.pid}`), false);
  const reopened = loadOrCreateProtectedStorageKey({ keyFilePath, protector, allowCreate: false });
  assert.equal(reopened.state, "READY");
  if (created.state === "READY" && reopened.state === "READY") {
    const value = created.codec.encrypt("restart", "test:restart");
    assert.equal(reopened.codec.decrypt(value, "test:restart"), "restart");
  }
  rmSync(keyFilePath);
  assert.deepEqual(loadOrCreateProtectedStorageKey({ keyFilePath, protector, allowCreate: false }), { state: "KEY_RECOVERY_REQUIRED", failureCode: "PROTECTED_KEY_MISSING" });
  writeFileSync(keyFilePath, "{}", "utf8");
  assert.deepEqual(loadOrCreateProtectedStorageKey({ keyFilePath, protector, allowCreate: false }), { state: "KEY_RECOVERY_REQUIRED", failureCode: "PROTECTED_KEY_FILE_INVALID" });
  assert.equal(readFileSync(keyFilePath, "utf8"), "{}");
  rmSync(directory, { recursive: true, force: true });
});

test("OS key protection không khả dụng không tạo key mới", () => {
  const directory = mkdtempSync(join(tmpdir(), "eyemate-key-unavailable-"));
  const keyFilePath = join(directory, "protected-storage-key.json");
  const unavailable = { ...protector, isEncryptionAvailable: () => false };
  assert.deepEqual(loadOrCreateProtectedStorageKey({ keyFilePath, protector: unavailable, allowCreate: true }), { state: "KEY_RECOVERY_REQUIRED", failureCode: "OS_KEY_PROTECTION_UNAVAILABLE" });
  assert.equal(existsSync(keyFilePath), false);
  rmSync(directory, { recursive: true, force: true });
});
