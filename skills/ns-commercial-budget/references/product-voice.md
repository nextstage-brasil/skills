# Dual-audience voice (commercial budget)

Deliverable serves **client first**, also **delivery team**. Client must confirm scope understanding; team must not lose sizing-critical detail.

## Audience test

| Section | Client reads | Team needs |
|---------|--------------|------------|
| Objetivo, Features, fluxos, RNFs, riscos (narrative) | Plain product/commercial language | Same text must cover every committed capability |
| Critérios de aceite | Verifiable by stakeholder | Each criterion maps to a scoped behavior — no hidden gap |
| Estimativas (FP, COSMIC, horas) | Totals + per-Feature FP justification readable | FP origins traceable; COSMIC table complete; hours = formula only |
| Macroatividades | Lifecycle effort split | Unchanged |

**Rule:** _Would the client sign this knowing what they buy?_ AND _Would engineering find a missing boundary?_ Both must pass.

## Client-facing (default)

- Business capabilities, journeys, roles, outcomes, constraints
- Stakeholder menu/screen labels from the brief
- Delivery uncertainty in product terms (homologação, contrato parceiro, escopo aberto)

## Technical detail — where it lives

| Need | Put it here | Not here |
|------|-------------|----------|
| Scope completeness | Features + critérios de aceite + fluxos Mermaid | Class names, schemas, endpoints |
| Sizing traceability | Estimativas → FP origem do cálculo + per-Feature FP | Feature narrative |
| COSMIC counts | Estimativas → CFP table only | Per-Feature E/R/W/X prose |
| Productivity math | Estimativas → Horas (cálculo) | Narrative justification in horas row |

## Forbidden in narrative sections

- Class, service, module, file names
- DB tables/columns, ORM, migrations
- API field lists, HTTP codes, OpenAPI as story
- Frameworks/infra unless human made them a **commercial** constraint — one plain line max
- Code snippets, `/api/...` paths as Feature story
- Internal paths (`docs/context/...`) — say "contexto de produto consultado" if needed

## Rewrite patterns

| Leak | Rewrite |
|------|---------|
| Filter `tipo_pessoa = ORCRIM` | Só cadastros classificados como organização criminosa |
| Persist `api_key` hash | Admin atualiza chave de acesso da integração |
| EO/EQ IFPUG ILF | FP origem table in Estimativas; Feature = capability |
| GET paginated | Consulta paginada dos cadastros elegíveis |

## Acceptance criteria

Product checks: who does what, what appears, what must not happen. "O administrador consegue…" / "O parceiro recebe…" — not "controller retorna 401".

## Fluxos Mermaid

1–3 diagrams max. Labels = roles + business actions (Portuguese). Purpose: client validates understanding; team spots missing steps. No technical node names.

## Risks and premissas

Product/delivery language. Name **Responsável** (Cliente / Empresa / Ambos) per risk in the table.
