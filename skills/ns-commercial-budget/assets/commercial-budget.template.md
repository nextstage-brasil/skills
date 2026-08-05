# Orçamento comercial — {product_display_name}

**Sequência:** `{seq}`  
**Gerado em:** `{generated_at}`  
**Versão / referência:** `{version_san}`  
**Idioma:** PT-BR

---

## Objetivo principal da versão

{Commercial/product summary — business value, who benefits, what changes in the product relationship. No tech stack or engineering area framing.}

---

## Fluxos principais (validação de entendimento)

<!-- 1–3 Mermaid diagrams. Client-readable labels (roles + business actions). Client validates scope; team spots gaps. -->

```mermaid
flowchart LR
  A[{ator}] --> B[{ação de negócio}]
  B --> C[{resultado esperado}]
```

<!-- Repeat only when multiple distinct flows matter. -->

---

## Agrupamento de objetivos (Features)

<!-- ≤10 Features. Client-first product language. No Precedência. No RF label. No task list. -->

### Feature 001 — {TÍTULO}

**Descrição detalhada:**  
{Who benefits, what the product allows/blocks, business rules — complete enough for client sign-off and team boundary check.}

#### Critérios de aceite

- [ ] {product-verifiable — "o administrador consegue…", "o parceiro recebe…"}
- [ ] {product-verifiable}

### Feature 002 — {TÍTULO}

**Descrição detalhada:**  
{…}

#### Critérios de aceite

- [ ] {…}

<!-- Repeat Feature 003…N (≤10). -->

---

## Requisitos Não Funcionais (RNFs)

<!-- Omit if none. No invented SLAs. -->

- {RNF traced to scope or clarification}

---

## Estimativas

### Pontos de Função (FP)

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 001 | {n} | {product-language rationale} |
| Feature 002 | {n} | {…} |
| **Total** | **{n}** | |

#### Origem do cálculo

| Elemento | Tipo | Qtd | FP/u | Subtotal | Fonte |
|----------|------|-----|------|----------|-------|
| {…} | {ILF/EIF/EI/EO/EQ or house unit} | | | | Feature 00N / reuse |
| **Total** | | | | **{n}** | |

### COSMIC (CFP)

| Feature | E | R | W | X | CFP |
|---------|---|---|---|---|-----|
| Feature 001 | | | | | |
| Feature 002 | | | | | |
| **Σ** | | | | | **{ΣCFP}** |

**Referência:** COSMIC FSM — contagens de movimentação de dados (E/R/W/X) por processo funcional.

### Horas previstas (cálculo)

| Item | Valor |
|------|-------|
| Total FP | {n} |
| Produtividade | {h/PF from human or `[ASSUMPTION]`} |
| Horas base | {n} FP × {h/PF} = **{n} h** |
| Margem de segurança | {s}% |
| **Total com margem** | **{n} h** |

---

## Macroatividades do projeto

<!-- Hours = with safety margin. Fixed 7 rows. See references/macro-activities.md. -->

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
- Mix %: {default or adjusted — cite in premissas}  
- Custo: só com R$/h e/ou R$/PF informados; senão `—` e `_pending rates_`

---

## Riscos e margem de segurança

| Risco | Impacto na estimativa | Mitigação / premissa | Responsável |
|-------|----------------------|----------------------|-------------|
| {risk} | {impact} | {mitigation or lacuna} | Cliente / Empresa / Ambos |

- **Margem de erro estimada:** {p}%  
- **Margem de segurança aplicada:** {s}%  
- **Racional:** {risks → percentages}

---

## Premissas e ressalvas

- {assumptions — team knowledge, delta-on-known-product, macro mix, margins, out-of-scope, lacunas}
- Este artefato **não** contém lista de tarefas (`tasks/`), issues GitLab nem handoff SDD.
- Custo em R$ só com taxas fornecidas; margem de segurança = contingência de estimativa, não markup comercial.

---

## Sugestões fora de escopo (não implementar)

<!-- Optional. Omit if empty. -->

- {idea} — fora do orçamento atual

---

## Próximos passos (informativo)

Após aprovação do escopo e estimativas: detalhamento SDD e/ou forecast PM — **fora desta skill**.
