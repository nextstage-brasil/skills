# Notas técnicas (internal doc only)

`commercial-budget-internal.md` only. **Never** include in `commercial-budget-costumer.md`.

## When to include

Include the section when the human supplied (or the agent loaded) **implementation-oriented source material** that:

- Crosses product narrative boundaries (scripts, schemas, partner platforms, field mappings)
- Was agreed in a meeting, transcript, POC, or architecture note
- Clarifies **how** scoped Features will be built — especially `engenharia` or integration-heavy Features

**Omit the entire section** when scope is purely product-level and no technical source exists. Do not invent pseudocode, table columns, or partner behavior to fill the section.

## Document position

After **Agrupamento de objetivos (Features)**, before **Requisitos Não Funcionais (RNFs)**.

Generation order: draft Features first (numbered), then Notas técnicas with explicit `Feature 00N` cross-references where relevant.

## Header

```markdown
## Notas técnicas ({source label})

Detalhes acordados {source — e.g. na reunião de {date}, na transcrição, no POC} que orientam implementação — especialmente {Feature 00N} ({short title}) {when applicable}.
```

Source label examples: `transcrição 21/07/2026`, `workshop arquitetura 2026-03-10`, `notas POC Postgres→Qlik`.

## Content patterns (use what applies)

| Pattern | Use for |
|---------|---------|
| **Hoje vs. alvo** table | Manual/as-is vs. target-state per aspect (fonte, quem altera, quando reflete) |
| Pseudocode / snippet | Load script, API shape, query — label as pseudocode; owner for final implementation |
| Blockquote caveat | Per-app / per-tenant variance, POC prerequisite, unconfirmed mapping |
| Logical structure table | Conceptual columns/fields — not full DDL unless human provided |
| Bullet clarifications | Boundaries (panel ≠ app, shared user rejected, ADMIN bypass) |
| Prerequisites table | Operational deps **outside** a Feature but blocking delivery — link to transcript |
| Scope / interim notes | Pilot count, manual workaround until Feature N, `[ASSUMPTION]` |
| Documentation & validation | Who shared docs, formal POC gate, transcript timestamps |

## Traceability markers

Same PT-BR markers as the rest of the deliverable:

- `[confirmado {nome}]` — explicit agreement in source
- `[ASSUMPTION: …]` — reasonable fill; confirm before build
- `[LACUNA: …]` — missing fact from source
- Transcript refs: `~HH:MM:SS` or range when human provided

Every table row, field name, and behavioral claim must trace to human description, loaded context, transcript, or an explicit marker.

## Voice

Technical detail **allowed and expected** here — opposite of Objetivo/Features narrative rules. Still:

- No task lists, GitLab issues, or SDD handoff
- No invented integration contracts — use `[LACUNA: contrato não definido]`
- Pseudocode is illustrative; name the owner/validator when source names them
- Cross-reference Feature numbers; do not duplicate full Feature acceptance text

## Anti-patterns

- Copying Notas técnicas into client export
- Section present with generic filler and no source
- Duplicating the entire Features section in prose
- Hiding `[ASSUMPTION]` / `[LACUNA]` as settled design
- Using Notas técnicas instead of APF origem table (sizing stays in Estimativas)
