import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";

export type LocalExportFormat = "JSON" | "MARKDOWN" | "PDF";
export interface LocalExportResult { readonly status: "EXPORTED" | "CANCELLED" | "FAILED"; readonly reason: string; }

export function writeLocalExport(destination: string, content: string): LocalExportResult {
  if (destination.length === 0) return { status: "CANCELLED", reason: "NO_DESTINATION" };
  if (destination.includes("\0") || content.length > 500_000) return { status: "FAILED", reason: "INVALID_EXPORT_INPUT" };
  const target = resolve(destination);
  if (target === parse(target).root || existsSync(target)) return { status: "FAILED", reason: "DESTINATION_UNAVAILABLE" };
  const temporary = `${target}.eyemate-tmp`;
  try { writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" }); renameSync(temporary, target); return { status: "EXPORTED", reason: "OK" }; }
  catch { try { rmSync(temporary, { force: true }); } catch { /* best-effort cleanup */ } return { status: "FAILED", reason: "WRITE_FAILED" }; }
}

export function writeLocalPdfExport(destination: string, content: Buffer): LocalExportResult {
  if (destination.length === 0) return { status: "CANCELLED", reason: "NO_DESTINATION" };
  if (destination.includes("\0") || content.length < 5 || content.length > 10_000_000 || content.subarray(0, 5).toString("ascii") !== "%PDF-") return { status: "FAILED", reason: "INVALID_PDF_EXPORT_INPUT" };
  const target = resolve(destination);
  if (target === parse(target).root || existsSync(target)) return { status: "FAILED", reason: "DESTINATION_UNAVAILABLE" };
  const temporary = `${target}.eyemate-tmp`;
  try { writeFileSync(temporary, content, { flag: "wx" }); renameSync(temporary, target); return { status: "EXPORTED", reason: "OK" }; }
  catch { try { rmSync(temporary, { force: true }); } catch { /* best-effort cleanup */ } return { status: "FAILED", reason: "WRITE_FAILED" }; }
}
