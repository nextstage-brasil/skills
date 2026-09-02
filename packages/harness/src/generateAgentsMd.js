import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_HOME, CLAUDE_MD_CONTENT, HARNESS_ROOT, HARNESS_RULES_DIR } from './agentsLayout.js';
import { listCategories } from './catalog.js';
import { loadManifest } from './manifest.js';
import { DEFAULT_SUBAGENTS } from './subagentsCatalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCKER_TESTING_SECTION = readFileSync(
  join(__dirname, '..', 'templates', 'snippets', 'docker-and-testing.md'),
  'utf8',
).trimEnd();

const SDD_PLANNING = [
  'ns-spec-driven',
];

const IMPL_SKILLS = ['ns-coder', 'ns-autonomous', 'ns-execution-gitlab-issue'];
const CLOSE_SKILLS = ['ns-reviewer', 'ns-living-spec'];

const COMPLEMENT_SKILLS = ['ns-frontend-design', 'ns-docs-writer', 'ns-best-practices'];

const LAYOUT_PATHS = [
  { path: 'AGENTS.md', purpose: 'Project rules entry point' },
  { path: HARNESS_RULES_DIR, purpose: 'Canonical project rules' },
  { path: join(HARNESS_ROOT, 'README.md'), purpose: 'How to add/edit rules' },
  { path: join(HARNESS_ROOT, 'agents/'), purpose: 'Canonical subagent bodies (edit here)' },
  { path: join(HARNESS_ROOT, 'manifest.json'), purpose: 'Adapter config for harness sync (rules + subagents)' },
  { path: '.cursor/rules/', purpose: 'Generated Cursor rule adapters' },
  { path: '.claude/rules/', purpose: 'Generated Claude rule adapters' },
  { path: '.cursor/agents/', purpose: 'Generated Cursor subagent bridges (model + skill)' },
  { path: '.claude/agents/', purpose: 'Generated Claude Code subagent bridges (model + skill)' },
  { path: join(AGENTS_HOME, 'skills/'), purpose: 'Installed skills (Skills CLI; Cursor reads here)' },
  { path: '.claude/skills/', purpose: 'Symlinked Claude Code skills (harness sync)' },
  { path: join(AGENTS_HOME, 'docs/'), purpose: 'Agent-oriented project docs' },
  { path: 'docs/context/', purpose: 'Product context (stack, brownfield)' },
  { path: 'docs/versions/', purpose: 'SDD version artifacts' },
  { path: 'docs/specs/', purpose: 'Living domain specs' },
];

function buildSubagentsSection(projectRoot, installed) {
  const installedSet = new Set(installed);
  const manifest = loadManifest(projectRoot);
  const fromManifest = Array.isArray(manifest?.subagents) ? manifest.subagents : [];
  const byName = new Map(fromManifest.filter((e) => e?.name).map((e) => [e.name, e]));

  const rows = [];
  for (const def of DEFAULT_SUBAGENTS) {
    if (!installedSet.has(def.skill)) continue;
    const entry = byName.get(def.name) ?? def;
    const cursorModel = entry.model?.cursor ?? def.model.cursor;
    const claudeModel = entry.model?.claude ?? def.model.claude;
    rows.push(
      `| \`${entry.name}\` | \`${entry.skill}\` | \`${cursorModel}\` / \`${claudeModel}\` |`,
    );
  }

  if (rows.length === 0) {
    return '_No harness subagent bridges (install coder/reviewer/task skills via a preset)._';
  }

  return `Invoke via Cursor/Claude project agents (e.g. \`/coder-agent\`, \`/reviewer-agent\`, \`/task-writer-agent\`) — **exact** \`name\` from this table. Orchestrators (\`ns-spec-driven\`, handoff, autonomous) **MUST** spawn that agent file so YAML \`model:\` applies (\`subagent-dispatch.md\`). **FORBIDDEN:** child Task \`inherit\` / \`coder\` / \`reviewer\` / \`generalPurpose\` as stand-in (parent model leaks). Inline mapped skill while bridge present = forbidden. Each bridge obeys this \`AGENTS.md\` (already in context — no tool-Read), boots rules per \`session-boot.md\`, then the mapped skill. Edit \`model\` in \`.nextstage-harness/manifest.json\` → \`subagents\`; \`harness update\` never resets your model.

| Agent | Skill | Model (cursor / claude) |
| ----- | ----- | ----------------------- |
${rows.join('\n')}`;
}

