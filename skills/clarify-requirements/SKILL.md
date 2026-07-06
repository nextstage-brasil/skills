---
name: clarify-requirements
description: Resolve ambiguities, gaps, and unstated assumptions in a scope description before generating requirements. Use when the user gives a vague or incomplete scope, mentions "dashboard", "notifications", "integration with X" without detail, starts a new system without docs, or before requirements generation when terms are ambiguous — even if they do not ask to "clarify". Do NOT generate requirements.md in this skill; output enriched context only.
depends:
  - nextstage-harness
---

# Clarify Requirements

Pre-planning workflow: identify and resolve ambiguities **before** invoking `requirements-generator`.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`. Stack and architecture questions belong to stack detection — not this skill.

## When to use

- Vague or incomplete scope from the user
- Ambiguous terms (dashboard, integration, notification system)
- First version of a new system without prior documentation
- Orchestrator judges scope too thin (< 3 paragraphs or vague terms)

## Workflow

### Step 1 — Analyze raw scope

Read the user's description and flag ambiguities:

| Category | Example |
|----------|---------|
| Actors | "the user does X" — which role? |
| Data scope | list fields, pagination, filters? |
| Integrations | REST, webhook, auth method? |
| Multitenancy | multi-company isolation? |
| Business rules | which validations exactly? |
| State lifecycle | allowed transitions? |
| Scope limits | what's in/out of this version? |
| Performance | volume, concurrency, SLA? |
| Security | auth required, role permissions? |

### Step 2 — Ask questions

- Maximum **5 questions per round**
- Prioritize blockers for correct feature generation
- Group related questions when possible
- Plain language, numbered, self-contained

Present:

```
Before generating requirements, I need to clarify a few points:

1. [actor question]
2. [data scope]
...

Reply in free form. I will proceed with requirements once I have these answers.
```

### Step 3 — Consolidate answers

After responses:

1. Confirm understanding in a short summary (3–5 bullets)
2. Ask: "Shall I proceed with requirements generation?"
3. Wait for yes or correction
4. **Maximum one clarification round** — if still unclear, document reasonable assumptions as "Assumed premises"

### Step 4 — Hand off to requirements-generator

Compile enriched context:

```markdown
## Original scope (user-provided):
[original text]

## Clarifications obtained:
1. Question: [...]
   Answer: [...]

## Confirmed premises:
- [Premise 1]
- [Premise 2]
```

Pass this document as input to `requirements-generator`. Do **not** write `requirements.md` here.

## Critical rules

- **One round of questions max** — then assume conservatively and document premises
- **No requirements document** in this workflow
- **No stack/architecture questions** — defer to stack profiles / project rules
- If user answers "don't know" on a critical point: assume smallest safest scope and document it

## Integration

```
planning start → [if ambiguous scope] → clarify-requirements → requirements-generator → Gate 1
```

## Related skills

- `requirements-generator` — next step after clarification
- `bootstrap-brownfield` — when existing codebase needs context first
