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

<!-- Locked brief: references/sales-value-speech.md. Addressee = decision-maker (CEO/CFO/ops). Four headings only. No extra subsections. -->

### Headline de valor

{One transformative sentence: what the organization gains. Not delivery, not the quote, not technology.}

### Parágrafo de valor agregado

{One paragraph, 120–180 words PT-BR, read-aloud. Capability + business differentiator (not the UI) + main deliveries tied to result + foundation/ROI if in scope. No bullets, no jargon, no architecture.}

### Ganhos concretos esperados

- {Redução de X% a Y% em [processo], liberando A a B horas para [função]. Cite benchmark if real. `[⚠️ validar com cliente]` only on unsourced clauses.}
- {…}
- {…}

<!-- 3–5 measurable gains. Scope facts (volume, hop count) are not gains by themselves. -->

### Possíveis objeções + resposta sugerida

**"{Trust / overlap / permission objection a decision-maker would raise.}"**  
{Rebuttal from scoped behavior — sure, direct. Not quote theater.}

**"{…}"**  
{…}

<!-- 2–3 pairs. Never: why another quote, sample first, wait for next version. -->

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

| Feature | FP | Esforço (h) | Custo (R$) | Justificativa |
|---------|-----|-------------|------------|---------------|
| Feature 001 | {n} | {FP × h/PF, or —} | {from rates, or —} | {product-language rationale} |
| Feature 002 | {n} | {… or —} | {… or —} | {…} |
| **Subtotal negócio** | **{sum_negócio}** | **{sum or —}** | **{sum or —}** | Features verificáveis pelo solicitante |
| Engenharia de consistência do produto | {sum_engenharia} | {… or —} | {… or —} | {Plain-language rollup — no internal Feature numbers} |
| **Total** | **{total}** | **{Horas base or —}** | **{sum or —}** | Contagem **delta** |

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
