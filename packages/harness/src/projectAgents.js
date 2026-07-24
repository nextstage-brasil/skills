import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_AGENTS,
  HARNESS_ROOT,
  resolveAgents,
  resolveAgentsConfig,
} from './agentsLayout.js';
import { KNOWN_AGENT_IDS } from './agentIds.js';
import {
  readManifestAgents,
  writeManifestAgents,
} from './manifest.js';
import { pruneExcludedAgentAdapters } from './pruneExcludedAgentAdapters.js';
import { refreshHarnessReadme } from './refreshHarnessReadme.js';
import { syncRules } from './syncRules.js';
import { syncSkills } from './syncSkills.js';

export function formatAgentsSource(source) {
  if (source === 'cli') return 'CLI --agent';
  if (source === 'manifest') return `${HARNESS_ROOT}/manifest.json`;
  return 'harness default';
}

export function showProjectAgents(projectRoot, cliAgentFlags = []) {
  const resolved = resolveAgentsConfig(projectRoot, cliAgentFlags);
  const manifestAgents = readManifestAgents(projectRoot);
  const harnessPresent = existsSync(join(projectRoot, HARNESS_ROOT));

  return {
    projectRoot,
    harnessPresent,
    active: resolved.agents,
    source: resolved.source,
    manifestAgents,
    defaults: [...DEFAULT_AGENTS],
    known: [...KNOWN_AGENT_IDS],
  };
}

export function runAgentsShow(projectRoot, options = {}) {
  const info = showProjectAgents(projectRoot, options.agent ?? []);

  console.log(`Active agents: ${info.active.join(', ')} (${formatAgentsSource(info.source)})`);

  if (!info.harnessPresent) {
    console.log(`No ${HARNESS_ROOT}/ — using defaults until init or agents set`);
    return info;
  }

  if (info.manifestAgents) {
    console.log(`Manifest: ${info.manifestAgents.join(', ')}`);
  } else {
    console.log(`Manifest: not set (defaults to ${info.defaults.join(', ')})`);
  }

  console.log('');
  console.log('Set project agents:');
  console.log('  npx @nextstage-brasil/harness agents set --agent cursor');
  console.log('  npx @nextstage-brasil/harness agents set cursor claude-code');
  console.log('');
  console.log(`Known agents: ${info.known.join(', ')} (alias: claude → claude-code)`);

  return info;
}

export function runAgentsSet(projectRoot, agentIds, options = {}) {
  if (agentIds.length === 0) {
    throw new Error('Usage: harness agents set <agent...> or harness agents set --agent <name>');
  }

  const agents = writeManifestAgents(projectRoot, agentIds);
  const pruned = pruneExcludedAgentAdapters(projectRoot, agents);

  let rulesWritten = 0;
  let skillsWritten = 0;

  if (!options.skipSync) {
    const rulesSync = syncRules(projectRoot, { agents });
    rulesWritten = rulesSync.written.length;
    const skillsSync = syncSkills(projectRoot, { agents, copy: Boolean(options.copy) });
    skillsWritten = skillsSync.written.length;
  }

  console.log(`Saved agents: ${agents.join(', ')} → ${HARNESS_ROOT}/manifest.json`);

  if (pruned.removed.length > 0) {
    console.log(`Removed ${pruned.removed.length} adapter path(s) for excluded agents`);
  }
  if (rulesWritten > 0) {
    console.log(`Synced ${rulesWritten} rule adapter(s)`);
  }
  if (skillsWritten > 0) {
    console.log(`Synced ${skillsWritten} skill adapter(s)`);
  }

  const readmeResult = refreshHarnessReadme(projectRoot);
  if (readmeResult.updated) {
    console.log(`Updated: ${HARNESS_ROOT}/README.md`);
  }

  return { agents, pruned, rulesWritten, skillsWritten };
}
