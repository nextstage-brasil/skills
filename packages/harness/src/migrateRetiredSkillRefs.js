import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_SKILLS_DIR, HARNESS_ROOT } from './agentsLayout.js';
import { isExternalSkill } from './externalSkills.js';
import { listInstalledSkillNames } from './prepare.js';
import { loadRetiredSkills } from './pruneRetiredSkills.js';

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function classifySkill(name) {
  return isExternalSkill(name) ? 'external' : 'ns';
}

/**
 * Rewrite manifest.skills when recorded/installed ids are in retired-skills.json.
 * Adds replacements so `harness update` can install them; old dirs stay until prune.
 *
 * @returns {{ migrations: { oldName: string, newName: string }[], replacements: string[], written: boolean }}
 */
export function migrateRetiredSkillRefs(projectRoot, options = {}) {
  const { dryRun = false } = options;
  const retired = loadRetiredSkills();
  const manifestPath = join(projectRoot, HARNESS_ROOT, 'manifest.json');
  const migrations = [];
  const replacements = new Set();

  const installed = listInstalledSkillNames(projectRoot);
  const hasManifest = existsSync(manifestPath);
  const manifest = hasManifest
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : null;
  const recordedNs = Array.isArray(manifest?.skills?.ns) ? manifest.skills.ns : [];
  const recordedExternal = Array.isArray(manifest?.skills?.external)
    ? manifest.skills.external
    : [];

  const seenOld = new Set();
  for (const name of [...installed, ...recordedNs, ...recordedExternal]) {
    const newName = retired[name];
    if (!newName || seenOld.has(name)) continue;
    seenOld.add(name);
    migrations.push({ oldName: name, newName });
    replacements.add(newName);
  }

  if (migrations.length === 0 || !hasManifest) {
    return {
      migrations,
      replacements: [...replacements].sort(),
      written: false,
    };
  }

  const drop = new Set(migrations.map((entry) => entry.oldName));
  const nextNs = new Set(recordedNs.filter((name) => !drop.has(name)));
  const nextExternal = new Set(recordedExternal.filter((name) => !drop.has(name)));

  for (const newName of replacements) {
    if (classifySkill(newName) === 'external') {
      nextExternal.add(newName);
    } else {
      nextNs.add(newName);
    }
  }

  const nextSkills = {
    preset: manifest.skills?.preset ?? null,
    ns: uniqueSorted([...nextNs]),
    external: uniqueSorted([...nextExternal]),
  };

  const changed =
    JSON.stringify(nextSkills) !==
    JSON.stringify({
      preset: manifest.skills?.preset ?? null,
      ns: uniqueSorted(recordedNs),
      external: uniqueSorted(recordedExternal),
    });

  if (!changed || dryRun) {
    return {
      migrations,
      replacements: [...replacements].sort(),
      written: false,
    };
  }

  manifest.skills = nextSkills;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    migrations,
    replacements: [...replacements].sort(),
    written: true,
  };
}

/** True when the skill folder exists under .agents/skills. */
export function skillInstalledOnDisk(projectRoot, skillName) {
  return existsSync(join(projectRoot, AGENTS_SKILLS_DIR, skillName, 'SKILL.md'));
}
