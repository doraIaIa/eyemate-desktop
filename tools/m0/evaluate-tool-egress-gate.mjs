#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TOOL_INVENTORY_SCHEMA_VERSION } from './collect-measurement-tool-inventory.mjs';

export function evaluateToolEgressGate(inventory) {
  if (!inventory || inventory.schemaVersion !== TOOL_INVENTORY_SCHEMA_VERSION || !Array.isArray(inventory.tools)) {
    return { ok: false, code: 'INVALID_TOOL_INVENTORY', exitCode: 2 };
  }
  if (inventory.networkBehavior !== 'VERIFIED_NO_EGRESS' || inventory.autoUpdateBehavior !== 'VERIFIED_DISABLED') {
    return { ok: false, code: 'BLOCKED_UNVERIFIED_EGRESS', exitCode: 1 };
  }
  return { ok: true, code: 'EGRESS_GATE_PASSED', exitCode: 0 };
}

function main() {
  const [input] = process.argv.slice(2);
  if (!input) { console.error('USAGE: node tools/m0/evaluate-tool-egress-gate.mjs <tool-inventory.json>'); process.exitCode = 2; return; }
  let inventory;
  try { inventory = JSON.parse(readFileSync(input, 'utf8')); } catch { console.error('ERROR: INVENTORY_UNREADABLE'); process.exitCode = 2; return; }
  const result = evaluateToolEgressGate(inventory);
  console.log(`${result.ok ? 'PASS' : result.exitCode === 2 ? 'ERROR' : 'BLOCKED'}: ${result.code}`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
