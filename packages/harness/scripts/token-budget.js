#!/usr/bin/env node

/**
 * Report skill token budget: description chars, SKILL.md lines, largest reference.
 * Thresholds (report-only): description ≤400, SKILL.md ≤250 lines, any reference ≤8KB.
 * Always exits 0.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkillIds, resolveSkillDir } from '../src/resolveSkillPath.js';

const DESC_MAX = 400;
const SKILL_LINES_MAX = 250;
const REF_BYTES_MAX = 8 * 1024;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const skillsDir = join(repoRoot, 'skills');

/**
 * YAML-style one-liner description: `"..."` / `'...'` / unquoted rest of line.
 * @param {string} frontmatter
 * @returns {string}
 */
function parseDescription(frontmatter) {
  const double = frontmatter.match(/^description:\s*"((?:\\.|[^"\\])*)"/m);
  if (double) {
    return double[1].replace(/\\([\\"])/g, '$1');
  }
  const single = frontmatter.match(/^description:\s*'((?:\\.|[^'\\])*)'/m);
  if (single) {
    return single[1].replace(/\\'/g, "'");
  }
  const unquoted = frontmatter.match(/^description:\s*(.+)$/m);
  return unquoted ? unquoted[1].trim() : '';
}

function skillMdLineCount(content) {
  if (content.length === 0) return 0;
  const lines = content.split('\n');
  return content.endsWith('\n') ? lines.length - 1 : lines.length;
}

function collectReferences(skillDir) {
  const refsDir = join(skillDir, 'references');
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) {
        walk(path);
        continue;
      }
      if (!name.endsWith('.md')) continue;
      files.push({ path, bytes: st.size });
    }
  }

  walk(refsDir);
  return files;
}

function pad(value, width) {
  const s = String(value);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function padLeft(value, width) {
  const s = String(value);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

const skillIds = discoverSkillIds(skillsDir);
const rows = [];
const violations = [];
let descSum = 0;
let skillLineSum = 0;
let refBytesSum = 0;

for (const id of skillIds) {
  const dir = resolveSkillDir(skillsDir, id);
  if (!dir) continue;
  const skillMdPath = join(dir, 'SKILL.md');
  const content = readFileSync(skillMdPath, 'utf8');
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  const description = fm ? parseDescription(fm[1]) : '';
  const descChars = description.length;
  const skillLines = skillMdLineCount(content);
  const refs = collectReferences(dir);
  const largest = refs.reduce(
    (acc, file) => (file.bytes > acc.bytes ? file : acc),
    { path: '', bytes: 0 },
  );
  refBytesSum += refs.reduce((sum, file) => sum + file.bytes, 0);
  descSum += descChars;
  skillLineSum += skillLines;

  const flags = [];
  if (descChars > DESC_MAX) {
    flags.push(`description ${descChars}>${DESC_MAX}`);
  }
  if (skillLines > SKILL_LINES_MAX) {
    flags.push(`SKILL.md ${skillLines}>${SKILL_LINES_MAX} lines`);
  }
  for (const file of refs) {
    if (file.bytes > REF_BYTES_MAX) {
      flags.push(`ref ${relative(repoRoot, file.path)} ${file.bytes}>${REF_BYTES_MAX}`);
    }
  }
  if (flags.length) {
    violations.push(`${id}: ${flags.join('; ')}`);
  }

  rows.push({
    id,
    descChars,
    skillLines,
    largestBytes: largest.bytes,
    largestRel: largest.path ? relative(repoRoot, largest.path) : '—',
  });
}

console.log('Token budget (report-only; exit 0)');
console.log(
  `${pad('skill', 32)} ${padLeft('desc', 5)} ${padLeft('lines', 5)} ${padLeft('maxRef', 7)} largest reference`,
);
for (const row of rows) {
  console.log(
    `${pad(row.id, 32)} ${padLeft(row.descChars, 5)} ${padLeft(row.skillLines, 5)} ${padLeft(row.largestBytes, 7)} ${row.largestRel}`,
  );
}

console.log('');
console.log(`catalog skills: ${rows.length}`);
console.log(`description chars (sum): ${descSum}`);
console.log(`SKILL.md lines (sum): ${skillLineSum}`);
console.log(`reference bytes (sum): ${refBytesSum}`);
console.log(
  `thresholds: description ≤${DESC_MAX}; SKILL.md ≤${SKILL_LINES_MAX} lines; reference ≤${REF_BYTES_MAX} bytes`,
);

if (violations.length === 0) {
  console.log('violations: none');
} else {
  console.log(`violations (${violations.length}):`);
  for (const line of violations) {
    console.log(`  - ${line}`);
  }
}

process.exit(0);
