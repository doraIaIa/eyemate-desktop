#!/usr/bin/env node

import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanArtifact } from './scan-evidence-artifact.mjs';

const QUARANTINE_EXTENSIONS = new Set(['.etl', '.blg', '.dmp', '.mdmp']);
const TEXT_EXTENSIONS = new Set(['.json', '.jsonl', '.txt']);

export function checkToolOutputAdmission(type, path) {
  if (typeof path !== 'string' || path.length === 0) return { ok: false, code: 'INVALID_OUTPUT_PATH', exitCode: 2 };
  const extension = extname(path).toLowerCase();
  if (QUARANTINE_EXTENSIONS.has(extension)) return { ok: false, code: 'QUARANTINE_RAW_CAPTURE', exitCode: 1 };
  if (!TEXT_EXTENSIONS.has(extension)) return { ok: false, code: 'QUARANTINE_UNSUPPORTED_OUTPUT', exitCode: 1 };
  const scan = scanArtifact(type, path);
  return scan.ok ? { ok: true, code: 'ADMITTED_SAFE_TEXT', exitCode: 0 } : { ok: false, code: `SCANNER_REJECTED_${scan.code}`, exitCode: scan.exitCode };
}

function main() {
  const [type, path] = process.argv.slice(2);
  const result = checkToolOutputAdmission(type, path);
  console.log(`${result.ok ? 'ADMITTED' : result.exitCode === 2 ? 'ERROR' : 'QUARANTINED'}: ${result.code}`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
