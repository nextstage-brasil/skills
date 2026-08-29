---
name: ns-coder
description: "(NS) Ad-hoc coding worker — bug fixes, small refactors, scripts, migrations — without full SDD. Entry priority 5: use for \"just implement this\", \"quick fix\", or concrete coding without execution-handoff (also C2 under ns-autonomous). Do NOT use for GitLab ISSUE_URL (ns-execution-gitlab-issue), multi-day/version scope (ns-spec-driven), diagnosis-only (ns-investigator), or when execution-handoff.md exists. Do NOT generate requirements/tasks/handoff."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "2.1"
depends:
  - ns-harness
  - ns-investigator
  - ns-frontend-design
  - ns-best-practices
  - ns-backend-tests
  - ns-e2e-tests
  - ns-docs-writer
  - ns-reviewer
  - ns-autonomous
  - ns-living-spec
---

# Code Coder

Central **execution worker** for ad-hoc diffs (and `C2` under `ns-autonomous`). **Not front door** — host picks entry per `../../ns-harness/references/code-skill-routing.md`.

## Workflow mode (mandatory)

**Fixed workflow**, not loose checklist. Steps in order; handoffs = **named skills** or harness bridges (`coder-agent` / `reviewer-agent` per `../../ns-harness/references/subagent-dispatch.md`). No platform Task personas or improvised review.

Canonical review gate: `../ns-reviewer/references/review-gate-workflow.md` — steps 7–9 **ad-hoc / C2 only**. Review **only** via `reviewer-agent` then `ns-reviewer` (**MUST** bridge when available; else direct); max **3** rounds; **`Approved` = score 10 only**. Score **9** = `Rejected` (Lift + mandatory re-review). No success without `Approved` or **blocked**. After `Approved`: Living specs (8) if match, then Final report (9).

**Exception — SDD handoff mode:** caller `run-implementation` / `execution-handoff.md` (or dispatch says SDD task mode): **skip** review gate + living specs. Parent owns review at version closure. See **When invoked under execution-handoff**.

## Routing (read first)

| Signal | Redirect |
| ------ | -------- |
| GitLab `ISSUE_URL` detected | **Stop** — `ns-execution-gitlab-issue` |
| Multi-day / version / SDD scope | `ns-spec-driven` |
| Obscure bug, root cause unclear | `ns-investigator` |
| Ad-hoc diff ready | `reviewer-agent` then `ns-reviewer` (review loop below) |

