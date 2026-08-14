import { existsSync } from 'node:fs';
import * as p from '@clack/prompts';
import { detectProject, isHarnessInstalled } from './detect.js';
import {
  allSkillNames,
  alwaysInstallSkills,
  getPreset,
  listCategories,
  listPresets,
  assertPresetHarnessCompatible,
  warnMissingDepends,
} from './catalog.js';
import { installSkillCreator, installSkills, installExternalSkills } from './installer.js';
import {
  getExternalPreset,
  isExternalSkill,
  listExternalPresets,
  listExternalStacks,
  resolveInstallPlan,
} from './externalSkills.js';
import { scaffoldProject } from './scaffold.js';
import { resolveSource } from './source.js';
import { syncRules } from './syncRules.js';
import { syncSkills } from './syncSkills.js';
import { syncSubagents } from './syncSubagents.js';
import { syncDockerignore } from './syncDockerignore.js';
import { syncGitignore } from './syncGitignore.js';
import { generateAgentsMd } from './generateAgentsMd.js';
import { buildPostInstallNotes } from './postInstallNotes.js';
import { pruneRetiredSkills } from './pruneRetiredSkills.js';
import { normalizeAgentIds } from './agentIds.js';
import { resolveAgentsConfig, HARNESS_ROOT } from './agentsLayout.js';
import { writeManifestAgents, manifestPath } from './manifest.js';
import { refreshHarnessReadme } from './refreshHarnessReadme.js';
import { logResolvedAgents } from './logResolvedAgents.js';
import { pruneExcludedAgentAdapters } from './pruneExcludedAgentAdapters.js';
import { resolveRepoRoot, listPresetDocuments } from './presets.js';
import { discoverSkillsWithDomain } from './resolveSkillPath.js';
import { join } from 'node:path';

