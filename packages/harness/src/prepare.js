import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_SKILLS_DIR, HARNESS_ROOT } from './agentsLayout.js';

export const PREPARE_SKILL = 'ns-harness';

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
  const missingPrepare = !installed.includes(PREPARE_SKILL);

  return {
    projectRoot,
    harnessPresent: existsSync(join(projectRoot, HARNESS_ROOT)),
    skillsDirPresent: existsSync(join(projectRoot, AGENTS_SKILLS_DIR)),
    installed,
    missingWorkers: [],
    missingPrepare,
    hasCode: hasApplicationCodeSignals(projectRoot),
    ready:
      existsSync(join(projectRoot, HARNESS_ROOT))
      && existsSync(join(projectRoot, AGENTS_SKILLS_DIR))
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
  lines.push('  /ns-harness prepare this repo');
  lines.push('');
  lines.push('Or prompt:');
  lines.push('  /ns-harness generate architecture rules for this project');
  lines.push('');
  lines.push('Chain (automatic, one session — ns-harness references/prepare.md):');
  lines.push('  1. architecture-rules-generator.md → .nextstage-harness/rules/architecture-rules.md');
  lines.push('  2. harness sync');
  lines.push('  3. bootstrap-brownfield.md → docs/context/brownfield-map.md');
  lines.push('  4. codebase-reverse-spec.md → docs/context/system-reverse-spec.md');
  lines.push('  5. agents-md.md → AGENTS.md + CLAUDE.md');
  lines.push('');

  if (!assessment.harnessPresent) {
    lines.push('⚠  .nextstage-harness/ not found — run harness init first.');
    lines.push('');
  }

  if (!assessment.skillsDirPresent) {
    lines.push('⚠  .agents/skills/ not found — run harness init first.');
    lines.push('');
  }

  if (assessment.missingPrepare) {
    lines.push('⚠  Missing skill: ns-harness');
    lines.push('   Install: npx @nextstage-brasil/harness --yes');
    lines.push('');
  }

  if (!assessment.hasCode) {
    lines.push('⚠  No application code detected — skip prepare on greenfield until code exists.');
    lines.push('');
  }

  if (assessment.ready) {
    lines.push('✓  Prerequisites OK — invoke /ns-harness prepare this repo in your agent.');
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
