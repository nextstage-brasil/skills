/**
 * Offline smoke test of the ns-qa-homologation environment contract (Q5 + Q10)
 * against the fake qa-env in test/fixtures/qa-app/ (no network, no docker):
 * qa-env outputs pass `qa_gate.py --check-env`, a run.json built from them passes
 * `--check-run`, the Q10 plan is ordered and run-owned only, and `down` removes
 * exactly the registered resources while an unregistered one survives.
 * Needs bash + python3 (override with $PYTHON).
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const fakeEnv = join(__dirname, 'fixtures', 'qa-app', 'qa-env.sh');
const scriptsDir = join(repoRoot, 'skills', 'ns-qa-homologation', 'scripts');
const python = process.env.PYTHON || 'python3';

const RUN_ID = '42-20261124T1200Z';
const NS = 'qa-42-20261124t1200z';
const COMMIT = 'abc1234def5678abc1234def5678abc1234def56';
const STAMP = '2026-11-24T12:00:00Z';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`assert failed: ${message}`);
  }
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', env: { ...process.env, ...env } });
  if (result.error) {
    throw new Error(`${command} could not start: ${result.error.message}`);
  }
  return result;
}

function json(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label}: stdout is not JSON (exit ${result.status}): ${result.stdout}${result.stderr}`);
  }
}

class QaFixture {
  constructor(workDir) {
    this.workDir = workDir;
    this.stateDir = join(workDir, 'state');
    this.outputs = 0;
  }

  qaEnv(...args) {
    return run('bash', [fakeEnv, ...args], { QA_APP_STATE_DIR: this.stateDir });
  }

  gate(...args) {
    return run(python, [join(scriptsDir, 'qa_gate.py'), ...args]);
  }

  cleanupPlan(runPath, outcome) {
    return run(python, [join(scriptsDir, 'qa_cleanup_plan.py'), '--run', runPath, '--outcome', outcome]);
  }

  /** Runs one qa-env command and asserts its stdout keeps the contract. */
  contractCall(expectedExit, ...args) {
    const result = this.qaEnv(...args);
    assert(result.status === expectedExit, `qa-env ${args[0]} exit ${result.status} != ${expectedExit}: ${result.stderr}`);
    const output = json(result, `qa-env ${args[0]}`);
    this.outputs += 1;
    const file = join(this.workDir, `${args[0]}-${this.outputs}.json`);
    writeFileSync(file, result.stdout);
    const check = this.gate('--check-env', file, '--run-id', RUN_ID);
    assert(check.status === 0, `--check-env ${args[0]}: ${check.stdout}`);
    return output;
  }

  writeRun(name, manifest) {
    const path = join(this.workDir, name);
    writeFileSync(path, JSON.stringify(manifest, null, 2));
    return path;
  }
}

function manifestFrom(upOutput) {
  const resource = (kind, id, phase, via) => ({ kind, id, created_at: STAMP, created_by_phase: phase, via });
  return {
    run_version: 1,
    run_id: RUN_ID,
    issue: { dev: 'group/app#42', qa: null },
    level: { declared: 'L1', effective: 'L1', caps: [] },
    profile_sha256: 'b'.repeat(64),
    environment: { provider: 'script' },
    // Completed L1 run: every gate through Q7b passed.
    phase: 'Q7b',
    phases: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q7b'].map((phase) => ({ phase, state: 'passed', updated_at: STAMP })),
    created_resources: [
      resource('evidence_dir', `docs/qa/${RUN_ID}`, 'Q0', 'agent'),
      ...upOutput.created_resources.map((item) => resource(item.kind, item.id, 'Q5', 'qa-env')),
    ],
    checkpoints: [],
    pauses: [],
  };
}

