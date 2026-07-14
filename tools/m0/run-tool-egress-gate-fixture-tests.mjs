#!/usr/bin/env node

import { evaluateToolEgressGate } from './evaluate-tool-egress-gate.mjs';
import { TOOL_INVENTORY_SCHEMA_VERSION } from './collect-measurement-tool-inventory.mjs';

const base = { schemaVersion: TOOL_INVENTORY_SCHEMA_VERSION, tools: [] };
const cases = [
  ['unknown-blocked', { ...base, networkBehavior: 'NOT_EVALUATED_OFFLINE_ONLY', autoUpdateBehavior: 'NOT_EVALUATED_OFFLINE_ONLY' }, false, 'BLOCKED_UNVERIFIED_EGRESS'],
  ['verified-pass', { ...base, networkBehavior: 'VERIFIED_NO_EGRESS', autoUpdateBehavior: 'VERIFIED_DISABLED' }, true, 'EGRESS_GATE_PASSED'],
  ['invalid-inventory', {}, false, 'INVALID_TOOL_INVENTORY'],
];
let failures = 0;
for (const [name, input, ok, code] of cases) { const result = evaluateToolEgressGate(input); const pass = result.ok === ok && result.code === code; console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failures += 1; }
if (failures) { process.exitCode = 1; } else console.log('TOOL_EGRESS_GATE_FIXTURES_PASSED: 3');
