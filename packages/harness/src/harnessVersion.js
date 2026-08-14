import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedVersion;

export function getHarnessVersion() {
  if (!cachedVersion) {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    cachedVersion = pkg.version;
  }
  return cachedVersion;
}

/**
 * @param {number} a
 * @param {number} b
 */
function compareParts(a, b) {
  if (a !== b) return a > b ? 1 : -1;
  return 0;
}

/**
 * @param {string} version
 * @returns {[number, number, number]}
 */
function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((part) => Number(part) || 0);
  return [major, minor, patch];
}

/**
 * Minimal semver satisfy for harness ranges used in this repo (>=x.y.z).
 * @param {string} range
 * @param {string} version
 */
export function satisfiesHarnessRange(range, version) {
  if (!range || !version) return true;

  const gte = range.match(/^>=([0-9]+)\.([0-9]+)\.([0-9]+)$/);
  if (gte) {
    const required = [Number(gte[1]), Number(gte[2]), Number(gte[3])];
    const actual = parseVersion(version);
    for (let i = 0; i < 3; i += 1) {
      const cmp = compareParts(actual[i], required[i]);
      if (cmp !== 0) return cmp > 0;
    }
    return true;
  }

  return range === version;
}

/**
 * @param {string | undefined} requiresHarness
 * @param {string} [harnessVersion]
 */
export function assertHarnessCompatible(requiresHarness, harnessVersion = getHarnessVersion()) {
  if (!requiresHarness) return;

  if (!satisfiesHarnessRange(requiresHarness, harnessVersion)) {
    throw new Error(
      `Skill requires harness ${requiresHarness} but running @nextstage-brasil/harness@${harnessVersion}`,
    );
  }
}
