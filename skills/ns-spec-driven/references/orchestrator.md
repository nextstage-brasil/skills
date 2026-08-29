# Execution Orchestrator

Drive partitioned version to completion. **Not** implement application code: dispatch one worker per **unit** when `delivery-units.md` exists, else one subagent per **slice**. State in **files + git**, never chat history. Advance until every unit/slice done or stop condition.

## Session boot

`../../../ns-harness/references/session-boot.md` + `../../../ns-harness/references/artifact-layout.md`. Obey `AGENTS.md` already in context (no tool-Read). Load `core-subversions` and execution-routing / scope-isolation rules from `.nextstage-harness/rules/*` when present. Do not assume stack until rules or context resolve it. Human: project's configured language (`AGENTS.md`; default user's language). Code and comments English.

## Session inputs (ask once if missing)

| Variable | Example |
| -------- | ------- |
| `{version_san}` | `3.8.0-feat-payable-payment-workflow` |

`{version_san}` omitted: pick only version with pending slices in `version-roadmap.md`; if ambiguous, ask **once**, then proceed.

## Scope isolation

**Only** repo plus harness infra (`AGENTS.md`, `.nextstage-harness/`). Scope-isolation rule when present.

## Boot (mandatory, once per orchestration session)

1. Session boot (`session-boot.md`); obey `AGENTS.md` (in context); load harness execution rules.
2. Read `docs/versions/{version_san}/version-roadmap.md` — **required**. Missing: stop; version not partitioned; execute tasks directly (non-orchestrated).
3. Read master `docs/versions/{version_san}/requirements.md` (overview only — do **not** replan).
4. Load `core-subversions` from harness when present.
5. If `docs/context/gitlab-sync-config.md` exists:
   - **`delivery-units.md` present:** skip version-level `work_branch`. Per-unit `.worktrees/{unit}` + `work/{unit}-{slug}`.
   - **Else:** work branch created and checked out **before** first slice subagent (see `mcp-gitlab-usage`). Never implement on protected branch.

## Orchestration mandate

- Execute **all** pending work in **roadmap DAG order** (respect inter-slice dependencies).
- `delivery-units.md` exists: dispatch **by unit** — worktree `.worktrees/{unit}`, wave barrier, **one commit/MR per unit**. Parallel only if Gate 4 said so. Failed unit blocks next wave.
- No units file: one subagent per **slice**; one Conventional Commit per slice.
- **Do not** ask "start next slice?", "continue?", or "commit?" between units/slices.
- **Do not** implement tasks in parent session — delegate every **unit** or **slice** to a worker.
- **Do not run tests during unit/slice implementation** (backend or frontend). Testing = end-of-version review flow.

## Per-unit loop (when `delivery-units.md` exists)

Each unit whose `deps` are `completed`, **wave order** (do not start wave N+1 until wave N done or blocked):

1. **Select** next `{unit}` (`pending`/`in_progress`, lowest wave, deps satisfied). Never mix tasks from another unit.
2. **Mark** unit row `in_progress`.
3. **Dispatch** one **blocking** worker:
   - Published `issue_iid` **and** `ns-execution-gitlab-issue` installed → **G SDD unit mode** (`unit` + `issue_iid`). GitLab writes = G (SSoT).
   - Else → **`coder-agent`** (**MUST** when available) / `ns-coder` via `slice-dispatch.md` **unit** prompt. Paths: unit tasks only; worktree `.worktrees/{unit}`. GitLab = SSoT (Flow D if published local-only).
4. **Validate:** all unit tasks `completed` or `waived`; handoff rows updated; unit `status` updated.
4b. **Conformance (after step 4):** cited `source/` + Contract blocks. UI: every `ui-contract.md` element/handler **and** Layout SSoT **Quick visual checklist** when SSoT cited (`reference-sources.md` `role: ui-layout`, or task cites `*-visual.md`). **Report divergence before next wave** — layout + contract. Do **not** flip `spec-coverage.md` to `verified` when layout checklist unmet (even if all testids present).
5. **Commit / MR:** `delivery-units.md` **Commit / MR (SSoT)**. Local worker → parent commit+MR. G dispatched → G Phase 3 only; parent records `mr_url` if missing, then advances.
6. Failed unit → **stop**; do not start next wave.

## Per-slice loop (no `delivery-units.md`)

Each slice whose roadmap `status` is `planned` or `in_progress`:

