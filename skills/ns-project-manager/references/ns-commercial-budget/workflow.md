---
name: ns-commercial-budget
description: >
  (NS) Client-facing commercial budget from free-form scope — dual audience
  (client-first + delivery completeness). Features with acceptance criteria,
  Mermaid flow validation, per-Feature Function Points with calculation origins,
  hours as productivity formula, macro-activity table, risk-based safety margin
  with Responsável (Cliente/Empresa/Ambos). COSMIC CFP table only when the human
  explicitly asks (COSMIC, CFP, cosmic functions).
  Header Sequência + Gerado em on regenerate. When docs/context exists, full
  read reverse-spec + brownfield-map, reuse inventory, size delta not greenfield.
  Never invent R$. Optional engineering split: internal commercial-budget-internal.md
  plus client export commercial-budget-costumer.md when scope mixes business
  capabilities with operational/architectural consequences. Use for orçamento,
  proposta comercial, cotação, budget proposal, ponto-função, Function Points,
  COSMIC, CFP, precificar escopo.
  NOT for SDD requirements.md/tasks/GitLab issues, RICE/sprint/PERT, factory
  token/USD cost.
license: Apache-2.0
provides:
  - artifact:commercial-budget
consumes:
  - artifact:docs/context/architecture-rules.md
metadata:
  author: nextstage-brasil
  version: "1.24"
---

# Commercial Budget

Client-facing commercial budget from free-form scope: **Features**, **Mermaid flows**, **Function Points + hours**, **macro table**, **risk margins**. **Default sizing = APF (IFPUG CPM latest; SISP latest only for cases CPM does not cover).** Include COSMIC CFP only when the human explicitly asks. Other FP methods only when the human names them. Count screen consults, planograph, charts, maps — never 0 PF as “UI only”. Fixed path; header **Sequência** + **Gerado em** each regenerate.

**Audience:** client first, delivery second. Client confirms scope; team gets traceable sizing. Narrative = product/commercial. Sizing detail in Estimativas. Read `references/product-voice.md`.

**Product context:** full-read reverse-spec + brownfield-map when present; reuse inventory; size **delta**, not greenfield. Block sizing if context exists and inventory missing.

**Pricing:** Custo (R$) only when human supplies rates. Never invent.

Not SDD, not tasks/, not GitLab issues, not RICE/sprint/PERT.

## Session boot

Optional — skip step if path missing. Do not invent project layout.

1. If `agents.local.md` exists beside `AGENTS.md`, read once. Never tool-Read `AGENTS.md`.
2. If `.nextstage-harness/rules/` exists, read `architecture-rules.md` and `project-rules.md` when present.
3. If `docs/context/` exists, follow `references/product-context.md` (full reverse-spec + brownfield-map) before clarifying.
4. If none exist, continue chat scope only. Ask once for `{version_san}` when persist needs it. Do not create `docs/versions/` until persist agreed.

## Language

- Skill + references: English.
- Deliverable: PT-BR default. English only when human asks.
- Read `references/product-voice.md` before client-facing sections.

## Workflow

### 1. Intake

1. Capture scope + productivity / team / rates hints.
2. Resolve `{version_san}`.
3. **Product context + reuse gate** — `references/product-context.md`; mandatory full-read reverse-spec + `brownfield-map.md`; reuse inventory before clarify/sizing.
4. Persist under `docs/versions/{version_san}/pm/` or chat-only (default: persist).

### 2. Clarify

Read `references/clarification.md`.

- ≤5 questions, one batch; ≤1 follow-up round.
- Prefer team experience when hours estimated and missing.
- Do not re-ask reverse-spec/brownfield facts — ask **delta** only.
- `proceed with assumptions` / `quick mode`: mark `[ASSUMPTION]` / `[LACUNA]` in doc.
- No invented SLAs, volumes, prices (`references/anti-hallucination.md`).

### 3. Generate

1. `assets/commercial-budget-internal.template.md`
2. `references/product-voice.md`
3. `references/sales-value-speech.md` — when writing `commercial-budget-costumer.md` (Valor agregado)
4. `references/engineering-split.md` — classify each scoped item `negócio` | `engenharia` | `qualidade` before Features
5. `references/fp-sizing.md` — always (default = APF: IFPUG CPM latest, SISP fallback)
6. `references/cosmic-sizing.md` — **only** if human asked for COSMIC / CFP / cosmic functions; otherwise skip (do not size, do not add a CFP section)
7. `references/macro-activities.md` + `references/risk-margin.md`
8. `references/document-versioning.md`
9. **Reuse inventory applied** — map `net-new`→ADD, `extend`→CHG, `reuse`→omit (IFPUG enhancement). Block if context existed and inventory skipped.

