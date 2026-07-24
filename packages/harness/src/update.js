import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
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
    p.log.warn('No installed skills to update.');
    return { skills: [], skipped: true };
  }

  if (argv['dry-run']) {
    p.log.info(`Would update ${skills.length} skill(s)`);
    p.log.message(skills.join(', '));
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

  const details = [];

  const pruneResult = pruneRetiredSkills(projectRoot, { agents });
  if (pruneResult.removed.length > 0) {
    const names = pruneResult.removable.map((entry) => entry.oldName).join(', ');
    details.push(`Retired skills removed: ${names}`);
  }

  const skillsSync = syncSkills(projectRoot, { agents, copy: Boolean(argv.copy) });
  if (skillsSync.written.length > 0) {
    details.push(`Skill adapters synced: ${skillsSync.written.length}`);
  }

  if (existsSync(join(projectRoot, HARNESS_ROOT))) {
    const rulesSync = syncRules(projectRoot, { agents });
    if (rulesSync.written.length > 0) {
      details.push(`Rule adapters synced: ${rulesSync.written.length}`);
    }
  }

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    details.push(`Excluded-agent adapters removed: ${prunedAdapters.removed.length}`);
  }

  const readmeResult = refreshHarnessReadme(projectRoot);
  if (readmeResult.updated) {
    details.push(`Refreshed ${HARNESS_ROOT}/README.md`);
  }

  p.log.success(`Updated ${skills.length} skill${skills.length === 1 ? '' : 's'}`);
  for (const line of details) {
    p.log.message(line);
  }

  const installed = listInstalledSkillNames(projectRoot);
  if (installed.includes('harness-prepare')) {
    p.note(
      [
        '/harness-prepare',
        '',
        'Builds architecture rules, brownfield context, and AGENTS.md.',
        'Skip only if greenfield (no application code yet).',
      ].join('\n'),
      'Next — run in your AI agent',
    );
  }

  return { skills, skipped: false };
}
