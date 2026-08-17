---
name: ns-requirements-enricher
description: (NS) Enrich requirements before autonomous execution from a GitLab issue or chat context. Use when the user asks to enrich/expand requirements, flesh out acceptance criteria, or prepare issue context for coding agents. Do NOT replace `/ns-spec-driven` Specify for full version requirements.md.
  **Issue mode:** given ISSUE_URL, read issue and comments via MCP, investigate codebase,
  run grill-me gap analysis, post one internal comment with numbered questions for the
  issue author. **Chat mode:** when the user pastes or describes requirements/scope in
  conversation (no issue), run the same analysis and render numbered questions inline
  in chat only — no files, no GitLab posts. Use whenever the user asks to enrich/refine
  requirements, clarify scope, prepare for execution, run grill-me, or generate blocking
  questions — with or without a GitLab issue. Do NOT use for full issue execution
  (ns-execution-gitlab-issue), code review (ns-reviewer), version planning
  (start_execution_planning), or generating requirements.md (`/ns-spec-driven` Specify).
license: Apache-2.0
provides:
  - gate:requirements-enrichment
consumes:
  - artifact:gitlab-issue
metadata:
  author: nextstage-brasil
  version: "1.1"
---

# Requirements Enricher

Prepare requirements for **autonomous execution** by closing gaps before any branch, code, or status change.

## Mode detection

| Mode | Trigger | Delivery |
| ---- | ------- | -------- |
| **Issue** | `ISSUE_URL` present or user points to GitLab issue | Post one **internal** GitLab comment (Phase 4) |
| **Chat** | User pastes/describes requirements in conversation — no issue URL | Render verdict + numbered questions **inline in chat only** — no files, no GitLab, no version artifacts |

Both modes share Phases 2–3 (investigation + grill-me). Phase 1 (MCP load) applies only in **issue** mode.

## Session boot

Optional — skip that step if path missing. Investigate codebase after this boot when repo available.

1. If `agents.local.md` exists beside `AGENTS.md`, read once. Never tool-Read `AGENTS.md`.
2. If `.nextstage-harness/rules/` exists, read `architecture-rules.md` and `project-rules.md` when present.
3. If `docs/context/` exists, list it; read reverse-spec / brownfield-map when present.
4. If GitLab MCP available, follow `mcp-gitlab-usage` when that skill installed (`get_mcp_gitlab_skill` version check on first access). Otherwise stay in chat mode.

## Objective

**Issue mode:** given `ISSUE_URL`, produce one **internal** GitLab comment that:

1. Summarizes what you understood from issue + comments
2. Opens with **verdict icon** — `✅` (ready) or `❌` (blocking questions)
3. Lists **all** blocking/open questions **numbered sequentially** (never one-by-one in chat)
4. **@mentions** issue **author** (who opened it) so they can reply in issue thread

**Chat mode:** given requirements text from conversation, produce **inline** response that:

1. Summarizes what you understood from user's description
2. Opens with same **verdict icon** — `✅` or `❌`
3. Lists **all** blocking/open questions **numbered sequentially** in chat reply
4. Does **not** @mention anyone (no issue author)

Do **not** implement, commit, change issue status, create files, or ask questions interactively one-by-one (except when blocked on missing context or MCP access in issue mode).

## When to use

- User provides `ISSUE_URL` and wants requirements clarified before coding (**issue** mode)
- User pastes feature brief, scope, or acceptance criteria in chat without GitLab issue (**chat** mode)
- User invokes grill-me on requirements (issue or chat)
- `ns-autonomous` / human flags work as underspecified
- Pre-step before `ns-execution-gitlab-issue` when acceptance criteria incomplete

## Prerequisites

1. Obey `AGENTS.md` when already in host context — Docker/runtime context if investigation touches tests or services. Never tool-Read it.
2. Read `agents.local.md` when present — use **only** GitLab MCP server named there.
3. Follow GitLab MCP tool contracts when MCP available; if MCP missing, stay in chat mode.

## Inputs

| Variable    | Required | Description |
| ----------- | -------- | ----------- |
| `ISSUE_URL` | Issue mode only | Full GitLab issue link |
| Requirements text | Chat mode only | User message, pasted brief, or attached scope |
| `DRY_RUN`   | No       | Issue mode: if true, show comment in chat only; do not post |

## Phase 1 — Load issue context (issue mode only)

**Skip this phase in chat mode.** Use user's message and any pasted context as requirements source instead.

**Parse URL** for `project_id` (or `project_name` for discovery) + `issue_iid`.

**Mandatory reads:**

1. `read_issue` — title, description, labels, milestone, **author** (`username`, `name`), assignees, related links.
2. `list_issue_comments` — full thread history; treat comment bodies as requirements source.

### Author username (mandatory — do not guess)

