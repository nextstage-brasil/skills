---
name: ns-requirements-enricher
description: >
  (NS) Enrich requirements before autonomous execution from a GitLab issue or chat
  context. Use when the user asks to enrich/expand requirements, flesh out
  acceptance criteria, prepare issue context for coding agents, run grill-me, or
  generate blocking product questions — with or without a GitLab issue. Issue
  mode: ISSUE_URL → MCP read + codebase grill-me → one internal comment with
  numbered questions for the issue author. Chat mode: pasted/described scope →
  same analysis, numbered questions inline only (no files, no GitLab). Do NOT
  replace `/ns-spec-driven` Specify for version `requirements.md`. Do NOT use
  for full issue execution (`ns-execution-gitlab-issue`), code review
  (`ns-reviewer`), version planning (`start_execution_planning`), PM intake
  (`00-clarification.md` OKR/RICE), or SDD Clarify (version-scope before Specify).
license: Apache-2.0
provides:
  - gate:requirements-enrichment
consumes:
  - artifact:gitlab-issue
metadata:
  author: nextstage-brasil
  version: "1.3"
depends:
  - ns-harness
  - mcp-gitlab-usage
---

# Requirements Enricher

Close product/UX gaps **before** autonomous **execution** of one issue or pasted scope. No branch, code, or status change.

Not PM clarification. Not SDD Clarify. See **Relationship**.

## Mode detection

| Mode | Trigger | Delivery |
| ---- | ------- | -------- |
| **Issue** | `ISSUE_URL` present or user points to GitLab issue | One **internal** GitLab comment (Phase 4) |
| **Chat** | User pastes/describes requirements — no issue URL | Verdict + numbered questions **inline chat only** — no files, no GitLab, no version artifacts |

Phases 2–3 shared. Phase 1 (MCP load) = **issue** mode only.

Issue mode needs GitLab MCP. MCP missing → stay **chat** mode (same grill-me; no post).

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** before MCP or codebase investigation.

GitLab MCP after boot: follow `mcp-gitlab-usage` (`get_mcp_gitlab_skill` version check on first access). MCP absent → chat mode.

## Objective

**Issue mode** (`ISSUE_URL`) — one **internal** GitLab comment:

1. Summarize issue + comments
2. Verdict icon first — `✅` ready / `❌` blocking questions
3. **All** blocking questions numbered sequential (never one-by-one in chat)
4. **@mention** issue **author** (opener)

**Chat mode** (conversation text) — **inline** reply:

1. Summarize user description
2. Same verdict icon
3. Numbered questions in chat
4. No @mention

Do **not** implement, commit, change issue status, create files, or ask questions one-by-one (except blocked on missing context / MCP in issue mode).

## When to use

- `ISSUE_URL` + clarify before coding (**issue**)
- Pasted brief/scope/AC in chat, no GitLab (**chat**)
- Grill-me on requirements (either mode)
- `ns-autonomous` / human flags underspecified
- Pre-step before `ns-execution-gitlab-issue` when acceptance incomplete

## Prerequisites

1. Obey `AGENTS.md` in host context — Docker/runtime if investigation hits tests/services. Never tool-Read it.
2. `agents.local.md` present → **only** GitLab MCP named there.
3. MCP tool contracts when MCP available; MCP missing → chat mode.

