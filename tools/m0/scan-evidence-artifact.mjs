#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWED_TYPES = new Set([
  'run-record', 'device-snapshot', 'resource-trace', 'network-evidence',
  'privacy-scan-report', 'sqlite-migration', 'package-build', 'lifecycle-accessibility',
]);
const MAX_TEXT_BYTES = 1024 * 1024;
const FORBIDDEN_KEY = /(?:^|[\s,{])"?(?:raw[_-]?frame|raw[_-]?video|video[_-]?frame|raw[_-]?landmarks?|landmarks?|pixel[_-]?buffer|exact[_-]?per[_-]?frame[_-]?series|username|home[_-]?path|serial[_-]?number|device[_-]?instance[_-]?id|token|secret|private[_-]?key)"?\s*[:=]/im;
const FORBIDDEN_VALUE = /(?:[a-z]:\\users\\|\\\\[^\\]+\\|file:\/\/|\/users\/|\/home\/|authorization:|bearer\s+|-----begin [a-z ]*private key-----)/i;

function main() {
  const [type, input] = process.argv.slice(2);
  if (!type || !input) {
    console.error('USAGE: node tools/m0/scan-evidence-artifact.mjs <artifact-type> <artifact-file>');
    process.exitCode = 2;
    return;
  }
  if (!ALLOWED_TYPES.has(type)) {
    console.error('REJECTED: UNKNOWN_ARTIFACT_TYPE');
    process.exitCode = 2;
    return;
  }

  let stats;
  let bytes;
  try {
    const path = resolve(input);
    stats = statSync(path);
    if (!stats.isFile()) throw new Error('not-file');
    if (stats.size > MAX_TEXT_BYTES) {
      console.error('REJECTED: ARTIFACT_TOO_LARGE');
      process.exitCode = 1;
      return;
    }
    bytes = readFileSync(path);
  } catch {
    console.error('ERROR: INPUT_UNREADABLE');
    process.exitCode = 2;
    return;
  }

  if (bytes.includes(0)) {
    console.error('REJECTED: BINARY_ARTIFACT');
    process.exitCode = 1;
    return;
  }

  const text = bytes.toString('utf8');
  const codes = [];
  if (FORBIDDEN_KEY.test(text)) codes.push('FORBIDDEN_FIELD');
  if (FORBIDDEN_VALUE.test(text)) codes.push('FORBIDDEN_VALUE');

  if (codes.length > 0) {
    console.error(`REJECTED: codes=${codes.join(',')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`SAFE: type=${type} bytes=${stats.size}`);
}

main();
