import * as p from '@clack/prompts';
import { detectProject } from './detect.js';
import {
  allSkillNames,
  getPreset,
  listCategories,
  listPresets,
  resolveDepends,
} from './catalog.js';
import { installSkills } from './installer.js';
import { scaffoldProject } from './scaffold.js';
import { resolveSource } from './source.js';

export async function runInit(argv = {}) {
  p.intro('NextStage harness');

  const projectDir = await resolveProjectDir(argv.dir);
  const detection = detectProject(projectDir);

  p.log.info(
    detection.kind === 'existing'
      ? 'Existing project detected — manual skill selection starts empty unless you pick a preset.'
      : 'New or empty project — recommended preset is pre-selected when you choose manually.',
  );

  const skills = await resolveSkills(argv, detection);
  if (skills.length === 0) {
    p.cancel('No skills selected.');
    process.exit(1);
  }

  const resolved = resolveDepends(skills);
  p.log.step(`Skills to install (${resolved.length}): ${resolved.join(', ')}`);

  const scaffoldOptions = await resolveScaffoldOptions(argv, detection);
  const installOptions = {
    projectRoot: detection.projectRoot,
    global: Boolean(argv.global),
    agents: argv.agent ?? [],
    copy: Boolean(argv.copy),
    source: argv.source,
  };

  if (argv['dry-run']) {
    p.log.info(`Source: ${resolveSource(argv.source)}`);
    p.log.info('Dry run — no files written, no skills installed.');
    p.outro('Done.');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Installing skills via npx skills add…');

  try {
    installSkills(resolved, installOptions);
    spinner.stop('Skills installed.');
  } catch (error) {
    spinner.stop('Installation failed.');
    p.cancel(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!scaffoldOptions.skip) {
    const result = scaffoldProject(detection.projectRoot, scaffoldOptions);
    if (result.created.length > 0) {
      p.log.success(`Created: ${result.created.join(', ')}`);
    }
    if (result.skipped.length > 0) {
      p.log.warn(`Skipped (already exist): ${result.skipped.join(', ')}`);
    }
  }

  p.note(
    [
      'Typical SDD chain:',
      'clarify-requirements → requirements-generator → analyze-consistency',
      '→ task-generator → coder / execute-gitlab-issue → code-reviewer',
      '→ living-spec-consolidator',
      '',
      'List installed skills: npx skills list',
    ].join('\n'),
    'Next steps',
  );

  p.outro('NextStage harness ready.');
}

async function resolveProjectDir(argvDir) {
  if (argvDir) return argvDir;

  if (!process.stdin.isTTY) {
    return process.cwd();
  }

  const dir = await p.text({
    message: 'Project directory',
    placeholder: process.cwd(),
    defaultValue: process.cwd(),
  });

  if (p.isCancel(dir)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  return dir || process.cwd();
}

async function resolveSkills(argv, detection) {
  if (argv.all) {
    return allSkillNames();
  }

  if (argv.preset) {
    const preset = getPreset(argv.preset);
    if (!preset) {
      throw new Error(`Unknown preset: ${argv.preset}`);
    }
    return preset.skills;
  }

  if (argv.skill?.length) {
    return resolveDepends(argv.skill);
  }

  if (!process.stdin.isTTY || argv.yes) {
    return getPreset('recommended')?.skills ?? ['nextstage-harness'];
  }

  const mode = await p.select({
    message: 'What do you want to install?',
    options: [
      { value: 'recommended', label: 'Recommended SDD chain', hint: 'planning + test generators' },
      { value: 'gitlab', label: 'GitLab execution', hint: 'MCP + review + issue flow' },
      { value: 'brownfield', label: 'Brownfield onboarding' },
      { value: 'implementation', label: 'Implementation & quality' },
      { value: 'all', label: 'All skills' },
      { value: 'manual', label: 'Choose manually' },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  if (mode === 'all') {
    return allSkillNames();
  }

  if (mode !== 'manual') {
    return getPreset(mode)?.skills ?? [];
  }

  return selectSkillsManually(detection);
}

async function selectSkillsManually(detection) {
  const categories = listCategories();
  const selected = new Set(
    detection.kind === 'new' ? ['nextstage-harness'] : [],
  );

  for (const category of categories) {
    const options = category.skills.map((skill) => ({
      value: skill,
      label: skill,
    }));

    const picked = await p.multiselect({
      message: category.label,
      options,
      required: false,
      initialValues: [...selected].filter((skill) => category.skills.includes(skill)),
    });

    if (p.isCancel(picked)) {
      p.cancel('Init cancelled.');
      process.exit(0);
    }

    for (const skill of picked) {
      selected.add(skill);
    }
  }

  return resolveDepends([...selected]);
}

async function resolveScaffoldOptions(argv, detection) {
  if (argv['no-scaffold']) {
    return { skip: true };
  }

  if (argv.yes) {
    return {
      skip: false,
      agents: !detection.signals.hasAgents,
      docs: !detection.signals.hasDocsVersions,
      force: false,
    };
  }

  if (!process.stdin.isTTY) {
    return { skip: false, agents: true, docs: true, force: false };
  }

  const scaffold = await p.confirm({
    message: 'Scaffold AGENTS.md and docs/ layout?',
    initialValue: true,
  });

  if (p.isCancel(scaffold)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  if (!scaffold) {
    return { skip: true };
  }

  const force = detection.signals.hasAgents
    ? await p.confirm({
        message: 'AGENTS.md already exists. Overwrite?',
        initialValue: false,
      })
    : false;

  if (p.isCancel(force)) {
    p.cancel('Init cancelled.');
    process.exit(0);
  }

  return {
    skip: false,
    agents: true,
    docs: true,
    force: Boolean(force),
  };
}

export function printList() {
  p.intro('NextStage skill catalog');

  for (const preset of listPresets()) {
    p.log.info(`${preset.id} — ${preset.label}`);
    p.log.message(preset.skills.join(', '));
  }

  p.log.step('All skills');
  p.log.message(allSkillNames().join(', '));
  p.outro('Run: npx @nextstage-brasil/harness');
}
