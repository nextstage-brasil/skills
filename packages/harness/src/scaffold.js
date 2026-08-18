import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOCS_LAYOUT_DIRS,
  HARNESS_ROOT,
  HARNESS_RULES_DIR,
} from './agentsLayout.js';
import { refreshHarnessReadme } from './refreshHarnessReadme.js';
import { writeClaudeMdIfMissing } from './syncClaudeMd.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');
const harnessManifestTemplatePath = join(templatesDir, 'harness-manifest.json');

export function scaffoldProject(projectRoot, options = {}) {
  const { agents = true, docs = true, force = false } = options;
  const created = [];
  const skipped = [];

  if (agents) {
    scaffoldHarnessRoot(projectRoot, { force, created, skipped });
    scaffoldClaudeStub(projectRoot, { created, skipped });
  }

  if (docs) {
    for (const dir of DOCS_LAYOUT_DIRS) {
      const target = join(projectRoot, dir);
      if (existsSync(target)) {
        skipped.push(`${dir}/`);
      } else {
        mkdirSync(target, { recursive: true });
        created.push(`${dir}/`);
      }

      const gitkeep = join(target, '.gitkeep');
      if (!existsSync(gitkeep)) {
        writeUtf8(gitkeep, '');
        created.push(`${dir}/.gitkeep`);
      }
    }
  }

  return { created, skipped };
}

function scaffoldHarnessRoot(projectRoot, { force, created, skipped }) {
  const harnessRoot = join(projectRoot, HARNESS_ROOT);
  const manifestTarget = join(harnessRoot, 'manifest.json');
  const rulesTarget = join(projectRoot, HARNESS_RULES_DIR);
  const archRulesTarget = join(rulesTarget, 'architecture-rules.md');
  const projectRulesTarget = join(rulesTarget, 'project-rules.md');

  mkdirSync(rulesTarget, { recursive: true });

  if (existsSync(manifestTarget) && !force) {
    skipped.push(`${HARNESS_ROOT}/manifest.json`);
    ensureProjectRulesManifestEntry(manifestTarget, created, skipped);
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

  if (existsSync(projectRulesTarget) && !force) {
    skipped.push(`${HARNESS_RULES_DIR}/project-rules.md`);
  } else {
    copyFileSync(
      join(templatesDir, 'rules', 'project-rules.stub.md'),
      projectRulesTarget,
    );
    created.push(`${HARNESS_RULES_DIR}/project-rules.md`);
  }

  const readmeResult = refreshHarnessReadme(projectRoot);
  if (!readmeResult.skipped) {
    const label = `${HARNESS_ROOT}/README.md`;
    if (readmeResult.created) {
      created.push(label);
    } else {
      created.push(`${label} (updated)`);
    }
  }
}

function scaffoldClaudeStub(projectRoot, { created, skipped }) {
  const result = writeClaudeMdIfMissing(projectRoot);
  if (result.skipped) {
    skipped.push('CLAUDE.md');
    return;
  }
  created.push('CLAUDE.md');
}

function writeUtf8(path, content) {
  writeFileSync(path, content, 'utf8');
}

function ensureProjectRulesManifestEntry(manifestTarget, created, skipped) {
  const manifest = JSON.parse(readFileSync(manifestTarget, 'utf8'));
  if (!Array.isArray(manifest.rules)) {
    const template = loadHarnessManifestTemplate();
    manifest.rules = Array.isArray(template.rules)
      ? template.rules.map((rule) => ({ ...rule }))
      : [];
  }
  if (manifest.rules.some((rule) => rule.name === 'project-rules')) {
    skipped.push(`${HARNESS_ROOT}/manifest.json (project-rules entry present)`);
    return;
  }
  manifest.rules.push(getTemplateRuleEntry('project-rules'));
  writeUtf8(manifestTarget, `${JSON.stringify(manifest, null, 2)}\n`);
  created.push(`${HARNESS_ROOT}/manifest.json (project-rules entry added)`);
}

function loadHarnessManifestTemplate() {
  return JSON.parse(readFileSync(harnessManifestTemplatePath, 'utf8'));
}

function getTemplateRuleEntry(name) {
  const entry = loadHarnessManifestTemplate().rules?.find((rule) => rule.name === name);
  if (!entry) {
    throw new Error(`Missing ${name} in harness-manifest.json template`);
  }
  return { ...entry };
}
