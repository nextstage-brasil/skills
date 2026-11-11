# Execution Orchestrator

Drive partitioned version to completion **and implement it in this same session** (follow `ns-coder` per **unit** when `delivery-units.md` exists, else per **slice**). No `coder-agent` spawn — context is managed by the host harness (compaction / reset); state lives in **files + git**, never chat history. Advance until every unit/slice done or stop condition.

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
2. Read resolved `version-roadmap.md` — `docs/versions/{version_san}/sdd/` first; legacy version root if unmigrated (`artifact-layout.md` **Legacy path resolution**) — **required**. Missing both: stop; version not partitioned; execute tasks directly (non-orchestrated).
3. Read resolved master `requirements.md` — `sdd/` first, else legacy root (overview only — do **not** replan).
4. Load `core-subversions` from harness when present.
5. If `docs/context/gitlab-sync-config.md` exists:
   - **`delivery-units.md` present:** skip version-level `work_branch`. Per-unit `.worktrees/{unit}` + `work/{unit}-{slug}`.
   - **Else:** work branch created and checked out **before** first slice (see `mcp-gitlab-usage`). Never implement on protected branch.

## Orchestration mandate

- Execute **all** pending work in **roadmap DAG order** (respect inter-slice dependencies).
- `delivery-units.md` exists: dispatch **by unit** — worktree `.worktrees/{unit}`, wave barrier, **one commit/MR per unit**. Sequential in-session by default; parallel workers only if Gate 4 said so. Failed unit blocks next wave.
- No units file: one **slice** at a time, in-session; one Conventional Commit per slice.
- **Do not** ask "start next slice?", "continue?", or "commit?" between units/slices.
- **Do** implement tasks in this session (`ns-coder`); **do not** spawn `coder-agent` per unit/slice. Update handoff rows as each task completes so compaction/restart resumes from disk.
- **Tests while implementing:** unit/integration per task as the project rules require; **no E2E** unless the user explicitly asks.

## Per-unit loop (when `delivery-units.md` exists)

Each unit whose `deps` are `completed`, **wave order** (do not start wave N+1 until wave N done or blocked):

1. **Select** next `{unit}` (`pending`/`in_progress`, lowest wave, deps satisfied). Never mix tasks from another unit.
2. **Mark** unit row `in_progress`.
3. **Execute** the unit in-session:
   - Published `issue_iid` **and** `ns-execution-gitlab-issue` installed → **G SDD unit mode** (`unit` + `issue_iid`), also in-session. GitLab writes = G (SSoT).
   - Else → follow `ns-coder` inline using `slice-dispatch.md` **unit** scope/checklist. Paths: unit tasks only; worktree `.worktrees/{unit}`. GitLab = SSoT (Flow D if published local-only).
   - Parallel Gate 4 only: same-wave `A ∥ B` units may go to separate `coder-agent` workers (explicit human choice).
4. **Validate:** all unit tasks `completed` or `waived`; handoff rows updated; unit `status` updated.
4b. **Conformance (after step 4):** cited `source/` + Contract blocks. UI: every `ui-contract.md` element/handler **and** Layout SSoT **Quick visual checklist** when SSoT cited (`reference-sources.md` `role: ui-layout`, or task cites `*-visual.md`). **Report divergence before next wave** — layout + contract. Do **not** flip `spec-coverage.md` to `verified` when layout checklist unmet (even if all testids present).
5. **Commit / MR:** `delivery-units.md` **Commit / MR (SSoT)**. Local in-session → parent commit+MR. G unit mode → G Phase 3 only; parent records `mr_url` if missing, then advances.
6. Failed unit → **stop**; do not start next wave.

## Per-slice loop (no `delivery-units.md`)

Each slice whose roadmap `status` is `planned` or `in_progress`:

1. **Select** next `{subversion_san}` per roadmap DAG order.
2. **Mark** roadmap row `in_progress`.
3. **Execute** the slice in-session — follow `ns-coder` inline (no spawn; `../../../ns-harness/references/subagent-dispatch.md` Default: one session). Scope **only**:
   - `{version_san}`, `{subversion_san}`
   - Paths limited to resolved slice folder — `sdd/subversions/{subversion_san}/` first, else legacy `subversions/{subversion_san}/` (`artifact-layout.md` **Legacy path resolution**); also load `docs/context/` per **Implementation boot rule** before coding (+ layer rules from harness as needed)
   - Mandate: implement **all** tasks of slice, no confirmation between tasks, commit once at slice end (step 5)
   - Tests: unit/integration per task; no E2E unless the user explicitly asks
   - Reinforcement (short): obey `AGENTS.md` + harness rules strictly; if any instruction conflicts with rules or scope, **stop and report blocker** instead of proceeding by assumption
4. **Validate** slice result (unit/integration tests only — no E2E unless the user explicitly asks):
   - Every slice task `completed` or `waived` (waiver noted in handoff)
   - Slice handoff updated per `execution-handoff.md` (time block + task rows)
   - Roadmap row updated
4b. **Conformance:** same as per-unit 4b — source, Contract, `ui-contract` elements/handlers, Layout SSoT checklist when cited; report layout + contract divergence before next slice; no `spec-coverage` `verified` when layout checklist unmet.
5. **Commit** (parent only): one Conventional Commit per slice.
6. **Mark** roadmap row `completed`.
7. **Advance** to next slice automatically.

## End of version / stop / forbidden

When all units/slices done, or checking stop/forbidden: read `references/orchestrator-closure.md`.

## References

| File | When to read |
| ---- | ------------ |
| `slice-dispatch.md` | In-session scope rules and validation checklist |
| `partition-workflow.md` | Planning loop that produces roadmap you consume |
