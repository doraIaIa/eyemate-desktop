#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FORBIDDEN = [
  ['NETWORK_MODULE', /node:(?:net|http|https|tls|dgram)/],
  ['NETWORK_API', /\b(?:fetch|WebSocket)\s*\(/],
  ['NETWORK_URL', /https?:\/\//],
];

function files(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return files(path);
    return entry.isFile() && entry.name.endsWith('.mjs') && !entry.name.endsWith('-fixture-tests.mjs') ? [path] : [];
  });
}

export function inspectStaticEgress(root) {
  const findings = [];
  for (const path of files(root)) {
    const text = readFileSync(path, 'utf8');
    for (const [code, pattern] of FORBIDDEN) if (pattern.test(text)) findings.push({ code, file: path.slice(root.length + 1).replaceAll('\\', '/') });
  }
  return { ok: findings.length === 0, code: findings.length === 0 ? 'NO_STATIC_NETWORK_REFERENCE' : 'STATIC_NETWORK_REFERENCE_FOUND', filesInspected: files(root).length, findings };
}

function main() {
  const root = dirname(fileURLToPath(import.meta.url));
  const result = inspectStaticEgress(root);
  console.log(`${result.ok ? 'PASS' : 'FAIL'}: ${result.code} files=${result.filesInspected}`);
  for (const finding of result.findings) console.log(`FINDING: ${finding.code} ${finding.file}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
