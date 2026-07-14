#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { initializeRunDirectory } from './initialize-run-directory.mjs';

const [root, metadataFile, barrier] = process.argv.slice(2);
while (!existsSync(barrier)) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
try {
  const result = initializeRunDirectory(root, JSON.parse(readFileSync(metadataFile, 'utf8')));
  console.log(`WORKER_SUCCESS:${result.runRelative}`);
} catch (error) {
  console.error(`WORKER_FAILURE:${error.code ?? 'UNEXPECTED'}`);
  process.exitCode = 1;
}
