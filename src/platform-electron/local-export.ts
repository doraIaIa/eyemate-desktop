import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";

export type LocalExportFormat = "JSON" | "MARKDOWN";
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
