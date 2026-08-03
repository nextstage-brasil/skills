# Anti-hallucination (commercial budget)

Every Feature, RNF, and estimate premise must trace to the human’s description, clarification answers, **loaded product context** (`system-reverse-spec*` / `brownfield-map.md`), or an explicit `[ASSUMPTION: …]` / `[LACUNA: …]` marker.

## Forbidden

1. **Invented SLAs / volumes** — No latency, uptime, concurrency, or record counts the stakeholder did not state. Prefer qualitative acceptance criteria and `[LACUNA: métrica não fornecida]`.
2. **Any commercial price** — No R$/h, R$/PF, margin, Investimento, or monetary totals. This skill stops at FP + COSMIC + hours.
3. **Gold plating** — No dashboards, RBAC, audits, or integrations not requested. Optional ideas go under **Sugestões fora de escopo (não implementar)** — never inside Feature acceptance criteria.
4. **Silent architecture decisions** — ML, OCR, heavy sync, multi-region: record intent and `[DECISÃO DE ARQUITETURA: …]`; do not pretend the design is settled.
5. **Fake integration readiness** — External systems need contract hints (API/protocol/format) or `[LACUNA: contrato de integração não definido]`.
6. **Task leakage** — No `tasks/`, checklists of implementation steps, or GitLab issue drafts in this artifact.
7. **Silent team productivity** — Hours must cite team experience (seniority / tenure / involvement) and/or an explicit productivity premise; do not invent “fast team” without a marker.
8. **Ignore known product context** — When `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` exist, do not budget as greenfield capabilities that those docs already describe; size the **delta** or mark conflict with `[LACUNA: …]` / `[ASSUMPTION: …]`.
9. **Contradict reverse-spec silently** — If chat scope conflicts with documented behavior, surface it; do not overwrite the reverse-spec in the budget.

## Lacunas

Use PT-BR markers in the deliverable (default language):

- `[LACUNA: …]` — missing fact; stakeholder must confirm
- `[ASSUMPTION: …]` — temporary fill after quick mode / proceed with assumptions
- `[DECISÃO DE ARQUITETURA: …]` — needs human/architect call

Surface open lacunas in **Premissas / ressalvas**. A budget with open lacunas is still deliverable, but call them out in the chat summary.

## Estimates honesty

- FP and CFP are judgment-based; always include short rationale.
- Hours without clarified team experience or house productivity must declare `[ASSUMPTION: …]` or `[LACUNA: …]` and the productivity figure used.
- When reverse-spec/map show reuse, hours premise should reflect brownfield delta — not full rebuild of documented behavior.
- Hours are effort estimates — not a commercial quote in R$.
