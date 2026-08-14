# Orçamento comercial — {product_display_name}

**Sequência:** `{seq}`  
**Gerado em:** `{generated_at}`  
**Versão / referência:** `{version_san}-costumer`  
**Idioma:** PT-BR

---

## Objetivo principal da versão

{Same commercial/product summary as internal doc — no engineering framing.}

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

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 001 | {n} | {product-language rationale} |
| Feature 002 | {n} | {…} |
| **Subtotal negócio** | **{sum_negócio}** | Features verificáveis pelo solicitante |
| Engenharia de consistência do produto | {sum_engenharia} | {Plain-language rollup — no internal Feature numbers} |
| **Total** | **{total}** | Contagem **delta** |

#### Origem do cálculo (resumo)

| Elemento | FP | Vinculado a |
|----------|-----|-------------|
| {capability summary} | {n} | Feature 00N |
| Consistência interna (consultas, relatórios, vínculos) | {n} | Entrega operacional embutida |
| **Total** | **{total}** | |

> Detalhamento elemento a elemento (ILF, EI, EO, AEQ etc.) disponível na versão interna `commercial-budget-internal.md`.

### COSMIC (CFP)

| Feature | E | R | W | X | CFP |
|---------|---|---|---|---|-----|
| Feature 001 | | | | | |
| Engenharia de consistência | | | | | |
| **Σ** | | | | | **{ΣCFP}** |

**Referência:** COSMIC FSM — contagens de movimentação de dados (E/R/W/X) por processo funcional.

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
- FP detalhado na versão interna `commercial-budget-internal.md`.
- Este artefato **não** contém lista de tarefas (`tasks/`), issues GitLab nem handoff SDD.

---

## Sugestões fora de escopo (não implementar)

{Optional — copy from internal if present.}

---

## Próximos passos (informativo)

Após aprovação do escopo e estimativas: detalhamento SDD e/ou forecast PM — **fora desta skill**.
