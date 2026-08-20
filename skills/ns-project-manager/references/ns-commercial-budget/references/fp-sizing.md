# Function Points (commercial budget)

**Default measurement (contract 7.3.5):** Análise de Pontos de Função (**APF**). Count **UFP**.

1. **IFPUG CPM**, latest published edition (do not freeze an old year in the deliverable; state the edition used).
2. **SISP Roteiro de Métricas**, latest published edition — **only** for situations **not contemplated** by that CPM. As of 2026-06: SISP **3.0** (Portaria SGD/MGI nº 3.656/2026) until a newer official SISP replaces it.
3. Switch away from this cascade only if the human **already named** another method (NESMA, SFP, house, COSMIC-for-hours). Never mix silent house discounts with CPM.

**Internal only:** method statement, origem (Tipo, RET/DET or FTR/DET, complexidade, UFP, ADD/CHG/DEL, Base CPM|SISP). **Client commercial doc:** per-Feature FP + product-language justificativa — no CPM/SISP jargon.

**Invariant:** **Total PF is identical** in `commercial-budget-internal.md` and `commercial-budget-costumer.md` (and Σ PF in both macro tables, both hours bases). Presentation differs; the count does not. `qualidade` = 0 FP in both.

## Method statement (internal, mandatory)

PT-BR default, under `### Pontos de Função (FP)` in `commercial-budget-internal.md` only:

```markdown
A unidade de mensuração é a Análise de Pontos de Função (APF).
A contagem dos pontos de função foi realizada de acordo com o Manual de Práticas de Contagem (Counting Practices Manual - CPM) publicado pelo International Function Point Users Group (IFPUG), na sua versão mais atual ({edition used, e.g. CPM 4.3.1}).
Situações não contempladas pelo CPM foram contadas com o Roteiro de Métricas de Software do SISP, na versão mais atual ({edition used, e.g. SISP 3.0}). Se nenhuma linha usou SISP, dizer: nenhuma situação fora do CPM.

| Campo | Valor |
|-------|--------|
| Tipo de contagem | Desenvolvimento \| Melhoria \| Aplicação |
| Fronteira da aplicação | {what is inside this product vs users / other applications} |
```

- **Desenvolvimento** — greenfield / no baseline product.
- **Melhoria** — default when reverse-spec / brownfield-map / reuse inventory exists (delta).
- **Aplicação** — baseline snapshot (rare for this skill).

Do **not** put this block in `commercial-budget-costumer.md`.

## Must count — do not zero modern UI

PF is **independent of technology**. A 2026 screen, SPA, mobile view, GraphQL-backed list, chart, planograph/planograma, map, or BI tile is still a user function if the user recognizes it.

**Count (never 0 because “só tela / só gráfico / framework”):**

| User-visible work | First try (CPM) | If CPM does not contemplate it |
|-------------------|-----------------|--------------------------------|
| Consulta de tela, lista, filtro, detalhe, pesquisa | **EQ** (retrieval) or **EO** if derived/calculated | SISP current — still a sized item |
| Inclusão / alteração / exclusão / fluxo em tela | **EI** | SISP current |
| Planograph / planograma / layout visual de produtos | **ILF** if the layout is a maintained logical file; **EQ/EO** for consult/maintain | SISP geotecnologia / painel if spatial-analytic and CPM type does not fit |
| Gráfico, dashboard, painel analítico | **EO** (derived) or **EQ** | SISP 3.0+ painéis analíticos |
| Mapa / camada geo | EQ/EO + logical files of geo data | SISP 3.0+ geotecnologias |
| Chatbot / IA / DW / data lake user functions | Elementary process + logical files if identifiable | SISP 3.0+ that context |

Same elementary process on web + mobile = **one** transactional function (not two) unless processing logic differs.

**Forbidden:** skip consulta de telas; skip planograph as “desenho”; skip charts as “lib de BI”; skip GraphQL/API screens as “não é APF”.

`qualidade` (automated tests only) stays **0 FP** — verification, not a user function. User-facing consulta/planograph is **not** `qualidade`.

## CPM counting sequence (internal)

Execute in order. Do not skip to weights.

1. **Type of count** — Desenvolvimento / Melhoria / Aplicação.
2. **Scope and application boundary** — users and other systems **outside**.
3. **Data functions** — ILF (maintained inside), EIF (referenced, maintained outside). RET + DET → matrix.
4. **Transactional functions** — one row per **elementary process**:
   - **EI** — maintain an ILF or alter behaviour.
   - **EO** — present information **with derived/calculated data**, or alter behaviour.
   - **EQ** — present information by retrieval; **no** derived data.
5. **Enhancement** — ADD / CHG / DEL. Unchanged: omit. `net-new`→ADD; `extend`→CHG (full UFP after change); `reuse`→omit. No house %.
6. **UFP** — Σ contributions. No GSC/VAF unless the human asked for adjusted FP.

## SISP fallback (only when CPM does not contemplate)

Use **latest SISP** complementary APF rules (not SFP/SPP/HST unless the human named those metrics).

