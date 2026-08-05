---
name: ns-commercial-budget
description: >
  (NS) Client-facing commercial budget from free-form scope — dual audience
  (client-first + delivery completeness). Features with acceptance criteria,
  Mermaid flow validation, per-Feature FP with calculation origins, COSMIC CFP
  table (E/R/W/X reference only), hours as productivity formula, macro-activity
  table, risk-based safety margin with Responsável (Cliente/Empresa/Ambos).
  Header Sequência + Gerado em on regenerate. When docs/context exists, full
  read reverse-spec + brownfield-map, reuse inventory, size delta not greenfield.
  Never invent R$. Use for orçamento, proposta comercial, cotação, budget
  proposal, ponto-função, Function Points, COSMIC, CFP, precificar escopo.
  NOT for SDD requirements.md/tasks/GitLab issues, RICE/sprint/PERT, factory
  token/USD cost.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.10"
depends:
  - ns-harness
---

# Commercial Budget

Client-facing commercial budget from free-form scope: **Features**, **Mermaid flows**, **FP + COSMIC + hours**, **macro table**, **risk margins**. Fixed path; header **Sequência** + **Gerado em** on each regenerate.

**Audience:** client first, delivery team second. Client confirms scope understanding; team gets traceable sizing. Narrative = product/commercial. Sizing detail in Estimativas. Read `references/product-voice.md`.

**Product context:** full read reverse-spec + brownfield-map when present → reuse inventory → size **delta**, not greenfield. Block sizing without inventory when context exists.

**Pricing:** Custo (R$) only when human supplies rates. Never invent.

Not SDD, not tasks/, not GitLab issues, not RICE/sprint/PERT.

## Harness discovery

Resolve `{product_root}` via `../ns-harness/references/harness-discovery.md` + `artifact-layout.md`. No harness → repo root. Ask once for `{version_san}` if missing.

## Language

- Skill + references: English.
- Deliverable: PT-BR default. English only when human asks.
- Read `references/product-voice.md` before client-facing sections.

## Workflow

### 1. Intake

1. Capture scope + productivity / team / rates hints.
2. Resolve `{product_root}`, `{version_san}`.
3. **Product context + reuse gate** — `references/product-context.md`; mandatory full read reverse-spec + `brownfield-map.md` → reuse inventory before clarify/sizing.
4. Persist under `docs/versions/` or chat-only (default: persist).

### 2. Clarify

Read `references/clarification.md`.

- ≤5 questions, one batch; ≤1 follow-up round.
- Prefer team experience when hours estimated and missing.
- Do not re-ask reverse-spec/brownfield facts — ask **delta** only.
- `proceed with assumptions` / `quick mode` → `[ASSUMPTION]` / `[LACUNA]` in doc.
- No invented SLAs, volumes, prices (`references/anti-hallucination.md`).

### 3. Generate

1. `assets/commercial-budget.template.md`
2. `references/product-voice.md`
3. `references/fp-sizing.md`
4. `references/cosmic-sizing.md`
5. `references/macro-activities.md` + `references/risk-margin.md`
6. `references/document-versioning.md`
7. **Reuse inventory applied** — `reuse` / `extend` / `net-new`; discount reuse. Block if context existed and inventory skipped.

| Section | Rules |
|---------|--------|
| Objetivo principal | Commercial/product — value, who benefits, product change. **Not** engineering-area framing |
| Fluxos principais | 1–3 Mermaid `flowchart TD`; white init + Palette A/B `classDef` + `linkStyle` edges (`product-voice.md`). Subtitle per diagram; validation chain optional; client-readable PT-BR labels |
| Features (≤10) | `Feature 001`…; generous product description + acceptance criteria client can verify. **No Precedência.** No `RF`. Delta-on-existing. No fields/classes/API schema |
| RNFs | Only if identified — product language |
| Estimativas — FP | Per-Feature FP + justificativa; **origem do cálculo** table with traceable arithmetic (`fp-sizing.md`) |
| Estimativas — COSMIC | Summary table + method reference line only — **no** rationale prose |
| Estimativas — Horas | **Calculation only:** FP × productivity → base → margin → total. Cite productivity source |
| Macroatividades | 7-row table unchanged (`macro-activities.md`) |
| Riscos | Table + margins; **Responsável** column: Cliente / Empresa / Ambos |
| Premissas | Assumptions, out-of-scope, lacunas — client-readable |
| Tasks | **Never** |

**Hours:** productivity from human or `[ASSUMPTION]`. Base = formula. Margin from risks. Macro table allocates budgeted hours.

### 4. Persist

```
{product_root}/docs/versions/{version_san}/commercial-budget.md
```

`references/document-versioning.md`: mkdir, bump Sequência, set Gerado em, overwrite, report path.

### 5. Stop

1. Summarize sequência, Gerado em, path, totals (FP, ΣCFP, hours base, hours com margem, margin %), Custo filled or not.
2. No tasks, issues, requirements.md, SDD handoff.
3. Offer approve → SDD / PM forecast in text only.

## Out of scope

- requirements.md, SDD generators
- ns-harness-codebase-reverse-spec unless human asks
- Factory bands A/A′/B, token/USD cost
- RICE, sprint, PERT (`ns-project-manager`)
- Invented R$ / sales markup as safety margin

## References

| File | When |
|------|------|
| `references/product-context.md` | After `{product_root}` — reuse inventory gate |
| `references/product-voice.md` | Before drafting — dual-audience rules |
| `references/clarification.md` | Before generating |
| `references/fp-sizing.md` | Before FP tables |
| `references/cosmic-sizing.md` | Before COSMIC (agent sizing; doc = table only) |
| `references/macro-activities.md` | Before lifecycle table |
| `references/risk-margin.md` | Before risks / margin % |
| `references/document-versioning.md` | Before persist |
| `references/anti-hallucination.md` | Before Features / estimates |
| `assets/commercial-budget.template.md` | Document structure |
