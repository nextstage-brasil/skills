# Orçamento comercial — {product_display_name}

**Sequência:** `{seq}`  
**Gerado em:** `{generated_at}`  
**Versão / referência:** `{version_san}`  
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

| Base (h) | Margem de segurança | Total com margem (h) | Produtividade / premissa |
|----------|---------------------|----------------------|--------------------------|
| {n} | {s}% | {n} | {Team experience + reverse-spec/brownfield; h/PF or h/CFP if given. Lifecycle envelope via macro table. [ASSUMPTION] when needed.} |

---

## Macroatividades do projeto

<!-- Hours in this table = with safety margin. See references/macro-activities.md. Fixed 7 rows — do not drop. -->

| Macroatividade | Esforço (h) | PF | Custo (R$) |
|----------------|-------------|-----|------------|
| Engenharia de requisitos | | | {n or —} |
| Design / Arquitetura | | | |
| Implementação | | | |
| Testes de implementação (unitário e e2e) | | | |
| Testes de homologação | | | |
| Homologação | | | |
| Implantação | | | |
| **Σ** | **{n}** | **{Total FP}** | **{n or —}** |

**Notas:**  
- Base: {h} h · Margem de segurança: {s}% · Total com margem: {h} h  
- Mix %: {cite default or adjusted mix}  
- Custo: preencher só com R$/h e/ou R$/PF informados; senão `—` e `_pending rates_`

---

## Riscos e margem de segurança

| Risco | Impacto na estimativa | Mitigação / premissa |
|-------|----------------------|----------------------|
| {risk} | {impact} | {mitigation or lacuna} |

- **Margem de erro estimada:** {p}%  
- **Margem de segurança aplicada:** {s}%  
- **Racional:** {link risks → chosen percentages}

---

## Premissas e ressalvas

- {assumptions — team knowledge, docs/context paths read, macro mix, margins, out-of-scope, lacunas, architecture decisions}
- Este artefato **não** contém lista de tarefas de implementação (`tasks/`), issues GitLab nem handoff SDD.
- Custo em R$ só aparece quando taxas foram fornecidas; margem de segurança é contingência de estimativa, não markup comercial.

---

## Sugestões fora de escopo (não implementar)

<!-- Optional. Omit if empty. Never merge into Feature acceptance criteria. -->

- {idea} — fora do orçamento atual

---

## Próximos passos (informativo)

Após aprovação do escopo e das estimativas (FP, COSMIC, horas com margem, macroatividades): detalhamento SDD (`requirements.md` / tarefas) e/ou forecast de entrega PM, se necessário — **fora do escopo desta skill**.
