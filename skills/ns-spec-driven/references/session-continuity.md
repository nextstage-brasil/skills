# Session continuity (pause / resume)

Progress is tracked on disk — not in chat history.

## Resume signals

| Signal | Action |
| ------ | ------ |
| `docs/versions/{version_san}/execution-handoff.md` exists | Read handoff first — it is the **source of truth** for task order and status |
| `version-roadmap.md` + subversions | Check slice handoffs under `subversions/` |
| User says "continue", "resume", "where we left off" | Locate latest handoff; do not restart planning |

## Handoff fields to read

1. Current task id and status table.
2. `Total process time (s)` — preserve and update per `ns-execution-handoff-generator`.
3. Blockers or notes from last session.

## Resume workflow

1. Resolve `{version_san}` from user or newest modified folder under `docs/versions/`.
2. Read `execution-handoff.md` (or slice handoff if orchestrating a subversion).
3. Skip phases whose artifacts are **complete and user-approved**:
   - Requirements exist and user does not ask to rewrite → skip Specify.
   - Tasks + handoff exist → skip Tasks generation; go to Execute.
4. Delegate Execute to the appropriate worker (handoff run-implementation, orchestrator, or GitLab).
5. On close, run review → living spec if not already done for this delivery.

## Pause

When user pauses mid-execute:

- Update `execution-handoff.md` with current task status and timestamps.
- Report: version path, last completed task, next task id.

## Fresh session rule

Re-read handoff and the **active task file** at the start of every new chat — do not assume chat memory.
