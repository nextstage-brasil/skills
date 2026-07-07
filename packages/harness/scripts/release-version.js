#!/usr/bin/env node
/**
 * Determine semantic version bump from conventional commits in the push.
 * Writes GITHUB_OUTPUT keys: should_release, new_version, bump_level.
 */

import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

const range = process.env.RELEASE_COMMIT_RANGE?.trim();
if (!range) {
  console.error('RELEASE_COMMIT_RANGE is required (e.g. abc123..def456)');
  process.exit(1);
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bumpVersion(version, level) {
  const next = parseVersion(version);
  if (level === 'major') {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
  } else if (level === 'minor') {
    next.minor += 1;
    next.patch = 0;
  } else {
    next.patch += 1;
  }
  return formatVersion(next);
}

function getCommitMessages(commitRange) {
  const output = execSync(
    `git log ${commitRange} --pretty=format:%s%n%b%n--commit-end--`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();

  if (!output) {
    return [];
  }

  return output
    .split('\n--commit-end--\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((message) => !/^chore\(harness\): release v/.test(message.split('\n')[0] ?? ''));
}

function getBumpLevel(messages) {
  let hasFeat = false;

  for (const message of messages) {
    const subject = message.split('\n')[0] ?? '';

    if (/^version(\([^)]+\))?!?:/.test(subject)) {
      return 'major';
    }

    if (/^feat(\([^)]+\))?:/.test(subject)) {
      hasFeat = true;
    }
  }

  return hasFeat ? 'minor' : null;
}

function writeOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    console.log(`${key}=${value}`);
    return;
  }
  appendFileSync(outputPath, `${key}=${value}\n`);
}

const messages = getCommitMessages(range);

if (messages.length === 0) {
  console.log(`No commits in range ${range}; skipping release.`);
  writeOutput('should_release', 'false');
  process.exit(0);
}

const bumpLevel = getBumpLevel(messages);

if (!bumpLevel) {
  console.log(`No feat/version commits in range ${range}; skipping release.`);
  writeOutput('should_release', 'false');
  process.exit(0);
}

const newVersion = bumpVersion(currentVersion, bumpLevel);
console.log(`Current version: ${currentVersion}`);
console.log(`Bump level: ${bumpLevel}`);
console.log(`New version: ${newVersion}`);

writeOutput('should_release', 'true');
writeOutput('new_version', newVersion);
writeOutput('bump_level', bumpLevel);
