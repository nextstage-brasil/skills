#!/usr/bin/env node
/**
 * Validate relative cross-skill paths (`../ns-*`, `../../ns-*`) in skill markdown.
 *
 * Paths resolve against the directory of the file that contains them, exactly as an agent
 * resolving them with a file Read would. A wrong depth (e.g. `../../ns-harness/...` from a
 * SKILL.md) fails on hosts that Read literal paths (Claude Code) and only works by luck on
 * hosts that fall back to semantic search.
 *
 * Usage: node scripts/validate-skill-links.js [--fix]
 *   --fix  rewrite a broken path when exactly one other depth resolves to an existing file.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const skillsDir = join(repoRoot, 'skills');
const fix = process.argv.includes('--fix');

// `../`-prefixed path to a catalog skill; stops at whitespace, quotes, backticks, brackets, `#`.
const LINK_PATTERN = /(?<![\w./-])((?:\.\.\/)+)(ns-[a-z0-9-]+(?:\/[A-Za-z0-9._\-/]*)?)/g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.endsWith('-workspace') || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, out);
    else if (entry.endsWith('.md')) out.push(path);
  }
  return out;
}

function cleanTarget(target) {
  return target.replace(/[.,;:)]+$/, '');
}

function isPlaceholder(target) {
  return /[{}*<>]/.test(target);
}

const errors = [];
let fixedCount = 0;

for (const file of walk(skillsDir)) {
  if (file.includes(`${join('skills', '_meta')}`)) continue;
  const source = readFileSync(file, 'utf8');
  const fileDir = dirname(file);
  let next = source;

  for (const match of source.matchAll(LINK_PATTERN)) {
    const [whole, dots, rawTarget] = match;
    const target = cleanTarget(rawTarget);
    if (isPlaceholder(target)) continue;
    const resolved = resolve(fileDir, dots + target);
    if (existsSync(resolved)) continue;

    const candidates = [1, 2, 3]
      .map((depth) => '../'.repeat(depth))
      .filter((prefix) => prefix !== dots && existsSync(resolve(fileDir, prefix + target)));

    const rel = relative(repoRoot, file);
    const line = source.slice(0, match.index).split('\n').length;
    if (fix && candidates.length === 1) {
      next = next.replace(whole, candidates[0] + rawTarget);
      fixedCount += 1;
    } else {
      const hint = candidates.length ? ` (did you mean ${candidates[0]}${target}?)` : '';
      errors.push(`${rel}:${line} ${dots}${target}${hint}`);
    }
  }

  if (fix && next !== source) writeFileSync(file, next, 'utf8');
}

if (fix && fixedCount > 0) {
  console.log(`Fixed ${fixedCount} relative skill path(s).`);
}

if (errors.length > 0) {
  console.error(`ERROR: ${errors.length} broken relative skill path(s):`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log('OK: relative cross-skill paths resolve');
