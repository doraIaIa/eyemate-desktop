import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, normalize, parse, resolve } from "node:path";

const ENVELOPE_PREFIX = "eyemate:aes-256-gcm:v1";
const KEY_FILE_SCHEMA = "eyemate-protected-key/0.1.0";

export interface SensitiveDataCodec {
  readonly version: "aes-256-gcm/0.1.0";
  encrypt(plaintext: string, context: string): string;
  decrypt(envelope: string, context: string): string;
  isEncrypted(value: string): boolean;
}

export interface OperatingSystemKeyProtector {
  isEncryptionAvailable(): boolean;
  encryptString(plaintext: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export type ProtectedKeyResult =
  | { readonly state: "READY"; readonly codec: SensitiveDataCodec; readonly created: boolean }
  | { readonly state: "KEY_RECOVERY_REQUIRED"; readonly failureCode: string };

function validateKeyFilePath(keyFilePath: string): string {
  const safePath = normalize(resolve(keyFilePath));
  if (safePath === parse(safePath).root || !safePath.endsWith(".json")) throw new Error("INVALID_PROTECTED_KEY_PATH");
  return safePath;
}

export function createSensitiveDataCodec(key: Buffer): SensitiveDataCodec {
  if (key.length !== 32) throw new Error("INVALID_STORAGE_MASTER_KEY");
  const masterKey = Buffer.from(key);
  return Object.freeze({
    version: "aes-256-gcm/0.1.0",
    encrypt(plaintext: string, context: string): string {
      if (typeof plaintext !== "string" || !/^[a-z0-9:._/-]{1,160}$/i.test(context)) throw new Error("INVALID_SENSITIVE_ENCRYPTION_INPUT");
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
      cipher.setAAD(Buffer.from(context, "utf8"));
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return `${ENVELOPE_PREFIX}:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
    },
    decrypt(envelope: string, context: string): string {
      const parts = envelope.split(":");
      if (parts.length !== 6 || parts.slice(0, 3).join(":") !== ENVELOPE_PREFIX) throw new Error("SENSITIVE_DATA_ENVELOPE_INVALID");
      try {
        const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(parts[3]!, "base64url"));
        decipher.setAAD(Buffer.from(context, "utf8"));
        decipher.setAuthTag(Buffer.from(parts[4]!, "base64url"));
        return Buffer.concat([decipher.update(Buffer.from(parts[5]!, "base64url")), decipher.final()]).toString("utf8");
      } catch { throw new Error("SENSITIVE_DATA_TAMPERED_OR_KEY_INVALID"); }
    },
    isEncrypted(value: string): boolean { return value.startsWith(`${ENVELOPE_PREFIX}:`); }
  });
}

export function loadOrCreateProtectedStorageKey(input: {
  readonly keyFilePath: string;
  readonly protector: OperatingSystemKeyProtector;
  readonly allowCreate: boolean;
}): ProtectedKeyResult {
  let safePath: string;
  try { safePath = validateKeyFilePath(input.keyFilePath); }
  catch (error) { return { state: "KEY_RECOVERY_REQUIRED", failureCode: error instanceof Error ? error.message : "INVALID_PROTECTED_KEY_PATH" }; }
  if (!input.protector.isEncryptionAvailable()) return { state: "KEY_RECOVERY_REQUIRED", failureCode: "OS_KEY_PROTECTION_UNAVAILABLE" };
  try {
    if (existsSync(safePath)) {
      const document = JSON.parse(readFileSync(safePath, "utf8")) as { schemaVersion?: string; protectedKey?: string };
      if (document.schemaVersion !== KEY_FILE_SCHEMA || typeof document.protectedKey !== "string") throw new Error("PROTECTED_KEY_FILE_INVALID");
      const plaintext = input.protector.decryptString(Buffer.from(document.protectedKey, "base64"));
      return { state: "READY", codec: createSensitiveDataCodec(Buffer.from(plaintext, "base64")), created: false };
    }
    if (!input.allowCreate) return { state: "KEY_RECOVERY_REQUIRED", failureCode: "PROTECTED_KEY_MISSING" };
    const masterKey = randomBytes(32);
    const protectedKey = input.protector.encryptString(masterKey.toString("base64"));
    const document = `${JSON.stringify({ schemaVersion: KEY_FILE_SCHEMA, protectedKey: protectedKey.toString("base64") }, null, 2)}\n`;
    mkdirSync(dirname(safePath), { recursive: true });
    const temporaryPath = `${safePath}.tmp-${process.pid}`;
    try { writeFileSync(temporaryPath, document, { encoding: "utf8", flag: "wx" }); renameSync(temporaryPath, safePath); }
    catch (error) { rmSync(temporaryPath, { force: true }); throw error; }
    return { state: "READY", codec: createSensitiveDataCodec(masterKey), created: true };
  } catch (error) {
    return { state: "KEY_RECOVERY_REQUIRED", failureCode: error instanceof Error ? error.message : "PROTECTED_KEY_OPEN_FAILED" };
  }
}
