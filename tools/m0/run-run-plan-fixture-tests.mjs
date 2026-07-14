#!/usr/bin/env node

import { validateRunPlan, RUN_PLAN_SCHEMA_VERSION } from './validate-m0-run-plan.mjs';

const valid = { schemaVersion: RUN_PLAN_SCHEMA_VERSION, candidate: 'synthetic-control', workloadId: 'WL-CONTROL', workloadVersion: '1.0.0', deviceProfileId: 'DP-DEV', assetManifestRef: 'artifacts/assets.json', tool: { id: 'node', version: 'v24.12.0' }, environment: { networkMode: 'BLOCKED', powerMode: 'CONTROLLED', package: 'UNPACKAGED' }, protocol: { warmUp: 'NONE', stabilization: 'PT0S', timeout: 'PT30S', duration: 'PT1S', samplingInterval: 'PT1S', plannedRepetitions: 3, cooldown: 'PT0S' }, expectedMetricSet: ['MET-CONTROL'], varianceRule: { version: '1.0.0' }, outlierRule: { version: '1.0.0' }, overheadTolerance: { version: '1.0.0' }, plannedSlots: ['CONTROL-01', 'CONTROL-02', 'CONTROL-03'] };
const cases = [['valid-plan', valid, 'RUN_PLAN_READY'], ['tbd-rejected', { ...valid, protocol: { ...valid.protocol, duration: 'TBD_BY_TECH_QA' } }, 'RUN_PLAN_CONTAINS_TBD'], ['duplicate-slot-rejected', { ...valid, plannedSlots: ['CONTROL-01', 'CONTROL-01', 'CONTROL-03'] }, 'RUN_PLAN_DUPLICATE_SLOT']];
let failures = 0;
for (const [name, plan, code] of cases) { const result = validateRunPlan(plan); const pass = result.code === code; console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`); if (!pass) failures += 1; }
if (failures) process.exitCode = 1; else console.log('RUN_PLAN_FIXTURES_PASSED: 3');
