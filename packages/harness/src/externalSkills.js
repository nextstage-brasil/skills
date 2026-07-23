import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDepends } from './catalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const externalPath = join(__dirname, '..', 'templates', 'external-skills.json');

let cached;

export function loadExternalSkills() {
  if (!cached) {
    cached = JSON.parse(readFileSync(externalPath, 'utf8'));
  }
  return cached;
}

export function isExternalSkill(skillId) {
  return Boolean(loadExternalSkills().skills[skillId]);
}

export function getExternalSkill(skillId) {
  const entry = loadExternalSkills().skills[skillId];
  if (!entry) return null;
  return { id: skillId, ...entry };
}

export function listExternalPresets() {
  const { presets } = loadExternalSkills();
  return Object.entries(presets).map(([id, preset]) => ({
    id,
    ...preset,
    nsSkills: resolveDepends(preset.nsSkills ?? ['nextstage-harness']),
    skills: [...preset.skills],
  }));
}

export function getExternalPreset(id) {
  const preset = listExternalPresets().find((entry) => entry.id === id);
  return preset ?? null;
}

export function listExternalStacks() {
  const { stacks, skills } = loadExternalSkills();
  return Object.entries(stacks).map(([id, stack]) => ({
    id,
    ...stack,
    skills: Object.entries(skills)
      .filter(([, entry]) => entry.stack === id)
      .map(([skillId, entry]) => ({ id: skillId, ...entry })),
  })).filter((stack) => stack.skills.length > 0);
}

export function groupExternalSkillsBySource(skillIds) {
  const { skills } = loadExternalSkills();
  const bySource = new Map();

  for (const skillId of skillIds) {
    const entry = skills[skillId];
    if (!entry) {
      throw new Error(`Unknown external skill: ${skillId}`);
    }
    const list = bySource.get(entry.source) ?? [];
    list.push(skillId);
    bySource.set(entry.source, list);
  }

  return [...bySource.entries()].map(([source, ids]) => ({ source, skills: ids }));
}

export function resolveInstallPlan({ nsSkillIds = [], externalSkillIds = [] }) {
  return {
    nsSkills: resolveDepends(nsSkillIds),
    externalSkills: [...new Set(externalSkillIds)],
  };
}