function listSkillDirs(projectRoot) {
  const skillsDir = join(projectRoot, AGENTS_HOME, 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((entry) => {
      const path = join(skillsDir, entry);
      return statSync(path).isDirectory();
    })
    .sort();
}

function pathExists(projectRoot, relPath) {
  return existsSync(join(projectRoot, relPath));
}

/** Case-insensitive match for agents.local.md beside AGENTS.md. */
function findAgentsLocalMd(projectRoot) {
  if (!existsSync(projectRoot)) return null;
  const match = readdirSync(projectRoot).find((entry) => entry.toLowerCase() === 'agents.local.md');
  return match ?? null;
}

function readProjectTitle(projectRoot) {
  const readmePath = join(projectRoot, 'README.md');
  if (existsSync(readmePath)) {
    const firstLine = readFileSync(readmePath, 'utf8').split('\n').find((l) => l.trim());
    if (firstLine?.startsWith('# ')) {
      return firstLine.slice(2).trim();
    }
  }
  return basename(resolve(projectRoot));
}

function buildSddChain(installed) {
  const set = new Set(installed);
  const items = [];

  for (const skill of SDD_PLANNING.filter((s) => set.has(s))) {
    items.push(`- [ ] \`${skill}\``);
  }

  if (set.has('ns-spec-driven')) {
    items.push('- [ ] After tasks: optional Gate 4 + `delivery-units.md` (opt-in publish/parallel); default local → handoff');
  }

  const impl = IMPL_SKILLS.filter((skill) => set.has(skill));
  if (impl.length > 0) {
    items.push(`- [ ] Implementation (${impl.map((s) => `\`${s}\``).join(' / ')})`);
  }

  for (const skill of CLOSE_SKILLS.filter((s) => set.has(s))) {
    items.push(`- [ ] \`${skill}\``);
  }

  return items.length > 0 ? items.join('\n') : '_No SDD planning skills installed._';
}

function buildImplementationRoutingTable(installed) {
  const set = new Set(installed);
  const rows = [
    { priority: 1, signal: 'GitLab `ISSUE_URL` or "implement this issue"', skill: 'ns-execution-gitlab-issue' },
    { priority: 2, signal: 'Feature / version / SDD / multi-day scope', skill: 'ns-spec-driven' },
    { priority: 3, signal: 'Autonomous local plan, no issue', skill: 'ns-autonomous' },
    { priority: 4, signal: 'Root-cause only — no implement request', skill: 'ns-investigator' },
    { priority: 5, signal: 'Default — quick fix, small ad-hoc diff', skill: 'ns-coder' },
  ];

  return rows
    .filter(({ skill }) => set.has(skill) || skill === 'ns-coder')
    .map(({ priority, signal, skill }) => {
      const status = set.has(skill) ? `\`${skill}\`` : `\`${skill}\` _(not installed)_`;
      return `| ${priority} | ${signal} | ${status} |`;
    })
    .join('\n');
}

function buildImplementationNote(installed) {
  const set = new Set(installed);
  if (set.has('ns-execution-gitlab-issue')) {
    return 'GitLab issue → `ns-execution-gitlab-issue` (delegates coding to `ns-autonomous`); local plan/ad-hoc autonomous → `ns-autonomous` standalone.';
  }
  if (set.has('ns-autonomous')) {
    return 'Local plan/ad-hoc autonomous execution → `ns-autonomous` standalone.';
  }
  if (set.has('ns-spec-driven')) {
    return 'Partitioned versions → `/ns-spec-driven` (reads `references/orchestrator.md`). Ad-hoc tasks → `ns-coder`.';
  }
  if (set.has('ns-coder')) {
    return 'Ad-hoc tasks → `ns-coder`.';
  }
  return '_No implementation skills installed._';
}

/** Compact inventory — group by catalog category; skip empty groups. */
function buildInstalledSkillsSection(installed) {
  const set = new Set(installed);
  const claimed = new Set();
  const rows = [];

  for (const category of listCategories()) {
    const skills = category.skills.filter((skill) => set.has(skill)).sort();
    if (skills.length === 0) continue;
    for (const skill of skills) claimed.add(skill);
    rows.push(`| ${category.label} | ${skills.map((s) => `\`${s}\``).join(', ')} |`);
  }

  const other = installed.filter((skill) => !claimed.has(skill)).sort();
  if (other.length > 0) {
    rows.push(`| Other | ${other.map((s) => `\`${s}\``).join(', ')} |`);
  }

  if (rows.length === 0) {
    return '_No skills under `.agents/skills/`._';
  }

  return `| Role | Skills |\n| ---- | ------ |\n${rows.join('\n')}`;
}

function buildSkillCreatorSection(installed) {
  const has = installed.includes('skill-creator');
  if (has) {
    return 'Follow `.agents/skills/skill-creator/SKILL.md` for workflow, evals, and description optimization. Save project skills under `.agents/skills/<name>/` — path overrides and sync: installed `ns-harness` → `references/project-skill-authoring.md`. After each create or edit run `npx @nextstage-brasil/harness sync`.';
  }
  return 'Install Anthropics **skill-creator** to author project-local skills in `.agents/skills/`:\n\n```bash\nnpx skills add https://github.com/anthropics/skills --skill skill-creator -y\n```\n\nOr: `npx @nextstage-brasil/harness --preset full --yes` (installs skill-creator). Then read `.agents/skills/skill-creator/SKILL.md` and `ns-harness` → `references/project-skill-authoring.md`.';
}

