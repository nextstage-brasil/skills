---
name: ns-code-coder
description: "(NS) Ad-hoc coding worker — bug fixes, small refactors, scripts, migrations — without full SDD. Entry priority 5: use for \"just implement this\", \"quick fix\", or concrete coding without execution-handoff (also C2 under ns-code-autonomous). Do NOT use for GitLab ISSUE_URL (ns-execution-gitlab-issue), multi-day/version scope (ns-spec-driven), diagnosis-only (ns-code-investigator), or when execution-handoff.md exists. Do NOT generate requirements/tasks/handoff."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.3"
depends:
  - ns-harness
  - ns-code-investigator
  - ns-code-frontend-design
  - ns-code-best-practices
  - ns-code-backend-tests
  - ns-code-e2e-tests
  - ns-code-docs-writer
  - ns-code-reviewer
  - ns-code-autonomous
---

# Code Coder

Central **execution worker** for ad-hoc diffs (and as `C2` subagent under `ns-code-autonomous`). **Not the front door** — the host agent picks entry per `../ns-harness/references/code-skill-routing.md`.

## Workflow mode (mandatory)

This skill is a **fixed workflow**, not a loose checklist. Steps run in order; handoffs use **named skills only**. Do not substitute platform subagents, personas, or improvised review.

Canonical review gate: `../ns-harness/references/review-gate-workflow.md` — follow exactly for steps 7–8. Review **only** via `ns-code-reviewer`; max **3** rounds; after any Critical fix, **re-review** is mandatory; never report success without a passing verdict or an explicit **blocked** state.

## Routing (read first)

| Signal | Redirect |
| ------ | -------- |
| GitLab `ISSUE_URL` detected | **Stop** → `ns-execution-gitlab-issue` |
| Multi-day / version / SDD scope | `ns-spec-driven` |
| Obscure bug, root cause unclear | `ns-code-investigator` |
| Ad-hoc diff ready | `ns-code-reviewer` (review loop below) |

Entry priority **5** (default). Harness table: `../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

### When to use (entry)

- Bug fixes and hotfixes outside a planned version
- Isolated component, hook, service, or utility
- Small refactors (≤ 1 file or tight group)
- Scripts, migrations, seeds outside version lifecycle
- "Just implement this" without `execution-handoff.md`

### When invoked as C2 (engine mode)

When `ns-code-autonomous` dispatches this skill as a work-unit subagent inside an existing worktree: follow the unit scope only. Do **not** re-route to `ns-execution-gitlab-issue` if an `ISSUE_URL` appears in code or comments — that is context, not a routing signal. Escalate new destructive doubts to the caller (`A`), not to GitLab skills.

For full planned versions with `execution-handoff.md`, follow
`../ns-sdd-execution-handoff-generator/references/run-implementation.md` and update the
handoff per `../ns-sdd-execution-handoff-generator/SKILL.md` — not this skill's ad-hoc
cycle below.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. **Complete Session boot (blocking)** there before any other step in this skill.

## Session inputs

| Variable             | Required                                                        |
| -------------------- | --------------------------------------------------------------- |
| `{product_root}`     | Yes (or infer if single obvious product)                        |
| `{task_description}` | Yes                                                             |
| `{target_layer}`     | Infer when possible: frontend, backend, infra, tests, fullstack |

## Scope isolation

Operate only under `{product_root}/**` plus harness docs. Do not read other products in a monorepo unless asked.

## Boot (mandatory)

Complete **Session boot (blocking)** in `../ns-harness/references/harness-discovery.md`, then:

1. `git status` and `git diff`
2. **Read target files before writing**

**Success criterion:** following project rules and task scope = success; inventing paths, SDD artifacts, or cross-product changes = failure.

## Implementation rules

- **Diff-first** — only required lines; no unrelated formatting
- **Prefer editing** existing files over new files
- **Large change gate:** >1 file simultaneously, >20 lines in one file, or public contract change → one-line plan, wait for approval
- **No commits** unless human explicitly asks — when committing, see `../ns-harness/references/agent-git-identity.md`
- **No SDD artifacts** — no `task-NNN.md`, `requirements.md`, `execution-handoff.md`
- **No gratuitous comments** unless requested
- Run tests per `AGENTS.md` Docker and testing; project-specific container and commands live in `architecture-rules.md`

## Per-task cycle

1. Understand task
2. Load rules
3. Explore relevant files
4. Identify minimal diff
5. Apply (or present plan if large-change gate)
6. Run tests if in scope (see **Pre-review** below)
7. **Review loop** — invoke `ns-code-reviewer` only; iterate per `../ns-harness/references/review-gate-workflow.md`
8. **Final report** — mandatory fields per **Final report** below; never skip verdict or round count

### Pre-review (before step 7)

- Run tests covering changed files per `AGENTS.md` and `../ns-harness/references/docker-and-testing.md`.
- If the diff removes exports, constants, env flags, or public symbols: search the repo for remaining call sites and resolve before review.

## Review loop (mandatory)

After pre-review (step 6), run the gate in `../ns-harness/references/review-gate-workflow.md` before reporting done.

- Invoke **`ns-code-reviewer`** on the working-tree diff (`git diff`) — read its `SKILL.md`; no `ISSUE_URL`, no version-closure path. Just the ad-hoc diff.
- **Max 3 rounds.** Score gate from `ns-code-reviewer`: pass ≥**9**/10, ideal **10**/10.
  - **Pass:** zero Critical Issues **and** overall score ≥ **9**/10 → proceed to step 8.
  - **Fail** (Criticals **or** score ≤ **8**) with rounds left → apply the minimal diff that clears Criticals and lifts quality to ≥9 (`ns-code-reviewer` is read-only, so this skill applies the fixes), re-run tests if in scope, then **mandatory re-review** via `ns-code-reviewer`.
  - **Rounds exhausted** still failing the gate → **stop and report as blocked**. List unresolved Criticals and/or the last score. Do not report success.
