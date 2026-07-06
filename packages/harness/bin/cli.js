#!/usr/bin/env node

import { runInit, printList } from '../src/init.js';

const HELP = `
Usage:
  harness init [options]   Install NextStage skills and scaffold project layout (default)
  harness list             List presets and available skills

Options:
  --dir <path>           Target project directory (default: current)
  --preset <name>        Preset: recommended | gitlab | brownfield | implementation
  --skill <name>         Install specific skill (repeatable)
  --all                  Install every skill in the catalog
  --global, -g           Install skills globally (passed to skills CLI)
  --agent <name>         Target agent (repeatable; passed to skills CLI)
  --copy                 Copy skill files instead of symlinking
  --source <path>        Skills source (default: nextstage-brasil/skills or local repo)
  --yes, -y              Non-interactive; use recommended preset and default scaffold
  --no-scaffold          Skip AGENTS.md and docs/ scaffolding
  --no-agents            Skip agent persona projection (.cursor/agents/, .claude/agents/)
  --dry-run              Show resolved skills without installing
  --help, -h             Show this help

Examples:
  npx @nextstage-brasil/harness
  npx @nextstage-brasil/harness --preset gitlab --yes
  npx @nextstage-brasil/harness --skill execute-gitlab-issue --yes
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
    'no-agents': false,
    'dry-run': false,
    help: false,
  };

  if (args.length === 0) {
    return result;
  }

  const first = args[0];
  if (first === 'list') {
    result.command = 'list';
  } else if (first === 'init') {
    result.command = 'init';
  } else if (first.startsWith('-')) {
    result.command = 'init';
  } else {
    console.error(`Unknown command: ${first}\n\nRun with --help for usage.`);
    process.exit(1);
  }

  let start = 0;
  if (first === 'init' || first === 'list') {
    start = 1;
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

    if (arg === '--no-agents') {
      result['no-agents'] = true;
      continue;
    }

    if (arg === '--dry-run') {
      result['dry-run'] = true;
      continue;
    }

    const valueFlags = ['--dir', '--preset', '--skill', '--agent', '--source'];
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
      i += 1;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  return result;
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

  try {
    await runInit(parsed);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
