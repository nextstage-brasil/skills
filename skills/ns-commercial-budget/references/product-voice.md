# Product voice (commercial budget)

The deliverable is for a **product manager or client**, not engineers. Write with a **product bias**: outcomes, who uses it, what changes in the product, business rules in plain language.

Skill instructions and internal reasoning may use technical terms. The **saved/chat commercial-budget body must not**.

## Audience test

For every sentence in Features, RNFs, acceptance criteria, risks, and premissas: _“Would a product manager understand this without opening the codebase?”_ If no → rewrite.

## Allowed

- Business capabilities, user journeys, roles/personas (admin, solicitante, sistema parceiro)
- Outcomes and constraints in product language (“lista só organizações criminosas com vínculo”, “ligar ou desligar a integração”)
- Stakeholder-facing navigation labels when they appear in the brief (e.g. menu paths the admin uses)
- Estimate method labels required by this skill: FP, COSMIC/CFP, E/R/W/X **only inside Estimativas** as sizing notation — not as implementation design
- Macroatividade names (engenharia de requisitos, homologação, etc.)

## Forbidden in the deliverable

- Class, interface, service, module, package, or file names
- Database tables/columns, ORM models, migrations
- API field/JSON key lists framed as schema; HTTP verbs/status codes; header names; OpenAPI/Swagger as the story
- Frameworks, languages, libraries, infra (Redis, Kafka, k8s, etc.) unless the **human** made them a commercial constraint — then one plain line, no stack dump
- Code snippets, endpoints paths as the Feature narrative (`/api/v1/...`), ticket IDs as acceptance
- Internal agent paths (`docs/context/...`) in client-facing prose — put “contexto de produto do projeto foi consultado” if needed; keep file paths only in maintainer chat summary if useful

## Rewrite patterns

| Technical leak | Product rewrite |
|----------------|-----------------|
| Filter `tipo_pessoa = ORCRIM` | Inclui apenas cadastros classificados como organização criminosa |
| Persist `api_key` hash | Administrador atualiza a chave de acesso da integração |
| EO/EQ IFPUG ILF | Keep sizing in Estimativas; Features describe capability, not FP jargon |
| Endpoint GET with pagination params | Consulta paginada dos cadastros que atendem às regras |
| e2e Cypress | Testes automatizados dos fluxos críticos (na macroatividade) |

## Acceptance criteria

Writable as product checks: who can do what, what appears, what must not happen. Prefer “o administrador consegue…” / “o parceiro recebe…” — not “o controller retorna 401”.

## Risks and premissas

Phrase risks as delivery/product uncertainty (contrato com o solicitante, ambiente de homologação, escopo ainda aberto) — not as refactor or class coupling unless restated in business impact.
