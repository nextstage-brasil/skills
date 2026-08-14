import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from './catalog.js';
import { discoverSkillIds, resolveSkillMd } from './resolveSkillPath.js';
import { resolveRepoRoot } from './presets.js';

/**
 * Validate catalog depends graph integrity.
 * @param {{ repoRoot?: string, skillsDir?: string }} [options]
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateDependsGraph(options = {}) {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const skillsDir = options.skillsDir ?? join(repoRoot, 'skills');
  const catalog = loadCatalog();
  const depends = catalog.depends ?? {};
  const catalogSkills = new Set(Object.keys(depends));
  const discovered = new Set(discoverSkillIds(skillsDir));
  const errors = [];

  for (const skill of catalog.alwaysInstall ?? []) {
    if (!catalogSkills.has(skill)) {
      errors.push(`alwaysInstall references unknown skill: ${skill}`);
    }
  }

  for (const skill of discovered) {
    if (!catalogSkills.has(skill)) {
      errors.push(`catalog.json missing depends entry for skill: ${skill}`);
    }
  }

  for (const skill of catalogSkills) {
    if (!resolveSkillMd(skillsDir, skill)) {
      errors.push(`catalog.json lists unknown skill: ${skill}`);
    }
  }

  for (const [skill, deps] of Object.entries(depends)) {
    for (const dep of deps) {
      if (!catalogSkills.has(dep)) {
        errors.push(`${skill}: depends on missing catalog skill "${dep}"`);
      }
    }
  }

  for (const skill of discovered) {
    const skillMd = resolveSkillMd(skillsDir, skill);
    if (!skillMd) continue;

    const content = readFileSync(skillMd, 'utf8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) continue;

    const declared = parseDepends(frontmatter[1]);
    const expected = depends[skill] ?? [];

    for (const dep of expected) {
      if (!declared.includes(dep)) {
        errors.push(`${skill}: catalog depends on ${dep} but SKILL.md frontmatter does not`);
      }
    }

    for (const dep of declared) {
      if (!expected.includes(dep)) {
        errors.push(`${skill}: frontmatter depends on ${dep} but catalog.json does not`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function parseDepends(frontmatter) {
  const match = frontmatter.match(/^depends:\s*\n((?:[ \t]+-\s+.+\n?)*)$/m);
  if (!match) return [];
  return [...match[1].matchAll(/^[ \t]+-\s+(\S+)/gm)].map((m) => m[1]);
}