let workDir;
try {
  workDir = mkdtempSync(join(tmpdir(), 'qa-env-fixture-'));
  const fixture = new QaFixture(workDir);
  const foreign = join(fixture.stateDir, 'container', 'daily-app-1');
  mkdirSync(dirname(foreign), { recursive: true });
  writeFileSync(foreign, '');

  // Q5: up → health → info → seed, each output validated against the contract.
  const up = fixture.contractCall(0, 'up', '--run', RUN_ID, '--ref', COMMIT);
  assert(up.created_resources.length === 3, 'up registers container, volume, image');
  assert(up.urls[0].url.endsWith('/qa-app/index.html'), 'up exposes the static fixture app');
  fixture.contractCall(0, 'health', '--run', RUN_ID);
  const info = fixture.contractCall(0, 'info', '--run', RUN_ID);
  assert(info.commit === COMMIT, 'info reports the deployed commit (= MR commit)');
  const seed = fixture.contractCall(0, 'seed', '--run', RUN_ID, '--prefix', 'qa-bot-');
  assert(seed.data.every((item) => item.ref.includes(RUN_ID)), 'seeded refs carry the run id');
  assert(seed.data.some((item) => item.data_source === 'db_fixture'), 'seed declares data_source per entity');
  fixture.contractCall(0, 'reset', '--run', RUN_ID, '--prefix', 'qa-bot-');

  // run.json built from qa-env output passes --check-run; a foreign resource is rejected.
  const manifest = manifestFrom(up);
  const runPath = fixture.writeRun('run.json', manifest);
  const runCheck = fixture.gate('--check-run', runPath);
  assert(runCheck.status === 0, `--check-run: ${runCheck.stdout}`);
  const tampered = structuredClone(manifest);
  tampered.created_resources.push({ ...tampered.created_resources[1], id: 'daily-app-1' });
  const tamperedCheck = fixture.gate('--check-run', fixture.writeRun('tampered.json', tampered));
  assert(tamperedCheck.status === 2, 'run.json naming a resource outside the run is rejected');
  assert(json(tamperedCheck, 'check-run').errors.some((e) => e.includes('not run-owned')), 'rejection names the rule');

  // Q10 plans: blocked keeps all; success needs --profile (Q7b recomputed from the run's ledger, covered by
  // the skill's Python tests); leftover orders the qa-env removals executed below.
  const blocked = json(fixture.cleanupPlan(runPath, 'blocked'), 'plan blocked');
  assert(blocked.steps.length === 0 && blocked.keep.length === 4, 'blocked run keeps every resource');
  const noProfile = fixture.cleanupPlan(runPath, 'success');
  assert(noProfile.status === 3, 'success without --profile is a usage error');
  const leftover = json(fixture.cleanupPlan(runPath, 'leftover'), 'plan leftover');
  assert(
    leftover.steps.map((step) => step.kind).join(',') === 'container,volume,image',
    `cleanup order: ${leftover.steps.map((step) => step.kind)}`,
  );
  assert(leftover.keep.map((item) => item.kind).join(',') === 'evidence_dir', 'agent-owned evidence dir kept');

  // down refuses a resource outside run.json, then removes exactly the registered ones, in plan order.
  fixture.contractCall(2, 'down', '--run', RUN_ID, '--manifest', runPath, '--resource', 'container:daily-app-1');
  for (const step of leftover.steps.filter((item) => item.via === 'qa-env')) {
    const target = `${step.kind}:${step.id}`;
    const removed = fixture.contractCall(0, 'down', '--run', RUN_ID, '--manifest', runPath, '--resource', target);
    assert(removed.removed.length === 1 && removed.removed[0].id === step.id, `down removed ${step.id}`);
  }
  for (const item of up.created_resources) {
    assert(!existsSync(join(fixture.stateDir, item.kind, item.id)), `${item.kind}:${item.id} removed`);
  }
  assert(existsSync(foreign), 'unregistered resource untouched');
  const health = fixture.qaEnv('health', '--run', RUN_ID);
  assert(health.status === 1, 'env is gone after cleanup');

  console.log(`OK: qa-env fixture contract (${fixture.outputs} outputs validated, ${NS} cleaned, foreign kept)`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true });
  }
}