Entry priority **5** (default). Harness table: `../../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

### When to use (entry)

- Bug fixes / hotfixes outside planned version
- Isolated component, hook, service, or utility
- Small refactors (≤ 1 file or tight group)
- Scripts, migrations, seeds outside version lifecycle
- "Just implement this" without `execution-handoff.md`

### When invoked as C2 (engine mode)

`ns-autonomous` dispatches as work-unit subagent in existing worktree: unit scope only. Do **not** re-route to `ns-execution-gitlab-issue` on `ISSUE_URL` in code/comments — context, not routing. Escalate destructive doubts to caller (`A`), not GitLab skills. No living-spec consolidator as C2 — version closure/caller owns. Complete ad-hoc **Review loop** unless caller says SDD handoff / defer review.

### When invoked under execution-handoff (SDD task mode)

Parent `run-implementation` (classic SDD) or dispatch **SDD handoff / execution-handoff**:

1. **Scope:** classic = one **batch** (same-layer consecutive `pending`, prefer 4–7, hard max 7; size 1 = single task) per `references/run-implementation.md`. Partitioned slice = that slice's tasks. Parent owns handoff file updates.
2. Read each task **card** (header through Validation criteria); open `Detailed description` on demand (ambiguity or `blocked`) — `../ns-spec-driven/references/task-schema.md`.
3. Implement + unit/integration only. No E2E.
4. **Forbidden:** `reviewer-agent` / `ns-reviewer`, living-spec consolidator, `Code Review:` verdict line.
5. **Before report complete:** public-export grep (**Pre-review**). Still **no** reviewer.
6. Report to parent **per task**: files changed, tests run, blockers, tokens (split or `~N`), `Layout SSoT: {path} read | none registered`. Parent marks rows and runs Step 5 review once all tasks done (`Approved` = **10**). Session boot: cold start this agent = full boot per `session-boot.md`; same agent continuing = no full re-read unless `agents.local.md` / harness rules changed.

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** before any other step — cold start only; mid-session skip if already booted and files unchanged. Never tool-Read `AGENTS.md`.

After session-boot steps 1–6:

- Load **all** `.nextstage-harness/rules/*.md` marked **always-applicable** in harness `manifest.json`, plus layer rules for target layer.
- Load **agent-requested** rules when `manifest.json` `description` matches task scope (persistence, auth, tenancy, build). No manifest: scan `rules/*.md`; read files whose scope matches.
- Unread mandatory rules = **incomplete boot**. Do not pick stack default to fill gap.
- **Stack signals:** detected stack implies expected sibling rule — `../../ns-harness/references/architecture-rules/stack-signals.md`. Rule present: load. Absent: ask or mark `needs-clarification` — never assume framework default.

## Session inputs

| Variable | Required |
| -------- | -------- |
| `{task_description}` | Yes |
| `{target_layer}` | Infer when possible: frontend, backend, infra, tests, fullstack |

## Scope isolation

Operate only inside the repo + harness docs.

## Boot (mandatory)

**Session boot** (`../../ns-harness/references/session-boot.md`) — one rule for ad-hoc, C2, SDD handoff:

| Agent state | Action |
| ----------- | ------ |
| Cold start (this agent/subagent just started) | Full Session boot (steps 1–6). Bridge may have done local + architecture/project rules — finish layer rules + context |
| Same agent continuing; steps 1–6 done; files unchanged | Do **not** re-read rule corpus |
| `agents.local.md` or harness rules changed since last boot | Re-boot |

Then:

1. Obey `AGENTS.md` orders (already in context) — no invented paths
2. `git status` and `git diff`
3. **Read target files before writing**

**Success:** `AGENTS.md` orders + project rules + task scope. Invented paths or SDD artifacts (except handoff updates when parent owns them) = failure.

## Implementation rules

- **Constitution over card:** card prescribes persistence/API/gate/pattern rules forbid — implement rules path; annotate `card deviation: {card} -> {rules}` in `## Execution notes`. Large/ambiguous deviation: `blocked`.
- **Grounding check before diff:** card names class/command absent from repo and rules — stop and report. Do not implement.
- **Persistence source:** persistence path from `architecture-rules.md` + mandatory project rules (Session boot). Forbidden to assume ORM or upsert default when rules silent — ask or `blocked`.
- **Rules + code same turn:** rule request + code delivers diff same turn, not harness text only.
- **Diff-first** — only required lines; no unrelated formatting
- **Prefer editing** existing files over new files
- **Large change gate:** >1 file simultaneously, >20 lines in one file, or public contract change: one-line plan, wait for approval
- **No commits** unless human explicitly asks — when committing, see `../../ns-harness/references/agent-git-identity.md`
- **No SDD version artifacts** — no `task-NNN.md`, `requirements.md`, `execution-handoff.md`, or `docs/versions/` writes. Conditional living-spec updates under `docs/specs/` via `ns-living-spec` allowed (see **Living specs**).
- **No gratuitous comments** unless requested
- Tests per `AGENTS.md` Docker + testing; container/commands in `architecture-rules.md`
- Under `execution-handoff.md` / `run-implementation`: **unit/integration only** — no E2E (human at version end); no review gate (parent Step 5)

## Complement delegation

`spec-driven` / `gitlab` presets install complements via `depends` (check `.agents/skills/` once per session). **Delegate** — do not duplicate their workflows inline.

| Signal | Skill | When |
| ------ | ----- | ---- |
| Frontend UI **without** Layout SSoT registered for screen being built (`reference-sources.md` `role: ui-layout`, or card cites `*-visual.md`) | `ns-frontend-design` | Before large UI diff (step 4–5) or when task is primarily visual |
| Layout SSoT **registered** for screen being built | *(none — read SSoT)* | Open cited guide/prototype **before** diff; match registered pattern + project UI approach; **do not** invoke `ns-frontend-design` anti-slop |
| Security headers, CSP/CORS, dep CVE sweep, a11y/Web Interface Guidelines audit | `ns-best-practices` | On explicit request, or after frontend work before review when hygiene was in scope |
| README / `docs/` guides (not code comments) | `ns-docs-writer` | On explicit request or version/doc closure — not every ad-hoc fix |

MR/SOLID review stays **`ns-reviewer`** only. Missing complement: continue with harness rules; recommend install once per session (`../ns-spec-driven/references/skill-integrations.md`).

## Per-task cycle

**SDD handoff mode:** one dispatch may cover a **batch**; still stop after step 6; report **per task** to parent; skip 7–9.

1. Understand task
2. Load rules — obey `AGENTS.md` already booted; Session boot again only if cold start this agent or files changed
3. Explore (grep/head large fixtures — no full test dumps)
4. Identify minimal diff
5. Apply (or plan if large-change gate)
6. Run tests if in scope + public-export grep (**Pre-review**)
7. **Review loop** — **MUST** `reviewer-agent` when available (else `ns-reviewer`); `../ns-reviewer/references/review-gate-workflow.md`
8. **Living specs (conditional)** — see below
9. **Final report** — mandatory fields; never skip verdict or round count

### Pre-review (before step 7; also before SDD report complete)

- Tests covering changed files per `AGENTS.md` and `../../ns-harness/references/docker-and-testing.md`.
- Diff removes exports/constants/env flags/public symbols: search remaining call sites; resolve before review.
- List **new or newly exported** public names (`return { }`, `module.exports`, `export`, `public`/`public static`, window/global attach).
- Grep each: **no caller outside defining module** — keep private/unexported. Continue (ad-hoc: review; SDD: report parent). **Forbidden** reviewer in SDD handoff.
- Internal/private/nested helpers: keep.

## Review loop (mandatory ad-hoc / C2; skip SDD handoff)

After step 6, run `../ns-reviewer/references/review-gate-workflow.md` before done — **except SDD handoff** (return to parent; no review).

- **MUST** invoke **`reviewer-agent`** when available (else **`ns-reviewer`**) on working-tree diff (`git diff`) — reviewer bridge/skill begins Session boot at cold start then reviewer workflow; no `ISSUE_URL`, no version-closure path. Ad-hoc diff only.
- **Max 3 rounds.** `Approved` = score **10** only (`review-gate-workflow.md`).
  - **Pass:** `Approved` (score **= 10**, zero Criticals) → step 8.
  - **Lift:** `Rejected` **and** score **= 9**, rounds left: in-scope fix toward **10**, tests if in scope, **mandatory re-review**.
  - **Fail:** Criticals **or** score ≤ **8**, rounds left: same as Lift (fix + tests + re-review). `reviewer-agent` / `ns-reviewer` read-only — this skill applies fixes. **MUST** `reviewer-agent` when available; else `ns-reviewer`.
  - **Stop:** `Blocked` or 3 rounds exhausted → **report blocked**. List unresolved Criticals and/or last score. No success. Skip step 8.
- Fixes within original task scope. Critical (or score-blocking Warning) needs changes outside scope (public contract, cross-product, multi-day): stop, escalate per **Stop conditions**.
- Suggestions (P2) alone do **not** block when `Approved`. Score **9** still Lift even if only P2.

## Living specs (step 8, conditional)

Only after `Code Review: Approved` (not as C2). Invoke **`ns-living-spec`** **ad-hoc** when **all** true:

1. `docs/specs/` exists
2. Diff **behavioral** (API, schema, UX, or domain behavior) — skip cosmetic / rename-only / pure refactor
3. Skill available (installed via `depends`)

Pass: mode `ad-hoc`, `{task_description}`, approved `git diff`. Read consolidator `SKILL.md`, follow it. No invent `{version_san}` or write under `docs/versions/`.

**Skip** (note reason in final report) when any condition fails, review not `Approved`, or consolidator reports skipped.

## Final report (step 9)

No success language until gate passes or **blocked** (`review-gate-workflow.md`). **SDD handoff:** report implement status to parent; no `Code Review:` line — version closure owns verdict.

Every ad-hoc / C2 closure response **must** include:

| Field | Value |
| ----- | ----- |
| Active skill | `ns-coder` |
| Reviewer skill | `ns-reviewer` (via `reviewer-agent` when dispatched) |
| Review round | Last round executed: `1`, `2`, or `3` |
| Score | Last overall score from reviewer |
| Verdict | Exact line: `Code Review: {Approved\|Rejected\|Blocked}` |
| Living specs | `updated` \| `skipped: {reason}` \| `n/a` (blocked/rejected) |
| Layout SSoT | `{path} read` \| `none registered` |

Then: what changed, follow-ups, blocked Criticals if applicable.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| Large change gate | Plan + wait |
| Public contract change | Stop, explain, ask |
| Task needs multi-day SDD planning | Redirect to `ns-spec-driven` |

## Related skills

- `ns-reviewer` — mandatory review loop after implementation (**Review loop**)
- `ns-living-spec` — conditional ad-hoc living-spec update after `Approved` (**Living specs**)
- `ns-investigator` — blocked by unclear bug
- `ns-autonomous` — autonomous multi-agent execution (GitLab issue or local plan); GitLab issue use `ns-execution-gitlab-issue` instead
- `ns-frontend-design` — UI/design work (**Complement delegation**)
- `ns-best-practices` — security/CSP/a11y hygiene pass (**Complement delegation**)
- `ns-docs-writer` — README / `docs/` guides on request (**Complement delegation**)

## Forbidden

- SDD **version** artifact generation (`docs/versions/`, handoff, requirements/tasks)
- Living-spec consolidator **before** `Code Review: Approved`, or when `docs/specs/` missing
- Out-of-repo access without scope
- Commits without explicit request
- Refactors outside task scope
- **Review substitutes** — Cursor Task subagents (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or any review not via `reviewer-agent` / `ns-reviewer` `SKILL.md`. Harness `reviewer-agent` **allowed**.
- **Skipping re-review** — success after `Rejected` (including score **9**) without a new `Approved` round (ad-hoc / C2)
- **Success without verdict** — ad-hoc / C2 closure without mandatory **Final report** fields and parseable `Code Review:` line
- **Per-task / mid-batch review under handoff** — `reviewer-agent` / `ns-reviewer` during `run-implementation` task or batch (parent owns Step 5)
