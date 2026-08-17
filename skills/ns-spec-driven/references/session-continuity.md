# Session continuity (pause / resume)

Progress on disk — not chat history.

## Resume signals

| Signal | Action |
| ------ | ------ |
| `docs/versions/{version_san}/execution-handoff.md` exists | Read handoff first — **source of truth** for task order + status |
| `version-roadmap.md` + subversions | Check slice handoffs under `subversions/` |
| User say "continue", "resume", "where we left off" | Locate latest handoff; no restart planning |

## Handoff fields to read

1. Current task id + status table.
2. `Total process time (s)` — preserve + update per `execution-handoff.md`.
3. Blockers / notes from last session.

## Resume workflow

1. Resolve `{version_san}` from user or newest modified folder under `docs/versions/`.
2. Read `execution-handoff.md` (or slice handoff if orchestrating subversion).
3. Skip phases with artifacts **complete + user-approved**:
   - Requirements exist, user not ask rewrite: skip Specify.
   - Tasks + handoff exist: skip Tasks generation; go Execute.
4. Delegate Execute per execute routing (`run-implementation.md`, `orchestrator.md`, or GitLab).
5. On close: review then living spec if not done for this delivery.

## Pause

User pause mid-execute:

- Update `execution-handoff.md` with current task status + timestamps.
- Report: version path, last completed task, next task id.

## Fresh session rule

Re-read handoff + **active task file** at start every new chat — no assume chat memory.
