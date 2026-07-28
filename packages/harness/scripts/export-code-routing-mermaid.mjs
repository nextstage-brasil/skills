#!/usr/bin/env node
/**
 * Export the code-skill routing mermaid diagram from harness canonical source.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname, isAbsolute, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');
const sourcePath = join(
  repoRoot,
  'skills/ns-harness/references/code-skill-routing.md',
);
const outPath = process.argv[2]
  ? isAbsolute(process.argv[2])
    ? process.argv[2]
    : resolve(process.cwd(), process.argv[2])
  : join(repoRoot, 'coder-skill-routing.mmd');

const source = readFileSync(sourcePath, 'utf8');
const match = source.match(/```mermaid\n([\s\S]*?)```/);
if (!match) {
  console.error(`No mermaid block in ${sourcePath}`);
  process.exit(1);
}

writeFileSync(outPath, `${match[1].trim()}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