export async function runInit(argv = {}) {
  p.intro('NextStage harness');

  const projectDir = await resolveProjectDir(argv.dir);
  const detection = detectProject(projectDir);

  p.log.info(
    detection.kind === 'existing'
      ? 'Existing project detected — manual skill selection starts empty unless you pick a preset.'
      : 'New or empty project — all skills are pre-selected by default.',
  );

  const plan = await resolveInstallPlanFromArgv(argv, detection);
  if (plan.nsSkills.length === 0 && plan.externalSkills.length === 0) {
    p.cancel('No skills selected.');
    process.exit(1);
  }

  if (plan.presetWarnings?.length) {
    for (const warning of plan.presetWarnings) {
      p.log.warn(warning);
    }
  }

  if (plan.dependsWarnings?.length && !argv['dry-run']) {
    for (const warning of plan.dependsWarnings) {
      p.log.warn(warning);
    }
  }

  const skillSummary = [
    plan.nsSkills.length > 0 ? `NextStage (${plan.nsSkills.length}): ${plan.nsSkills.join(', ')}` : null,
    plan.externalSkills.length > 0 ? `External (${plan.externalSkills.length}): ${plan.externalSkills.join(', ')}` : null,
  ].filter(Boolean).join('\n');
  p.log.step(skillSummary);

  const scaffoldOptions = resolveScaffoldOptions(argv);
  const agentFlags = argv.agent ?? [];
  const { agents } = agentFlags.length > 0
    ? { agents: normalizeAgentIds(agentFlags) }
    : resolveAgentsConfig(detection.projectRoot, []);
  const installOptions = {
    projectRoot: detection.projectRoot,
    global: Boolean(argv.global),
    agents,
    copy: Boolean(argv.copy),
    source: argv.source,
  };

  const resolvedSource = resolveSource(argv.source);

  if (argv['dry-run']) {
    p.log.info(`Source: ${resolvedSource}`);
    if (plan.presetIncludes?.length) {
      p.log.info(`Preset includes (${plan.presetIncludes.length}): ${plan.presetIncludes.join(', ')}`);
    }
    if (plan.externalSkills.length > 0) {
      p.log.info(`External skills: ${plan.externalSkills.join(', ')}`);
    }
    p.log.info(`Agents: ${agents.join(', ')}`);
    if (agentFlags.length === 0) {
      logResolvedAgents(detection.projectRoot, []);
    }
    p.log.info('Skill adapters → .claude/skills/ when Claude Code is targeted; Cursor reads `.agents/skills/` directly');
    p.log.info('Dry run — no files written, no skills installed.');
    p.outro('Done.');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Installing skills via npx skills add…');

  try {
    if (plan.nsSkills.length > 0) {
      installSkills(plan.nsSkills, installOptions);
    }
    if (plan.installSkillCreator) {
      spinner.message('Installing skill-creator (anthropics/skills)…');
      installSkillCreator(installOptions);
    }
    if (plan.externalSkills.length > 0) {
      spinner.message(`Installing external skills: ${plan.externalSkills.join(', ')}…`);
      installExternalSkills(plan.externalSkills, installOptions);
    }
    spinner.stop('Skills installed.');
  } catch (error) {
    spinner.stop('Installation failed.');
    p.cancel(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  try {
    const pruneResult = pruneRetiredSkills(detection.projectRoot, { agents });
    if (pruneResult.removed.length > 0) {
      const names = pruneResult.removable.map((entry) => entry.oldName).join(', ');
      p.log.success(`Removed retired skills: ${names}`);
    }
    if (pruneResult.skipped.length > 0) {
      const names = pruneResult.skipped.map((entry) => entry.oldName).join(', ');
      p.log.warn(`Retired skills kept (replacement missing): ${names}`);
    }
  } catch (error) {
    p.log.warn(error instanceof Error ? error.message : String(error));
  }

  try {
    const skillsSyncResult = syncSkills(detection.projectRoot, {
      agents,
      copy: Boolean(argv.copy),
    });
    if (skillsSyncResult.written.length > 0) {
      p.log.success(`Skill adapters: ${skillsSyncResult.written.length} symlink(s)`);
    }
  } catch (error) {
    p.log.warn(error instanceof Error ? error.message : String(error));
  }

  try {
    const prunedAdapters = pruneExcludedAgentAdapters(detection.projectRoot, agents);
    if (prunedAdapters.removed.length > 0) {
      p.log.success(`Removed adapters for excluded agents: ${prunedAdapters.removed.length} path(s)`);
    }
  } catch (error) {
    p.log.warn(error instanceof Error ? error.message : String(error));
  }

  let scaffoldRan = false;
  if (!scaffoldOptions.skip) {
    const result = scaffoldProject(detection.projectRoot, scaffoldOptions);
    scaffoldRan = result.created.length > 0;
    if (result.created.length > 0) {
      p.log.success(`Created: ${result.created.join(', ')}`);
    }
    if (result.skipped.length > 0) {
      p.log.warn(`Skipped (already exist): ${result.skipped.join(', ')}`);
    }

    try {
      const syncResult = syncRules(detection.projectRoot, { agents });
      if (syncResult.written.length > 0) {
        p.log.success(`Synced rule adapters: ${syncResult.written.length} file(s)`);
      }
    } catch (error) {
      p.log.warn(
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const subagentsResult = syncSubagents(detection.projectRoot, { agents });
      if (subagentsResult.seeded.length > 0) {
        p.log.success(`Seeded subagents: ${subagentsResult.seeded.join(', ')}`);
      }
      if (subagentsResult.written.length > 0) {
        p.log.success(`Synced subagent adapters: ${subagentsResult.written.length} file(s)`);
      }
    } catch (error) {
      p.log.warn(
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const dockerignoreResult = syncDockerignore(detection.projectRoot);
      if (dockerignoreResult.written.length > 0) {
        p.log.success('Ensured .dockerignore has harness ignore paths');
      }
    } catch (error) {
      p.log.warn(error instanceof Error ? error.message : String(error));
    }

    try {
      const gitignoreResult = syncGitignore(detection.projectRoot);
      if (gitignoreResult.written.length > 0) {
        p.log.success('Updated .gitignore with harness ignore paths');
      }
    } catch (error) {
      p.log.warn(error instanceof Error ? error.message : String(error));
    }
  }

  if (!scaffoldOptions.skip) {
    try {
      const agentsMdResult = generateAgentsMd(detection.projectRoot, { force: false });
      if (agentsMdResult.skipped) {
        p.log.info(agentsMdResult.reason);
      } else {
        p.log.success(`Generated: ${agentsMdResult.written.join(', ')}`);
      }
    } catch (error) {
      p.log.warn(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    if (existsSync(manifestPath(detection.projectRoot))) {
      writeManifestAgents(detection.projectRoot, agents);
    }
  } catch (error) {
    p.log.warn(error instanceof Error ? error.message : String(error));
  }

  try {
    const readmeResult = refreshHarnessReadme(detection.projectRoot);
    if (readmeResult.updated) {
      p.log.success(`Updated: ${HARNESS_ROOT}/README.md`);
    }
  } catch (error) {
    p.log.warn(error instanceof Error ? error.message : String(error));
  }

  p.note(
    buildPostInstallNotes({
      preset: argv.preset,
      installedSkills: plan.nsSkills,
      projectRoot: detection.projectRoot,
      scaffoldRan,
      noScaffold: Boolean(scaffoldOptions.skip),
    }),
    'Next steps',
  );

  p.outro('NextStage harness ready.');
}

async function resolveProjectDir(argvDir) {
  if (argvDir) return argvDir;

  const cwd = process.cwd();
  if (!process.stdin.isTTY) {
    return cwd;
  }

  if (isHarnessInstalled(cwd)) {
    p.log.info(`Using ${cwd} (harness already installed)`);
    return cwd;
  }

  const dir = await p.text({
    message: 'Project directory',
    placeholder: cwd,
    defaultValue: cwd,
  });

  if (p.isCancel(dir)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  return dir || cwd;
}

async function resolveInstallPlanFromArgv(argv, detection) {
  if (argv.all) {
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds: allSkillNames() }), {
      installSkillCreator: true,
    });
  }

  if (argv.preset) {
    const externalPreset = getExternalPreset(argv.preset);
    if (externalPreset) {
      return wrapInstallPlan(resolveInstallPlan({
        nsSkillIds: externalPreset.nsSkills,
        externalSkillIds: externalPreset.skills,
      }));
    }

    const preset = getPreset(argv.preset);
    if (!preset) {
      throw new Error(`Unknown preset: ${argv.preset}`);
    }
    assertPresetHarnessCompatible(preset.requires_harness);
    const dependsWarnings = warnMissingDepends(preset.skills);
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds: preset.skills }), {
      presetIncludes: preset.includes,
      presetWarnings: preset.warnings,
      dependsWarnings,
      installSkillCreator: preset.name === 'full',
    });
  }

  if (argv.skill?.length) {
    const nsSkillIds = [];
    const externalSkillIds = [];
    for (const skill of argv.skill) {
      if (isExternalSkill(skill)) {
        externalSkillIds.push(skill);
      } else {
        nsSkillIds.push(skill);
      }
    }
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds, externalSkillIds }));
  }

  if (!process.stdin.isTTY || argv.yes) {
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds: allSkillNames() }), {
      installSkillCreator: true,
    });
  }

  const mode = await p.select({
    message: 'What do you want to install?',
    initialValue: 'spec-driven',
    options: [
      ...listPresetDocuments(resolveRepoRoot()).map((doc) => ({
        value: doc.name,
        label: `${doc.name} (${doc.description})`,
      })),
      { value: 'all', label: 'All NextStage skills', hint: 'excludes Agents API external skills' },
      ...listExternalPresets().map((preset) => ({
        value: `external:${preset.id}`,
        label: `${preset.id} (${preset.description})`,
      })),
      { value: 'manual', label: 'Choose manually' },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  if (mode === 'all') {
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds: allSkillNames() }), {
      installSkillCreator: true,
    });
  }

  if (mode.startsWith('external:')) {
    const preset = getExternalPreset(mode.slice('external:'.length));
    return wrapInstallPlan(resolveInstallPlan({
      nsSkillIds: preset?.nsSkills ?? ['ns-harness'],
      externalSkillIds: preset?.skills ?? [],
    }));
  }

  if (mode !== 'manual') {
    const preset = getPreset(mode);
    assertPresetHarnessCompatible(preset?.requires_harness);
    return wrapInstallPlan(resolveInstallPlan({ nsSkillIds: preset?.skills ?? [] }), {
      presetIncludes: preset?.includes ?? [],
      presetWarnings: preset?.warnings ?? [],
      dependsWarnings: warnMissingDepends(preset?.skills ?? []),
      installSkillCreator: preset?.name === 'full',
    });
  }

  return selectSkillsManually(detection);
}