1. Identify the user-recognizable function that has no CPM type.
2. Apply the matching SISP 3.0+ chapter (painéis analíticos, geotecnologias, IA/chatbot, DW/data lake, and other “not in CPM” items in that edition).
3. Origem row: **Base = SISP**, Fonte = SISP edition + chapter/section name. Keep UFP in the same total.
4. If the SISP PDF is not in the workspace: still **count** via closest CPM EQ/EO/EI/ILF from the user view and mark `[ASSUMPTION: SISP {chapter} not at hand — classified as {type}]`. Never drop the function.

If the human named NESMA/house/SFP: follow that instead of this cascade.

## Complexity matrices (IFPUG CPM)

If RET/DET or FTR/DET can be inferred, classify **Low / Average / High**. If not inferable: **Average** and `[ASSUMPTION: complexity Average — DET/RET or FTR not stated]` — **still count the function**.

**ILF / EIF** (RET × DET):

| RET \ DET | 1–19 | 20–50 | 51+ |
|-----------|------|-------|-----|
| 1 | Low | Low | Average |
| 2–5 | Low | Average | High |
| 6+ | Average | High | High |

**EI** (FTR × DET):

| FTR \ DET | 1–4 | 5–15 | 16+ |
|-----------|-----|------|-----|
| 0–1 | Low | Low | Average |
| 2 | Low | Average | High |
| 3+ | Average | High | High |

**EO / EQ** (FTR × DET):

| FTR \ DET | 1–5 | 6–19 | 20+ |
|-----------|-----|------|-----|
| 0–1 | Low | Low | Average |
| 2–3 | Low | Average | High |
| 4+ | Average | High | High |

**UFP weights:**

| Tipo | Low | Average | High |
|------|-----|---------|------|
| ILF | 7 | 10 | 15 |
| EIF | 5 | 7 | 10 |
| EI | 3 | 4 | 6 |
| EO | 4 | 5 | 7 |
| EQ | 3 | 4 | 6 |

## Internal doc — per-Feature table

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 00N | n | Product-language: what capability adds/changes and why that FP count |

## Origem do cálculo (internal only)

| Elemento | Tipo | Contribuição | RET/FTR | DET | Complexidade | UFP | Base | Fonte |
|----------|------|--------------|---------|-----|--------------|-----|------|-------|
| Cadastro de parceiros | ILF | ADD | 1 | [ASSUMPTION] | Average | 10 | CPM | Feature 001 |
| Consulta em tela por documento | EQ | ADD | 1 | [ASSUMPTION] | Average | 4 | CPM | Feature 002 |
| Planograma da loja | EO | ADD | 2 | [ASSUMPTION] | Average | 5 | CPM or SISP | Feature 003 |
| **Total UFP** | | | | | | **{n}** | | |

- **Base:** `CPM` or `SISP`.
- **Contribuição:** ADD / CHG / DEL for Melhoria; ADD for Desenvolvimento.

## Client export (`commercial-budget-costumer.md`)

When `engineering-split.md` applies:

| Row type | Content |
|----------|---------|
| Per `negócio` Feature | FP + product-language justificativa + Esforço (h) + Custo (R$) |
| **Subtotal negócio** | Σ `negócio` FP (and Σ hours / Σ R$ when those columns are filled) |
| **Engenharia de consistência do produto** | Σ `engenharia` FP — plain-language rollup; same extra columns |
| **Total** | Same as internal Total PF; Esforço total = Horas base when productivity given |

**Esforço (h)** — row FP × team productivity (h/PF used in Horas previstas). No safety margin here. If productivity was **not specified**: `—` in every Esforço cell (including subtotal/total). Do not invent h/PF.

**Custo (R$)** — Esforço × R$/h, or row FP × R$/PF when that rate was given. If **no rate** was specified: `—` in every Custo cell. Never invent R$. R$/PF can fill Custo even when Esforço is `—`.

- No method statement, Tipo, RET/DET, UFP, ADD/CHG/DEL, ILF/EIF/EI/EO/EQ, SISP chapter names.
- Do **not** copy the internal origem table.
- **Total** PF line = internal **Total UFP**. Hours base/margin/total = internal. Macro Σ PF = that same total.

## Consistency

- Σ per-Feature FP (internal) = client **Total** = Total UFP = Σ PF in **both** macro tables.
- FP ≠ CFP. COSMIC only if the human asked.

## Anti-patterns

- Claiming CPM while using house % discounts.
- Skipping boundary / type of count.
- Zero PF on consulta de tela, planograph, gráfico, dashboard, mapa, or GraphQL-backed user query.
- Treating user-facing screens as `qualidade` (0 FP).
- Switching the whole budget to SFP/SPP/HST when the contract/default is APF.
- Origem missing or not summing to Total UFP.
- Counting files/tables/APIs instead of logical files and elementary processes — but **do** count the user function those APIs serve.
- CPM/SISP origem in `commercial-budget-costumer.md`.
- Different Total PF (or hours) between internal and client docs.
- Invented Esforço or Custo in the client FP table when productivity or rates were not specified.
