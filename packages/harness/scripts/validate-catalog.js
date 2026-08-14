#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverSkillIds,
  discoverSkillsWithDomain,
  resolveSkillMd,
} from '../src/resolveSkillPath.js';
import { validateCommercialBudgetSkill } from './validate-commercial-budget-skill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const skillsDir = join(repoRoot, 'skills');
const catalogPath = join(__dirname, '..', 'templates', 'catalog.json');
const skillPathsPath = join(__dirname, '..', 'templates', 'skill-paths.json');
const retiredPath = join(__dirname, '..', 'templates', 'retired-skills.json');
const externalPath = join(__dirname, '..', 'templates', 'external-skills.json');

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const retiredSkills = JSON.parse(readFileSync(retiredPath, 'utf8'));
const externalCatalog = JSON.parse(readFileSync(externalPath, 'utf8'));
const catalogSkills = new Set(Object.keys(catalog.depends));
const externalSkillIds = new Set(Object.keys(externalCatalog.skills ?? {}));

const errors = [];

for (const skill of catalog.alwaysInstall ?? []) {
  if (!catalogSkills.has(skill)) {
    errors.push(`alwaysInstall references unknown skill: ${skill}`);
  }
}

const skillDirs = discoverSkillIds(skillsDir);

for (const skill of skillDirs) {
  if (!catalogSkills.has(skill)) {
    errors.push(`catalog.json missing depends entry for skill: ${skill}`);
  }
}

for (const skill of catalogSkills) {
  const skillMd = resolveSkillMd(skillsDir, skill);
  if (!skillMd) {
    errors.push(`catalog.json lists unknown skill: ${skill}`);
    continue;
  }
  try {
    statSync(skillMd);
  } catch {
    errors.push(`catalog.json lists unknown skill: ${skill}`);
  }
}

for (const skill of skillDirs) {
  const skillMd = resolveSkillMd(skillsDir, skill);
  if (!skillMd) continue;

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
  if (!catalogSkills.has(newName) && !externalSkillIds.has(newName)) {
    errors.push(`retired-skills.json maps "${oldName}" to unknown skill "${newName}"`);
  }
  if (oldName === newName) {
    errors.push(`retired-skills.json has identity mapping for "${oldName}"`);
  }
}

for (const [skillId, entry] of Object.entries(externalCatalog.skills ?? {})) {
  if (!entry.source) {
    errors.push(`external-skills.json: "${skillId}" missing source`);
  }
  if (!entry.stack || !externalCatalog.stacks?.[entry.stack]) {
    errors.push(`external-skills.json: "${skillId}" has unknown stack "${entry.stack}"`);
  }
  if (catalogSkills.has(skillId)) {
    errors.push(`external-skills.json: "${skillId}" collides with a NextStage catalog skill`);
  }
}

for (const [presetId, preset] of Object.entries(externalCatalog.presets ?? {})) {
  for (const skillId of preset.skills ?? []) {
    if (!externalCatalog.skills?.[skillId]) {
      errors.push(`external-skills.json preset "${presetId}" references unknown skill "${skillId}"`);
    }
  }
  for (const skillId of preset.nsSkills ?? []) {
    if (!catalogSkills.has(skillId)) {
      errors.push(`external-skills.json preset "${presetId}" references unknown NS skill "${skillId}"`);
    }
  }
  if (presetId === 'agents-api') {
    const presetSkills = new Set(preset.skills ?? []);
    for (const [skillId, entry] of Object.entries(externalCatalog.skills ?? {})) {
      if (entry.stack !== 'agents-api') continue;
      if (!presetSkills.has(skillId)) {
        errors.push(`agents-api preset must include all agents-api stack skills; missing "${skillId}"`);
      }
    }
  }
}

errors.push(...validateCommercialBudgetSkill(skillsDir));

const expectedSkillPaths = Object.fromEntries(
  discoverSkillsWithDomain(skillsDir).map((skill) => [skill.id, skill.path]),
);
let skillPaths = {};
try {
  skillPaths = JSON.parse(readFileSync(skillPathsPath, 'utf8'));
} catch {
  errors.push('templates/skill-paths.json is missing or invalid JSON');
}

for (const [skillId, path] of Object.entries(expectedSkillPaths)) {
  if (skillPaths[skillId] !== path) {
    errors.push(`skill-paths.json out of sync for ${skillId}: expected ${path}, got ${skillPaths[skillId] ?? 'missing'}`);
  }
}

for (const skillId of Object.keys(skillPaths)) {
  if (!expectedSkillPaths[skillId]) {
    errors.push(`skill-paths.json lists unknown skill: ${skillId}`);
  }
}

const bundledPresetsDir = join(__dirname, '..', 'templates', 'presets');
const repoPresetsDir = join(repoRoot, 'presets');
if (existsSync(bundledPresetsDir) && existsSync(repoPresetsDir)) {
  for (const file of ['index.json', 'spec-driven.json', 'gitlab.json', 'project-manager.json', 'frontend.json', 'agent-creator.json', 'full.json']) {
    const bundled = join(bundledPresetsDir, file);
    const repo = join(repoPresetsDir, file);
    if (!existsSync(bundled) || !existsSync(repo)) continue;
    if (readFileSync(bundled, 'utf8') !== readFileSync(repo, 'utf8')) {
      errors.push(`bundled templates/presets/${file} is out of sync with presets/${file}`);
    }
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

console.log(`OK: catalog.json in sync with ${skillDirs.length} skills; ${Object.keys(externalCatalog.skills ?? {}).length} external skills`);
