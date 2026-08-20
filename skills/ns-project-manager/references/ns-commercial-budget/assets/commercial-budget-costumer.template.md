# Orçamento comercial — {product_display_name}

**Sequência:** `{seq}`  
**Gerado em:** `{generated_at}`  
**Versão / referência:** `{version_san}-costumer`  
**Idioma:** PT-BR

---

## Objetivo principal da versão

{Same commercial/product summary as internal doc — no engineering framing.}

---

## Valor agregado desta versão

<!-- Client export only. Commercial talking track for management ↔ client. Same topic set as the proven executive-summary shape. See references/product-voice.md → Valor agregado. Do not write until value-audience is confirmed (or explicit `[ASSUMPTION]` after human said proceed). -->

**Público desta conversa:** {confirmed job/role this version is sold to — not a fixed title}

### Em uma frase

{One sentence: the daily pain → what this version lets {audience} do instead. Concrete, speakable. No Feature numbers.}

### O que muda no trabalho do {audience}

- **{Outcome in bold.}** {How work changes — grounded in scoped Features only.}
- **{…}** {…}

<!-- Several bullets. Prefer outcome-first (time, proof, permission, searchable corpus, false-positive control, own workspace) over a Feature dump. -->

### Exemplos de ganho concreto

| Antes | Depois |
|-------|--------|
| {How {audience} does it today} | {Same job after this version} |
| {…} | {…} |

<!-- 3–6 rows. Pair current friction with the scoped capability. No invented volumes or R$ ROI. -->

### O que esta versão **não** faz (para não gerar expectativa errada)

- {Explicit out-of-scope or “not this version” — from Premissas / Sugestões fora de escopo / known exclusions.}
- {…}

<!-- Include operational caveats that would otherwise oversell (e.g. batch ingest before full production use) when they are already in the budget. -->

---

## Fluxos principais (validação de entendimento)

{Copy client-relevant Mermaid flows from internal doc — ≤3 diagrams, unchanged styling rules.}

---

## Agrupamento de objetivos (Features)

> **Nota de leitura:** este documento apresenta apenas **objetivos de negócio** verificáveis pelo solicitante. A consistência interna do produto faz parte da entrega, mas não aparece como feature separada — está embutida nos critérios de aceite abaixo e refletida no total de horas.

<!-- `negócio` Features only. Renumber 001…N contiguously. Merge `engenharia` acceptance outcomes into parent Features. No `qualidade` Features. See references/engineering-split.md. -->

### Feature 001 — {TÍTULO}

**Descrição detalhada:**  
{Product language — include parent-level mention of product consistency when `engenharia` children were merged.}

#### Critérios de aceite

- [ ] {product-verifiable — includes merged outcomes from absorbed `engenharia` items}
- [ ] {product-verifiable}

<!-- Repeat Feature 002…N. -->

---

## Requisitos Não Funcionais (RNFs)

<!-- Copy from internal; add quality line when `qualidade` items exist: -->
- **Qualidade:** verificação automatizada cobre {capabilities} — critério de parada em falha no ambiente de execução do projeto

---

## Estimativas

### Pontos de Função (FP) — visão de negócio

| Feature | FP | Justificativa | Esforço (h) | Custo (R$) |
|---------|-----|---------------|-------------|------------|
| Feature 001 | {n} | {product-language rationale} | {FP × h/PF, or —} | {from rates, or —} |
| Feature 002 | {n} | {…} | {… or —} | {… or —} |
| **Subtotal negócio** | **{sum_negócio}** | Features verificáveis pelo solicitante | **{sum or —}** | **{sum or —}** |
| Engenharia de consistência do produto | {sum_engenharia} | {Plain-language rollup — no internal Feature numbers} | {… or —} | {… or —} |
| **Total** | **{total}** | Contagem **delta** | **{Horas base or —}** | **{sum or —}** |

<!-- Esforço (h) = that row’s FP × team productivity (h/PF). Same productivity as Horas previstas. No safety margin in this column (margin stays in Horas previstas). If productivity was not given: every Esforço cell is `—` (including totals). -->
<!-- Custo (R$) = Esforço × R$/h, or FP × R$/PF when that rate was given. If no rate: every Custo cell is `—`. Never invent R$. -->

<!-- COSMIC (CFP): omit entire subsection unless the human explicitly asked for COSMIC/CFP. -->

### Horas previstas (cálculo)

| Item | Valor |
|------|-------|
| Total FP | {total — same as internal} |
| Produtividade | {h/PF} |
| Horas base | {total} FP × {h/PF} = **{n} h** |
| Margem de segurança | {s}% |
| **Total com margem** | **{n} h** |

---

## Macroatividades do projeto

{Same table and totals as internal doc — unchanged hours and PF.}

---

## Riscos e margem de segurança

{Rewrite risks in product language — no internal Feature numbers. Same margin %.}

---

## Premissas e ressalvas

- {Same as internal where client-relevant}
- A **engenharia de consistência do produto** faz parte da entrega e do total de horas, mas não é apresentada como feature de negócio separada neste documento.
- Este artefato **não** contém lista de tarefas (`tasks/`), issues GitLab nem handoff SDD.

---

## Sugestões fora de escopo (não implementar)

{Optional — copy from internal if present.}

---

## Próximos passos (informativo)

Após aprovação do escopo e estimativas: detalhamento SDD e/ou forecast PM — **fora desta skill**.
