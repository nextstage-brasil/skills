---
name: ns-commercial-budget
description: >
  (NS) Client-facing commercial budget from a free-form scope description —
  Features with precedence and acceptance criteria, Function Points, COSMIC CFP
  (E/R/W/X), and predicted development hours. When docs/context exists, reads
  system-reverse-spec (prefer .agent.md) and brownfield-map to size the delta
  on the known product. Stops at FP + COSMIC + hours — never price in R$ /
  Investimento. Use whenever the user asks for orçamento, proposta comercial,
  cotação, budget proposal, ponto-função, Function Points, COSMIC, CFP,
  precificar escopo, or a commercial quote from a product description — even if
  they do not name this skill. Do NOT use for SDD requirements.md / tasks /
  GitLab issues (ns-sdd-*), RICE/sprint/PERT delivery forecast
  (ns-project-manager), or factory token/USD cost.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.3"
depends:
  - ns-harness
---

# Commercial Budget

Produce a **client-facing commercial budget** from a free-form description: scoped **Features** (not legacy “RF / requisito funcional” labeling) and estimates (**FP + COSMIC CFP + predicted hours**).

When product context exists, **align Features and hours to the known system** (reverse business spec + brownfield map) so the budget sizes the **delta**, not a blank-slate rewrite.

**Hard stop:** do **not** include Investimento (R$), R$/h, R$/PF, margin, or any commercial price. Effort ends at hours.

This skill is **not** SDD execution, not `tasks/`, not GitLab issues, and not the gated PM pipeline (RICE / sprint / PERT).

## Harness discovery

When the workspace has a harness layout, resolve `{product_root}` via `../ns-harness/references/harness-discovery.md` and `../ns-harness/references/artifact-layout.md`.

If no harness is found: use repo root as `{product_root}`. Ask once for `{version_san}` if missing — a placeholder slug is fine (e.g. `orcamento-api-orcrim`).

## Language

- Skill instructions: English (this file + `references/`).
- **Deliverable:** Portuguese (Brazil) by default. English only when the human explicitly asks.

## Workflow

### 1. Intake

1. Capture the free-form scope description (and any productivity / team-experience hints already given).
2. Resolve `{product_root}` and `{version_san}` (ask if missing; placeholder ok).
3. **Product context boot** — read `references/product-context.md` and load `{context_root}` artifacts when present (`system-reverse-spec.agent.md` preferred over `system-reverse-spec.md`, plus `brownfield-map.md`).
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
2. Read `references/cosmic-sizing.md` before sizing CFP.
3. Fill the template using **chat scope + product context** (reuse/extend existing entities, use cases, roles, integrations when documented):

| Section | Rules |
|---------|--------|
| Objetivo principal | Executive summary of the version/scope |
| Features (≤10) | IDs `Feature 001`…; dependency order; Precedência; generous description; acceptance criteria. Do **not** use `RF` / “Requisitos Funcionais”. Prefer delta-on-existing over inventing parallel capabilities already in reverse-spec |
| RNFs | Only if identified from scope/clarification — no gold plating |
| Estimativas | FP total + rationale; COSMIC per Feature (E/R/W/X) + ΣCFP; **horas previstas** grounded in team experience / productivity **and** brownfield reuse signals |
| Investimento (R$) | **Omit entirely** — never price |
| Premissas / ressalvas | Assumptions (incl. team knowledge + which `docs/context/` files were read), out-of-scope, open lacunas |
| Tasks | **Never** include a task list |

**Hours:** calibrate from clarified team experience (seniority, tenure on the product, involvement) and from reverse-spec/map signals (reuse vs greenfield). If house productivity (h/PF or h/CFP) was given, use it and cite it. If experience was not answered, mark `[ASSUMPTION: …]` or `[LACUNA: …]` and state the productivity premise explicitly. Include test effort inside the hours (do not invent factory A/A′/B scenarios).

### 4. Persist

Unless the human said chat-only / skip docs:

```
{product_root}/docs/versions/{version_san}/commercial-budget.md
```

Create the directory with `mkdir -p` (or equivalent) when needed. Overwrite on regenerate; tell the human the path.

### 5. Stop

After the document:

1. Summarize path + totals (**FP, ΣCFP, hours previstas** only) and whether product context was used.
2. **Do not** generate tasks, GitLab issues, `requirements.md`, SDD handoff, or any R$ total.
3. Offer next step in text only: approve → SDD / PM delivery forecast if needed.

## Out of scope

- Writing `requirements.md` or invoking SDD task generators
- Running `ns-harness-codebase-reverse-spec` / prepare unless the human explicitly asks
- Factory effort bands A / A′ / B or token/USD cost models
- RICE, sprint planning, PERT/Monte Carlo (`ns-project-manager`)
- Commercial pricing (Investimento, R$/h, R$/PF, margin)

## References

| File | When |
|------|------|
| `references/product-context.md` | After `{product_root}` — reverse-spec / brownfield boot |
| `references/clarification.md` | Before generating — intake questions |
| `references/cosmic-sizing.md` | Before COSMIC E/R/W/X counts |
| `references/anti-hallucination.md` | Before writing Features / estimates |
| `assets/commercial-budget.template.md` | Structure of the client document |
