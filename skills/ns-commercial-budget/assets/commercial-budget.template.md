# Orçamento comercial — {product_display_name}

**Versão / referência:** `{version_san}`  
**Data:** `{issue_date}`  
**Idioma:** PT-BR

---

## Objetivo principal da versão

{executive summary — impact and functional intent}

---

## Agrupamento de objetivos (Features)

<!-- Up to 10 Features. Order by technical/business dependency. No task list. Do not label as RF / Requisitos Funcionais. -->

### Feature 001 — {TÍTULO}

**Precedência:** Nenhuma  
**Descrição detalhada:**  
{Generous description: business flows, actors, integrations, expected use. Not a one-liner.}

#### Critérios de aceite

- [ ] {testable criterion}
- [ ] {testable criterion}

### Feature 002 — {TÍTULO}

**Precedência:** Feature 001  
**Descrição detalhada:**  
{…}

#### Critérios de aceite

- [ ] {…}

<!-- Repeat Feature 003…N as needed (≤10). -->

---

## Requisitos Não Funcionais (RNFs)

<!-- Omit entire section if none identified. No invented SLAs. -->

- {RNF only if traced to scope or clarification}

---

## Estimativas

### Pontos de Função (FP)

| Total FP | Método / premissa |
|----------|-------------------|
| {n} | {rationale — what was counted and how} |

### COSMIC (CFP)

| Feature | E | R | W | X | CFP |
|---------|---|---|---|---|-----|
| Feature 001 | | | | | |
| Feature 002 | | | | | |
| **Σ** | | | | | **{ΣCFP}** |

**Racional COSMIC (resumo):** {how movements were derived; point to per-Feature notes if long}

### Horas previstas

| Total (h) | Produtividade / premissa |
|-----------|--------------------------|
| {n} | {Ground in team experience (seniority, tenure, involvement), reverse-spec/brownfield reuse vs greenfield, and/or h/PF or h/CFP if given. Mark [ASSUMPTION] when experience was not clarified. Tests included.} |

<!-- Do NOT include Investimento (R$), rates, or commercial price. Stop at FP + COSMIC + hours. -->

---

## Premissas e ressalvas

- {assumptions — include team knowledge used for hours, which docs/context files were read (paths), out-of-scope, open lacunas, architecture decisions}
- Este artefato **não** contém lista de tarefas de implementação (`tasks/`), issues GitLab, handoff SDD nem precificação em R$.

---

## Sugestões fora de escopo (não implementar)

<!-- Optional. Omit if empty. Never merge into Feature acceptance criteria. -->

- {idea} — fora do orçamento atual

---

## Próximos passos (informativo)

Após aprovação do escopo e das estimativas (FP, COSMIC, horas): detalhamento SDD (`requirements.md` / tarefas) e/ou forecast de entrega PM, se necessário — **fora do escopo desta skill**.
