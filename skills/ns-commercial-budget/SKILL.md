---
name: ns-commercial-budget
description: >
  (NS) Client-facing commercial budget from a free-form scope description —
  Features with precedence and acceptance criteria, Function Points, COSMIC CFP
  (E/R/W/X), predicted hours, macro-activity table (RE, design/arch, build,
  impl tests, homologation tests, assisted homologation, deployment) with
  effort/PF/optional R$ cost, plus risk-based safety/error margin %. Header
  carries generation sequence + date/time (same file path on regenerate). When
  docs/context exists, must read reverse-spec and brownfield-map in full,
  build a reuse inventory, and size the delta (not greenfield). Never invent
  R$ without human rates. Use
  whenever the user asks for orçamento, proposta comercial, cotação, budget
  proposal, ponto-função, Function Points, COSMIC, CFP, precificar escopo, or
  a commercial quote from a product description — even if they do not name
  this skill. Do NOT use for SDD requirements.md / tasks / GitLab issues
  (ns-sdd-*), RICE/sprint/PERT delivery forecast (ns-project-manager), or
  factory token/USD cost.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.8"
depends:
  - ns-harness
---

# Commercial Budget

Produce a **client-facing commercial budget** from a free-form description: scoped **Features**, estimates (**FP + COSMIC CFP + hours**), a **macro-activity table** (lifecycle effort), and **risk-based safety / error margins**. The artifact path is fixed; **Sequência** + **Gerado em** (date and time) version the content in the header on each regenerate.

**Audience:** product manager or client — **product voice only** in the deliverable (see `references/product-voice.md`). No field names, classes, schemas, or implementation jargon.

When product context exists, **read artifacts in full**, build a **reuse inventory** (`references/product-context.md`), then align Features and hours to the known system so the budget sizes the **delta**, not a blank-slate rewrite. Sizing without reuse inventory when context files exist is **blocked**.

**Pricing:** fill **Custo (R$)** in the macro table **only** when the human supplies R$/h and/or R$/PF. Never invent rates or a silent Investimento total outside that table.

This skill is **not** SDD execution, not `tasks/`, not GitLab issues, and not the gated PM pipeline (RICE / sprint / PERT).

## Harness discovery

When the workspace has a harness layout, resolve `{product_root}` via `../ns-harness/references/harness-discovery.md` and `../ns-harness/references/artifact-layout.md`.

If no harness is found: use repo root as `{product_root}`. Ask once for `{version_san}` if missing — a placeholder slug is fine (e.g. `orcamento-api-orcrim`).

## Language

- Skill instructions: English (this file + `references/`).
- **Deliverable:** Portuguese (Brazil) by default. English only when the human explicitly asks.
- **Product voice (mandatory):** read `references/product-voice.md` before writing Features / RNFs / acceptance / risks / premissas. Size methods (FP, COSMIC) stay in Estimativas; the narrative stays business/product.

## Workflow

### 1. Intake

1. Capture the free-form scope description (and any productivity / team-experience / rates hints already given).
2. Resolve `{product_root}` and `{version_san}` (ask if missing; placeholder ok).
3. **Product context boot + reuse gate** — read `references/product-context.md`; when `{context_root}/` exists, **mandatory full read** of reverse-spec (`.agent.md` then `.md` as applicable) and `brownfield-map.md`, then build the **reuse inventory** before clarification or sizing.
4. Confirm whether to persist under `docs/versions/` or chat-only (default: persist).

### 2. Clarify (actionable, not staircase)

Read `references/clarification.md`.

- Batch **at most 5** questions in one message.
- At most **one** follow-up round.
- Prefer asking **team experience** when hours will be estimated and that context is missing (seniority, time on the product, depth of involvement).
- Do **not** re-ask facts already covered by the reverse-spec / brownfield map — ask about the **delta** only.
- Skip clarification when the human says `proceed with assumptions` or `quick mode` — mark gaps as `[ASSUMPTION: …]` or `[LACUNA: …]` in the doc.
- Do not invent SLAs, volumes, or prices to fill gaps (see `references/anti-hallucination.md`).

