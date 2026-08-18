import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { listInstalledSkillNames } from './prepare.js';
import { installSkills, updateInstalledSkills } from './installer.js';
import { pruneRetiredSkills } from './pruneRetiredSkills.js';
import { syncSkills } from './syncSkills.js';
import { syncRules } from './syncRules.js';
import { syncSubagents } from './syncSubagents.js';
import { syncClaudeMd } from './syncClaudeMd.js';
import { pruneExcludedAgentAdapters } from './pruneExcludedAgentAdapters.js';
import { HARNESS_ROOT, resolveAgents } from './agentsLayout.js';
import { logResolvedAgents } from './logResolvedAgents.js';
import { refreshHarnessReadme } from './refreshHarnessReadme.js';
import { planSkillUpdates } from './skillUpdateDiff.js';

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

  const diff = await planSkillUpdates(projectRoot, skills, {
    force: Boolean(argv.force),
    source: argv.source,
  });

  if (argv['dry-run']) {
    p.log.info(
      `Would update ${diff.toUpdate.length} skill(s)`
      + (diff.upToDate.length > 0 ? `; ${diff.upToDate.length} already up to date` : ''),
    );
    if (diff.toUpdate.length > 0) {
      p.log.message(`Update: ${diff.toUpdate.join(', ')}`);
    }
    if (diff.upToDate.length > 0) {
      p.log.message(`Up to date: ${diff.upToDate.join(', ')}`);
    }
    if (diff.unchecked.length > 0 && diff.toUpdate.length > 0) {
      const uncheckedNames = diff.unchecked.map((entry) => entry.name);
      p.log.message(`No baseline hash (will refresh): ${uncheckedNames.join(', ')}`);
    }
    return { skills: diff.toUpdate, upToDate: diff.upToDate, dryRun: true };
  }

  if (diff.upToDate.length > 0) {
    p.log.info(`${diff.upToDate.length} skill(s) already up to date`);
  }

  if (diff.toUpdate.length === 0) {
    p.log.success('All installed skills are up to date');
    const pruneOnly = pruneRetiredSkills(projectRoot, { agents });
    if (pruneOnly.removed.length > 0) {
      p.log.message(`Retired skills removed: ${pruneOnly.removable.map((e) => e.oldName).join(', ')}`);
    }
    return { skills: [], upToDate: diff.upToDate, skipped: false };
  }

  const installOptions = {
    projectRoot,
    global: Boolean(argv.global),
    agents,
    copy: Boolean(argv.copy),
    source: argv.source,
  };

  if (diff.toUpdate.length > 0) {
    updateInstalledSkills(diff.toUpdate, installOptions);
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
    const subagentsSync = syncSubagents(projectRoot, { agents });
    if (subagentsSync.seeded.length > 0) {
      details.push(`Subagents seeded: ${subagentsSync.seeded.join(', ')}`);
    }
    if (subagentsSync.written.length > 0) {
      details.push(`Subagent adapters synced: ${subagentsSync.written.length}`);
    }
  }

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    details.push(`Excluded-agent adapters removed: ${prunedAdapters.removed.length}`);
  }

  const claudeMd = syncClaudeMd(projectRoot, { agents });
  if (claudeMd.written.length > 0) {
    details.push('Created CLAUDE.md (Claude Code boot stub)');
  }

  const readmeResult = refreshHarnessReadme(projectRoot);
  if (readmeResult.updated) {
    details.push(`Refreshed ${HARNESS_ROOT}/README.md`);
  }

  p.log.success(
    `Updated ${diff.toUpdate.length} skill${diff.toUpdate.length === 1 ? '' : 's'}`
    + (diff.upToDate.length > 0 ? ` (${diff.upToDate.length} unchanged)` : ''),
  );
  for (const line of details) {
    p.log.message(line);
  }

  const installed = listInstalledSkillNames(projectRoot);
  if (installed.includes('ns-harness')) {
    p.note(
      [
        '/ns-harness prepare this repo',
        '',
        'Builds architecture rules, brownfield context, and AGENTS.md.',
        'Skip only if greenfield (no application code yet).',
      ].join('\n'),
      'Next — run in your AI agent',
    );
  }

  return { skills: diff.toUpdate, upToDate: diff.upToDate, skipped: false };
}
