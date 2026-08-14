#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportExternal, validateExternalDir } from '../src/exportExternal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const preset = arg('--preset') ?? 'project-manager';
const outDir = arg('--out');
const noZip = process.argv.includes('--no-zip');

const result = exportExternal({
  preset,
  repoRoot,
  outDir,
  zip: !noZip,
});

const errors = validateExternalDir(result.outDir);
if (errors.length) {
  console.error(`export-external: ${errors.length} validation error(s)`);
  for (const err of errors) console.error(`  ${err}`);
  process.exit(1);
}

for (const w of result.warnings) console.warn(w);
console.log(`Wrote ${result.skills.length} skill(s) to ${result.outDir}`);
if (result.zips.length) {
  console.log(`Zips: ${result.zips.join(', ')}`);
}