### 3. Generate

1. Read `assets/commercial-budget.template.md`.
2. Read `references/product-voice.md` before drafting any client-facing section.
3. Read `references/cosmic-sizing.md` before sizing CFP.
4. Read `references/macro-activities.md` and `references/risk-margin.md` before the lifecycle table and margin section.
5. Read `references/document-versioning.md` before persist — bump header **Sequência** + **Gerado em**.
6. **Reuse inventory applied** — confirm each scope piece is classified `reuse` / `extend` / `net-new` with reverse-spec/map signals; discount reuse in Features and estimates. Do not size until this step is done when context files existed.
7. Fill the template using **chat scope + product context + reuse inventory** (product language only):

| Section | Rules |
|---------|--------|
| Objetivo principal | Executive product summary — impact and intent, no tech stack |
| Features (≤10) | IDs `Feature 001`…; dependency order; Precedência; generous **product** description; acceptance criteria a PM can verify. Do **not** use `RF` / “Requisitos Funcionais”. Prefer delta-on-existing. No fields/classes/APIs as schema |
| RNFs | Only if identified — product/quality language, no invented SLAs |
| Estimativas | FP total + rationale; COSMIC per Feature (E/R/W/X) + ΣCFP; **horas base** + **horas com margem de segurança** |
| Macroatividades | Mandatory 7-row table: esforço (h), PF, Custo (R$ or `—`); see `macro-activities.md` |
| Riscos e margem | Risks in product/delivery language + margem de erro `%` + margem de segurança `%` |
| Premissas / ressalvas | Assumptions (team knowledge, delta-on-known-product with reuse applied, mix %, margins), out-of-scope, lacunas — still product-readable |
| Tasks | **Never** include a task list |

**Hours:** calibrate from team experience and reverse-spec/map signals. If house productivity (h/PF or h/CFP) was given, use it and cite it. Otherwise mark `[ASSUMPTION: …]` / `[LACUNA: …]`. Base hours cover the full macro lifecycle (not “coding only”). Then apply safety margin from risks.

### 4. Persist

Unless the human said chat-only / skip docs:

```
{product_root}/docs/versions/{version_san}/commercial-budget.md
```

Follow `references/document-versioning.md`:

1. `mkdir -p` the version folder when needed.
2. If the file exists, read current **Sequência** and increment; else start at `1`.
3. Set **Gerado em** to local date **and** time at write.
4. Overwrite the same path (header carries the version).
5. Tell the human the path + sequência + Gerado em.

### 5. Stop

After the document:

1. Summarize **sequência**, **Gerado em**, path + totals (**FP, ΣCFP, hours base, hours com margem, margem %**) and whether Custo was filled.
2. **Do not** generate tasks, GitLab issues, `requirements.md`, or SDD handoff.
3. Offer next step in text only: approve → SDD / PM delivery forecast if needed.

## Out of scope

- Writing `requirements.md` or invoking SDD task generators
- Running `ns-harness-codebase-reverse-spec` / prepare unless the human explicitly asks
- Factory effort bands A / A′ / B or token/USD cost models
- RICE, sprint planning, PERT/Monte Carlo (`ns-project-manager`)
- Invented R$ / sales markup disguised as safety margin

## References

| File | When |
|------|------|
| `references/product-context.md` | After `{product_root}` — mandatory read + reuse inventory gate |
| `references/product-voice.md` | Before drafting — product/client language |
| `references/clarification.md` | Before generating — intake questions |
| `references/cosmic-sizing.md` | Before COSMIC E/R/W/X counts |
| `references/macro-activities.md` | Before lifecycle allocation table |
| `references/risk-margin.md` | Before risks / safety % |
| `references/document-versioning.md` | Before persist — header Sequência + Gerado em |
| `references/anti-hallucination.md` | Before writing Features / estimates |
| `assets/commercial-budget.template.md` | Structure of the client document |
