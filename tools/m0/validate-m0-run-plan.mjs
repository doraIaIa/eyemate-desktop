#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const RUN_PLAN_SCHEMA_VERSION = 'm0-run-plan/0.1.0';

function hasTbd(value) {
  if (typeof value === 'string') return value.toUpperCase().includes('TBD');
  if (Array.isArray(value)) return value.some(hasTbd);
  if (value && typeof value === 'object') return Object.values(value).some(hasTbd);
  return false;
}

export function validateRunPlan(plan) {
  if (!plan || plan.schemaVersion !== RUN_PLAN_SCHEMA_VERSION) return { ok: false, code: 'UNSUPPORTED_RUN_PLAN_SCHEMA', exitCode: 2 };
  if (hasTbd(plan)) return { ok: false, code: 'RUN_PLAN_CONTAINS_TBD', exitCode: 1 };
  const requiredStrings = ['candidate', 'workloadId', 'workloadVersion', 'deviceProfileId', 'assetManifestRef', 'tool.id', 'tool.version', 'environment.networkMode', 'environment.powerMode', 'environment.package', 'protocol.warmUp', 'protocol.stabilization', 'protocol.timeout', 'protocol.duration', 'protocol.samplingInterval', 'protocol.cooldown', 'varianceRule.version', 'outlierRule.version', 'overheadTolerance.version'];
  for (const key of requiredStrings) {
    const value = key.split('.').reduce((current, part) => current?.[part], plan);
    if (typeof value !== 'string' || value.length === 0) return { ok: false, code: 'RUN_PLAN_MISSING_REQUIRED_FIELD', exitCode: 1 };
  }
  if (!Array.isArray(plan.expectedMetricSet) || plan.expectedMetricSet.length === 0 || !plan.expectedMetricSet.every((item) => typeof item === 'string' && item.length > 0)) return { ok: false, code: 'RUN_PLAN_INVALID_EXPECTED_METRICS', exitCode: 1 };
  if (!Number.isInteger(plan.protocol.plannedRepetitions) || plan.protocol.plannedRepetitions < 1 || !Array.isArray(plan.plannedSlots) || plan.plannedSlots.length !== plan.protocol.plannedRepetitions) return { ok: false, code: 'RUN_PLAN_INVALID_REPETITIONS', exitCode: 1 };
  const slots = new Set(plan.plannedSlots);
  if (slots.size !== plan.plannedSlots.length || !plan.plannedSlots.every((slot) => typeof slot === 'string' && slot.length > 0)) return { ok: false, code: 'RUN_PLAN_DUPLICATE_SLOT', exitCode: 1 };
  return { ok: true, code: 'RUN_PLAN_READY', exitCode: 0 };
}

function main() {
  const [input] = process.argv.slice(2);
  if (!input) { console.error('USAGE: node tools/m0/validate-m0-run-plan.mjs <run-plan.json>'); process.exitCode = 2; return; }
  let plan;
  try { plan = JSON.parse(readFileSync(input, 'utf8')); } catch { console.error('ERROR: RUN_PLAN_UNREADABLE'); process.exitCode = 2; return; }
  const result = validateRunPlan(plan);
  console.log(`${result.ok ? 'READY' : result.exitCode === 2 ? 'ERROR' : 'INVALID'}: ${result.code}`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