function buildComplementsNote(installed) {
  const set = new Set(installed);
  const present = COMPLEMENT_SKILLS.filter((skill) => set.has(skill));
  const missing = COMPLEMENT_SKILLS.filter((skill) => !set.has(skill));

  if (present.length === COMPLEMENT_SKILLS.length) {
    return 'All optional complements installed (`ns-frontend-design`, `ns-docs-writer`, `ns-best-practices`). `/ns-spec-driven` delegates to them when relevant.';
  }

  const rows = COMPLEMENT_SKILLS.map((skill) => {
    const status = set.has(skill) ? 'installed' : 'not installed';
    const when =
      skill === 'ns-frontend-design'
        ? 'UI pages and components'
        : skill === 'ns-docs-writer'
          ? 'README and docs/ guides'
          : 'Security headers and modernization pass';
    return `| \`${skill}\` | ${when} | ${status} |`;
  });

  const installHint =
    missing.length > 0
      ? `\nInstall missing complements: \`npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y\``
      : '';

  return `Optional complements (soft-integrated by \`/ns-spec-driven\`):\n\n| Skill | When | Status |\n| ----- | ---- | ------ |\n${rows.join('\n')}${installHint}`;
}

export function generateAgentsMd(projectRoot, options = {}) {
  const { force = false } = options;
  const root = resolve(projectRoot);
  const agentsPath = join(root, 'AGENTS.md');
  const claudePath = join(root, 'CLAUDE.md');

  const installed = listSkillDirs(root);
  if (installed.length === 0) {
    throw new Error('No skills in .agents/skills/ — run harness init first');
  }

  if (existsSync(agentsPath) && !force) {
    return { skipped: true, reason: 'AGENTS.md exists (use --force to overwrite)' };
  }

  const projectName = readProjectTitle(root);

  const agentsLocalMd = findAgentsLocalMd(root);
  const layoutRows = [
    ...LAYOUT_PATHS.map(({ path, purpose }) => {
      const present = pathExists(root, path);
      return `| \`${path}\` | ${purpose} | ${present ? 'present' : 'not present'} |`;
    }),
    `| \`agents.local.md\` | Gitignored local agent overrides (read if present; case-insensitive) | ${agentsLocalMd ? `present (\`${agentsLocalMd}\`)` : 'not present'} |`,
  ];

  const hasHarness = pathExists(root, HARNESS_ROOT);
  const hasSdd = installed.includes('ns-spec-driven');
  const archRulesNote = hasHarness
    ? `**Before implementation, read \`.nextstage-harness/rules/architecture-rules.md\` and \`.nextstage-harness/rules/project-rules.md\`.** If architecture-rules is still the harness stub, run \`/ns-harness prepare this repo\` then \`npx @nextstage-brasil/harness sync\`. Edit \`project-rules.md\` manually for project-local settings (language, codes, MCP server, agent names).`
    : '**Harness rules not scaffolded** — run `harness init` (then `harness sync` absorbs orphan `.cursor/rules/*.mdc`).';

  const content = `# Project agents — ${projectName}

NextStage harness project. Skills detected from \`.agents/skills/\` (generated by CLI — refine with \`/ns-harness\` agents-md for brownfield).

## First action (before any work)

Obey this file (\`AGENTS.md\`) — already in host context; **do not** tool-Read it.

1. If \`agents.local.md\` exists at the same directory as \`AGENTS.md\` (case-insensitive filename), read it **once** — local overrides apply after this file.
2. Read \`.nextstage-harness/rules/architecture-rules.md\` and \`.nextstage-harness/rules/project-rules.md\` when \`.nextstage-harness/\` exists.
3. Note the **GitLab MCP server** named in \`project-rules.md\`, Project-specific notes, or \`agents.local.md\` — use only that server for GitLab tools. When \`agents.local.md\` and \`project-rules.md\` disagree, \`agents.local.md\` wins.

${archRulesNote}

## How to start

| Mode | When | Entry |
| ---- | ---- | ----- |
| Planning | New feature, version, or SDD scope | \`/ns-spec-driven\` or SDD chain below |
| Implementation | Approved plan, handoff, or GitLab issue | Implementation routing table below |
| Ad-hoc | Quick fix, script, small diff — no version lifecycle | \`/ns-coder\` |

## Layout

| Path | Purpose | Status |
| ---- | ------- | ------ |
${layoutRows.join('\n')}

## Installed skills

${buildInstalledSkillsSection(installed)}

Invoke via the Skills menu / slash (e.g. \`/ns-coder\`, \`/ns-reviewer\`), **or** via harness project subagents below. Skills are the workflow source of truth — subagents are thin bridges that bind a model, obey this \`AGENTS.md\` (already in context), then run the skill.

## Project subagents

${buildSubagentsSection(root, installed)}

## Implementation routing

Priority scan **1 → 5**; first matching signal wins. Full handoffs: installed \`ns-harness\` skill → \`references/code-skill-routing.md\`.

| Priority | Signal | Skill |
| -------- | ------ | ----- |
${buildImplementationRoutingTable(installed)}

## Workflows

### Brownfield / context (manual)

${hasHarness ? '**Full onboarding:** `/ns-harness prepare this repo` (or `npx @nextstage-brasil/harness prepare`) runs all steps below in one session — **not** part of `/ns-spec-driven`.\n**Keep context fresh:** re-run `/ns-harness prepare` after major refactors or when brownfield artifacts are stale.\n\n' : ''}| Artifact | Path | Skill |
| -------- | ---- | ----- |
| Full prepare chain | (all rows below) | \`/ns-harness\` → \`prepare.md\` |
| Architecture constitution | \`.nextstage-harness/rules/architecture-rules.md\` | \`/ns-harness\` → \`architecture-rules-generator.md\` |
| Project-local rules | \`.nextstage-harness/rules/project-rules.md\` | (manual edit) |
| Brownfield map | \`docs/context/brownfield-map.md\` | \`/ns-harness\` → \`bootstrap-brownfield.md\` |
| Business reverse spec | \`docs/context/system-reverse-spec.md\` | \`/ns-harness\` → \`codebase-reverse-spec.md\` |
| Project agents entry | \`AGENTS.md\` | \`/ns-harness\` → \`agents-md.md\` |

### Delivery (spec-driven)

${hasSdd ? '**Entry:** `/ns-spec-driven` — auto-sizes Small / Medium / Large and delegates to worker skills. Does **not** auto-run prepare.\n\n' : ''}Checklist (run in order when planning a version):

${buildSddChain(installed)}

### Implementation

${buildImplementationNote(installed)}

### Optional complements

${buildComplementsNote(installed)}

### Project-local skills

${buildSkillCreatorSection(installed)}

## Hard stops / FORBIDDEN

- Do not invent folders, skills, or agent personas not listed here (harness \`*-agent\` bridges in Project subagents are allowed).
- Do not skip \`architecture-rules.md\` or \`project-rules.md\` before implementation.
- Do not commit, push, or mutate GitLab state unless the active skill explicitly allows it for this run.
- GitLab \`ISSUE_URL\` → \`ns-execution-gitlab-issue\` — never ad-hoc coder on the main checkout.
- Do not fabricate \`{version_san}\` or \`docs/versions/\` unless the active skill's workflow requires it.

## Ownership

This file **routes** agents to skills and project rules. Stack, modules, and technical constraints belong in \`architecture-rules.md\` — not here. Project codes, language, team context, and agent names belong in \`project-rules.md\`.

## Rules and sync

- Canonical rules: \`.nextstage-harness/rules/*.md\`
- Subagent model bindings: \`.nextstage-harness/manifest.json\` → \`subagents\` (project-owned; update does not reset)
- Regenerate adapters: \`npx @nextstage-brasil/harness sync\`
- Refresh this file: \`npx @nextstage-brasil/harness agents-md\`
- Skills: \`.agents/skills/\` (canonical; Cursor reads here) — \`.claude/skills/\` symlinked for Claude Code when harness sync runs

See \`ns-harness\` skill (\`session-boot.md\`, \`rules-sync.md\`).

${DOCKER_TESTING_SECTION}

## Language

Project code comments and documentation: English unless the team defines otherwise.

`;

  writeFileSync(agentsPath, content, 'utf8');
  writeFileSync(claudePath, CLAUDE_MD_CONTENT, 'utf8');

  return {
    skipped: false,
    written: ['AGENTS.md', 'CLAUDE.md'],
    skills: installed,
  };
}
