#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_VERSION = 'm0-benchmark-run/0.3.0';
const FORBIDDEN_KEYS = new Set(['rawframe', 'rawvideo', 'video', 'videoframe', 'landmark', 'landmarks', 'rawlandmark', 'rawlandmarks', 'pixelbuffer', 'exactperframeseries', 'username', 'homepath', 'serialnumber', 'deviceinstanceid', 'token', 'secret', 'privatekey']);
const RESERVED_REFERENCE_SEGMENTS = new Set(['user', 'users', 'profile', 'profiles']);
const FORBIDDEN_VALUE = /(?:[a-z]:\\users\\|\/users\/|\/home\/|authorization:|bearer\s+|-----begin [a-z ]*private key-----)/i;

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isIsoTimestamp(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function normalizedKey(value) { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function isSafeReference(value) {
  const basicSyntaxIsSafe = typeof value === 'string'
    && /^[a-z0-9][a-z0-9._/-]*$/i.test(value)
    && !value.includes('..')
    && !value.includes('\\')
    && !value.includes(':');
  return basicSyntaxIsSafe && !value.split('/').some((segment) => RESERVED_REFERENCE_SEGMENTS.has(segment.toLowerCase()));
}
function add(errors, condition, code) { if (!condition) errors.push(code); }

function scanForbidden(value, location, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(item, `${location}[${index}]`, errors));
  } else if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(normalizedKey(key))) errors.push(`FORBIDDEN_FIELD:${location}.${key}`);
      scanForbidden(item, `${location}.${key}`, errors);
    }
  } else if (typeof value === 'string' && FORBIDDEN_VALUE.test(value)) {
    errors.push(`FORBIDDEN_VALUE:${location}`);
  }
}

function validateMetric(metric, index, errors) {
  const location = `metricObservations[${index}]`;
  add(errors, isObject(metric), `INVALID_METRIC_OBJECT:${location}`);
  if (!isObject(metric)) return;
  for (const field of ['metricId', 'unit', 'aggregation', 'aggregationVersion', 'samplingInterval', 'samplingMethodVersion', 'tool', 'toolVersion', 'startedAtUtc', 'endedAtUtc', 'status', 'artifactRef']) {
    add(errors, typeof metric[field] === 'string' && metric[field].length > 0, `MISSING_METRIC_FIELD:${location}.${field}`);
  }
  for (const field of ['sampleCount', 'expectedSampleCount', 'droppedSampleCount']) add(errors, Number.isInteger(metric[field]) && metric[field] >= 0, `INVALID_METRIC_COUNT:${location}.${field}`);
  add(errors, Number.isFinite(metric.coverageRatio) && metric.coverageRatio >= 0 && metric.coverageRatio <= 1, `INVALID_METRIC_COVERAGE:${location}`);
  if (Number.isInteger(metric.sampleCount) && Number.isInteger(metric.expectedSampleCount) && Number.isInteger(metric.droppedSampleCount)) {
    add(errors, metric.sampleCount + metric.droppedSampleCount === metric.expectedSampleCount, `METRIC_COUNT_TOTAL_MISMATCH:${location}`);
    if (metric.expectedSampleCount > 0 && Number.isFinite(metric.coverageRatio)) add(errors, metric.coverageRatio === metric.sampleCount / metric.expectedSampleCount, `METRIC_COVERAGE_MISMATCH:${location}`);
  }
  add(errors, isIsoTimestamp(metric.startedAtUtc), `INVALID_METRIC_TIMESTAMP:${location}.startedAtUtc`);
  add(errors, isIsoTimestamp(metric.endedAtUtc), `INVALID_METRIC_TIMESTAMP:${location}.endedAtUtc`);
  add(errors, isSafeReference(metric.artifactRef), `INVALID_ARTIFACT_REF:${location}`);
  add(errors, ['OBSERVED', 'NOT_MEASURED', 'ERROR'].includes(metric.status), `INVALID_METRIC_STATUS:${location}`);
  if (metric.status === 'OBSERVED') {
    add(errors, metric.value !== null && metric.value !== undefined, `OBSERVED_VALUE_REQUIRED:${location}`);
    add(errors, metric.sampleCount > 0, `OBSERVED_SAMPLE_REQUIRED:${location}`);
    add(errors, metric.missingReason === null, `OBSERVED_MISSING_REASON_MUST_BE_NULL:${location}`);
  } else {
    add(errors, metric.value === null, `NON_OBSERVED_VALUE_MUST_BE_NULL:${location}`);
    add(errors, metric.sampleCount === 0, `NON_OBSERVED_SAMPLE_MUST_BE_ZERO:${location}`);
    add(errors, typeof metric.missingReason === 'string' && metric.missingReason.length > 0, `NON_OBSERVED_REASON_REQUIRED:${location}`);
  }
}