- Keep fixes within the original task scope. If a Critical (or score-blocking Warning) requires changes outside scope (public contract, cross-product, multi-day work), stop and escalate per **Stop conditions** instead of expanding the diff.
- Suggestions (P2) alone do not block when score is already ≥9: carry them into the final report as follow-ups.

## Final report (step 8)

Do not use "done", "concluído", or success language until the review gate passes or the run is explicitly **blocked** (see `review-gate-workflow.md`).

Every closure response **must** include:

| Field | Value |
| ----- | ----- |
| Active skill | `ns-code-coder` |
| Reviewer skill | `ns-code-reviewer` |
| Review round | Last round executed: `1`, `2`, or `3` |
| Score | Last overall score from reviewer |
| Verdict | Exact line: `Code Review: {Approved\|Rejected\|Blocked}` |

Then: what changed, follow-ups, and blocked Criticals if applicable.

## Stop conditions

| Condition                                       | Action               |
| ----------------------------------------------- | -------------------- |
| `{product_root}` unclear with multiple products | Ask once             |
| Large change gate                               | Plan + wait          |
| Public contract or cross-product boundary       | Stop, explain, ask   |
| Task needs multi-day SDD planning               | Redirect to `ns-spec-driven` |

## Related skills

- `ns-code-reviewer` — mandatory review loop after implementation (see **Review loop**)
- `ns-code-investigator` — if blocked by unclear bug
- `ns-code-autonomous` — autonomous multi-agent execution (GitLab issue or local plan); for a GitLab issue, use `ns-execution-gitlab-issue` instead

## Forbidden

- SDD artifact generation
- Cross-product access without scope
- Commits without explicit request
- Refactors outside task scope
- **Review substitutes** — Cursor Task subagents (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or any review not executed by reading and following `ns-code-reviewer` / `SKILL.md`
- **Skipping re-review** — reporting success after a fix when the previous `ns-code-reviewer` verdict was `Rejected` or score < 9 without a new passing round
- **Success without verdict** — closure without the mandatory **Final report** fields and a parseable `Code Review:` line
