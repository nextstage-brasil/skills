# Time tracking (estimate + spent)

Authoritative rules for GitLab time fields during issue execution. Read before `set_issue_estimate` or `add_issue_spent_time`.

## Estimate (`set_issue_estimate`) — fill only when empty

1. From `read_issue`, inspect `time_stats.time_estimate` (seconds). **Empty** means missing, `null`, or `0`.
2. If **not empty** → **do not call** `set_issue_estimate`. Preserve the human/planning estimate.
3. If empty → call only when the engine returned `estimate_seconds` **≥ 60**. Values under 60s are invalid for an estimate — skip the call (do not invent a substitute, do not write `1`).
4. Never overwrite an existing estimate with a plan-based or engine value.

Creation flow (`create_issue` then estimate) is unchanged: new issues start empty.

## Spent time (`add_issue_spent_time`) — wall-clock active work only

### Timestamps

| Variable     | When to set |
| ------------ | ----------- |
| `START_TIME` | **External mode:** immediately before first `ns-autonomous` Engine invoke. **SDD unit mode:** immediately before first task in unit (`run-implementation`). Not during gates, branch resolution, or worktree setup. |
| `END_TIME`   | At **Phase 3 delivery closure** — the same moment you apply `status_done` (Dev 100%), after Phase 4 returns `Approved`. Never earlier (not at first push). Never if the run stops blocked / review exhausted. |

Use UTC ISO 8601 **and** Unix epoch seconds from the same instant (prefer `date -u +%s` / equivalent) so duration is not guessed.

### Duration formula

```
ELAPSED_SECONDS = max(1, END_EPOCH - START_EPOCH - PAUSED_SECONDS)
```

- Compute from **epoch integers**, never from mental math on clock strings alone.
- `PAUSED_SECONDS`: sum of wall-clock intervals while waiting on the human (destructive-doubt pause, Gate 1 confirmation waits if any occurred after `START_TIME`). If no pause → `0`.
- Floor `max(1, …)` is only so GitLab accepts a positive duration when coding finished in under one second — **never** use `1` as a default, estimate, or substitute when you lost the timestamps.
- If `START_TIME` / `END_TIME` were not recorded → **do not invent** a duration; ask the human once or skip spent time and say so.
- Fix-loop rework after a `Rejected` review stays under the same `START_TIME` → `END_TIME` window (single spent entry at Dev 100%).

### Forbidden

| Wrong | Right |
| ----- | ----- |
| Use `estimate_seconds` / plan estimate as `duration` | Use wall-clock `ELAPSED_SECONDS` only |
| Round up to nearest 30 min / hour | Use exact ceil of epoch delta |
| Set `END_TIME` / spent at first push (before Dev 100%) | End clock when applying Dev 100% |
| Apply Dev 100% or spent without Phase 4 `Approved` | Closure only after `Approved` |
| Include Phase 1 gates in the interval | Start clock at Phase 2 |
| Confuse `set_issue_estimate` with `add_issue_spent_time` | Estimate = planned effort; spent = measured active work |

### Doubt pause (Phase 2)

When escalating a destructive doubt and waiting:

1. Record `PAUSE_START` (epoch) when you stop for the human.
2. On resume, add `(RESUME_EPOCH - PAUSE_START)` to `PAUSED_SECONDS`.
3. Continue the same `START_TIME` — do not reset it.
