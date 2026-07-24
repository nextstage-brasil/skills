import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeAgentIds } from './agentIds.js';

const HARNESS_ROOT = '.nextstage-harness';

export function manifestPath(projectRoot) {
  return join(projectRoot, HARNESS_ROOT, 'manifest.json');
}

export function loadManifest(projectRoot) {
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readManifestAgents(projectRoot) {
  const manifest = loadManifest(projectRoot);
  if (!manifest || !Array.isArray(manifest.agents) || manifest.agents.length === 0) {
    return null;
  }
  return normalizeAgentIds(manifest.agents);
}

export function writeManifestAgents(projectRoot, agentIds) {
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) {
    throw new Error(`Missing ${HARNESS_ROOT}/manifest.json — run harness init first`);
  }

  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.agents = normalizeAgentIds(agentIds);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest.agents;
}
