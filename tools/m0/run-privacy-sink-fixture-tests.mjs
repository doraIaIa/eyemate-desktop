#!/usr/bin/env node

import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const FORBIDDEN = /raw[_-]?(?:frame|video|landmarks?)|\blandmarks?\b|pixel[_-]?buffer|exact[_-]?per[_-]?frame[_-]?series|username|secret|token/i;

export function inspectSqliteSchema(path) {
  try {
    const database = new DatabaseSync(path, { readOnly: true });
    const schema = database.prepare("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL").all().map((row) => row.sql).join('\n');
    database.close();
    return FORBIDDEN.test(schema) ? { ok: false, code: 'FORBIDDEN_SQLITE_SCHEMA' } : { ok: true, code: 'SAFE_SQLITE_SCHEMA' };
  } catch { return { ok: false, code: 'SQLITE_UNREADABLE' }; }
}

export function inspectTextSink(path) {
  try { return FORBIDDEN.test(readFileSync(path, 'utf8')) ? { ok: false, code: 'FORBIDDEN_SINK_CONTENT' } : { ok: true, code: 'SAFE_TEXT_SINK' }; }
  catch { return { ok: false, code: 'SINK_UNREADABLE' }; }
}

const root = mkdtempSync(join(tmpdir(), 'eyemate-m0-privacy-'));
let failures = 0;
function test(name, pass) { console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failures += 1; }
try {
  const safeDb = join(root, 'safe.sqlite');
  const safe = new DatabaseSync(safeDb); safe.exec('CREATE TABLE safe_aggregate (aggregate_id TEXT, quality_ratio REAL, algorithm_version TEXT);'); safe.close();
  test('safe-sqlite-schema', inspectSqliteSchema(safeDb).ok);
  const forbiddenDb = join(root, 'forbidden.sqlite');
  const forbidden = new DatabaseSync(forbiddenDb); forbidden.exec('CREATE TABLE capture (raw_frame BLOB);'); forbidden.close();
  test('forbidden-sqlite-schema-rejected', inspectSqliteSchema(forbiddenDb).code === 'FORBIDDEN_SQLITE_SCHEMA');
  const sinks = join(root, 'sinks'); mkdirSync(sinks);
  for (const name of ['log.txt', 'crash.txt', 'telemetry.txt', 'temp.txt']) writeFileSync(join(sinks, name), 'synthetic safe aggregate only\n', 'utf8');
  test('safe-log-crash-telemetry-temp', ['log.txt', 'crash.txt', 'telemetry.txt', 'temp.txt'].every((name) => inspectTextSink(join(sinks, name)).ok));
  const leak = join(sinks, 'leak.txt'); writeFileSync(leak, 'rawFrame=synthetic-marker', 'utf8');
  test('forbidden-sink-rejected', inspectTextSink(leak).code === 'FORBIDDEN_SINK_CONTENT');
} finally { rmSync(root, { recursive: true, force: true }); }
if (failures) { console.error(`PRIVACY_SINK_FIXTURES_FAILED: ${failures}`); process.exitCode = 1; } else console.log('PRIVACY_SINK_FIXTURES_PASSED: 4');