function validateRunRecord(record) {
  const errors = [];
  add(errors, isObject(record), 'INVALID_RECORD_OBJECT');
  if (!isObject(record)) return errors;
  for (const field of ['schemaVersion', 'runId', 'timestampUtc', 'repository', 'commit', 'shellCandidate', 'shellRuntimeVersion', 'algorithmVersion', 'assetManifestVersion', 'deviceProfileId', 'deviceSnapshotRef', 'workloadId', 'workloadVersion', 'plannedSlotId', 'attemptId', 'runPlanRef', 'command', 'startedAtUtc', 'endedAtUtc', 'executionStatus', 'validity', 'outcome']) {
    add(errors, typeof record[field] === 'string' && record[field].length > 0, `MISSING_FIELD:${field}`);
  }
  add(errors, record.schemaVersion === SCHEMA_VERSION, 'UNSUPPORTED_SCHEMA_VERSION');
  add(errors, /^[0-9a-f]{40}$/i.test(record.commit ?? ''), 'INVALID_COMMIT');
  add(errors, typeof record.dirtyWorktree === 'boolean', 'INVALID_DIRTY_WORKTREE');
  add(errors, Number.isInteger(record.repetition) && record.repetition > 0, 'INVALID_REPETITION');
  add(errors, isIsoTimestamp(record.timestampUtc), 'INVALID_TIMESTAMP_UTC');
  add(errors, isIsoTimestamp(record.startedAtUtc), 'INVALID_STARTED_AT_UTC');
  add(errors, isIsoTimestamp(record.endedAtUtc), 'INVALID_ENDED_AT_UTC');
  add(errors, /^m0\.[a-z0-9.-]+$/i.test(record.command ?? ''), 'INVALID_COMMAND_ID');
  add(errors, isSafeReference(record.deviceSnapshotRef), 'INVALID_DEVICE_SNAPSHOT_REF');
  add(errors, isSafeReference(record.runPlanRef), 'INVALID_RUN_PLAN_REF');
  add(errors, isObject(record.operator) && typeof record.operator.role === 'string' && typeof record.operator.pseudonymousId === 'string', 'INVALID_OPERATOR');
  add(errors, isObject(record.environment), 'INVALID_ENVIRONMENT');
  add(errors, Array.isArray(record.metricObservations) && record.metricObservations.length > 0, 'MISSING_METRIC_OBSERVATIONS');
  add(errors, Array.isArray(record.errorReasonCodes), 'INVALID_ERROR_REASON_CODES');
  add(errors, Array.isArray(record.unexpectedNetworkCalls), 'INVALID_NETWORK_CALLS');
  add(errors, Array.isArray(record.artifactRefs), 'INVALID_ARTIFACT_REFS');
  add(errors, isObject(record.privacyInspection), 'INVALID_PRIVACY_INSPECTION');
  add(errors, Array.isArray(record.acceptanceEvaluations), 'INVALID_ACCEPTANCE_EVALUATIONS');
  add(errors, record.reviewer === null || typeof record.reviewer === 'string', 'INVALID_REVIEWER');
  add(errors, record.invalidReason === null || typeof record.invalidReason === 'string', 'INVALID_INVALID_REASON');
  add(errors, ['COMPLETED', 'ABORTED'].includes(record.executionStatus), 'INVALID_EXECUTION_STATUS');
  add(errors, ['VALID', 'INVALID'].includes(record.validity), 'INVALID_VALIDITY');
  add(errors, ['PASSED', 'FAILED', 'NOT_EVALUATED'].includes(record.outcome), 'INVALID_OUTCOME');
  if (record.executionStatus === 'ABORTED') add(errors, record.outcome === 'NOT_EVALUATED', 'ABORTED_OUTCOME_MUST_BE_NOT_EVALUATED');
  if (record.validity === 'INVALID') add(errors, typeof record.invalidReason === 'string' && record.invalidReason.length > 0, 'INVALID_REASON_REQUIRED');
  if (record.validity === 'VALID') add(errors, record.invalidReason === null, 'VALID_INVALID_REASON_MUST_BE_NULL');
  if (record.outcome === 'FAILED') add(errors, record.executionStatus === 'COMPLETED' && record.validity === 'VALID', 'FAILED_OUTCOME_REQUIRES_COMPLETED_VALID_RUN');
  if (Array.isArray(record.metricObservations)) record.metricObservations.forEach((metric, index) => validateMetric(metric, index, errors));
  if (Array.isArray(record.artifactRefs)) {
    record.artifactRefs.forEach((reference, index) => add(errors, isSafeReference(reference), `INVALID_ARTIFACT_REF:artifactRefs[${index}]`));
    const uniqueReferences = new Set(record.artifactRefs);
    add(errors, uniqueReferences.size === record.artifactRefs.length, 'DUPLICATE_ARTIFACT_REF');
  }
  if (Array.isArray(record.metricObservations)) {
    const metricIds = record.metricObservations.map((metric) => isObject(metric) ? metric.metricId : undefined);
    add(errors, new Set(metricIds).size === metricIds.length, 'DUPLICATE_METRIC_ID');
  }
  scanForbidden(record, 'record', errors);
  return [...new Set(errors)];
}

function main() {
  const input = process.argv[2];
  if (!input) { console.error('USAGE: node tools/m0/validate-evidence-schema.mjs <run-record.jsonl>'); process.exitCode = 2; return; }
  let text;
  try { text = readFileSync(resolve(input), 'utf8'); } catch { console.error('ERROR: INPUT_UNREADABLE'); process.exitCode = 2; return; }
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) { console.error('INVALID: EMPTY_JSONL'); process.exitCode = 1; return; }
  const failures = [];
  lines.forEach((line, index) => {
    try {
      const errors = validateRunRecord(JSON.parse(line));
      if (errors.length > 0) failures.push({ line: index + 1, errors });
    } catch { failures.push({ line: index + 1, errors: ['INVALID_JSON'] }); }
  });
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`INVALID: line=${failure.line} codes=${failure.errors.join(',')}`));
    process.exitCode = 1;
  } else {
    console.log(`VALID: records=${lines.length} schema=${SCHEMA_VERSION}`);
  }
}

main();
