import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESS_AGENT_DIRS } from './detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundledAgentsDir = join(__dirname, '..', 'templates', 'agents');

// Agent personas are neutral markdown, not tied to any harness format — the
// only translation happening here is *where* the file lands, never its
// content. See agents/*.md at the repo root for the canonical source.
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

// Projects each installed skill's matching persona (if any) into the native
// agent directory for each harness in `harnesses` (see projectionHarnesses()).
export function projectAgentPersonas({ agentsDir, harnesses, skills, projectRoot, force = false }) {
  const created = [];
  const skipped = [];

  if (!agentsDir || harnesses.length === 0) {
    return { created, skipped };
  }

  const personas = availablePersonas(agentsDir).filter((name) => skills.includes(name));

  for (const persona of personas) {
    for (const harness of harnesses) {
      const dirParts = HARNESS_AGENT_DIRS[harness];
      if (!dirParts) continue;

      const targetDir = join(projectRoot, ...dirParts);
      const target = join(targetDir, `${persona}.md`);
      const label = join(...dirParts, `${persona}.md`);

      if (existsSync(target) && !force) {
        skipped.push(label);
        continue;
      }

      mkdirSync(targetDir, { recursive: true });
      copyFileSync(join(agentsDir, `${persona}.md`), target);
      created.push(label);
    }
  }

  return { created, skipped };
}
