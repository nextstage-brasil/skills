# Clarify Requirements

Pre-planning workflow: identify and resolve ambiguities **before** Specify (`requirements-generator.md`).

## Harness

See `../../../ns-harness/references/session-boot.md` and `../../../ns-harness/references/artifact-layout.md`.

Stack and architecture questions belong to stack detection — not this phase.

## When to use

- Vague or incomplete scope from user
- Ambiguous terms (dashboard, integration, notification system)
- First version of new system without prior documentation
- Face judges scope too thin (< 3 paragraphs or vague terms)

## Workflow

### Step 0 — Brownfield gate (before analysis)

**Do not grep or explore application source code** until this step completes.

1. Check `docs/context/brownfield-map.md`.
2. Detect brownfield signals under repo: `backend/`, `frontend/`, `src/`, `app/`, or equivalent application code (not docs-only repos).
3. **If brownfield signals exist and `brownfield-map.md` is missing:**
   - Stop — do not ask clarification questions yet.
   - Invoke **`/ns-harness`** `bootstrap-brownfield.md` and produce `docs/context/brownfield-map.md`.
   - Tell user briefly brownfield context required before refining scope.
   - Resume this phase at **Step 0.4** (refresh gate) once map file exists.
4. **If greenfield** (no application code) — skip bootstrap; proceed to Step 1.
5. **If `brownfield-map.md` already exists** — run **Step 0.4** before any scope analysis.

#### Step 0.4 — Brownfield refresh gate (mandatory human confirmation)

**Stop. Do not proceed to Step 1 until human replies.**

1. Read `docs/context/brownfield-map.md`.
2. Extract map date from `**Date:**` line in file header. If absent, state `date unknown`.
3. Present gate to human in **natural chat** (match conversation language; English template below). Do **not** use phase jargon, `Reply:`, or telegraphic status dumps. See `human-communication.md`.

```
There's already a codebase map at docs/context/brownfield-map.md
(last updated {date from file, or "date unknown"}).

Want me to re-scan the repo and update it, or keep this one and move on to scope questions?

- refresh — re-scan and update the map
- keep — use the map as-is
```

4. **Wait for explicit reply.** Valid answers: `refresh` / `keep` (or clear equivalent in natural language).
5. **Never assume** `keep` because map looks recent, because planning urgent, or because user already pasted descritivo.
6. On **`refresh`:** invoke **`/ns-harness`** `bootstrap-brownfield.md` (update in place), then continue to Step 1 with new map.
7. On **`keep`:** note in session context human accepted map date `{date}`; continue to Step 1 using existing file.
8. On ambiguous reply: ask once more — do not start Step 1 until `refresh` or `keep` clear.

Also read `docs/context/system-reverse-spec.agent.md` when present (prefer over prose body); else `system-reverse-spec.md` (after gate resolves).

Allowed reads before Step 1 (brownfield): user scope file, `brownfield-map.md`, `system-reverse-spec.agent.md` / `system-reverse-spec.md`, `.nextstage-harness/rules/architecture-rules.md`, files under `docs/versions/{version_san}/` for active version.

**Forbidden before Step 1:** ad-hoc `grep`/code search in `backend/`, `frontend/`, or `src/` to "reduce ambiguity"; skipping Step 0.4 when map exists.

### Step 1 — Analyze raw scope

Read user's description (and brownfield context when Step 0 applied). Flag ambiguities:

| Category        | Example                           |
| --------------- | --------------------------------- |
| Actors          | "the user does X" — which role?   |
| Data scope      | list fields, pagination, filters? |
| Integrations    | REST, webhook, auth method?       |
| Multitenancy    | multi-company isolation?          |
| Business rules  | which validations exactly?        |
| State lifecycle | allowed transitions?            |
| Scope limits    | what's in/out of this version?    |
| Performance     | volume, concurrency, SLA?         |
| Security        | auth required, role permissions?  |

Use brownfield map for **what exists** — ask user only for **what version should change or add**.

### Step 2 — Ask questions

- Maximum **5 questions per round**
- Prioritize blockers for correct feature generation
- Group related questions when possible
- Plain language, numbered, self-contained — **conversational**, not form (`Reply:`, `Premise:`, skill names)
- Never say "before Clarify/Specify" — name next deliverable in plain words

Present (adapt language to conversation):

```
A few open points before I draft the requirements document:

1. [actor question]
2. [data scope]
...

Answer in your own words — no special format needed.
```

### Step 3 — Consolidate answers

After responses:

1. Confirm understanding in short summary (3–5 bullets)
2. Ask in plain language: "Want me to write the requirements document next?"
   — **Forbidden:** "go for Specify", "proceed to Specify", phase-name commands
3. Wait for yes or correction
4. **Maximum one clarification round** — if still unclear, document reasonable assumptions as "Assumed premises"

### Step 4 — Hand off to Specify

Compile enriched context:

```markdown
## Original scope (user-provided):

[original text]

## Brownfield context (if applicable):

[Summary from brownfield-map.md — modules and constraints relevant to this version]
[Brownfield gate: human chose refresh | keep on {date shown in gate}]

## Clarifications obtained:

1. Question: [...]
   Answer: [...]

## Confirmed premises:

- [Premise 1]
- [Premise 2]
```

Pass this document as input to `requirements-generator.md`. Do **not** write `requirements.md` here.

## Critical rules

- **Brownfield without map:** run `/ns-harness` `bootstrap-brownfield.md` first — never skip by grepping codebase instead
- **Brownfield with map:** Step 0.4 gate **mandatory** — show last map date; wait for explicit `refresh` or `keep`; never assume
- **Human chat:** natural language; name deliverables ("requirements document"), not phases ("Specify"); never caveman-compress chat
- **One round of questions max** — then assume conservatively and document premises
- **No requirements document** in this workflow
- **No stack/architecture questions** — defer to stack profiles / project rules and brownfield map
- If user answers "don't know" on critical point: assume smallest safest scope and document it

## Integration

```
planning start → [brownfield + no map?] → /ns-harness bootstrap-brownfield → [brownfield refresh gate] → clarify-requirements → requirements-generator → Gate 1
```

Brownfield refresh gate: human confirms `refresh` or `keep` after seeing `brownfield-map.md` date.

## Related

- `/ns-harness` `bootstrap-brownfield.md` — mandatory prerequisite when code exists and `brownfield-map.md` missing
- `requirements-generator.md` — next step after clarification
- `/ns-harness` `architecture-rules-generator.md` — constitution when `architecture-rules.md` still stub (separate from this phase)
- `/ns-requirements-enricher` — GitLab issue grill-me / execution-readiness (one issue or pasted scope). Clarify does **not** post GitLab comments and does **not** replace per-issue enrichment. Do **not** use this file for that.