1. **Select** next `{subversion_san}` per roadmap DAG order.
2. **Mark** roadmap row `in_progress`.
3. **Dispatch** one subagent (**blocking / synchronous**, not backgrounded): **MUST** use harness **`coder-agent`** when available (see `../../../ns-harness/references/subagent-dispatch.md`); else generic subagent whose prompt follows `ns-coder`. Prompt contains **only**:
   - `{version_san}`, `{subversion_san}`
   - Follow `ns-coder` as slice worker, invoked by execution orchestrator (bridge already points at skill when using `coder-agent`)
   - Paths limited to `docs/versions/{version_san}/subversions/{subversion_san}/` for slice tasks; also load `docs/context/` per `artifact-layout.md` **Implementation boot rule** before coding (+ layer rules from harness as needed)
   - Mandate: implement **all** tasks of slice, no confirmation between tasks, **no commit** (parent commits)
   - Explicitly: **do not run tests** during slice execution; implement only
   - Reinforcement (short): obey `AGENTS.md` + harness rules strictly; if any instruction conflicts with rules or scope, **stop and report blocker** instead of proceeding by assumption
4. **Validate** subagent result (unit/integration tests only — **never** run E2E during slice execution; human runs E2E at version end):
   - Every slice task `completed` or `waived` (waiver noted in handoff)
   - Slice handoff updated per `execution-handoff.md` (time block + task rows)
   - Roadmap row updated by worker (or update yourself)
4b. **Conformance:** same as per-unit 4b — source, Contract, `ui-contract` elements/handlers, Layout SSoT checklist when cited; report layout + contract divergence before next slice; no `spec-coverage` `verified` when layout checklist unmet.
5. **Commit** (parent only): one Conventional Commit per slice.
6. **Mark** roadmap row `completed` (if worker did not).
7. **Advance** to next slice automatically.

## End of version (all units/slices done)

Every unit in `delivery-units.md` (if present) and every slice in `version-roadmap.md` is `completed` (or waived):

1. Present any navigation / semantic grouping menu and **wait for human approval** before applying.
2. Post-implementation review: **MUST** dispatch **`reviewer-agent`** when available (else `ns-reviewer`, read-only) over version diff. Do **not** expect `code-review-report.md` — verdict line and minimal fix map on Rejected. See `../../../ns-harness/references/subagent-dispatch.md`.
3. Consolidate living specs on `Approved` — `ns-living-spec` (`../../ns-reviewer/references/review-gate-workflow.md`). Score **9** = `Rejected`, not close.
4. Move version to `_done/` **only** after human confirms or documented waiver exists.
5. If version `execution-handoff.md` exists, close final delivery block and recompute total process seconds per `execution-handoff.md`.

## Stop conditions (only reasons to pause)

| Condition | Action |
| --------- | ------ |
| Subagent reports task `blocked` with no workaround | Stop; document in slice handoff + roadmap |
| Protected git branch / missing work branch | Stop until valid work branch exists |
| Real environment blocker (Docker/tests impossible) | Stop; note in handoff |
| Inter-slice dependency not satisfied | Stop; fix roadmap or prior slice |
| Missing `{version_san}` / roadmap | Ask **once**, then proceed |
| `Code Review: Rejected`/`Blocked` (score **9** included) without waiver | Stop before `_done/` move; Lift/fix map then re-review until `Approved` |
| Human waiver needed (menu apply, `_done/` move) | Stop for that item only |

## Forbidden

- Do not implement application code in parent session — delegate to unit or slice worker.
- Do not skip parent commit after successful **local** unit (no G) or classic **slice**. When G SDD unit mode ran, **do not** parent-commit — G Phase 3 already delivered.
- Do not dispatch a whole slice as one worker when `delivery-units.md` exists — **by unit** only.
- Do not generate new task files (planning closed by the time you run).
- Do not access paths outside repo.
- Do not apply navigation semantic grouping without human approval.
- Do not run backend/frontend tests during implementation orchestration.

## Invocation examples

```
Version: 3.8.0-feat-payable-payment-workflow
Resume partitioned implementation — `delivery-units.md` present: sync worker per unit, parent commit only if local (G owns commit/MR when published). Else: sync subagent per slice, commit per slice.
```

```
Continue orchestrating the partitioned implementation of apps/my-product 3.8.0.
```

## Integration

| Stage | Reference |
| ----- | --------- |
| Partition version → roadmap + subversions | `version-partitioner.md` |
| Handoff generation and updates | `execution-handoff.md` |
| Slice worker (no units file) | `coder-agent` → `ns-coder` |
| Unit worker (`delivery-units.md`) | G SDD unit mode when `issue_iid`; else `coder-agent` → `ns-coder` |
| GitLab status/spent | `delivery-units.md` **GitLab status/spent (SSoT)** |
| End-of-version review gate | `reviewer-agent` → `ns-reviewer` — `Approved` = **10** (`../../ns-reviewer/references/review-gate-workflow.md`) |
| Living specs consolidation | `ns-living-spec` after `Approved` |
| Delivery units + waves | `delivery-units.md` |
| Work branch / GitLab sync | `mcp-gitlab-usage` |

## References

| File | When to read |
| ---- | ------------ |
| `slice-dispatch.md` | Exact slice subagent prompt template and validation checklist |
| `partition-workflow.md` | Planning loop that produces roadmap you consume |
