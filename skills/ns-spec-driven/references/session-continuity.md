# Session continuity (pause / resume)

Progress on disk — not chat history.

## Resume signals

Resolve paths per `artifact-layout.md` **Legacy path resolution** (`sdd/` first, else version root). If classic artifacts only at version root → **Legacy nest migration** STOP before skip-planning.

| Signal | Action |
| ------ | ------ |
| `delivery-units.md` exists (resolved path) | Read units + `issue_iid` — **never re-create** published issues on resume |
| `execution-handoff.md` exists (resolved path) | Read handoff first — **source of truth** for task order + status |
| `version-roadmap.md` + subversions (resolved) | Check slice handoffs under `subversions/` |
| User say "continue", "resume", "where we left off" | Locate latest handoff; no restart planning |

## Handoff fields to read

1. Current task id + status table.
2. `Total process time (s)` — preserve + update per `execution-handoff.md`.
3. Blockers / notes from last session.

## Resume workflow

1. Resolve `{version_san}` from user or newest modified folder under `docs/versions/`.
2. Resolve artifact paths (`sdd/` first, legacy version root fallback). If classic SDD at root only → nest migration STOP (below) before continuing.
3. Read resolved `execution-handoff.md` (or slice handoff if orchestrating subversion).
4. Re-anchor: `clarify-contract.md`, `unknowns-register.md`, `source/`, `spec-coverage.md`. **Open critical unknowns:** re-enter Clarify-Strict, not Specify.
5. Skip phases with artifacts **complete + user-approved**:
   - Requirements exist, user not ask rewrite: skip Specify.
   - Tasks exist, no `delivery-units.md`, handoff exists: skip units + Gate 4; go Execute classic.
   - Tasks exist, no `delivery-units.md`, no handoff: Gate 4 per `gates.md` when GitLab possible; else classic handoff (no units).
   - Tasks + `delivery-units.md` + Gate 4 done, handoff exists: skip Tasks generation; go Execute.
6. **Resume GitLab:** reuse `issue_iid` and open `mr_url` from `delivery-units.md` — forbidden to `create_issue` again for same unit.
7. Delegate Execute per execute routing (`run-implementation.md`, `orchestrator.md`, `ns-execution-gitlab-issue` unit mode, or external GitLab).
8. On close: `review-gate-workflow.md` (`Approved` = **10**; **9** = `Rejected` Lift). `ns-living-spec` after `Approved` only.

## Pause

User pause mid-execute:

- Update `execution-handoff.md` with current task status + timestamps.
- Report: version path, last completed task, next task id.

## Fresh session rule

Re-read handoff + **active task file** at start every new chat — no assume chat memory.

## Legacy nest migration (first SDD touch per version)

When classic SDD artifacts still sit at version root (not under `sdd/`):

1. **STOP once** before read/write. Propose move `version root → sdd/` for every SDD artifact found. Search repo refs; list referencing files.
2. Ask: **confirm move + ref fix** or **decline** — same discipline as PM misplaced gate. Forbidden: `proceed`, silence, continuing same turn.
3. **On confirm:** create `sdd/`, move artifacts, fix every ref, re-search until clean.
4. **On decline / no answer:** read legacy paths only; no dual-write; no silent second tree.

Canonical resolution: `artifact-layout.md` **Legacy path resolution** + **Legacy nest migration**. New versions: `sdd/` only.
