#!/usr/bin/env node

import { lstatSync, mkdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanArtifactBytes } from './scan-evidence-artifact.mjs';

export const TOOL_INVENTORY_SCHEMA_VERSION = 'm0-measurement-tool-inventory/0.1.0';
export const TOOL_INVENTORY_COLLECTOR_VERSION = 'm0-measurement-tool-inventory-collector/0.1.0';

const TOOL_PROBES = Object.freeze([
  { toolId: 'node', executable: process.execPath, args: ['--version'], versionPattern: /^(v\d+\.\d+\.\d+)\s*$/m },
  { toolId: 'wpr', executable: 'wpr', args: ['/?'] },
  { toolId: 'xperf', executable: 'xperf', args: ['/?'] },
  { toolId: 'logman', executable: 'logman', args: ['/?'] },
  { toolId: 'wevtutil', executable: 'wevtutil', args: ['/?'] },
]);

class ToolError extends Error {
  constructor(code, exitCode = 1) { super(code); this.code = code; this.exitCode = exitCode; }
}

function safeRelativeArtifactPath(value) {
  return typeof value === 'string' && value.startsWith('artifacts/') && value.length > 'artifacts/'.length
    && !isAbsolute(value) && !value.includes('\\') && !value.includes(':') && !value.includes('\0')
    && !value.includes('//') && !value.includes('..')
    && !value.split('/').some((part) => part === '' || part === '.');
}

function evidenceRoot(rootInput) {
  try {
    if (lstatSync(rootInput).isSymbolicLink()) throw new Error('symlink');
    const root = realpathSync(rootInput);
    if (!lstatSync(root).isDirectory()) throw new Error('not-directory');
    return root;
  } catch { throw new ToolError('EVIDENCE_ROOT_UNREADABLE', 2); }
}

function insideRoot(root, relativePath, allowMissingFinal = false) {
  if (!safeRelativeArtifactPath(relativePath)) throw new ToolError('UNSAFE_OUTPUT_PATH');
  const output = resolve(root, relativePath);
  const relativeOutput = relative(root, output);
  if (relativeOutput === '..' || relativeOutput.startsWith(`..${sep}`)) throw new ToolError('UNSAFE_OUTPUT_PATH');
  const segments = relativePath.split('/');
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = resolve(current, segments[index]);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
    } catch (error) {
      if (error instanceof ToolError) throw error;
      if (allowMissingFinal && index === segments.length - 1) continue;
      if (index < segments.length - 1) continue;
      throw new ToolError('OUTPUT_UNREADABLE', 2);
    }
  }
  return output;
}

function ensureSafeParent(root, artifactPath) {
  let current = root;
  for (const segment of artifactPath.split('/').slice(0, -1)) {
    current = resolve(current, segment);
    try {
      const stats = lstatSync(current);
      if (!stats.isDirectory() || stats.isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
    } catch (error) {
      if (error instanceof ToolError) throw error;
      try {
        mkdirSync(current);
        const created = lstatSync(current);
        if (!created.isDirectory() || created.isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
      } catch (createError) {
        if (createError instanceof ToolError) throw createError;
        throw new ToolError('OUTPUT_DIRECTORY_FAILED', 2);
      }
    }
  }
  return current;
}

function defaultProbe(definition) {
  const result = spawnSync(definition.executable, definition.args, {
    encoding: 'utf8', shell: false, windowsHide: true, timeout: 3000, maxBuffer: 16 * 1024,
  });
  if (result.error?.code === 'ENOENT') return { availability: 'NOT_FOUND', output: '' };
  if (result.error) return { availability: 'SAFE_PROBE_FAILED', output: '' };
  return { availability: 'AVAILABLE', output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function versionFromOutput(definition, output) {
  if (!definition.versionPattern) return null;
  return definition.versionPattern.exec(output)?.[1] ?? null;
}

export function buildMeasurementToolInventory({ probe = defaultProbe, collectedAtUtc = new Date().toISOString() } = {}) {
  if (typeof probe !== 'function' || typeof collectedAtUtc !== 'string' || Number.isNaN(Date.parse(collectedAtUtc))) {
    throw new ToolError('INVALID_COLLECTION_OPTIONS', 2);
  }
  const tools = TOOL_PROBES.map((definition) => {
    const response = probe(definition);
    if (!response || !['AVAILABLE', 'NOT_FOUND', 'SAFE_PROBE_FAILED'].includes(response.availability) || typeof response.output !== 'string') {
      throw new ToolError('INVALID_PROBE_RESPONSE', 2);
    }
    const version = response.availability === 'AVAILABLE' ? versionFromOutput(definition, response.output) : null;
    return {
      toolId: definition.toolId,
      availability: response.availability,
      version,
      versionStatus: version ? 'OBSERVED_SAFE_PROBE' : 'NOT_REPORTED_BY_SAFE_PROBE',
    };
  });
  return {
    schemaVersion: TOOL_INVENTORY_SCHEMA_VERSION,
    collectorVersion: TOOL_INVENTORY_COLLECTOR_VERSION,
    collectedAtUtc,
    collectionScope: 'LOCAL_READ_ONLY_AVAILABILITY',
    networkBehavior: 'NOT_EVALUATED_OFFLINE_ONLY',
    autoUpdateBehavior: 'NOT_EVALUATED_OFFLINE_ONLY',
    tools,
  };
}

function stableJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }

function writeAtomic(path, text) {
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, path);
  } catch {
    try { unlinkSync(temporary); } catch { /* temporary does not exist */ }
    throw new ToolError('INVENTORY_WRITE_FAILED', 2);
  }
}

export function collectMeasurementToolInventory(rootInput, artifactPath, options = {}) {
  const root = evidenceRoot(rootInput);
  try {
    ensureSafeParent(root, artifactPath);
    const output = insideRoot(root, artifactPath, true);
    try {
      if (lstatSync(output).isSymbolicLink()) throw new ToolError('UNSAFE_SYMLINK');
    } catch (error) {
      if (error instanceof ToolError) throw error;
      if (error?.code !== 'ENOENT') throw error;
    }
    const inventory = buildMeasurementToolInventory(options);
    const text = stableJson(inventory);
    const scan = scanArtifactBytes('resource-trace', Buffer.from(text, 'utf8'));
    if (!scan.ok) throw new ToolError(`SCANNER_REJECTED_${scan.code}`);
    writeAtomic(output, text);
    return inventory;
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError('OUTPUT_DIRECTORY_FAILED', 2);
  }
}

function main() {
  const [command, root, artifactPath] = process.argv.slice(2);
  try {
    if (command !== 'collect' || !root || !artifactPath) throw new ToolError('USAGE', 2);
    const inventory = collectMeasurementToolInventory(root, artifactPath);
    console.log(`INVENTORY_CREATED: tools=${inventory.tools.length} schema=${TOOL_INVENTORY_SCHEMA_VERSION}`);
  } catch (error) {
    const toolError = error instanceof ToolError ? error : new ToolError('UNEXPECTED_ERROR', 2);
    console.error(`${toolError.exitCode === 2 ? 'ERROR' : 'INVALID'}: ${toolError.code}`);
    process.exitCode = toolError.exitCode;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
