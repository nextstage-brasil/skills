# Requirements Generator

Produce structured `requirements.md` for `docs/versions/{version_san}/`.

## Session boot

See `../../../ns-harness/references/session-boot.md` and `../../../ns-harness/references/artifact-layout.md`. Create `docs/versions/{version_san}/` before writing.

## Inputs

- Scope description (possibly enriched by `clarify-requirements.md`)
- `{version_san}`
- Optional: `design-brief.md`, stack profile, brownfield map, web research from face

## Stack profiles

Load **one** profile from `stacks/` when stack known:

| Profile               | When                                           |
| --------------------- | ---------------------------------------------- |
| `generic.md`          | Default — stack-agnostic structure             |
| `laravel-react.md`    | Laravel + React monorepo detected or confirmed |
| `intelligent-saas.md` | Backend + frontend + agent-api                 |
| `agent-runtime.md`    | Standalone LangGraph `agent-api/`              |

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
**Detailed description:** ...

#### Acceptance criteria:

- [ ] ...

## Non-functional requirements (NFRs):

...
```

## New project ordering

When project greenfield, infrastructure/setup features before domain features (per stack profile): infra → database → cache/queues → backend modules → frontend → tests. Agent-api / intelligent SaaS: Feature 001 = runtime bootstrap (`stacks/agent-runtime.md` or `stacks/intelligent-saas.md`).

## Language

English unless user explicitly requests another language for deliverable.

## Rules

- Work only inside repo
- Incorporate research into NFRs or acceptance criteria when provided
- For frontend features: include UI/UX section from design brief; acceptance criteria for visual tokens when applicable
- Data model section **critical** — explicit table creation order and endpoints

## Integration

- After generation: Gate 1 (`requirements_confirmed`) — see `references/gates.md`
- Next: `analyze-consistency.md` after Gate 2
- Intelligent SaaS / agent-api: face must load `ns-langgraph-agents` — see `agent-runtime-integration.md`

## References

| File                                    | When                 |
| --------------------------------------- | -------------------- |
| `stacks/generic.md`          | Default              |
| `stacks/laravel-react.md`    | Laravel/React stack  |
| `stacks/intelligent-saas.md` | Agent-augmented SaaS |
| `stacks/agent-runtime.md`    | Standalone agent-api |
