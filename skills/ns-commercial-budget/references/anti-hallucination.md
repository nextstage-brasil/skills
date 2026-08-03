# Anti-hallucination (commercial budget)

Every Feature, RNF, estimate premise, macro-row figure, and margin % must trace to the human’s description, clarification answers, **loaded product context** (`system-reverse-spec*` / `brownfield-map.md`), or an explicit `[ASSUMPTION: …]` / `[LACUNA: …]` marker.

## Forbidden

1. **Invented SLAs / volumes** — No latency, uptime, concurrency, or record counts the stakeholder did not state. Prefer qualitative acceptance criteria and `[LACUNA: métrica não fornecida]`.
2. **Invented R$** — No R$/h, R$/PF, or Custo totals without human rates. Use `—` / `_pending rates_` in the macro table.
3. **Gold plating** — No dashboards, RBAC, audits, or integrations not requested. Optional ideas go under **Sugestões fora de escopo (não implementar)** — never inside Feature acceptance criteria.
4. **Silent architecture decisions** — ML, OCR, heavy sync, multi-region: record intent and `[DECISÃO DE ARQUITETURA: …]`; do not pretend the design is settled.
5. **Fake integration readiness** — External systems need contract hints (API/protocol/format) or `[LACUNA: contrato de integração não definido]`.
6. **Task leakage** — No `tasks/`, checklists of implementation steps, or GitLab issue drafts in this artifact.
7. **Silent team productivity** — Hours must cite team experience (seniority / tenure / involvement) and/or an explicit productivity premise; do not invent “fast team” without a marker.
8. **Ignore known product context** — When `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` exist, do not budget as greenfield capabilities that those docs already describe; size the **delta** or mark conflict with `[LACUNA: …]` / `[ASSUMPTION: …]`.
8a. **Checkbox theater** — Do not mark "contexto consultado" in Premissas without a reuse inventory and documented reuse discount in Features / FP / hours.
8b. **Superficial context read** — When context files exist, do not grep headers, skim body, or skip `.md` because `.agent.md` exists without reading the relevant sections.
8c. **Greenfield-on-reuse FP** — Do not count FP/CFP as net-new for entities, integrations, or flows already documented in reverse-spec/map unless scope explicitly replaces them.
9. **Contradict reverse-spec silently** — If chat scope conflicts with documented behavior, surface it; do not overwrite the reverse-spec in the budget.
10. **Macro table shortcuts** — Do not drop/rename the seven mandatory macro rows; do not put all hours only in “Implementação”.
11. **Naked margin** — Do not apply a safety % without a risks section and short rationale.
12. **Technical voice in the deliverable** — No class/field/schema/endpoint/framework narrative in Features, RNFs, acceptance, risks, or premissas (see `product-voice.md`). Translate code-derived facts into product language.

## Lacunas

Use PT-BR markers in the deliverable (default language):

- `[LACUNA: …]` — missing fact; stakeholder must confirm
- `[ASSUMPTION: …]` — temporary fill after quick mode / proceed with assumptions
- `[DECISÃO DE ARQUITETURA: …]` — needs human/architect call

Surface open lacunas in **Premissas / ressalvas**. A budget with open lacunas is still deliverable, but call them out in the chat summary.

Bump header **Sequência** and **Gerado em** on every regenerate; keep the same `commercial-budget.md` path (`references/document-versioning.md`). Do not create timestamped filenames.

## Estimates honesty

- FP and CFP are judgment-based; always include short rationale.
- Hours without clarified team experience or house productivity must declare `[ASSUMPTION: …]` or `[LACUNA: …]` and the productivity figure used.
- When reverse-spec/map show reuse, hours premise should reflect brownfield delta — not full rebuild of documented behavior.
- FP/CFP without documented reuse discount when context files existed = skill failure — fix the reuse inventory and re-size before persisting.
- Show **base hours** and **hours with safety margin**; macro table uses hours with margin.
- Error margin `{p}%` and safety margin `{s}%` must be stated explicitly.