function wrapInstallPlan(plan, extras = {}) {
  return {
    ...plan,
    presetIncludes: extras.presetIncludes ?? [],
    presetWarnings: extras.presetWarnings ?? [],
    dependsWarnings: extras.dependsWarnings ?? [],
    installSkillCreator: extras.installSkillCreator ?? false,
  };
}

async function selectSkillsManually(detection) {
  const categories = listCategories();
  const selectedNs = new Set(
    detection.kind === 'new' ? alwaysInstallSkills() : [],
  );
  const selectedExternal = new Set();

  for (const category of categories) {
    const options = category.skills.map((skill) => ({
      value: skill,
      label: skill,
    }));

    const picked = await p.multiselect({
      message: category.label,
      options,
      required: false,
      initialValues: [...selectedNs].filter((skill) => category.skills.includes(skill)),
    });

    if (p.isCancel(picked)) {
      p.cancel('Init cancelled.');
      process.exit(0);
    }

    for (const skill of picked) {
      selectedNs.add(skill);
    }
  }

  for (const stack of listExternalStacks()) {
    const options = stack.skills.map((skill) => ({
      value: skill.id,
      label: `${skill.id} (${skill.label})`,
    }));

    const picked = await p.multiselect({
      message: `${stack.label} — external`,
      options,
      required: false,
      initialValues: [...selectedExternal].filter((skillId) => stack.skills.some((skill) => skill.id === skillId)),
    });

    if (p.isCancel(picked)) {
      p.cancel('Init cancelled.');
      process.exit(0);
    }

    for (const skillId of picked) {
      selectedExternal.add(skillId);
    }
  }

  return wrapInstallPlan(resolveInstallPlan({
    nsSkillIds: [...selectedNs],
    externalSkillIds: [...selectedExternal],
  }));
}