## Inputs

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ISSUE_URL` | Issue mode only | Full GitLab issue link |
| Requirements text | Chat mode only | User message, pasted brief, or attached scope |
| `DRY_RUN` | No | Issue mode: true → show comment in chat; do not post |

## Phase 1 — Load issue context (issue mode only)

**Skip in chat mode.** Chat source = user message + pasted context.

**Parse URL** for `project_id` (or `project_name` for discovery) + `issue_iid`.

**Mandatory reads:**

1. `read_issue` — title, description, labels, milestone, **author** (`username`, `name`), assignees, related links.
2. `list_issue_comments` — full thread; comment bodies = requirements source.

### Author username (mandatory — do not guess)

`@mention` first line **must** be GitLab login from `read_issue`.

**Source of truth (only):** `author.username` from `read_issue` — who **opened** issue.

**Immediately after `read_issue`, record:**

```text
author_username = <author.username>   # literal string from MCP; case-sensitive
```

**Never use for `@mention`:**

- `author.name` (display name)
- Slug/sanitize from `author.name`
- Assignee username (unless assignee **is** author)
- Username from comments, email, profile URL, or memory
- Lowercasing / normalizing unless GitLab returned that casing

**If `author` or `author.username` missing:** stop + report — no assignee substitute, no guess.

**Synthesize** (internal notes, not posted yet):

- **Goal** — one sentence: what exists when done?
- **Acceptance criteria** — list from description; each clear / partial / missing
- **Constraints** — labels/milestone/due for _your_ context; do **not** turn missing labels into questions
- **Already answered** — comment facts that remove ambiguity; do not re-ask

Issue mode with no `ISSUE_URL` or MCP unavailable: stop one line — what missing. Do not invent issue content.

**Chat mode:** same Goal / AC / Constraints / Already answered from conversation text.

## Phase 2 — Investigate codebase and product context

Scope to what issue/scope touches. Find **real product ambiguities**. Technical findings stay in "Current understanding" / "Assumptions", not question list.

**Read when relevant:**

- `docs/context/brownfield-map.md`
- `docs/context/system-reverse-spec.agent.md` (prefer) else `system-reverse-spec.md`
- `.nextstage-harness/rules/architecture-rules.md`
- `docs/context/gitlab-sync-config.md` (context only)

**Investigation (pick what applies):** grep symbols/routes/modules; read controllers/services/views/API/integrations; check tests; note current behavior, extension points, permissions, events/queues, env.

**Output:** short bullets — **relevant files/areas** + **assumptions** implied but unstated.

## Phase 3 — Grill-me gap analysis

Sharpen plan: what still unknown for _behavior requester cares about_.

Cross **issue/chat text + comments + code**. Each gap: _could agent implement and verify without guessing product intent?_ If no → candidate question — then **rewrite** for requester.

### Audience (mandatory)

Questions for **who opened issue** (`author` from `read_issue`) — not developer, tech lead, or ops. Chat mode: for the human who pasted scope.

- Language: **common product/UX** (screen, button, filter, what appears, when it applies)
- Answers **imply** technical decision; translate later at execution
- Schema, SQL, class names, branches, labels, file paths → **Current understanding / Assumptions** — never the question

### Question quality rules

- **Requester-facing** — non-dev product owner answers without reading code
- **Specific** — screen/flow user sees, not implementation class
- **Answerable** — one line or short paragraph; closed choices when useful
- **Blocking** — omit nice-to-haves with safe default (state default in Assumptions)
- **Non-duplicative** — skip already answered
- **Numbered** — `1.`, `2.`, … by user journey (what appears, when, edges, acceptance)

### Translate technical gaps to product questions

| Technical gap (keep internal / in assumptions) | Ask the requester instead |
| ---------------------------------------------- | ------------------------- |
| Which table/column / relation? | "Does filtering by Club mean only people linked to that club today?" |
| Base branch / GATE 1 / `develop-*` naming | Do **not** ask (see Out of scope) |
| Missing label `Team: *` | Do **not** ask |
| Endpoint payload / SQL join | "When Federation and Role are both selected, must a person match both or either?" |
| Unit vs E2E test path | Only if acceptance unclear — e.g. "How will we validate this is done: on the screen, with specific scenarios?" — not "which phpunit path?" |

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
- Pure engineering choices with safe default already in Assumptions
- "How should we implement…" / schema / class / env var names

### Categories to scan

See `references/question-checklist.md`. Product/UX/acceptance gaps only.

Cap **15 questions**; merge related micro-questions. Zero gaps: say so; post short "ready for execution" internal note — no filler.

## Phase 4 — Deliver results

### Issue mode (MCP)

Unless `DRY_RUN=true`, call `add_issue_comment` with:

- `internal: true`
- `body` — Markdown from `references/comment-template.md` (fill all sections)

**Verdict icon (first character of first line):**

| Situation | Icon | First line |
| --------- | ---- | ---------- |
| Zero blocking questions — execution-ready | `✅` | `✅ @{author_username} — requirements enrichment for autonomous execution. **Ready for execution.**` |
| One or more blocking questions | `❌` | `❌ @{author_username} — requirements enrichment for autonomous execution. **{N} blocking question(s).**` |

`N = 0` → **execution-ready** template. `N ≥ 1` → **questions** template. Icon mandatory.

**Mention author:** `author_username` = literal `author.username` from Phase 1. Re-read `read_issue` if unsure — never infer.

**After posting:** chat reply with link or `project_id` + `issue_iid`; question count; one-line ready vs blocked.

Do **not** use `set_issue_status`, `update_issue`, or `create_issue`.

### Chat mode (inline)

Same structure as comment template **in chat**:

- Verdict icon first line (`✅` / `❌` + count)
- **Current understanding**
- **Assumptions** — safe defaults
- **Areas investigated** — files/modules (paths OK here)
- **Questions** — numbered product language (no @mentions)

Do **not** create files, post GitLab, or write version artifacts (`requirements.md`, task files).

**After delivery (both modes):** chat — issue: link/`project_id`+`issue_iid` + count; chat: count + ready vs blocked one-liner.

## Language

- GitLab comment (issue mode): **English** unless user or project docs require another language for stakeholders
- Chat reply (chat mode): match user language unless they request otherwise
- **Questions:** no file paths, class names, SQL, or env vars
- **Current understanding / Assumptions / Areas investigated:** code paths OK (executing agent)

## Anti-patterns

- Questions one-by-one in chat instead of batched comment
- Public (non-internal) comment
- Hand-crafting `requirements.md` or `start_execution_planning`
- Implementation or branches
- Generic questions ignoring codebase ("How should this work?" without screen)
- Re-asking facts already in comments
- Forgetting `@author_username` (opener)
- Using `author.name`, slug of display name, or any username ≠ `author.username` from `read_issue`
- Questions aimed at **developers** (table, branch, label, GATE, test path, JSON payload)
- Asking **missing labels**
- Asking **base branch** / remote branch naming (except optional "is milestone correct?")
- **Technical solution** inside question
- Using this skill for PM OKR/RICE intake or SDD version-scope Clarify

## Relationship to other skills

| Layer | Skill | When | Grain | Not this |
| ----- | ----- | ---- | ----- | -------- |
| PM clarification | `ns-project-manager` `00-clarification.md` | Intake → RICE | OKR, scale, deadline, stakeholders | Business/OKR — **not** this skill |
| SDD Clarify-Strict | `/ns-spec-driven` `clarify-strict.md` (entry `clarify-requirements.md`) | Before Specify, Gate 0 | **Version** scope on disk (`clarify-contract.md`, `unknowns-register.md`, `source/`) | Chat Q&A → version artifacts. No GitLab comments. Does **not** replace this skill |
| Enricher (this) | `/ns-requirements-enricher` | Before autonomous **execution** of one issue / pasted scope | **Per-issue** GitLab grill-me (or chat inline) | GitLab internal comment **or** inline grill-me → then `ns-execution-gitlab-issue` |
| Specify | `/ns-spec-driven` Specify | After Clarify | Version `requirements.md` | Not per-issue enrichment |
| Execute | `ns-execution-gitlab-issue` | After requirements clear | Implements issue | Not enrichment |
| Review | `ns-reviewer` | After code exists | Diff review | Not enrichment |
| MCP | `mcp-gitlab-usage` | All MCP calls | Tool contracts, `add_issue_comment` | Version check |

## Quick checklist

- [ ] Mode: issue (`ISSUE_URL`) vs chat (conversation text)
- [ ] Issue: `read_issue` + `list_issue_comments`; `author_username` = literal `author.username`
- [ ] Chat: synthesize from user message; no MCP issue load
- [ ] Codebase + product context investigated; technical gaps → assumptions or rewritten for requester
- [ ] Questions: requester-facing, plain language, no labels/branch/schema as questions
- [ ] Issue: template; verdict icon; `@author`; `internal: true`
- [ ] Chat: verdict + questions inline only; no files, no GitLab
- [ ] No status change, no code edits, no one-by-one Q&A

## References

| File | When |
| ---- | ---- |
| `references/comment-template.md` | Phase 4 — GitLab comment body |
| `references/question-checklist.md` | Phase 3 — gap scan categories |
| `../../ns-harness/references/session-boot.md` | Session boot (blocking) |
