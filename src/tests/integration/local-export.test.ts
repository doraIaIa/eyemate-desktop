import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeLocalExport, writeLocalPdfExport } from "../../platform-electron/local-export.js";

test("local export supports success, cancel and no overwrite", () => { const root = mkdtempSync(join(tmpdir(), "eyemate-export-")); try { const target = join(root, "summary.md"); assert.equal(writeLocalExport(target, "safe summary").status, "EXPORTED"); assert.equal(existsSync(target), true); assert.equal(writeLocalExport(target, "overwrite").status, "FAILED"); assert.equal(writeLocalExport("", "x").status, "CANCELLED"); } finally { rmSync(root, { recursive: true, force: true }); } });

test("PDF writer yêu cầu PDF hợp lệ, atomic và không overwrite", () => {
  const root = mkdtempSync(join(tmpdir(), "eyemate-pdf-export-"));
  try {
    const target = join(root, "summary.pdf");
    const fixture = Buffer.from("%PDF-1.7\nfixture", "ascii");
    assert.equal(writeLocalPdfExport(target, fixture).status, "EXPORTED");
    assert.equal(readFileSync(target).subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(writeLocalPdfExport(target, fixture).reason, "DESTINATION_UNAVAILABLE");
    assert.equal(writeLocalPdfExport("", fixture).status, "CANCELLED");
    assert.equal(writeLocalPdfExport(join(root, "invalid.pdf"), Buffer.from("not pdf")).reason, "INVALID_PDF_EXPORT_INPUT");
    assert.equal(existsSync(`${target}.eyemate-tmp`), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
