---
name: ns-requirements-enricher
description: "(NS) Produce a codebase-grounded implementation brief for one GitLab issue or pasted scope. Blocking questions stay in chat (recommended answer, reply by number) and never go to GitLab. Use for enrich/expand requirements, grill-me, implementation brief, preview-then-post, ISSUE_URL before coding. Modes: Issue, Chat. Do NOT replace `/ns-spec-driven` Specify or version Clarify. Do NOT: PM intake, PRD, issue execution (`ns-execution-gitlab-issue`), start_execution_planning, code review (`ns-reviewer`)."
license: Apache-2.0
provides:
  - gate:requirements-enrichment
consumes:
  - artifact:gitlab-issue
metadata:
  author: nextstage-brasil
  version: "1.5"
depends:
  - ns-harness
---

# Requirements Enricher

One issue or one pasted description. Output = **implementation brief** for coding agent. Questions only when they unblock implementation. No branch, code, status, or version artifacts.

Not PM clarification. Not SDD Specify / version Clarify. See **Relationship**.

## Mode detection

| Mode | Trigger | Delivery |
| ---- | ------- | -------- |
| **Issue** | `ISSUE_URL` or user points at GitLab issue | Chat **preview** of comment body. `add_issue_comment` **internal** only after human validates that draft |
| **Chat** | Pasted/described scope — no issue URL | Brief **on screen**. Never offer to post. Never ask "want me to post?" |

Phases 2–4 shared. Phase 1 (MCP load) = **issue** only.

**MCP fallback (SSoT):** GitLab MCP missing or unusable → treat as **chat** mode (same brief; no post). Do not stop. Phase 1 skipped.

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** before MCP or codebase investigation.

GitLab MCP after boot: follow `mcp-gitlab-usage` (`get_mcp_gitlab_skill` version check on first access). Absent → **MCP fallback**.

## Objective

**Issue mode** — questions stay in **chat**. They produce the comment. They **never** go to GitLab. After answers, show the closed brief. Post that body only on explicit human yes.

Posted comment (when allowed):

1. `@mention` issue **author** (`author.username` from `read_issue` only)
2. First line `✅` — requirements already closed
3. Full **implementation brief** (decisions already folded in). **No Questions section. No Recommended list. No reply-by-number footer.**

**Chat mode** — same question batch, then closed brief **inline**. No @mention. No GitLab offer. Not a PRD.

Do **not** implement, commit, change issue status, create files, write `requirements.md`, or call `start_execution_planning`.

## When to use

- `ISSUE_URL` + brief before coding (**issue**)
- Pasted brief/scope/AC in chat, no GitLab (**chat**)
- Grill-me when implementing agent would otherwise guess product intent
- `ns-autonomous` / human flags underspecified
- Pre-step before `ns-execution-gitlab-issue` when acceptance incomplete

## Prerequisites

1. Obey `AGENTS.md` in host context — Docker/runtime if investigation hits tests/services. Never tool-Read it.
2. `agents.local.md` present → **only** GitLab MCP named there.
3. MCP tool contracts when MCP available; else **MCP fallback**.

