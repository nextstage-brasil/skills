# Requirements Generator

Produce structured `requirements.md` for `docs/versions/{version_san}/`.

## Session boot

`../../../ns-harness/references/session-boot.md` + `../../../ns-harness/references/artifact-layout.md`. Create `docs/versions/{version_san}/` before writing.

## Inputs

- **Required:** `docs/versions/{version_san}/clarify-contract.md` after Gate 0 (`requirements_inputs_confirmed`)
- `unknowns-register.md` (waiver quote if any)
- `source/` when present — **Contract extraction:** copy tables **verbatim**; never paraphrase contracts
- Scope description
- `{version_san}`
- Optional: `design-brief.md`, stack profile, brownfield map, web research

**Refuse** unless Gate 0 passed: `(critical unknowns = 0 AND explicit Gate 0 human confirm) OR recorded skip-clarify waiver` (`gates.md`).

## UI contract output

Intake classified any `ui-screen` (or scope has UI): write `docs/versions/{version_san}/ui-contract.md` per `ui-contract.md` + template. Verbatim copy. Skip file if no UI.

## Assumed premises

Copy **Assumed premises** + impact from clarify-contract into `requirements.md` (own heading). Do not hide them.

## Stack profiles

Load **one** profile from `stacks/` when stack known:| Profile | When |
| ------- | ---- |
| `generic.md` | Default — stack-agnostic structure |
| `laravel-react.md` | Laravel + React monorepo detected or confirmed |
| `intelligent-saas.md` | Backend + frontend + agent-api |
| `agent-runtime.md` | Standalone LangGraph `agent-api/` |

Do not mention framework-specific tooling unless profile or detected stack applies.

## Document structure

Generate **only** markdown document (no conversational preamble):

```markdown
## Main objective of the version:

{executive summary}

## Technology stack:

{confirmed stack — reference applicable rules when harness has them}

## UI/UX guidelines:

{from design-brief when frontend in scope — omit if backend-only}

## Data model and APIs:

{tables, FK order, key endpoints — source of truth for tasks}

## Feature grouping:

### Feature 001 - TITLE

**Precedence:** None | Feature NNN
**Layers:** Backend | Frontend | Infrastructure | Tests
**Detailed description:** ... **Source:** Sx

#### Acceptance criteria:

- [ ] ... **Source:** Sx

## Non-functional requirements (NFRs):

...
```

## New project ordering

Greenfield: infrastructure/setup features before domain (per stack profile): infra, then database, then cache/queues, then backend modules, then frontend, then tests. Agent-api / intelligent SaaS: Feature 001 = runtime bootstrap (`stacks/agent-runtime.md` or `stacks/intelligent-saas.md`).

## Language

English unless user explicitly requests another language for deliverable.

## Rules

- Work only inside repo
- Incorporate research into NFRs or acceptance criteria when provided
- Frontend features: include UI/UX section from design brief; acceptance criteria for visual tokens when applicable
- Data model section **critical** — explicit table creation order and endpoints; tables **verbatim** from `source/` when present
- Every Feature and every AC line ends with **Source:** `Sx` (or `n/a` + reason if no source file)
- Forbid paraphrasing API/schema/error contracts — cite anchors
- After generation: Gate 1 (`requirements_confirmed`) — see `references/gates.md`
- Next: `analyze-consistency.md` after Gate 2
- Intelligent SaaS / agent-api: face must load `ns-langgraph-agents` — see `agent-runtime-integration.md`

## References

| File | When |
| ---- | ---- |
| `stacks/generic.md` | Default |
| `stacks/laravel-react.md` | Laravel/React stack |
| `stacks/intelligent-saas.md` | Agent-augmented SaaS |
| `stacks/agent-runtime.md` | Standalone agent-api |
