#!/usr/bin/env node

import { runInit, printList } from '../src/init.js';
import { syncRules } from '../src/syncRules.js';
import { syncSkills } from '../src/syncSkills.js';
import { syncSubagents } from '../src/syncSubagents.js';
import { syncDockerignore } from '../src/syncDockerignore.js';
import { syncGitignore } from '../src/syncGitignore.js';
import { addRule } from '../src/addRule.js';
import { addSubagent } from '../src/addSubagent.js';
import { generateAgentsMd } from '../src/generateAgentsMd.js';
import { runPrepare } from '../src/prepare.js';
import { pruneRetiredSkills, formatPruneReport } from '../src/pruneRetiredSkills.js';
import { runUpdate } from '../src/update.js';
import { runAgentsShow, runAgentsSet } from '../src/projectAgents.js';
import { logResolvedAgents } from '../src/logResolvedAgents.js';
import { pruneExcludedAgentAdapters } from '../src/pruneExcludedAgentAdapters.js';
import { HARNESS_ROOT, resolveAgents } from '../src/agentsLayout.js';
import { refreshHarnessReadme } from '../src/refreshHarnessReadme.js';
import { runUninstallCommand } from '../src/uninstall.js';

const HELP = `
Usage:
  harness init [options]   Install NextStage skills and scaffold project layout (default)
  harness prepare          Print full brownfield prepare instructions (/ns-harness-prepare)
  harness sync [options]   Absorb orphan .cursor/rules/*.mdc, then regenerate adapters
  harness add-rule <name>  Create a canonical rule, update manifest, and sync adapters
  harness add-subagent <name>  Create a canonical subagent bridge, update manifest, and sync
  harness agents-md        Generate AGENTS.md + CLAUDE.md from installed skills (no AI)
  harness prune-retired-skills  Remove renamed skill dirs after replacement is installed
  harness update [options] Update installed skills only (does not install new ones)
  harness uninstall [options]  Remove harness install (skills, adapters, scaffold)
  harness agents [set]   Show or set project agents (.nextstage-harness/manifest.json)
  harness list             List presets and available skills

Options:
  --dir <path>           Target project directory (default: current)
  --preset <name>        Preset: spec-driven | spec-driven-gitlab | project-manager | brownfield | full | agents-api | coder-langgraph
  --skill <name>         Install specific skill (repeatable)
  --all                  Install every skill in the catalog
  --global, -g           Install skills globally (passed to skills CLI)
  --agent <name>         Target agent (repeatable; default from manifest or cursor + claude-code)
  --copy                 Copy skill files instead of symlinking
  --source <path>        Skills source (default: nextstage-brasil/skills or local repo)
  --yes, -y              Non-interactive; install all skills and default scaffold
  --no-scaffold          Skip AGENTS.md and docs/ scaffolding
  --keep-agents-md       With uninstall: keep AGENTS.md and CLAUDE.md
  --check                With sync: verify adapters match canonical (CI mode)
  --force                Overwrite existing files (agents-md, add-rule, add-subagent)
  --description <text>   With add-rule / add-subagent: short purpose text (add-rule: Cursor "when to apply")
  --globs <patterns>     With add-rule: comma-separated globs (path-scoped; --description still required)
  --always-apply         With add-rule: set alwaysApply true (default false — agent-requested)
  --dry-run              Show resolved skills without installing
  --help, -h             Show this help

Examples:
  npx @nextstage-brasil/harness
  npx @nextstage-brasil/harness --preset spec-driven --yes
  npx @nextstage-brasil/harness --preset spec-driven-gitlab --yes
  npx @nextstage-brasil/harness --preset agents-api --yes
  npx @nextstage-brasil/harness --preset coder-langgraph --yes
  npx @nextstage-brasil/harness sync
  npx @nextstage-brasil/harness sync --check
  npx @nextstage-brasil/harness add-rule api-conventions --description "API conventions"
  npx @nextstage-brasil/harness add-rule frontend --globs "apps/web/**"
  npx @nextstage-brasil/harness add-subagent investigator-agent --skill ns-code-investigator --description "Investigation bridge"
  npx @nextstage-brasil/harness agents-md
  npx @nextstage-brasil/harness agents-md --force
  npx @nextstage-brasil/harness prepare
  npx @nextstage-brasil/harness prune-retired-skills --dry-run
  npx @nextstage-brasil/harness update
  npx @nextstage-brasil/harness update --dry-run
  npx @nextstage-brasil/harness uninstall --dry-run
  npx @nextstage-brasil/harness uninstall --yes
  npx @nextstage-brasil/harness agents
  npx @nextstage-brasil/harness agents set --agent cursor
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
    'always-apply': false,
    'keep-agents-md': false,
    subcommand: undefined,
    positional: [],
  };

  if (args.length === 0) {
    return result;
  }

  const knownCommands = [
    'init',
    'list',
    'sync',
    'prune-retired-skills',
    'agents-md',
    'add-rule',
    'add-subagent',
    'prepare',
    'update',
    'uninstall',
    'agents',
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

  if (result.command === 'agents' && args[start] === 'set') {
    result.subcommand = 'set';
    start += 1;
  }

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

    if (arg === '--always-apply') {
      result['always-apply'] = true;
      continue;
    }

    if (arg === '--keep-agents-md') {
      result['keep-agents-md'] = true;
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

    if (result.command === 'add-subagent' && !arg.startsWith('-') && !result.name) {
      result.name = arg;
      continue;
    }

    if (result.command === 'agents' && result.subcommand === 'set' && !arg.startsWith('-')) {
      result.positional.push(arg);
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
  logResolvedAgents(projectRoot, parsed.agent);
  const agents = resolveAgents(projectRoot, parsed.agent);
  const rulesResult = syncRules(projectRoot, { agents, check: parsed.check });
  const skillsResult = syncSkills(projectRoot, { agents, check: parsed.check, copy: parsed.copy });
  const subagentsResult = syncSubagents(projectRoot, { agents, check: parsed.check });
  const dockerignoreResult = parsed.check
    ? { written: [], skipped: [] }
    : syncDockerignore(projectRoot);
  const gitignoreResult = parsed.check
    ? { written: [], skipped: [] }
    : syncGitignore(projectRoot);
  const drifts = [
    ...rulesResult.drifts,
    ...skillsResult.drifts,
    ...subagentsResult.drifts,
  ];

  if (parsed.check) {
    if (drifts.length > 0) {
      console.error('Adapter drift detected:');
      for (const path of drifts) {
        console.error(`  ${path}`);
      }
      process.exit(1);
    }
    console.log('OK: rule, skill, and subagent adapters match canonical sources');
    return;
  }

  if (rulesResult.absorbed?.length > 0) {
    console.log(
      `Absorbed ${rulesResult.absorbed.length} orphan Cursor rule(s): ${rulesResult.absorbed.join(', ')}`,
    );
  }

  const totalWritten =
    rulesResult.written.length
    + skillsResult.written.length
    + subagentsResult.written.length
    + dockerignoreResult.written.length
    + gitignoreResult.written.length;
  if (totalWritten > 0) {
    console.log(`Synced ${totalWritten} adapter(s)`);
    if (skillsResult.written.length > 0) {
      console.log(`  Skills → ${skillsResult.written.length} path(s)`);
    }
    if (subagentsResult.written.length > 0) {
      console.log(`  Subagents → ${subagentsResult.written.length} path(s)`);
    }
    if (subagentsResult.seeded?.length > 0) {
      console.log(`  Subagents seeded in manifest: ${subagentsResult.seeded.join(', ')}`);
    }
    if (dockerignoreResult.written.length > 0) {
      console.log('  .dockerignore → harness ignore block');
    }
    if (gitignoreResult.written.length > 0) {
      console.log('  .gitignore → harness ignore block');
    }
  } else {
    console.log('No adapters written');
  }

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    console.log(`Removed ${prunedAdapters.removed.length} adapter path(s) for excluded agents`);
  }

  if (!parsed.check) {
    const readmeResult = refreshHarnessReadme(projectRoot);
    if (readmeResult.updated) {
      console.log(`Updated: ${HARNESS_ROOT}/README.md`);
    }
  }
}

async function runPrepareCmd(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  const result = runPrepare(projectRoot);
  console.log(result.message);
  if (!result.assessment.ready) {
    process.exit(1);
  }
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

async function runAddSubagent(parsed) {
  if (!parsed.name) {
    console.error(
      'Usage: harness add-subagent <name> --skill <skill-id> [--description <text>]',
    );
    process.exit(1);
  }
  if (parsed.skill.length !== 1) {
    console.error('add-subagent requires exactly one --skill <skill-id>');
    process.exit(1);
  }

  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = resolveAgents(projectRoot, parsed.agent);
  const result = addSubagent(projectRoot, {
    name: parsed.name,
    skill: parsed.skill[0],
    description: parsed.description,
    force: parsed.force,
    agents,
  });

  const action = result.overwritten ? 'Overwrote' : 'Created';
  console.log(`${action}: ${result.canonical}`);
  console.log(`Updated: ${HARNESS_ROOT}/manifest.json`);
  console.log(`Synced ${result.syncResult.written.length} adapter file(s)`);

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    console.log(`Removed ${prunedAdapters.removed.length} adapter path(s) for excluded agents`);
  }
}

async function runAddRule(parsed) {
  if (!parsed.name) {
    console.error(
      'Usage: harness add-rule <name> --description <text> [--globs <patterns>] [--always-apply]',
    );
    process.exit(1);
  }
  if (!parsed.description || !String(parsed.description).trim()) {
    console.error(
      'add-rule requires --description (Cursor "when to apply" header)',
    );
    process.exit(1);
  }

  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = resolveAgents(projectRoot, parsed.agent);
  const result = addRule(projectRoot, {
    name: parsed.name,
    description: parsed.description,
    globs: parsed.globs,
    alwaysApply: parsed['always-apply'] === true,
    force: parsed.force,
    agents,
  });

  const action = result.overwritten ? 'Overwrote' : 'Created';
  console.log(`${action}: ${result.canonical}`);
  console.log(`Updated: ${HARNESS_ROOT}/manifest.json`);
  console.log(`Synced ${result.syncResult.written.length} adapter file(s)`);

  const prunedAdapters = pruneExcludedAgentAdapters(projectRoot, agents);
  if (prunedAdapters.removed.length > 0) {
    console.log(`Removed ${prunedAdapters.removed.length} adapter path(s) for excluded agents`);
  }
}

async function runPruneRetiredSkills(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  const agents = resolveAgents(projectRoot, parsed.agent);
  const result = pruneRetiredSkills(projectRoot, {
    dryRun: Boolean(parsed['dry-run']),
    agents,
  });
  console.log(formatPruneReport(result));
}

async function runUninstallCmd(parsed) {
  const projectRoot = resolveProjectDir(parsed.dir);
  await runUninstallCommand(projectRoot, {
    dryRun: Boolean(parsed['dry-run']),
    yes: Boolean(parsed.yes),
    keepAgentsMd: Boolean(parsed['keep-agents-md']),
  });
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

  if (parsed.command === 'agents-md') {
    try {
      await runAgentsMd(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'prepare') {
    try {
      await runPrepareCmd(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'prune-retired-skills') {
    try {
      await runPruneRetiredSkills(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'add-subagent') {
    try {
      await runAddSubagent(parsed);
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

  if (parsed.command === 'update') {
    try {
      await runUpdate(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'uninstall') {
    try {
      await runUninstallCmd(parsed);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }

  if (parsed.command === 'agents') {
    try {
      const projectRoot = resolveProjectDir(parsed.dir);
      if (parsed.subcommand === 'set') {
        const agentIds = parsed.agent.length > 0 ? parsed.agent : parsed.positional;
        runAgentsSet(projectRoot, agentIds, { copy: parsed.copy });
      } else {
        runAgentsShow(projectRoot, { agent: parsed.agent });
      }
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
