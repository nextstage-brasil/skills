# Delivery units (SDD)

Mergeable work packages for GitLab optional publish. **Not** tickets per `task-NNN`. **Not** one issue for whole version.

## When

Write `docs/versions/{version_san}/sdd/delivery-units.md` from `../templates/delivery-units.template.md` **only when**:

- Human chose **GitLab publish** (`gate4_gitlab` = `yes` after Gate 4), or
- Human chose **parallel** unit dispatch (`gate4_mode` = `parallel` after Gate 4), or
- File **already exists** (resume — never re-create issues).

**Skip** (no algorithm, no file): local sequential default, no GitLab capability, no human ask for GitLab or parallel. Straight to `execution-handoff.md`; Execute classic (`Unit` column = `—`).

**Order:** after **all** `task-*.md` written. Gate 4 **ask first** when GitLab possible (`docs/context/gitlab-sync-config.md`, MCP GitLab in session, or human cited GitLab/parallel). Union-find + write **only after** human confirms publish or parallel. **Before** initial handoff when file required. Do not merge with handoff generation.

Subversions: one `delivery-units.md` under `docs/versions/{version_san}/sdd/` for all slice tasks (never merge across partition slices).

## Grain

| Artifact | Role |
| -------- | ---- |
| `task-NNN` | Agent how-card — never a GitLab ticket |
| Delivery unit | 1 issue + 1 draft MR + 1 human review |
| Version | GitLab **milestone** — not an issue |

## Unit definition

**Unit = connected component** of merge graph over version tasks.

### Merge graph edges

**Prerequisite:** only connect tasks in **same partition slice**. Tasks from different `subversions/{slice}/` folders **never** merge.

Within a slice, connect two tasks when **any** of:

1. **Depends on chain** — direct or transitive `Depends on` in task header (never split a chain across units).
2. **Write-set collision** — non-empty intersection of concrete paths from `Files to create or modify` (`task-schema.md`).
3. **Layer consumption** — one task consumes schema/API/migration another task in the slice still creates.

**Layer order tie-break:** grouping ambiguous, prefer schema/migration then API/backend then frontend then tests in one unit when edges above already connect them.

### Split rule

Partition **slice** = candidate grouping only. Slice **may split** into two+ units when graph shows independence (no edge above).

### Singleton

Standalone unit **only** when task has no merge edge to any other task in slice.

## Parallelism (`A ∥ B`)

Units **A** and **B** may run same wave **only when all** hold:

- No `Depends on` or `version-roadmap.md` `deps` path between them
- Empty write-set intersection across all tasks in A vs B
- A does not consume schema/API B still creates

Waves computed **when file written**. Human Gate 4 chooses sequential (default) vs parallel dispatch for same-wave units (`max_parallel_units` in `gitlab-sync-config.md`).

**Forbidden:** parallel without `A ∥ B`.

## Algorithm

1. **Collect** all `task-NNN-*.md` under version (include subversion `tasks/`).
2. **Parse** per task: short id, title, `Depends on`, `Estimate (seconds)`, layer, **concrete** write paths (`Files to create or modify`).
3. **Seed groups** — one group per partition slice folder; never cross-slice merge.
4. **Union-find / connected components** on merge graph edges (section above) within each slice.
5. **Assign unit ids** — `unit-001`, `unit-002`, … topological by deps.
6. **Compute waves** — wave 1 = units with no unit-level deps; wave `N+1` = units whose deps all in waves `≤ N` (equiv. `wave(u) = 1 + max(wave(deps))`, empty deps → 1).
7. **Title** — observable delivery phrase (same style as GitLab issue title).
8. **estimate_sum** — sum of task `Estimate (seconds)` in unit.
9. **deps** — other unit ids this unit waits on (from task `Depends on` across unit boundary).
10. **Write** table; leave `issue_iid`, `mr_url`, `spent_posted` empty; `status` = `pending`.

## Hard rules

- Never split a `Depends on` chain across units.
- Every task in **exactly one** unit.
- Never merge tasks from different partition slices.
- Never create issue per `task-NNN`.
- Never create one issue for entire version.

## SOURCE_BRANCH

Resolve **once per version** before Gate 4 confirm. Rules: `../../ns-execution-gitlab-issue/references/source-branch-resolution.md`.

Record resolved branch in `delivery-units.md` header. Every unit MR targets that branch. Work branch per unit: `work/{unit}-{slug}` (`slug` from unit title, kebab-case).

## Gate 4

Ask **before** compute when GitLab capable. After file written (when required), record answers in header. See `gates.md` + `human-communication.md`.

## GitLab publish

Human confirms: `mcp-gitlab-usage` flow **SDD delivery-unit publish**. Write `issue_iid` back per row.

## GitLab status/spent (SSoT)

**Only lookup.** Cite this table. No fourth branch.

| Condition | Owner | Writes |
| --------- | ----- | ------ |
| No `delivery-units.md`, **or** file exists with **empty** `issue_iid`s | Flow B **only** if legacy 1:1 task-issue map; else no GitLab board writes | Flow B per task when mapped |
| Any unit `issue_iid` filled **and** this run is `ns-execution-gitlab-issue` SDD unit mode | **G** | First act `in_progress`; Phase 3 `add_issue_spent_time` + `status_done` + `spent_posted=yes`. Skip Flow D |
| Any unit `issue_iid` filled **and** local execute (no G) | **Flow D** | Unit start `in_progress`; unit end spent + `done` + `spent_posted=yes` |

Forbidden: Flow B when any `issue_iid` filled. G + Flow D on same issue. Per-task spent when units published.

## Commit / MR (SSoT)

**Only lookup** for who writes git commit and draft MR.

| Condition | Owner |
| --------- | ----- |
| This run is G SDD unit mode | **G Phase 3** — squash, push, draft MR, write `mr_url`. Parent must **not** commit |
| Unit worker is local (`coder-agent` / `run-implementation`, no G) | **Parent** — one Conventional Commit + draft MR per unit (`mr_per_unit`) |
| No `delivery-units.md` (classic partitioned) | **Parent** — one Conventional Commit per slice |

## Execute

Apply **GitLab status/spent (SSoT)** above. Coding: G SDD unit mode when published + G; else `run-implementation.md` unit batches.

## Compatibility

Version without `delivery-units.md`: **classic default** handoff + optional per-task board sync (Flow B). Normal local sequential path — not legacy-only.

## References

| File | When |
| ---- | ---- |
| `../templates/delivery-units.template.md` | Output shape |
| `task-schema.md` | Write paths + estimates |
| `version-partitioner.md` | Slice = grouping hint only |
| `gates.md` | Gate 4 |
| `execution-handoff.md` | After units + optional publish |
| `../../ns-gitlab-board-sync/SKILL.md` | Flow B / Flow D — owners from GitLab status/spent (SSoT) |
