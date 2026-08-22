#!/usr/bin/env node
/**
 * Copy templates/agent-runtime/ into dest (default ./agent-api).
 * Substitutes {{PRODUCT_SLUG}} and {{PRODUCT_DISPLAY_NAME}}.
 *
 * Usage:
 *   node bootstrap-agent-runtime.mjs [--dest ./agent-api] [--slug my-agent] [--force]
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(__dirname, '..', 'templates', 'agent-runtime');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function isNonEmptyDir(dir) {
  if (!existsSync(dir)) return false;
  if (!statSync(dir).isDirectory()) return true;
  return readdirSync(dir).filter((n) => n !== '.DS_Store').length > 0;
}

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === 'dist' || name.name === '.DS_Store') continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function displayName(slug) {
  return slug.replace(/[-_]+/g, ' ').trim() || slug;
}

const destArg = arg('--dest') ?? 'agent-api';
const dest = resolve(process.cwd(), destArg);
const slug =
  arg('--slug') ??
  (basename(dest) === 'agent-api' ? basename(dirname(dest)) : basename(dest)) ??
  'agent';
const force = process.argv.includes('--force');

if (!existsSync(TEMPLATE)) {
  console.error(`Template not found: ${TEMPLATE}`);
  process.exit(1);
}

if (isNonEmptyDir(dest) && !force) {
  console.error(`Refusing to overwrite non-empty dest: ${dest} (pass --force)`);
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(TEMPLATE, dest, {
  recursive: true,
  filter: (src) => !src.includes(`${join('node_modules')}`) && !src.includes(`${join('dist')}`),
});

const productDisplay = displayName(slug);
const textExt = new Set(['.ts', '.json', '.md', '.sql', '.example', '.gitignore', '']);

for (const file of walkFiles(dest)) {
  const ext = file.includes('.') ? file.slice(file.lastIndexOf('.')) : '';
  if (ext && !textExt.has(ext) && !file.endsWith('.env.example')) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const next = text
    .replaceAll('{{PRODUCT_SLUG}}', slug)
    .replaceAll('{{PRODUCT_DISPLAY_NAME}}', productDisplay)
    .replaceAll('@factory/', '@nextstage/');
  if (next !== text) writeFileSync(file, next);
}

console.log(`Agent runtime scaffolded at ${dest}`);
console.log(`Slug: ${slug}`);
console.log(`Next: cd ${dest} && npm install && npm test`);
console.log('PostgreSQL: set DATABASE_URL in .env (see .env.example)');
console.log('Graph spec: align src/graph/ with graph-spec.md (Phase 0)');
