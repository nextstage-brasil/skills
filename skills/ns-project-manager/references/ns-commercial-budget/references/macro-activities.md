# Macro activities (commercial budget)

After FP / COSMIC / base hours set, **allocate** across fixed project macro activities. Output one mandatory table in deliverable.

## Fixed rows (always — this order)

| # | Macroatividade | What it covers |
|---|----------------|----------------|
| 1 | Engenharia de requisitos | Elicitation, clarification, Feature/acceptance refinement, scope freeze for version |
| 2 | Design / Arquitetura | Solution design, integration contracts, data/API design, architecture decisions for delta |
| 3 | Implementação | Build of Features (code, config, migrations in scope) |
| 4 | Testes de implementação (unitário e e2e) | Automated unit tests + e2e when UI/critical flows apply; if no UI/e2e surface, still keep row — put e2e hours at 0 and note N/A in premissa |
| 5 | Testes de homologação | Tests in **controlled remote** environment (staging/UAT-like), scripted or exploratory by delivery team |
| 6 | Homologação | **Assisted validation with requester** (walkthrough, sign-off support) — not unattended QA |
| 7 | Implantação | Delivery/release process (deploy, smoke, handover) — **not** second “Implementação” row |

Do **not** rename, merge, or drop rows. Do **not** add extra macro rows unless human explicitly requests.

## Table columns

| Column | Rule |
|--------|------|
| Macroatividade | Exact labels above |
| Esforço (h) | Hours for that row (one decimal ok) |
| PF | Function-point **share** of version total (may be fractional; sum = Total FP) |
| Custo (R$) | Fill **only** if human gave R$/h and/or R$/PF; else `—` for every row and one footnote `_pending rates_` |

**Σ row:** sum of esforço, sum of PF (= Total FP), sum of Custo when rates exist.

## Default effort mix (baseline)

Use unless human supplies another split. Mark `[ASSUMPTION: mix macro …]` when using defaults. Adjust with rationale when reverse-spec / brownfield / team experience justify (must still sum **100%**).

| Macroatividade | % of base hours |
|----------------|-----------------|
| Engenharia de requisitos | 12% |
| Design / Arquitetura | 12% |
| Implementação | 40% |
| Testes de implementação (unitário e e2e) | 18% |
| Testes de homologação | 7% |
| Homologação | 6% |
| Implantação | 5% |
| **Total** | **100%** |

**PF share:** same percentages applied to Total FP (or redistribute with explicit rationale if phase is PF-light — document why).

**CFP:** keep at Feature level; do not force second COSMIC table per macro unless asked.

## Base vs margin

1. Compute **base hours** from FP × productivity (or stated h/CFP) as today.
2. Allocate base hours with mix above: per-row esforço **before** safety margin.
3. Apply **safety margin %** from `references/risk-margin.md` to produce:
   - per-row esforço **com margem** (or show base table + one line “margem de segurança X% then total com margem”)
   - Prefer one table with **Esforço (h)** = hours **including** safety margin, and state % in risks section; also show base total and total with margin.

Recommended presentation:

- Table uses **hours with safety margin** (what budget commits).
- Footnote: `Base: {h} h · Margem de segurança: {p}% · Total com margem: {h} h`

## Consistency

- Σ esforço (com margem) = hours total reported in Estimativas (com margem).
- Σ PF = Total FP from Estimativas.
- Macro table does **not** replace Feature list — layers lifecycle cost on Feature sizing.
