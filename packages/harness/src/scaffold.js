import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_LAYOUT_DIRS } from './agentsLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');

export function scaffoldProject(projectRoot, options = {}) {
  const { agents = true, docs = true, force = false } = options;
  const created = [];
  const skipped = [];

  if (agents) {
    const target = join(projectRoot, 'AGENTS.md');
    if (existsSync(target) && !force) {
      skipped.push('AGENTS.md');
    } else {
      copyFileSync(join(templatesDir, 'AGENTS.md'), target);
      created.push('AGENTS.md');
    }
  }

  if (docs) {
    for (const dir of AGENTS_LAYOUT_DIRS) {
      const target = join(projectRoot, dir);
      if (existsSync(target)) {
        skipped.push(`${dir}/`);
      } else {
        mkdirSync(target, { recursive: true });
        created.push(`${dir}/`);
      }
    }

    for (const dir of ['docs/context', 'docs/specs', 'docs/versions']) {
      const target = join(projectRoot, dir);
      if (existsSync(target)) {
        skipped.push(`${dir}/`);
      } else {
        mkdirSync(target, { recursive: true });
        created.push(`${dir}/`);
      }
    }

    const gitkeep = join(projectRoot, 'docs', 'versions', '.gitkeep');
    if (!existsSync(gitkeep)) {
      writeUtf8(gitkeep, '');
      created.push('docs/versions/.gitkeep');
    }
  }

  return { created, skipped };
}

function writeUtf8(path, content) {
  writeFileSync(path, content, 'utf8');
}
