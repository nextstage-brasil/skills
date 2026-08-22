#!/usr/bin/env node
/**
 * Export standalone Claude-importable skills (no harness coupling).
 * Always exports every skill in templates/profiles/external-presets.json.
 *
 * Usage:
 *   node scripts/build-external.mjs
 *   node scripts/build-external.mjs --out ./dist/external
 *   node scripts/build-external.mjs --no-zip
 *
 * npm:
 *   npm run export:external
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportExternalAll, validateExternalDir } from '../src/exportExternal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

const outDir = arg('--out');
const noZip = process.argv.includes('--no-zip');

const result = exportExternalAll({
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
