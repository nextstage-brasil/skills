import { existsSync, lstatSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { KNOWN_AGENT_IDS } from './agentIds.js';

const AGENT_ADAPTER_PATHS = {
  cursor: ['.cursor/rules', '.cursor/skills'],
  'claude-code': ['.claude/rules', '.claude/skills'],
};

function removePath(path) {
  if (!existsSync(path)) return false;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    unlinkSync(path);
    return true;
  }
  if (stat.isDirectory()) {
    rmSync(path, { recursive: true, force: true });
    return true;
  }
  unlinkSync(path);
  return true;
}

function removeAgentRootIfEmpty(projectRoot, agentDir) {
  const rootPath = join(projectRoot, agentDir);
  if (!existsSync(rootPath)) return null;
  const entries = readdirSync(rootPath);
  if (entries.length > 0) return null;
  rmSync(rootPath, { recursive: true, force: true });
  return rootPath;
}

/**
 * Remove harness-managed adapters for agents not in the target list.
 * skills update may recreate excluded agent dirs — call after external CLI steps.
 */
export function pruneExcludedAgentAdapters(projectRoot, agents, options = {}) {
  const { dryRun = false } = options;
  const target = new Set(agents);
  const removed = [];

  for (const agent of KNOWN_AGENT_IDS) {
    if (target.has(agent)) continue;

    if (agent === 'claude-code') {
      const claudeRoot = join(projectRoot, '.claude');
      if (existsSync(claudeRoot)) {
        if (!dryRun) removePath(claudeRoot);
        removed.push(claudeRoot);
      }
      continue;
    }

    for (const rel of AGENT_ADAPTER_PATHS[agent] ?? []) {
      const path = join(projectRoot, rel);
      if (!existsSync(path)) continue;
      if (!dryRun) removePath(path);
      removed.push(path);
    }

    if (!dryRun) {
      const emptyRoot = removeAgentRootIfEmpty(projectRoot, '.cursor');
      if (emptyRoot) removed.push(emptyRoot);
    }
  }

  return { removed };
}