`@mention` on first line **must** use GitLab login exactly as returned by `read_issue`.

**Source of truth (only):**

- `author.username` from `read_issue` response — user who **opened** issue.

**Immediately after `read_issue`, record:**

```text
author_username = <author.username>   # literal string from MCP; case-sensitive
```

**Never use for `@mention`:**

- `author.name` (display name)
- Slug/sanitize derivations from `author.name`
- Assignee username (unless assignee **is** author)
- Username inferred from comments, email, profile URL, or memory
- Lowercasing or normalizing unless GitLab returned that casing

**If `author` or `author.username` missing:** stop and report — do not substitute assignee or guess.

**Synthesize** (internal notes, not yet posted):

- **Goal** — one sentence: what should exist when done?
- **Acceptance criteria** — explicit list from description; mark each as clear / partial / missing.
- **Constraints** — note labels/milestone/due date for _your_ context; do **not** turn missing labels into questions.
- **Already answered** — facts from comments that remove ambiguity; do not re-ask these.

If `ISSUE_URL` missing in issue mode, or MCP unavailable, stop with single line telling human what is missing (do not invent issue content).

In **chat mode**, synthesize Goal, Acceptance criteria, Constraints, and Already answered from conversation text using same structure as above.

## Phase 2 — Investigate codebase and product context

Scope investigation to what issue touches. Goal: discover **real product ambiguities**; keep technical findings in "Current understanding" / "Assumptions", not in question list.

**Read product context when relevant:**

- `docs/context/brownfield-map.md` — existing modules, legacy constraints.
- `docs/context/system-reverse-spec.agent.md` when present (prefer); else `system-reverse-spec.md`.
- `.nextstage-harness/rules/architecture-rules.md` — routes, modules, layering.
- `docs/context/gitlab-sync-config.md` — status labels, project ids (for your context only).

**Investigation actions (pick what applies):**

- Grep symbols, routes, module names mentioned in issue.
- Read controllers, services, views, API routes, and integrations in affected area.
- Check existing tests for same area.
- Note: current behavior, extension points, permissions, events/queues, env dependencies.

**Output:** short bullet list of **relevant files/areas** and **assumptions** issue implies but does not state.

## Phase 3 — Grill-me gap analysis

Apply relentless interview logic: sharpen plan by exposing what still unknown for _behavior requester cares about_.

Cross **issue text + comments + code findings**. For each gap, ask: _"Could agent implement and verify this without guessing product intent?"_ If no, candidate question — then **rewrite** it for requester (see below).

### Audience (mandatory)

Questions are for **who opened issue** (`author` from `read_issue`), not for developer, tech lead, or ops.

- Language: **common product/UX language** (screen, button, filter, what appears, when it applies).
- Requester's answers must **imply** technical decision; you translate later at execution time.
- Put schema, SQL, class names, branches, labels, and file paths in **Current understanding / Assumptions** — never as question itself.

### Question quality rules

- **Requester-facing** — non-dev product owner can answer without reading code.
- **Specific** — name screen/flow user sees, not implementation class.
- **Answerable** — one line or short paragraph; prefer closed choices when useful.
- **Blocking** — omit nice-to-haves that have safe default (state default in "Assumptions").
- **Non-duplicative** — skip anything already answered in issue or comments.
- **Numbered** — final list is `1.`, `2.`, … ordered by user journey (what appears, when it applies, edge cases, acceptance).

### Translate technical gaps to product questions

| Technical gap (keep internal / in assumptions) | Ask the requester instead                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Which table/column / relation?                 | "Does filtering by Club mean only people linked to that club today?"                                                                          |
| Base branch / GATE 1 / `develop-*` naming      | Do **not** ask (see Out of scope)                                                                                                             |
| Missing label `Team: *`                        | Do **not** ask                                                                                                                                |
| Endpoint payload / SQL join                    | "When Federation and Role are both selected, must a person match both or either?"                                                             |
| Unit vs E2E test path                          | Only if acceptance unclear — e.g. "How will we validate this is done: on the screen, with specific scenarios?" — not "which phpunit path?" |

### Good vs bad examples

**Good (ask):**

> When the checkbox is checked, does the filter apply immediately or only after clicking Search (like dates/unit)?

**Ignore / never ask:**

> Missing Team label on this issue

> Base branch (GATE 1): milestone is 1.32, but remote only has `develop_1.32` — which branch?

> Should table `agencia_2.linktable` with relation `PESSOA|CLUBE` filter by `id_right_linktable`?

**Milestone (only allowed case):** at most _one_ question like "Is the milestone on this issue correct?" — when product version genuinely ambiguous. Nothing about branch naming, underscores vs hyphens, or GATE 1.

### Out of scope for question list

Do **not** promote to numbered questions:

