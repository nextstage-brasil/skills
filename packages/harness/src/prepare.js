import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_SKILLS_DIR, HARNESS_ROOT } from './agentsLayout.js';

export const PREPARE_SKILL = 'harness-prepare';

export const PREPARE_WORKER_SKILLS = [
  'harness-architecture-rules',
  'harness-bootstrap-brownfield',
  'harness-codebase-reverse-spec',
  'harness-agents-md',
];

export function listInstalledSkillNames(projectRoot) {
  const skillsDir = join(projectRoot, AGENTS_SKILLS_DIR);
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter((entry) => {
      const path = join(skillsDir, entry);
      return statSync(path).isDirectory() && existsSync(join(path, 'SKILL.md'));
    })
    .sort();
}

function hasApplicationCodeSignals(projectRoot) {
  const signals = [
    'package.json',
    'composer.json',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'src',
    'app',
    'lib',
  ];
  return signals.some((rel) => existsSync(join(projectRoot, rel)));
}

export function assessPrepareReadiness(projectRoot) {
  const installed = listInstalledSkillNames(projectRoot);
  const installedSet = new Set(installed);
  const missingWorkers = PREPARE_WORKER_SKILLS.filter((skill) => !installedSet.has(skill));
  const missingPrepare = !installedSet.has(PREPARE_SKILL);

  return {
    projectRoot,
    harnessPresent: existsSync(join(projectRoot, HARNESS_ROOT)),
    skillsDirPresent: existsSync(join(projectRoot, AGENTS_SKILLS_DIR)),
    installed,
    missingWorkers,
    missingPrepare,
    hasCode: hasApplicationCodeSignals(projectRoot),
    ready:
      existsSync(join(projectRoot, HARNESS_ROOT))
      && existsSync(join(projectRoot, AGENTS_SKILLS_DIR))
      && missingWorkers.length === 0
      && !missingPrepare
      && hasApplicationCodeSignals(projectRoot),
  };
}

export function buildPrepareMessage(assessment) {
  const lines = [];
  lines.push('Harness prepare — full brownfield AI bootstrap');
  lines.push('');
  lines.push('Run in Cursor or Claude Code:');
  lines.push('');
  lines.push('  /harness-prepare');
  lines.push('');
  lines.push('Or prompt:');
  lines.push('  Run full harness prepare for this project.');
  lines.push('');
  lines.push('Chain (automatic, one session):');
  lines.push('  1. harness-architecture-rules → .nextstage-harness/rules/architecture-rules.md');
  lines.push('  2. harness sync');
  lines.push('  3. harness-bootstrap-brownfield → docs/context/brownfield-map.md');
  lines.push('  4. harness-codebase-reverse-spec → docs/context/system-reverse-spec.md');
  lines.push('  5. harness-agents-md → AGENTS.md + CLAUDE.md');
  lines.push('');

  if (!assessment.harnessPresent) {
    lines.push('⚠  .nextstage-harness/ not found — run harness init first.');
    lines.push('');
  }

  if (!assessment.skillsDirPresent) {
    lines.push('⚠  .agents/skills/ not found — run harness init first.');
    lines.push('');
  }

  if (assessment.missingPrepare || assessment.missingWorkers.length > 0) {
    const missing = [
      ...(assessment.missingPrepare ? [PREPARE_SKILL] : []),
      ...assessment.missingWorkers,
    ];
    lines.push(`⚠  Missing skills: ${missing.join(', ')}`);
    lines.push('   Install: npx @nextstage-brasil/harness --preset brownfield --yes');
    lines.push('');
  }

  if (!assessment.hasCode) {
    lines.push('⚠  No application code detected — skip prepare on greenfield until code exists.');
    lines.push('');
  }

  if (assessment.ready) {
    lines.push('✓  Prerequisites OK — invoke /harness-prepare in your agent.');
    lines.push('');
    lines.push('Re-run regularly to refresh project context:');
    lines.push('  • After major refactors, new modules, or stack changes');
    lines.push('  • Before SDD planning when brownfield docs may be stale');
    lines.push('  • Updates: architecture-rules, brownfield-map, system-reverse-spec, AGENTS.md');
  }

  return lines.join('\n');
}

export function runPrepare(projectRoot) {
  const assessment = assessPrepareReadiness(projectRoot);
  return {
    assessment,
    message: buildPrepareMessage(assessment),
  };
}
