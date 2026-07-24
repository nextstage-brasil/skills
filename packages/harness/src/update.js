import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { listInstalledSkillNames } from './prepare.js';
import { installSkills, updateInstalledSkills } from './installer.js';
import { pruneRetiredSkills } from './pruneRetiredSkills.js';
import { syncSkills } from './syncSkills.js';
import { syncRules } from './syncRules.js';
import { pruneExcludedAgentAdapters } from './pruneExcludedAgentAdapters.js';
import { HARNESS_ROOT, resolveAgents } from './agentsLayout.js';
import { logResolvedAgents } from './logResolvedAgents.js';
import { refreshHarnessReadme } from './refreshHarnessReadme.js';

export function listSkillsToUpdate(projectRoot, requested = []) {
  const installed = listInstalledSkillNames(projectRoot);

  if (requested.length === 0) {
    return { skills: installed, skipped: [], notInstalled: [] };
  }

  const installedSet = new Set(installed);
  return {
    skills: requested.filter((name) => installedSet.has(name)),
    skipped: requested.filter((name) => !installedSet.has(name)),
    notInstalled: requested.filter((name) => !installedSet.has(name)),
  };
}

export async function runUpdate(argv = {}) {
  const projectRoot = argv.dir ?? process.cwd();
  const agentFlags = argv.agent ?? [];
  logResolvedAgents(projectRoot, agentFlags);
  const agents = resolveAgents(projectRoot, agentFlags);
  const { skills, notInstalled } = listSkillsToUpdate(projectRoot, argv.skill ?? []);

  if (notInstalled.length > 0) {
    throw new Error(`Not installed (skipped): ${notInstalled.join(', ')}`);
  }

  if (skills.length === 0) {
    console.log('No installed skills to update.');
    return { skills: [], skipped: true };
  }

  if (argv['dry-run']) {
    console.log(`Would update ${skills.length} skill(s): ${skills.join(', ')}`);
    return { skills, dryRun: true };
  }

  const installOptions = {
    projectRoot,
    global: Boolean(argv.global),
    agents,
    copy: Boolean(argv.copy),
    source: argv.source,
  };

  const hasSkillCreator = skills.includes('skill-creator');
  const withoutSkillCreator = skills.filter((name) => name !== 'skill-creator');

  if (withoutSkillCreator.length > 0) {
    updateInstalledSkills(withoutSkillCreator, installOptions);
  }

  if (hasSkillCreator) {
    updateInstalledSkills(['skill-creator'], installOptions);
    installSkills(['skill-creator'], installOptions);
  }

  const pruneResult = pruneRetiredSkills(projectRoot, { agents });
  if (pruneResult.removed.length > 0) {
    const names = pruneResult.removable.map((entry) => entry.oldName).join(', ');
    console.log(`Removed retired skills: ${names}`);
  }

  const skillsSync = syncSkills(projectRoot, { agents, copy: Boolean(argv.copy) });
  if (skillsSync.written.length > 0) {
    console.log(`Synced ${skillsSync.written.length} skill adapter(s)`);
  }

  if (existsSync(join(projectRoot, HARNESS_ROOT))) {
    const rulesSync = syncRules(projectRoot, { agents });
    if (rulesSync.written.length > 0) {
      console.log(`Synced ${rulesSync.written.length} rule adapter(s)`);
    }
  }

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    console.log(`Removed ${prunedAdapters.removed.length} adapter path(s) for excluded agents`);
  }

  const readmeResult = refreshHarnessReadme(projectRoot);
  if (readmeResult.updated) {
    console.log(`Updated: ${HARNESS_ROOT}/README.md`);
  }

  console.log(`Updated ${skills.length} skill(s): ${skills.join(', ')}`);
  return { skills, skipped: false };
}