## Inputs

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ISSUE_URL` | Issue mode only | Full GitLab issue / work item link |
| Requirements text | Chat mode only | User message, pasted brief, or attached scope |

No auto-post. `DRY_RUN` obsolete — preview always; post only after human validates.

## Phase 1 — Load issue context (issue mode only)

**Skip in chat mode.** Chat source = user message + pasted context.

**Parse URL** for `project_id` (or `project_name` for discovery) + `issue_iid`.

**Mandatory reads:**

1. `read_issue` — title, description, labels, milestone, **author** (`username`, `name`), assignees, related links.
2. `list_issue_comments` — full thread; comment bodies = requirements source.

### Author username (mandatory — do not guess)

`@mention` first line **must** be GitLab login from `read_issue`. Only when a comment is **actually posted**.

**Source of truth (only):** `author.username` from `read_issue` — who **opened** issue.

**Immediately after `read_issue`, record:**

```text
author_username = <author.username>   # literal string from MCP; case-sensitive
```

**Never use for `@mention`:** `author.name`; slug from display name; assignee (unless assignee **is** author); comment usernames; email; memory; lowercasing unless GitLab returned that casing.

**If `author` or `author.username` missing:** stop + report — no assignee substitute, no guess.

**Synthesize** (internal; not posted yet):

- **Goal** — one sentence: what exists when done?
- **Acceptance** — list from description; each clear / partial / missing
- **Constraints** — labels/milestone/due for _your_ context; do **not** turn missing labels into questions
- **Already answered** — comment facts that remove ambiguity; do not re-ask

User claimed issue mode but no `ISSUE_URL`: stop one line — URL missing. Do not invent issue content. MCP unavailable is **not** this stop — **MCP fallback**.

**Chat mode:** same Goal / AC / Constraints / Already answered from conversation text.

## Phase 2 — Codebase check first

Determine whether requested behavior **already exists** in application code, **extends** existing screens/flows/modules, or is **new**.

Scope to what issue/scope touches. Technical findings stay in brief (**Current behavior**, **Files/areas**, **Assumptions**) — not in question list.

**Read when relevant:**

- `docs/context/brownfield-map.md`
- `docs/context/system-reverse-spec.agent.md` (prefer) else `system-reverse-spec.md`
- `.nextstage-harness/rules/architecture-rules.md`
- `docs/context/gitlab-sync-config.md` (context only)

**Investigation:** grep symbols/routes/modules; read controllers/services/views/API/integrations; check tests; note current behavior, extension points, permissions, events/queues, env.

**Output (feeds brief):**

| Finding | Brief use |
| ------- | --------- |
| Behavior already in code | State where. Questions only if request **changes** that behavior and product intent still ambiguous |
| Extension of existing screen/flow | Name screen/module. Brief says what stays vs what changes |
| Not found | Brief says greenfield-in-this-area. Still no version framing |

Do **not** run version Clarify. Do **not** write `requirements.md`, `clarify-contract.md`, `unknowns-register.md`, `source/`, task files, PO, milestone-as-version, Gate 0 version scope.

## Phase 3 — Scarce questions (grill technique)

Borrow **technique** from `ns-spec-driven` Clarify (`references/clarify-requirements.md`, `clarify-strict.md`): numbered batch; observable product language; blocking vs assumed vs omit; detectors for unresolved value + contradiction.

Do **not** run version Clarify workflow (no brownfield Step 0.4 halt, no Gate 0, no version artifacts, no `skip clarify`).

Cross **issue/chat text + comments + code**. Each gap: _would implementing agent guess product intent?_ If no guess needed → no question.

**Zero blocking gaps:** say **ready**. Do **not** invent filler.

### Audience

Questions for **who opened issue** (`author` from `read_issue`) — not developer/tech lead/ops. Chat: human who pasted scope.

- Language: **common product/UX** (screen, button, filter, what appears, when)
- Schema, SQL, class, branch, labels, file paths → brief sections — never the question list

### Promote vs assume vs drop

| Case | Action |
| ---- | ------ |
| Agent cannot verify done without this product fact | Numbered question **plus Recommended** |
| Safe default, and the agent can ship without asking | **Assumptions** — not a question |
| Already in description/comments/code | Drop |
| Nice-to-have / engineering taste | Drop or assumption |

### Question quality

- Requester-facing, specific screen/flow, answerable in one line or closed choices
- Blocking only. Numbered `1.` `2.` … by user journey
- Cap **15**. Merge micro-questions
- One round of all blockers — not drip Q&A (except missing context in issue mode)

### Question shape (mandatory when N ≥ 1)

Chat first. Not a PRD. Each question carries the default the coding agent will apply if accepted.

Order:

1. **Relevant facts** — codebase vs request, before the list. Screens, columns, behavior that already exists. No version / PO.
2. Each question:

```text
Q{n} — {short title}
{What the code does vs what the request says. One or two sentences.}
Recommended: {concrete default. Name what changes and what stays.}
```

3. Closer, same language as the human: reply by number (`1: …`, `2: …`). Yes/no items accept "all yes" or "all recommended". Then close the requirements in this chat. Do **not** say PRD, version, or PO.

**Chat only.** This batch is input for the brief. **Forbidden** inside `add_issue_comment` body: the questions, `Recommended:` lines, the reply-by-number closer.

**Recommended** = safe product default from code. Once accepted, write it as a decision in What changes, Acceptance, or Assumptions. Do not hide the default only in Assumptions while the question is still open in chat.

### Detectors (issue grain only)

| Id | Hit | Close |
| -- | --- | ----- |
| Unresolved value | TBD, range, vague adjective on visible behavior | Pin in question **or** assumption + impact in brief |
| Contradiction | Issue vs comments vs current code | Ask which product outcome wins. Do not pick silently |

**Not a detector:** missing labels, branch names, GATE 1, milestone-as-version, PO, full-version language.

### Translate technical gaps

| Keep in brief | Ask requester |
| ------------- | ------------- |
| Table/column / class | "Does filtering by Club mean only people linked to that club today?" |
| Base branch / `develop-*` | Do **not** ask |
| Missing `Team: *` | Do **not** ask |
| Endpoint / SQL join | "When Federation and Role both selected, must a person match both or either?" |

**Good:** `Q1 — When the filter applies` / Today the date filter runs only after Search. / `Recommended:` same — checkbox applies only after Search.

**Never ask:** Missing Team label; which `develop_*` branch; which SQL relation.

### Out of scope for question list

Labels; base branch; GATE 1; schema/class/env; "how should we implement"; version/PO/milestone-as-version; filler to look thorough.

Scan categories: `references/question-checklist.md`.

## Phase 4 — Implementation brief

Audience = **coding agent**. Grain = this issue or pasted description. Cut implementation doubt.

Fill `references/comment-template.md`. Required sections:

| Section | Content |
| ------- | ------- |
| Current behavior in code | What exists today (screens/flows/modules). Evidence from Phase 2 |
| What changes | Delta vs current. Stays-the-same if extension |
| Acceptance | Steps/outcomes agent can verify (screen or test), not OKR/RICE |
| Assumptions | Decisions and safe defaults already accepted. Impact if wrong |
| Files/areas | Paths/modules for the implementer |

No **Questions** heading. Unanswered gaps stay in the chat batch until folded in. Not a version PRD. Not PM OKR/RICE. Not SDD Specify.

## Phase 5 — Close requirements, then GitLab gate

**N ≥ 1:** send the question batch (Phase 3 shape) and **stop**. Do not post. Do not paste the GitLab body yet.

On reply: fold each answer into the brief.

| Reply | Brief |
| ----- | ----- |
| Accepts Recommended / "all yes" / "all recommended" | Move that default into **What changes** or **Assumptions**. Drop the question |
| Other answer | Write that decision into **What changes** / **Acceptance**. Drop the question |
| Skipped number | Ask again in chat. Do not invent. Do **not** preview or post until every asked item is decided |

Then paste the **closed** brief (template). Zero questions in that body.

| Mode | After closed brief on screen |
| ---- | ---------------------------- |
| **Issue** | Wait. Post `add_issue_comment` `internal: true` **only** after human explicitly validates that draft (yes / post / equivalent). No silent post. Edits → revise preview → wait again |
| **Chat** | Stop. Closed brief is the deliverable. **Forbidden:** offer to post; "want me to post?"; GitLab comment |

**N = 0:** no question batch. Paste the ready brief, then the same gate.

**Posted / previewed body** starts `✅ @{author_username} — implementation brief. **Ready.**` Chat preview of that body: same line, **no** `@mention`.

Do not post while any question is still open. There is no `❌` GitLab variant.

**Mention author:** only on **posted** issue comment. `author_username` = literal `author.username`. Re-read `read_issue` if unsure.

After a real post: chat with link or `project_id` + `issue_iid`.

Do **not** use `set_issue_status`, `update_issue`, `create_issue`, `start_execution_planning`.

## Language

- GitLab comment: **English** unless user or project docs require another language for stakeholders
- Chat: match user language unless they request otherwise
- **Chat questions:** no file paths, class names, SQL, env vars. Those questions never appear in the GitLab body
- **Current behavior / Assumptions / Files/areas / What changes:** code paths OK

## Anti-patterns

- Putting the question batch, `Recommended:` lines, or "reply by number" into the GitLab comment
- Auto-post without human validation of the closed brief
- Chat mode: offering GitLab post
- Questions one-by-one instead of batched brief
- Public (non-internal) comment
- `requirements.md` / `start_execution_planning` / version Clarify artifacts
- Implementation or branches
- Open question with no **Recommended** line
- Calling the closed brief a PRD
- Filler questions; generic "How should this work?"
- Re-asking facts already in comments
- `@mention` from anything except `author.username`
- Dev questions (table, branch, label, GATE, test path, JSON)
- Version / PO / milestone-as-version / "full version" framing
- Using this skill for PM OKR/RICE or SDD version Specify / Clarify-Strict

## Relationship to other skills

| Layer | Skill | When | Grain | Not this |
| ----- | ----- | ---- | ----- | -------- |
| PM | `ns-project-manager` | Intake → RICE | OKR, scale, stakeholders | Not this |
| SDD Clarify-Strict | `/ns-spec-driven` | Before Specify, Gate 0 | **Version** on disk | Technique borrowed; artifacts **not** |
| Enricher (this) | `/ns-requirements-enricher` | Before coding one issue / pasted scope | Per-issue brief + scarce questions | Preview then internal comment **or** chat-only brief |
| Specify | `/ns-spec-driven` Specify | After Clarify | Version `requirements.md` | Not per-issue brief |
| Execute | `ns-execution-gitlab-issue` | After brief clear | Implements issue | Not enrichment |
| Review | `ns-reviewer` | After code | Diff review | Not enrichment |
| MCP | `mcp-gitlab-usage` | MCP calls | Tool contracts | Version check; not catalog `depends` |

## Quick checklist

- [ ] Mode: issue vs chat
- [ ] Issue: `read_issue` + `list_issue_comments`; record `author.username`
- [ ] Chat: synthesize from user message; no MCP issue load
- [ ] Codebase check first: exists / extends / new
- [ ] Questions only if implementing agent would guess; else ready
- [ ] Each open question: code fact + **Recommended**. Closer: reply by number, then close requirements in chat. Not a PRD
- [ ] After answers: closed brief (decisions in What changes / Acceptance / Assumptions)
- [ ] GitLab body has no questions. Issue: post that closed draft only after human yes. Chat: never offer post
- [ ] No version framing, no status change, no code, no one-by-one Q&A

## References

| File | When |
| ---- | ---- |
| `references/comment-template.md` | Phase 4–5 — brief / GitLab body |
| `references/question-checklist.md` | Phase 3 — gap scan |
| `../../ns-harness/references/session-boot.md` | Session boot (blocking) |