- Missing or wrong **labels** (Team, Type, Priority, Severity, …)
- **Base branch**, remote branch naming, GATE 1 / `develop-{semver}` vs `develop_X.Y.Z`
- Pure engineering choices with safe default already stated in Assumptions
- "How should we implement…" / schema / class / env var names

### Categories to scan

See `references/question-checklist.md`. Prefer product/UX/acceptance gaps only.

Cap at **15 questions**; merge related micro-questions. If zero gaps remain, say so explicitly and post short "ready for execution" internal note instead of filler questions.

## Phase 4 — Deliver results

### Issue mode (MCP)

Unless `DRY_RUN=true`, call `add_issue_comment` with:

- `internal: true`
- `body` — Markdown from `references/comment-template.md` (fill all sections)

**Verdict icon (first character of first line):**

| Situation                                 | Icon | First line                                                                                                |
| ----------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| Zero blocking questions — execution-ready | `✅` | `✅ @{author_username} — requirements enrichment for autonomous execution. **Ready for execution.**`      |
| One or more blocking questions            | `❌` | `❌ @{author_username} — requirements enrichment for autonomous execution. **{N} blocking question(s).**` |

Use **execution-ready** template when `N = 0`; use **questions** template when `N ≥ 1`. Icon mandatory — never omit.

**Mention author:** `author_username` is **literal** `author.username` captured in Phase 1. Re-read `read_issue` output if unsure — never infer.

**After posting:** reply in chat with:

- Link or `project_id` + `issue_iid`
- Count of questions posted
- One-line note if issue looks execution-ready vs blocked

Do **not** use `set_issue_status`, `update_issue`, or `create_issue` in this skill.

### Chat mode (inline)

Render same structure as comment template **directly in chat reply**:

- Verdict icon on first line (`✅` ready / `❌` with question count)
- **Current understanding** — short summary
- **Assumptions** — safe defaults you applied
- **Areas investigated** — relevant files/modules (OK to include paths here)
- **Questions** — numbered list in plain product language (no @mentions)

Do **not** create files, post to GitLab, or write version artifacts (`requirements.md`, task files, etc.).

**After delivery (both modes):** reply in chat with:

- Issue mode: link or `project_id` + `issue_iid`; count of questions posted
- Chat mode: count of questions; one-line note if scope looks execution-ready vs blocked

## Language

- GitLab comment (issue mode): **English** unless user or project docs explicitly require another language for stakeholder communication.
- Chat reply (chat mode): match language user used unless they request otherwise.
- In **Questions**: no file paths, class names, SQL, or env vars
- In **Current understanding / Assumptions / Areas investigated**: code paths OK (for executing agent)

## Anti-patterns

- Asking questions one-by-one in chat instead of batching in issue comment
- Posting public (non-internal) comment
- Hand-crafting `requirements.md` or calling `start_execution_planning` (out of scope)
- Starting implementation or creating branches
- Generic questions ignoring codebase ("How should this work?" without screen/context)
- Re-asking facts already in comments
- Forgetting `@author_username` (opener)
- Using `author.name`, slug of display name, or any username not equal to `author.username` from `read_issue`
- Questions aimed at **developers** (table, branch, label, GATE, test path, JSON payload)
- Asking about **missing labels**
- Asking about **base branch** / remote branch naming (except optional "is milestone correct?")
- Putting **technical solution** inside question

## Relationship to other skills

| Skill                    | When                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| `ns-execution-gitlab-issue`   | After requirements clear; implements issue                  |
| `ns-reviewer`          | After code exists; reviews diffs                                    |
| `mcp-gitlab-usage`       | All MCP calls, version check, `add_issue_comment` contract          |
| `/ns-spec-driven` Clarify | Version-scope clarification in chat before Specify |
| `/ns-spec-driven` Specify | Produces `requirements.md` for version — not per-issue enrichment |

## Quick checklist

- [ ] Mode detected: issue (`ISSUE_URL`) vs chat (conversation text)
- [ ] Issue mode: `read_issue` + `list_issue_comments` done; `author_username` = literal `author.username`
- [ ] Chat mode: requirements synthesized from user message; no MCP issue load
- [ ] Codebase and product context investigated; technical gaps to assumptions or rewritten for requester
- [ ] Questions: requester-facing, plain language, no labels/branch/schema as questions
- [ ] Issue mode: comment uses template; verdict icon; `@author`; `internal: true`
- [ ] Chat mode: verdict + questions inline only; no files, no GitLab posts
- [ ] No status change, no code edits, no interactive Q&A one-by-one

## References

| File                               | When                          |
| ---------------------------------- | ----------------------------- |
| `references/comment-template.md`   | Phase 4 — GitLab comment body |
| `references/question-checklist.md` | Phase 3 — gap scan categories |
