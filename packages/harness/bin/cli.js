#!/usr/bin/env node

import { runInit, printList } from '../src/init.js';
import { syncRules } from '../src/syncRules.js';
import { syncSkills } from '../src/syncSkills.js';
import { syncDockerignore } from '../src/syncDockerignore.js';
import { migrateRules } from '../src/migrateRules.js';
import { addRule } from '../src/addRule.js';
import { generateAgentsMd } from '../src/generateAgentsMd.js';
import { DEFAULT_AGENTS, HARNESS_ROOT } from '../src/agentsLayout.js';

const HELP = `
Usage:
  harness init [options]   Install NextStage skills and scaffold project layout (default)
  harness sync [options]   Regenerate rule and skill adapters from canonical sources
  harness add-rule <name>  Create a canonical rule, update manifest, and sync adapters
  harness agents-md        Generate AGENTS.md + CLAUDE.md from installed skills (no AI)
  harness migrate-rules    Import legacy .cursor/rules/*.mdc into .nextstage-harness/
  harness list             List presets and available skills

Options:
  --dir <path>           Target project directory (default: current)
  --preset <name>        Preset: recommended | gitlab | brownfield | implementation
  --skill <name>         Install specific skill (repeatable)
  --all                  Install every skill in the catalog
  --global, -g           Install skills globally (passed to skills CLI)
  --agent <name>         Target agent (repeatable; default: cursor, claude-code)
  --copy                 Copy skill files instead of symlinking
  --source <path>        Skills source (default: nextstage-brasil/skills or local repo)
  --yes, -y              Non-interactive; install all skills and default scaffold
  --no-scaffold          Skip AGENTS.md and docs/ scaffolding
  --check                With sync: verify adapters match canonical (CI mode)
  --force                Overwrite existing files (migrate-rules, agents-md, add-rule)
  --description <text>   With add-rule: short purpose for the rule
  --globs <patterns>     With add-rule: comma-separated globs (skips alwaysApply)
  --dry-run              Show resolved skills without installing
  --help, -h             Show this help

Examples:
  npx @nextstage-brasil/harness
  npx @nextstage-brasil/harness --preset gitlab --yes
  npx @nextstage-brasil/harness sync
  npx @nextstage-brasil/harness sync --check
  npx @nextstage-brasil/harness add-rule api-conventions --description "API conventions"
  npx @nextstage-brasil/harness add-rule frontend --globs "apps/web/**"
  npx @nextstage-brasil/harness agents-md
  npx @nextstage-brasil/harness agents-md --force
  npx @nextstage-brasil/harness list
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: 'init',
    dir: undefined,
    preset: undefined,
    skill: [],
    agent: [],
    global: false,
    copy: false,
    source: undefined,
    yes: false,
    all: false,
    'no-scaffold': false,
    'dry-run': false,
    check: false,
    force: false,
    help: false,
    name: undefined,
    description: undefined,
    globs: undefined,
  };

  if (args.length === 0) {
    return result;
  }

  const knownCommands = [
    'init',
    'list',
    'sync',
    'migrate-rules',
    'agents-md',
    'add-rule',
  ];
  const first = args[0];
  if (knownCommands.includes(first)) {
    result.command = first;
  } else if (first.startsWith('-')) {
    result.command = 'init';
  } else {
    console.error(`Unknown command: ${first}\n\nRun with --help for usage.`);
    process.exit(1);
  }

  let start = knownCommands.includes(first) ? 1 : 0;

  for (let i = start; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      result.yes = true;
      continue;
    }

    if (arg === '--global' || arg === '-g') {
      result.global = true;
      continue;
    }

    if (arg === '--copy') {
      result.copy = true;
      continue;
    }

    if (arg === '--all') {
      result.all = true;
      continue;
    }

    if (arg === '--no-scaffold') {
      result['no-scaffold'] = true;
      continue;
    }

    if (arg === '--dry-run') {
      result['dry-run'] = true;
      continue;
    }

    if (arg === '--check') {
      result.check = true;
      continue;
    }

    if (arg === '--force') {
      result.force = true;
      continue;
    }

    const valueFlags = [
      '--dir',
      '--preset',
      '--skill',
      '--agent',
      '--source',
      '--description',
      '--globs',
    ];
    if (valueFlags.includes(arg)) {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Missing value for ${arg}`);
        process.exit(1);
      }

      if (arg === '--dir') result.dir = value;
      if (arg === '--preset') result.preset = value;
      if (arg === '--skill') result.skill.push(value);
      if (arg === '--agent') result.agent.push(value);
      if (arg === '--source') result.source = value;
      if (arg === '--description') result.description = value;
      if (arg === '--globs') result.globs = value;
      i += 1;
      continue;
    }

    if (result.command === 'add-rule' && !arg.startsWith('-') && !result.name) {
      result.name = arg;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  return result;
}

