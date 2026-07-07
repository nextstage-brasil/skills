import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENTS_PERSONAS_DIR } from './agentsLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundledAgentsDir = join(__dirname, '..', 'templates', 'agents');

/** Persona file name → skills; persona installs when any listed skill is present. */
const PERSONA_SKILL_DEPS = {
  'code-coder': ['coder', 'execute-gitlab-issue'],
  'execution-orchestrator': ['execution-orchestrator', 'version-partitioner'],
};

export function personaRequiredSkills(personaName) {
  return PERSONA_SKILL_DEPS[personaName] ?? [personaName];
}

export function personaRequiredSkill(personaName) {
  return personaRequiredSkills(personaName)[0];
}

export function matchingPersonas(agentsDir, skills) {
  return availablePersonas(agentsDir).filter((name) =>
    personaRequiredSkills(name).some((skill) => skills.includes(skill)),
  );
}

export function resolveAgentsDir(source) {
  if (typeof source === 'string' && existsSync(join(source, 'agents'))) {
    return join(source, 'agents');
  }
  if (existsSync(bundledAgentsDir)) {
    return bundledAgentsDir;
  }
  return null;
}

export function availablePersonas(agentsDir) {
  if (!agentsDir) return [];
  return readdirSync(agentsDir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.replace(/\.md$/, ''));
}

export function installAgentPersonas({ agentsDir, skills, projectRoot, force = false }) {
  const created = [];
  const skipped = [];

  if (!agentsDir) {
    return { created, skipped };
  }

  const personas = matchingPersonas(agentsDir, skills);
  const targetDir = join(projectRoot, AGENTS_PERSONAS_DIR);

  for (const persona of personas) {
    const target = join(targetDir, `${persona}.md`);
    const label = `${AGENTS_PERSONAS_DIR}/${persona}.md`;

    if (existsSync(target) && !force) {
      skipped.push(label);
      continue;
    }

    mkdirSync(targetDir, { recursive: true });
    copyFileSync(join(agentsDir, `${persona}.md`), target);
    created.push(label);
  }

  return { created, skipped };
}