| Section | Rules |
|---------|--------|
| Objetivo principal | Commercial/product — value, who benefits, product change. **Not** engineering-area framing |
| Valor agregado (client export only) | After Objetivo in `commercial-budget-costumer.md`. Locked speech to the **decision-maker**. Four headings only (`sales-value-speech.md`). No extra subsections. Gains = measurable ranges; objections = trust / overlap / permission — not quote theater |
| Fluxos principais | 1–3 Mermaid `flowchart TD`; white init + Palette A/B `classDef` + `linkStyle` edges (`product-voice.md`). Subtitle per diagram; validation chain optional; client-readable PT-BR labels |
| Features (≤10) | `Feature 001`…; generous product description + acceptance criteria client can verify. **No Precedência.** No `RF`. Delta-on-existing. No fields/classes/API schema. Internal doc may list `engenharia` / `qualidade` as separate Features for traceability; client export lists `negócio` only (`engineering-split.md`) |
| RNFs | Only if identified — product language |
| Estimativas — FP | **Same Total PF** in both docs. Internal: APF + CPM/SISP origem. Client: per-Feature FP + justificativa + **Esforço (h)** + **Custo (R$)** — **no** CPM/SISP types (`fp-sizing.md`, `engineering-split.md`). Esforço = `—` if productivity unspecified; Custo = `—` if rates unspecified |
| Estimativas — COSMIC | **Omit by default.** If human asked: summary table + method reference line only — **no** rationale prose |
| Estimativas — Horas | **Calculation only:** FP × productivity; base; margin; total. Cite productivity source |
| Macroatividades | 7-row table unchanged (`macro-activities.md`) |
| Riscos | Table + margins; **Responsável** column: Cliente / Empresa / Ambos |
| Premissas | Assumptions, out-of-scope, lacunas — client-readable |
| Tasks | **Never** |

**Hours:** productivity from human or `[ASSUMPTION]`. Base = formula. Margin from risks. Macro table allocates budgeted hours.

### 4. Persist

Create `pm/` if missing. Before write: `../pm-persist.md` — if the same basename already exists outside `pm/` under this version, search references, propose the move, wait; do not silent-move.

**Internal (always):**

```
docs/versions/{version_san}/pm/commercial-budget-internal.md
```

**Client export (when `engineering-split.md` applies or human asks):**

```
docs/versions/{version_san}/pm/commercial-budget-costumer.md
```

Use `assets/commercial-budget-costumer.template.md`. Independent Sequência per file (`document-versioning.md`).

### 5. Stop

1. Summarize sequência, Gerado em, path(s), totals (FP, hours base, hours com margem, margin %), Custo filled or not. Include ΣCFP only when COSMIC was requested. When client file exists: note Valor agregado followed locked speech (decision-maker), subtotal negócio vs engenharia rollup, and whether Esforço/Custo columns are filled or `—`.
2. No tasks, issues, requirements.md, SDD handoff.
3. Offer approve then SDD / PM forecast in text only.

## Out of scope

- requirements.md, SDD generators
- reverse-spec / brownfield mapping unless human asks
- Factory bands A/A′/B, token/USD cost
- RICE, sprint, PERT (`ns-project-manager`)
- Invented R$ / sales markup as safety margin

## References

| File | When |
|------|------|
| `references/product-context.md` | After Session boot — reuse inventory gate |
| `references/product-voice.md` | Before drafting — dual-audience rules |
| `references/sales-value-speech.md` | When writing Valor agregado in `commercial-budget-costumer.md` |
| `references/engineering-split.md` | Before Features — classify negócio / engenharia / qualidade; client export |
| `assets/commercial-budget-costumer.template.md` | When writing `commercial-budget-costumer.md` |
| `references/clarification.md` | Before generating |
| `references/fp-sizing.md` | Before FP tables — APF default (CPM then SISP) |
| `references/cosmic-sizing.md` | Only when human asked for COSMIC/CFP (agent sizing; doc = table only) |
| `references/macro-activities.md` | Before lifecycle table |
| `references/risk-margin.md` | Before risks / margin % |
| `references/document-versioning.md` | Before persist |
| `../pm-persist.md` | Before persist — canonical `pm/` path; propose move + update refs if misplaced |
| `references/anti-hallucination.md` | Before Features / estimates |
| `assets/commercial-budget-internal.template.md` | Document structure (internal) |