function resolveProjectDir(argvDir) {
  if (argvDir) return argvDir;
  return process.cwd();
}

async function runSync(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = parsed.agent.length > 0 ? parsed.agent : DEFAULT_AGENTS;
  const rulesResult = syncRules(projectRoot, { agents, check: parsed.check });
  const skillsResult = syncSkills(projectRoot, { agents, check: parsed.check, copy: parsed.copy });
  const dockerignoreResult = parsed.check
    ? { written: [], skipped: [] }
    : syncDockerignore(projectRoot);
  const drifts = [...rulesResult.drifts, ...skillsResult.drifts];

  if (parsed.check) {
    if (drifts.length > 0) {
      console.error('Adapter drift detected:');
      for (const path of drifts) {
        console.error(`  ${path}`);
      }
      process.exit(1);
    }
    console.log('OK: rule and skill adapters match canonical sources');
    return;
  }

  const totalWritten =
    rulesResult.written.length
    + skillsResult.written.length
    + dockerignoreResult.written.length;
  if (totalWritten > 0) {
    console.log(`Synced ${totalWritten} adapter(s)`);
    if (skillsResult.written.length > 0) {
      console.log(`  Skills → ${skillsResult.written.length} path(s)`);
    }
    if (dockerignoreResult.written.length > 0) {
      console.log('  .dockerignore → harness ignore block');
    }
  } else {
    console.log('No adapters written');
  }
}

async function runMigrateRules(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = parsed.agent.length > 0 ? parsed.agent : DEFAULT_AGENTS;
  const result = migrateRules(projectRoot, { force: parsed.force, agents });

  if (result.migrated.length > 0) {
    console.log(`Migrated: ${result.migrated.join(', ')}`);
  }
  if (result.skipped.length > 0) {
    console.log(`Skipped (already exist): ${result.skipped.join(', ')}`);
  }
  console.log(`Synced ${result.syncResult.written.length} adapter file(s)`);
}

async function runAgentsMd(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  const result = generateAgentsMd(projectRoot, { force: parsed.force });

  if (result.skipped) {
    console.log(`Skipped: ${result.reason}`);
    return;
  }

  console.log(`Wrote: ${result.written.join(', ')}`);
  console.log(`Skills (${result.skills.length}): ${result.skills.join(', ')}`);
}

async function runAddRule(parsed) {
  if (!parsed.name) {
    console.error('Usage: harness add-rule <name> [--description <text>] [--globs <patterns>]');
    process.exit(1);
  }

  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = parsed.agent.length > 0 ? parsed.agent : DEFAULT_AGENTS;
  const result = addRule(projectRoot, {
    name: parsed.name,
    description: parsed.description,
    globs: parsed.globs,
    force: parsed.force,
    agents,
  });

  const action = result.overwritten ? 'Overwrote' : 'Created';
  console.log(`${action}: ${result.canonical}`);
  console.log(`Updated: ${HARNESS_ROOT}/manifest.json`);
  console.log(`Synced ${result.syncResult.written.length} adapter file(s)`);
}

async function main() {
  const parsed = parseArgs(process.argv);

  if (parsed.help) {
    console.log(HELP);
    return;
  }

  if (parsed.command === 'list') {
    printList();
    return;
  }

  if (parsed.command === 'sync') {
    try {
      await runSync(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'migrate-rules') {
    try {
      await runMigrateRules(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'agents-md') {
    try {
      await runAgentsMd(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'add-rule') {
    try {
      await runAddRule(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  try {
    await runInit(parsed);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
