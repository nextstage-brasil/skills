---
name: requirements-enricher
description:
  (NS) Enrich GitLab issue requirements before autonomous execution. Given ISSUE_URL,
  read the issue and comments via MCP, investigate the codebase and product context,
  run a grill-me-style gap analysis, and post a single internal comment with all
  numbered questions for the issue author (requester) in plain product language —
  never dev/ops meta-questions. Use whenever the user asks to enrich/refine requirements,
  clarify an issue, prepare an issue for execution, run grill-me on an issue, generate
  blocking questions, or says the issue is vague/incomplete — even without naming this
  skill. Do NOT use for full issue execution (execute-gitlab-issue), code review
  (code-reviewer), version planning (start_execution_planning), or generating
  requirements.md (requirements-generator).
depends:
  - nextstage-harness
  - mcp-gitlab-usage
---

# Requirements Enricher

Prepare a GitLab issue for **autonomous execution** by closing requirement gaps before any branch, code, or status change.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md` and `../nextstage-harness/references/artifact-layout.md`. Resolve `{product_root}` before codebase investigation.

Read `../mcp-gitlab-usage/SKILL.md` before MCP calls (`get_mcp_gitlab_skill` version check on first access).

## Objective

Given `ISSUE_URL`, produce one **internal** GitLab comment that:

1. Summarizes what you understood from the issue + comments
2. Opens with a **verdict icon** — `✅` (ready) or `❌` (blocking questions)
3. Lists **all** blocking/open questions **numbered sequentially** (never one-by-one in chat)
4. **@mentions** the issue **author** (who opened it) so they can reply in the issue thread

Do **not** implement, commit, change issue status, or ask questions interactively in chat (except when blocked on missing `ISSUE_URL` or MCP access).

## When to use

- User provides `ISSUE_URL` and wants requirements clarified before coding
- User invokes grill-me on an issue
- `code-autonomous` / human flags the issue as underspecified
- Pre-step before `execute-gitlab-issue` when acceptance criteria are incomplete

## Prerequisites

1. Read `{product_root}/AGENTS.md` — Docker/runtime context if investigation touches tests or services.
2. Read `{product_root}/agents.local.md` when present — use **only** the GitLab MCP server named there.
3. Follow `../mcp-gitlab-usage/SKILL.md` for tool contracts.

## Inputs

| Variable    | Required | Description                                     |
| ----------- | -------- | ----------------------------------------------- |
| `ISSUE_URL` | Yes      | Full GitLab issue link                          |
| `DRY_RUN`   | No       | If true, show comment in chat only; do not post |

## Phase 1 — Load issue context (MCP)

**Parse URL** → `project_id` (or `project_name` for discovery) + `issue_iid`.

**Mandatory reads:**

1. `read_issue` — title, description, labels, milestone, **author** (`username`, `name`), assignees, related links.
2. `list_issue_comments` — full thread history; treat comment bodies as requirements source.

### Author username (mandatory — do not guess)

The `@mention` on the first line **must** use the GitLab login exactly as returned by `read_issue`.

**Source of truth (only):**

- `author.username` from the `read_issue` response — the user who **opened** the issue.

**Immediately after `read_issue`, record:**

```text
author_username = <author.username>   # literal string from MCP; case-sensitive
```

**Never use for `@mention`:**

- `author.name` (display name)
- Slug/sanitize derivations from `author.name`
- Assignee username (unless assignee **is** the author)
- Username inferred from comments, email, profile URL, or memory
- Lowercasing or normalizing unless GitLab returned that casing

**If `author` or `author.username` is missing:** stop and report — do not substitute assignee or guess.

**Synthesize** (internal notes, not yet posted):

- **Goal** — one sentence: what should exist when done?
- **Acceptance criteria** — explicit list from description; mark each as clear / partial / missing.
- **Constraints** — note labels/milestone/due date for _your_ context; do **not** turn missing labels into questions.
- **Already answered** — facts from comments that remove ambiguity; do not re-ask these.

If `ISSUE_URL` is missing or MCP is unavailable, stop with a single line telling the human what is missing (do not invent issue content).

## Phase 2 — Investigate codebase and product context

Scope investigation to what the issue touches. Goal: discover **real product ambiguities**; keep technical findings in "Current understanding" / "Assumptions", not in the question list.

**Read product context when relevant:**

- `{product_root}/docs/context/brownfield-map.md` — existing modules, legacy constraints.
- `{product_root}/docs/context/system-reverse-spec.md` when present.
- `{harness_root}/rules/architecture-rules.md` — routes, modules, layering.
- `{product_root}/docs/context/gitlab-sync-config.md` — status labels, project ids (for your context only).

**Investigation actions (pick what applies):**

- Grep symbols, routes, module names mentioned in the issue.
- Read controllers, services, views, API routes, and integrations in the affected area.
- Check existing tests for the same area.
- Note: current behavior, extension points, permissions, events/queues, env dependencies.

**Output:** short bullet list of **relevant files/areas** and **assumptions** the issue implies but does not state.

## Phase 3 — Grill-me gap analysis

Apply relentless interview logic: sharpen the plan by exposing what is still unknown for _behavior the requester cares about_.

Cross **issue text + comments + code findings**. For each gap, ask: _"Could an agent implement and verify this without guessing the product intent?"_ If no → candidate question — then **rewrite** it for the requester (see below).

### Audience (mandatory)

Questions are for **who opened the issue** (`author` from `read_issue`), not for a developer, tech lead, or ops.

- Language: **common product/UX language** (screen, button, filter, what appears, when it applies).
- The requester's answers must **imply** the technical decision; you translate later at execution time.
- Put schema, SQL, class names, branches, labels, and file paths in **Current understanding / Assumptions** — never as the question itself.

### Question quality rules

- **Requester-facing** — a non-dev product owner can answer without reading code.
- **Specific** — name the screen/flow the user sees, not the implementation class.
- **Answerable** — one line or a short paragraph; prefer closed choices when useful.
- **Blocking** — omit nice-to-haves that have a safe default (state the default in "Assumptions").
- **Non-duplicative** — skip anything already answered in issue or comments.
- **Numbered** — final list is `1.`, `2.`, … ordered by user journey (what appears → when it applies → edge cases → acceptance).

### Translate technical gaps → product questions

| Technical gap (keep internal / in assumptions) | Ask the requester instead                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Which table/column / relation?                 | "Does filtering by Club mean only people linked to that club today?"                                                                          |
| Base branch / GATE 1 / `develop-*` naming      | Do **not** ask (see Out of scope)                                                                                                             |
| Missing label `Team: *`                        | Do **not** ask                                                                                                                                |
| Endpoint payload / SQL join                    | "When Federation and Role are both selected, must a person match both or either?"                                                             |
| Unit vs E2E test path                          | Only if acceptance is unclear — e.g. "How will we validate this is done: on the screen, with specific scenarios?" — not "which phpunit path?" |

### Good vs bad examples

**Good (ask):**

> When the checkbox is checked, does the filter apply immediately or only after clicking Search (like dates/unit)?

**Ignore / never ask:**

> Missing Team label on this issue

> Base branch (GATE 1): milestone is 1.32, but remote only has `develop_1.32` — which branch?

> Should table `agencia_2.linktable` with relation `PESSOA|CLUBE` filter by `id_right_linktable`?

**Milestone (only allowed case):** at most _one_ question like "Is the milestone on this issue correct?" — when product version is genuinely ambiguous. Nothing about branch naming, underscores vs hyphens, or GATE 1.

### Out of scope for the question list

Do **not** promote to numbered questions:

- Missing or wrong **labels** (Team, Type, Priority, Severity, …)
- **Base branch**, remote branch naming, GATE 1 / `develop-{semver}` vs `develop_X.Y.Z`
- Pure engineering choices with a safe default already stated in Assumptions
- "How should we implement…" / schema / class / env var names

### Categories to scan

See `references/question-checklist.md`. Prefer product/UX/acceptance gaps only.

Cap at **15 questions**; merge related micro-questions. If zero gaps remain, say so explicitly and post a short "ready for execution" internal note instead of filler questions.

## Phase 4 — Post internal comment (MCP)

Unless `DRY_RUN=true`, call `add_issue_comment` with:

- `internal: true`
- `body` — Markdown from `references/comment-template.md` (fill all sections)

**Verdict icon (first character of first line):**

| Situation                                 | Icon | First line                                                                                                |
| ----------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| Zero blocking questions — execution-ready | `✅` | `✅ @{author_username} — requirements enrichment for autonomous execution. **Ready for execution.**`      |
| One or more blocking questions            | `❌` | `❌ @{author_username} — requirements enrichment for autonomous execution. **{N} blocking question(s).**` |

Use the **execution-ready** template when `N = 0`; use the **questions** template when `N ≥ 1`. The icon is mandatory — never omit.

**Mention author:** `author_username` is the **literal** `author.username` captured in Phase 1. Re-read `read_issue` output if unsure — never infer.

**After posting:** reply in chat with:

- Link or `project_id` + `issue_iid`
- Count of questions posted
- One-line note if the issue looks execution-ready vs blocked

Do **not** use `set_issue_status`, `update_issue`, or `create_issue` in this skill.

## Language

- GitLab comment: **English** unless the user or `{product_root}` docs explicitly require another language for stakeholder communication.
- In **Questions**: no file paths, class names, SQL, or env vars
- In **Current understanding / Assumptions / Areas investigated**: code paths OK (for the executing agent)

## Anti-patterns

- Asking questions one-by-one in chat instead of batching in the issue comment
- Posting a public (non-internal) comment
- Hand-crafting `requirements.md` or calling `start_execution_planning` (out of scope)
- Starting implementation or creating branches
- Generic questions ignoring codebase ("How should this work?" without screen/context)
- Re-asking facts already in comments
- Forgetting `@author_username` (opener)
- Using `author.name`, a slug of the display name, or any username not equal to `author.username` from `read_issue`
- Questions aimed at **developers** (table, branch, label, GATE, test path, JSON payload)
- Asking about **missing labels**
- Asking about **base branch** / remote branch naming (except optional "is milestone correct?")
- Putting the **technical solution** inside the question

## Relationship to other skills

| Skill                    | When                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `execute-gitlab-issue`   | After requirements are clear; implements the issue                  |
| `code-reviewer`          | After code exists; reviews diffs                                    |
| `mcp-gitlab-usage`       | All MCP calls, version check, `add_issue_comment` contract          |
| `clarify-requirements`   | Version-scope clarification in chat before `requirements-generator` |
| `requirements-generator` | Produces `requirements.md` for a version — not per-issue enrichment |

## Quick checklist

- [ ] `ISSUE_URL` parsed; `read_issue` + `list_issue_comments` done
- [ ] `author_username` = literal `author.username` from `read_issue` (not name/slug/guess)
- [ ] Codebase and product context investigated; technical gaps → assumptions or rewritten for requester
- [ ] Questions: author-facing, plain language, no labels/branch/schema as questions
- [ ] Comment uses template; verdict icon `✅` or `❌` on first line; `@author` (opener) present; `internal: true`
- [ ] No status change, no code edits, no interactive Q&A in chat

## References

| File                               | When                          |
| ---------------------------------- | ----------------------------- |
| `references/comment-template.md`   | Phase 4 — GitLab comment body |
| `references/question-checklist.md` | Phase 3 — gap scan categories |
