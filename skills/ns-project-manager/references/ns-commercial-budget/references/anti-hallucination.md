# Anti-hallucination (commercial budget)

Every Feature, RNF, estimate premise, macro-row figure, margin % must trace to human description, clarification answers, **loaded product context** (`system-reverse-spec*` / `brownfield-map.md`), or explicit `[ASSUMPTION: …]` / `[LACUNA: …]` marker.

## Forbidden

1. **Invented SLAs / volumes** — No latency, uptime, concurrency, record counts stakeholder did not state. Prefer qualitative acceptance + `[LACUNA: métrica não fornecida]`.
2. **Invented R$** — No R$/h, R$/PF, Custo totals without human rates. Use `—` / `_pending rates_` in macro table.
3. **Gold plating** — No dashboards, RBAC, audits, integrations not requested. Optional ideas under **Sugestões fora de escopo (não implementar)** — never inside Feature acceptance.
4. **Silent architecture decisions** — ML, OCR, heavy sync, multi-region: record intent + `[DECISÃO DE ARQUITETURA: …]`; do not pretend design settled.
5. **Fake integration readiness** — External systems need contract hints (API/protocol/format) or `[LACUNA: contrato de integração não definido]`.
6. **Task leakage** — No `tasks/`, implementation checklists, GitLab issue drafts in this artifact.
7. **Silent team productivity** — Hours must cite team experience (seniority / tenure / involvement) and/or explicit productivity premise; do not invent “fast team” without marker.
8. **Ignore known product context** — When `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` exist, do not budget as greenfield capabilities those docs already describe; size **delta** or mark conflict with `[LACUNA: …]` / `[ASSUMPTION: …]`.
8a. **Checkbox theater** — Do not mark "contexto consultado" in Premissas without reuse inventory + IFPUG ADD/CHG/omit mapping in Features / FP / hours.
8b. **Superficial context read** — When context files exist, do not grep headers, skim body, or skip `.md` because `.agent.md` exists without reading relevant sections.
8c. **Greenfield-on-reuse FP** — Do not count FP/CFP as net-new for entities, integrations, flows already in reverse-spec/map unless scope explicitly replaces them.
9. **Contradict reverse-spec silently** — If chat scope conflicts with documented behavior, surface it; do not overwrite reverse-spec in budget.
10. **Macro table shortcuts** — Do not drop/rename seven mandatory macro rows; do not put all hours only in “Implementação”.
11. **Naked margin** — Do not apply safety % without risks section + short rationale.
12. **Technical voice in narrative** — No class/field/schema/endpoint/framework in Objetivo, Features, fluxos, RNFs, acceptance, risks narrative, premissas (`product-voice.md`). APF origem (CPM/SISP) only in Estimativas. Implementation detail from transcript/POC belongs in internal **Notas técnicas** only (`technical-notes.md`) — omit section if no source; never copy to client export.
14. **Improvised value speech** — Do not add extra headings under **Valor agregado desta versão**, pitch the operator instead of the decision-maker, or use procurement objections (“why another quote”, “sample first”, “wait for v2”). Follow `sales-value-speech.md`.
15. **Invented commercial ROI** — No fabricated single-point R$ payback. Gains: range + short justification, cited benchmark, or stakeholder figure. `[⚠️ validar com cliente]` only on unsourced clauses — not on every line (`sales-value-speech.md`).

## Lacunas

PT-BR markers in deliverable (default language):

- `[LACUNA: …]` — missing fact; stakeholder must confirm
- `[ASSUMPTION: …]` — temporary fill after quick mode / proceed with assumptions
- `[DECISÃO DE ARQUITETURA: …]` — needs human/architect call

Surface open lacunas in **Premissas / ressalvas**. Budget with open lacunas still deliverable; call them out in chat summary.

Bump header **Sequência** + **Gerado em** every regenerate; keep same `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` path (`references/document-versioning.md`). No timestamped filenames.

## Estimates honesty

- FP: per-Feature justificativa in both docs; APF origem (CPM, SISP fallback) only in `commercial-budget-internal.md` (`fp-sizing.md`). CFP: omit unless asked; then table + reference line only.
- Hours = formula (FP × productivity); cite productivity source or `[ASSUMPTION]` / `[LACUNA]`.
- When reverse-spec/map show reuse, hours premise reflects brownfield delta — not full rebuild of documented behavior.
- FP without ADD/CHG/omit mapping when context files existed = skill failure — fix reuse inventory, re-size before persist.
- Show **base hours** and **hours with safety margin**; macro table uses hours with margin.
- Error margin `{p}%` and safety margin `{s}%` must be stated explicitly.
