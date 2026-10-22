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

function uniqueSorted(values) {
  return [...new Set(Array.isArray(values) ? values : [])].sort();
}

/**
 * Skills the harness installed (source of truth for `harness update`).
 * @return {{preset: string|null, ns: string[], external: string[]}|null}
 */
export function readManifestSkills(projectRoot) {
  const skills = loadManifest(projectRoot)?.skills;
  if (!skills || typeof skills !== 'object') {
    return null;
  }
  const ns = uniqueSorted(skills.ns);
  const external = uniqueSorted(skills.external);
  if (ns.length === 0 && external.length === 0) {
    return null;
  }
  return { preset: skills.preset ?? null, ns, external };
}

/**
 * Merge installed skill ids into manifest.skills (union; never drops entries).
 * @param {{preset?: string|null, ns?: string[], external?: string[]}} entry
 */
export function writeManifestSkills(projectRoot, entry = {}) {
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) {
    return null;
  }

  const raw = readFileSync(path, 'utf8');
  const manifest = JSON.parse(raw);
  const current = manifest.skills ?? {};
  manifest.skills = {
    preset: entry.preset ?? current.preset ?? null,
    ns: uniqueSorted([...(current.ns ?? []), ...(entry.ns ?? [])]),
    external: uniqueSorted([...(current.external ?? []), ...(entry.external ?? [])]),
  };

  const next = `${JSON.stringify(manifest, null, 2)}\n`;
  if (next !== raw) {
    writeFileSync(path, next, 'utf8');
  }
  return manifest.skills;
}
