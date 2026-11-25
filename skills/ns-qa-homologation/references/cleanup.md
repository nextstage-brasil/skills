# Q10 Cleanup

Remove what this run created, only on full success, only from `run.json.created_resources`. Planner `scripts/qa_cleanup_plan.py` = single authority (prints plan, executes nothing); agent executes. Effective L0 → planner returns `run_q10: false`, keeps all, no log line. v0.3.0: L1 run ends with Q7 `skipped` (verdict pending) → `success` unprovable → Q10 not executed; all kept (fail-safe); human removes via **Leftovers**.

## Registration (every phase)

Resource created → append to `run.json.created_resources` **at creation**, before next step: `{kind, id, created_at, created_by_phase, via}`; then `qa_gate.py --check-run <run.json>` (exit 2 → stall). Not registered = never deleted.

| `kind` | Typical creator | `via` |
| ------ | --------------- | ----- |
| `container`, `volume`, `database`, `image` | `qa-env up`/`reset` (Q5, Q6 ENV retry) | `qa-env` |
| `worktree` | `qa-env up`, or agent (`.worktrees/qa-<run_id>/`, Q8) | `qa-env` \| `agent` |
| `evidence_dir` | agent (Q0 run dir = `evidence.dir`) | `agent` |

Id rule (schemas + template): `^[A-Za-z0-9.][A-Za-z0-9._/:@+-]*$`, no `..` (no whitespace, shell metacharacters, leading `-`, absolute path). Embeds `run_id` boundary-aware: iid not preceded by digit, optional `-`/`_`/`.`, date, `t`, time, `z`, not followed by `[0-9a-z]`; case-insensitive (`qa-142-…` ≠ run `42-…`). `provider: url` / `none` → no `qa-env` resources.

## Outcome

**Full success** = every phase gate of the effective level passed, any verdict (Not homologated published correctly = success): Q7 `--check-ledger` exit 0; L3 Q8 branch pushed + MR open; L2/L3 Q9 preview approved, comment published, every capture uploaded.

| `--outcome` | Situation | Plan |
| ----------- | --------- | ---- |
| `success` | Full success | Delete per matrix |
| `upload_partial` | Q9 published, captures not uploaded | Keep all (human attaches) |
| `blocked` | Verdict Blocked (env never healthy, commit mismatch, blocked ratio) | Keep all |
| `gate_failure` | Gate rejected, script error, MCP down | Keep all |
| `incomplete` | Human chose "stop" at a pause / "do not publish" | Keep all |
| `paused` | Waiting on human (checkpoint, stall, score below min, preview) | No Q10; no log line; wait indefinitely |
| `leftover` | Human asked to remove a kept run's env | Delete `via: qa-env` only; agent-owned kept |

Planner rejects (exit 2): open pause unless `paused`; `paused` without one; `success` unless `run.json` proves it — no pause answered `stop`/`do_not_publish`, no `phases[]` entry `failed`/`running`, required gates `passed` (L1: Q0–Q7, + Q7b when present; L2: + Q7b, Q9; L3: + Q7b, Q8, Q9) and `phase` = last required gate. L3 run with Q8 skipped (nothing to automate) cannot prove success yet → keeps everything; Q8 no-op semantics land in Phase 5.

## Matrix (`success`, effective ≥ L1)

| Effective level | Env (`container`, `volume`, `database`) | `image` | `worktree` | `evidence_dir` |
| --------------- | --------------------------------------- | ------- | ---------- | -------------- |
| L2 / L3 | delete | delete | delete | delete |
| L1 | delete | delete | delete | delete all except `report.md` + `qa-ledger.json` (`cleanup.keep_local_report_at_L1`, default `true`) |

Category absent from `cleanup.on_full_success` → kept, reason logged.

**Known gap (Phase 4):** E2E-repo worktrees (`execution-lanes.md`, `git -C <e2e_root> worktree add`) get step `git worktree remove <id>` without `-C` → fails, keeps (fail-safe). Fix: resource repo-root field + `git -C`. Unreachable at L1 (Q10 not run).

## Never deleted

Anything not in `run.json` (shared/daily stack, base images, other runs' resources, pool slots) · E2E remote branch + MR (Q8) · published comment · `cleanup.log`.

## Procedure

1. `python3 scripts/qa_gate.py --check-run <run_dir>/run.json` → exit 0.
2. `python3 scripts/qa_cleanup_plan.py --run <run_dir>/run.json --outcome <outcome> --profile docs/context/qa-profile.md` (profile validated like Q0; invalid → exit 3). `run_q10: false` → stop here.
3. Execute `steps` in `order` (containers → volumes/db → images → worktrees → evidence), one at a time. Run `argv` directly (no shell); `command` = same argv shell-quoted, for display:
   - `via: qa-env` → `<environment.script> down --run <id> --manifest <run.json> --resource <kind>:<id>`; validate with `--check-env`.
   - `worktree` (agent) → check `preconditions` first; `git worktree remove <id>`; **never** `--force`; dirty → failure.
   - `evidence_dir` (`argv: null`) → file operation: `delete_except` keeps `keep_files`; `delete` removes whole dir.
4. **First failure → stop.** Keep everything not yet removed; no retry, no force.
5. Append exactly one line to `log_path` (`log_line` with `{utc_timestamp}` and `{result}` filled: `ok` or `stopped at <kind>:<id>: <reason>`). Append-only; never deleted.
6. Report removed / kept / stop reason. L1 local report path stays valid.

## Leftovers

Kept run, human later decides: `<environment.script> down --run <run_id> --manifest <run_dir>/run.json` (removes `via: qa-env` entries, ordered, stops on first failure) or plan with `--outcome leftover`. Agent-owned worktree / evidence: human reviews first. Only on explicit human request.