function resolveScaffoldOptions(argv) {
  if (argv['no-scaffold']) {
    return { skip: true };
  }

  return {
    skip: false,
    agents: true,
    docs: true,
    force: false,
  };
}

export function printList(options = {}) {
  const hasFilter = Boolean(options.presets || options.skills || options.domain);
  const showPresets = Boolean(options.presets || !hasFilter);
  const showSkills = Boolean(options.skills || options.domain || !hasFilter);
  const domainFilter = options.domain;

  p.intro('NextStage skill catalog');

  if (showPresets) {
    p.log.step('Presets (presets/index.json)');
    for (const preset of listPresets()) {
      p.log.info(`${preset.id} — ${preset.label ?? preset.description}`);
      if (preset.includes?.length) {
        p.log.message(`includes: ${preset.includes.join(', ')}`);
      }
      p.log.message(`resolved (${preset.skills.length}): ${preset.skills.join(', ')}`);
    }

    p.log.step('External presets (opt-in)');
    for (const preset of listExternalPresets()) {
      p.log.info(`${preset.id} — ${preset.label}`);
      p.log.message(`NS: ${preset.nsSkills.join(', ')}`);
      p.log.message(`External: ${preset.skills.join(', ')}`);
    }
  }

  if (showSkills) {
    const repoRoot = resolveRepoRoot();
    const skills = discoverSkillsWithDomain(join(repoRoot, 'skills')).filter((skill) => {
      if (!domainFilter) return true;
      return skill.domain === domainFilter || (domainFilter === 'root' && skill.domain === null);
    });

    p.log.step(domainFilter ? `Skills (${domainFilter}/)` : 'Skills (skills/)');
    for (const skill of skills) {
      p.log.message(`${skill.path} → ${skill.id}`);
    }
  }

  if (showPresets) {
    const presetIds = [
      ...listPresets().map((preset) => preset.id),
      ...listExternalPresets().map((preset) => preset.id),
    ].join(' | ');

    p.note(
      [
        `Presets: ${presetIds}`,
        '',
        'Install a preset (skills + dependencies + scaffold):',
        '  npx @nextstage-brasil/harness --preset spec-driven --yes',
        '  npx @nextstage-brasil/harness --preset gitlab --yes',
        '  npx @nextstage-brasil/harness --preset agent-creator --yes',
        '  npx @nextstage-brasil/harness --preset frontend-prototype --yes',
        '  npx @nextstage-brasil/harness --preset agents-api --yes',
        '',
        'Install one skill only (no scaffold):',
        '  npx @nextstage-brasil/harness --skill ns-gitlab-board-sync --no-scaffold -y',
        '',
        'Preview what a preset would install:',
        '  npx @nextstage-brasil/harness --preset gitlab --dry-run',
        '',
        'Refresh skills already in the project:',
        '  npx @nextstage-brasil/harness update',
        '',
        'Project agents (stored in .nextstage-harness/manifest.json):',
        '  npx @nextstage-brasil/harness agents',
        '  npx @nextstage-brasil/harness agents set --agent cursor',
      ].join('\n'),
      'Install',
    );
  }

  p.outro('Interactive wizard: npx @nextstage-brasil/harness');
}
