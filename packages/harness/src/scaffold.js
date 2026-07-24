import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AGENTS_LAYOUT_DIRS,
  HARNESS_ROOT,
  HARNESS_RULES_DIR,
} from './agentsLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');

export function scaffoldProject(projectRoot, options = {}) {
  const { agents = true, docs = true, force = false } = options;
  const created = [];
  const skipped = [];

  if (agents) {
    scaffoldHarnessRoot(projectRoot, { force, created, skipped });
    scaffoldClaudeStub(projectRoot, { created, skipped });
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

function scaffoldHarnessRoot(projectRoot, { force, created, skipped }) {
  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const manifestTarget = join(harnessRoot, 'manifest.json');
  const rulesTarget = join(projectRoot, HARNESS_RULES_DIR);
  const archRulesTarget = join(rulesTarget, 'architecture-rules.md');

  mkdirSync(rulesTarget, { recursive: true });

  if (existsSync(manifestTarget) && !force) {
    skipped.push(`${HARNESS_ROOT}/manifest.json`);
  } else {
    copyFileSync(join(templatesDir, 'harness-manifest.json'), manifestTarget);
    created.push(`${HARNESS_ROOT}/manifest.json`);
  }

  if (existsSync(archRulesTarget) && !force) {
    skipped.push(`${HARNESS_RULES_DIR}/architecture-rules.md`);
  } else {
    copyFileSync(
      join(templatesDir, 'rules', 'architecture-rules.stub.md'),
      archRulesTarget,
    );
    created.push(`${HARNESS_RULES_DIR}/architecture-rules.md`);
  }

  const readmeTarget = join(harnessRoot, 'README.md');
  if (existsSync(readmeTarget) && !force) {
    skipped.push(`${HARNESS_ROOT}/README.md`);
  } else {
    copyFileSync(join(templatesDir, 'harness-README.md'), readmeTarget);
    created.push(`${HARNESS_ROOT}/README.md`);
  }
}

function scaffoldClaudeStub(projectRoot, { created, skipped }) {
  const claudePath = join(projectRoot, 'CLAUDE.md');
  if (existsSync(claudePath)) {
    skipped.push('CLAUDE.md');
    return;
  }
  writeUtf8(claudePath, '@AGENTS.md\n');
  created.push('CLAUDE.md');
}

function writeUtf8(path, content) {
  writeFileSync(path, content, 'utf8');
}
