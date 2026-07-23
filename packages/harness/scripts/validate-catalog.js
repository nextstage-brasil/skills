#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const skillsDir = join(repoRoot, 'skills');
const catalogPath = join(__dirname, '..', 'templates', 'catalog.json');
const retiredPath = join(__dirname, '..', 'templates', 'retired-skills.json');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const retiredSkills = JSON.parse(readFileSync(retiredPath, 'utf8'));
const catalogSkills = new Set(Object.keys(catalog.depends));

const skillDirs = readdirSync(skillsDir).filter((entry) => {
  const path = join(skillsDir, entry);
  return (
    entry !== '_meta' &&
    statSync(path).isDirectory() &&
    statSync(join(path, 'SKILL.md')).isFile()
  );
});

const errors = [];

for (const skill of skillDirs) {
  if (!catalogSkills.has(skill)) {
    errors.push(`catalog.json missing depends entry for skill: ${skill}`);
  }
}

for (const skill of catalogSkills) {
  const skillMd = join(skillsDir, skill, 'SKILL.md');
  try {
    statSync(skillMd);
  } catch {
    errors.push(`catalog.json lists unknown skill: ${skill}`);
  }
}

for (const skill of skillDirs) {
  const skillMd = join(skillsDir, skill, 'SKILL.md');
  const content = readFileSync(skillMd, 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) continue;

  const declared = parseDepends(frontmatter[1]);
  const expected = catalog.depends[skill] ?? [];

  for (const dep of expected) {
    if (!declared.includes(dep)) {
      errors.push(`${skill}: catalog depends on ${dep} but SKILL.md frontmatter does not`);
    }
  }

  for (const dep of declared) {
    if (!expected.includes(dep)) {
      errors.push(`${skill}: frontmatter depends on ${dep} but catalog.json does not`);
    }
  }
}

for (const [oldName, newName] of Object.entries(retiredSkills)) {
  if (catalogSkills.has(oldName)) {
    errors.push(`retired-skills.json lists "${oldName}" but it is still in catalog.json`);
  }
  if (!catalogSkills.has(newName)) {
    errors.push(`retired-skills.json maps "${oldName}" to unknown skill "${newName}"`);
  }
  if (oldName === newName) {
    errors.push(`retired-skills.json has identity mapping for "${oldName}"`);
  }
}

function parseDepends(frontmatter) {
  const match = frontmatter.match(/^depends:\s*\n((?:[ \t]+-\s+.+\n?)*)$/m);
  if (!match) return [];
  return [...match[1].matchAll(/^[ \t]+-\s+(\S+)/gm)].map((m) => m[1]);
}

if (errors.length > 0) {
  console.error('Catalog validation failed:\n');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`OK: catalog.json in sync with ${skillDirs.length} skills`);
