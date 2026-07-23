import { spawnSync } from 'node:child_process';
import { resolveSource } from './source.js';
import { groupExternalSkillsBySource } from './externalSkills.js';

export const SKILL_CREATOR_SOURCE = 'https://github.com/anthropics/skills';

function runSkillsAdd({
  source,
  skills,
  projectRoot = process.cwd(),
  global = false,
  agents = [],
  copy = false,
  extraArgs = [],
}) {
  if (skills.length === 0) {
    throw new Error('No skills selected for installation');
  }

  const args = ['skills', 'add', source, '-y', ...extraArgs];

  for (const skill of skills) {
    args.push('--skill', skill);
  }

  if (global) args.push('-g');
  if (copy) args.push('--copy');
  for (const agent of agents) {
    args.push('--agent', agent);
  }

  const result = spawnSync('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`skills add failed with exit code ${result.status}`);
  }
}

export function installSkills(skills, options = {}) {
  const {
    projectRoot = process.cwd(),
    global = false,
    agents = [],
    copy = false,
    source,
  } = options;

  runSkillsAdd({
    source: resolveSource(source),
    skills,
    projectRoot,
    global,
    agents,
    copy,
    extraArgs: ['--full-depth'],
  });
}

export function installSkillCreator(options = {}) {
  const {
    projectRoot = process.cwd(),
    global = false,
    agents = [],
    copy = false,
  } = options;

  runSkillsAdd({
    source: SKILL_CREATOR_SOURCE,
    skills: ['skill-creator'],
    projectRoot,
    global,
    agents,
    copy,
  });
}

export function installExternalSkills(skillIds, options = {}) {
  if (skillIds.length === 0) {
    return;
  }

  const groups = groupExternalSkillsBySource(skillIds);
  const {
    projectRoot = process.cwd(),
    global = false,
    agents = [],
    copy = false,
  } = options;

  for (const group of groups) {
    runSkillsAdd({
      source: group.source,
      skills: group.skills,
      projectRoot,
      global,
      agents,
      copy,
    });
  }
}
