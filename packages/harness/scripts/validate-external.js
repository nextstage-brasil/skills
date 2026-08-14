#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExternalDir } from '../src/exportExternal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

const i = process.argv.indexOf('--dir');
const dir = i === -1 ? join(repoRoot, 'dist', 'external') : process.argv[i + 1];

const errors = validateExternalDir(dir);
if (errors.length) {
  console.error(`validate-external: ${errors.length} error(s)`);
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

console.log(`OK: external export at ${dir}`);
