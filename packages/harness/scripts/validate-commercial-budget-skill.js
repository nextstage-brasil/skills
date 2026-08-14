import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveSkillDir } from '../src/resolveSkillPath.js';

const SKILL_ID = 'ns-commercial-budget';

const REQUIRED_ARTIFACTS = [
  'commercial-budget-internal.md',
  'commercial-budget-costumer.md',
];

const REQUIRED_TEMPLATES = [
  'commercial-budget-internal.template.md',
  'commercial-budget-costumer.template.md',
];

const FORBIDDEN_LEGACY_ARTIFACTS = [
  'commercial-budget.md',
  'commercial-budget-cliente.md',
  'commercial-budget-full.md',
  'commercial-budget-full-cliente.md',
  'commercial-budget.template.md',
  'commercial-budget-cliente.template.md',
];

/** Project-specific or retired strings that must not appear in skill sources. */
const FORBIDDEN_LEAK_PATTERNS = [
  { pattern: /demanda-\d+/i, label: 'project issue id (demanda-*)' },
  { pattern: /\bmppb\b/i, label: 'project slug (mppb)' },
  { pattern: /\bORCRIM\b/, label: 'client domain token (ORCRIM)' },
  { pattern: /orcamento-api-orcrim/i, label: 'project version slug' },
  { pattern: /commercial-budget-full/i, label: 'legacy artifact prefix (commercial-budget-full*)' },
  { pattern: /commercial-budget-cliente/i, label: 'legacy artifact name (commercial-budget-cliente*)' },
];

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walkFiles(path, out);
      continue;
    }
    if (/\.(md|json)$/i.test(entry)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Validate ns-commercial-budget canonical artifact names and absence of project leaks.
 * @param {string} skillsDir
 * @returns {string[]}
 */
export function validateCommercialBudgetSkill(skillsDir) {
  const errors = [];
  const skillDir = resolveSkillDir(skillsDir, SKILL_ID);
  const skillMdPath = skillDir ? join(skillDir, 'SKILL.md') : null;

  if (!skillMdPath || !existsSync(skillMdPath)) {
    return errors;
  }

  const skillMd = readFileSync(skillMdPath, 'utf8');
  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!skillMd.includes(artifact)) {
      errors.push(`${SKILL_ID}: SKILL.md must reference canonical artifact "${artifact}"`);
    }
  }

  const assetsDir = join(skillDir, 'assets');
  for (const template of REQUIRED_TEMPLATES) {
    if (!existsSync(join(assetsDir, template))) {
      errors.push(`${SKILL_ID}: missing template assets/${template}`);
    }
  }

  for (const legacy of FORBIDDEN_LEGACY_ARTIFACTS) {
    if (existsSync(join(assetsDir, legacy))) {
      errors.push(`${SKILL_ID}: remove legacy template assets/${legacy}`);
    }
  }

  for (const file of walkFiles(skillDir)) {
    const rel = file.slice(skillDir.length + 1);
    const content = readFileSync(file, 'utf8');

    for (const { pattern, label } of FORBIDDEN_LEAK_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`${SKILL_ID}: forbidden ${label} in ${rel}`);
      }
    }

    if (/\bcommercial-budget\.md\b/.test(content)) {
      const allowed =
        content.includes('commercial-budget-internal.md')
        || content.includes('commercial-budget-costumer.md');
      if (!allowed && !rel.includes('MIGRATION')) {
        errors.push(
          `${SKILL_ID}: legacy path commercial-budget.md in ${rel} — use commercial-budget-internal.md`,
        );
      }
    }
  }

  return errors;
}
