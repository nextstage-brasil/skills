import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGENTS_PERSONAS_DIR } from './agentsLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundledAgentsDir = join(__dirname, '..', 'templates', 'agents');

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

  const personas = availablePersonas(agentsDir).filter((name) => skills.includes(name));
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
