# Run implementation — Closure (steps 4–6)

Load only when all tasks are `completed` or `waived` (or pausing after full scope done).

## Closure (steps 4–6)

When all tasks are `completed` or `waived`:

### Step 4 — UI / nav review

When resolved `ui-contract.md` exists (`sdd/` first, else legacy version root per `artifact-layout.md` **Legacy path resolution**): **mandatory** — every contract element/handler vs implementation; report divergence.

When Layout SSoT registered for a screen (`reference-sources.md` `role: ui-layout`, or any version task cites `*-visual.md`): open cited SSoT **before** diff walk; report **Quick visual checklist** divergence (independent of whether `ui-contract.md` exists).

If frontend navigation changes: present grouping proposals and **wait for human approval** before applying.

### Step 4.5 — E2E (human only)

Do **not** run E2E as the agent. Tell the human that E2E is their gate at version
end (after tasks complete; before or alongside review as they prefer). Agents may
have written E2E specs earlier — execution of those suites is human-owned.

### Step 5 — Code review then judge (required)

Follow `../../ns-reviewer/references/review-gate-workflow.md` (each `Approved` = score **10** only).

1. **MUST** `reviewer-agent` when available (else `ns-reviewer`) at version closure. See `../../../ns-harness/references/subagent-dispatch.md`. Reviewer does **not** dispatch judge.
2. No `code-review-report.md`. On `Code Review: Rejected`/`Blocked` (score **9** = Lift), fix map + re-review until `Approved` or **blocked**. **Do not** run `ns-judge` until `Code Review: Approved`.
3. On `Code Review: Approved` only: read `../../ns-judge/SKILL.md` in-session (`--mode closure --version {version_san}` or `--requirements` path). Python optional. `Delivery Review: Approved` only at 10. Judge Rejected: fix map; if product files changed, code review again then judge again.
4. Update handoff only on Pass (both Approved) or Stop:
   - **Version status:** `completed` | `completed_with_caveats` | `blocked_delivery`
   - `Post-implementation review — end` + recalculate **Total process time (s)**
   - Register **review tokens** in **Time tracking** (`Review — tokens`) or **Session history** (version-level) — **not** last task `Tokens` column
5. No `_done/` move with unresolved Criticals without waiver. Score **9** ≠ version close.

### Step 5.5 — Living specs

When status is `completed` or `completed_with_caveats` and `Delivery Review: Approved`:

1. Invoke `ns-living-spec`
2. Note in handoff; fill `Living specs — end`; recalculate totals

### Step 6 — Version archive

After human confirms (or documented waiver):

1. Move `{version_san}/` → `_done/{version_san}/` when project workflow requires it
2. Fill `Final delivery — end`; recalculate **Total process time (s)**

## Critical rules

- **Always** update `execution-handoff.md` when task status changes — rows stay **per task**; parent owns file
- **Batching:** **unit mode** on **unit-scoped run** (step 0 definition — all tasks in that `unit`). **Classic** only when not unit-scoped — same-layer consecutive `pending`, prefer 4–7, hard max 7.
- **AGENTS first** — Session boot once in Bootstrap (step 1); no rule re-read per batch unless `agents.local.md` or harness rules changed; never tool-Read `AGENTS.md`
- **Numeric task order** unless explicit dependency in the task file says otherwise
- **Minimal diff** — current batch scope only
- **No commits** unless human explicitly asks
- On real blocker: `blocked` + task **Execution notes**, stop
- **No E2E runs** during tasks — unit/integration only; human runs E2E at end
- **No per-task / mid-batch review** — `coder-agent` / `ns-coder` must not call reviewer or judge; **only** Step 5 invokes `reviewer-agent` / `ns-reviewer` then `ns-judge` after `Code Review: Approved`

## References

- Handoff generation and updates: `../../ns-spec-driven/references/execution-handoff.md`
- Handoff template: `../../ns-spec-driven/templates/execution-handoff.template.md`
- Orchestrated mode: `../../ns-spec-driven/references/orchestrator.md`
