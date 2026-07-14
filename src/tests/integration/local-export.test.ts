import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeLocalExport } from "../../platform-electron/local-export.js";

test("local export supports success, cancel and no overwrite", () => { const root = mkdtempSync(join(tmpdir(), "eyemate-export-")); try { const target = join(root, "summary.md"); assert.equal(writeLocalExport(target, "safe summary").status, "EXPORTED"); assert.equal(existsSync(target), true); assert.equal(writeLocalExport(target, "overwrite").status, "FAILED"); assert.equal(writeLocalExport("", "x").status, "CANCELLED"); } finally { rmSync(root, { recursive: true, force: true }); } });
