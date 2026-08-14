# Document structure — `05-cronograma-tres-cenarios.md`

Tone: dense tables, direct, internal PM/commercial. No fluff.

ALWAYS use this skeleton (adapt labels to human language; keep productivity vs percentile distinction explicit):

```markdown
# Cronograma de entrega — três cenários de produtividade
## {produto} / {version_san}

- Gerado em: {ISO datetime}
- Início: {data_inicio}
- Capacidade: {horas_por_dia} h/dia × {dias_uteis_por_semana} dias úteis/semana
- Teto: {teto or "nenhum"}
- Configs MC: [pert-config-p100.json](pert-config-p100.json) · [pert-config-p85.json](pert-config-p85.json) · [pert-config-p50.json](pert-config-p50.json)

---

## 0. Resumo comercial e prazos

### Contexto comercial
{short: product, version, total FP if known, links to commercial-budgets, what client gets per slice}

### Capacidade e início
{hours/day, business days/week, start, ceiling}

### Tabela-resumo de prazos de entrega

| Cenário de produtividade | h/FP | Horas restantes (est.) | Entrega P50 (calendário) | Entrega P85 (calendário) | Entrega P95 (calendário) | Cabe no teto? |
|--------------------------|-----:|-----------------------:|--------------------------|--------------------------|--------------------------|---------------|
| P100 — atual | … | … | … | … | … | Sim/Não |
| P85 — objetivo 50% mais rápido | … | … | … | … | … | … |
| P50 — objetivo 85% mais rápido | … | … | … | … | … | … |

> **P100** reflete a produtividade de hoje; **P85** e **P50** (cenários de produtividade) são **objetivos de aceleração**, não a baseline.  
> **P50 / P85 / P95** nas colunas de entrega são **percentis de calendário** (Monte Carlo), não os cenários de produtividade.

### Estimativa experiencial (opcional / condução humana)
> {literal human quote if provided}

| Item | Horas |
|------|------:|
| … | … |
| **Total** | … |

*(Separate from productivity scenarios P100/P85/P50.)*

---

## Tabela 1 — Cenário P100 (produtividade atual: {X} h/FP)

**Horas orçadas / restante:** …

| ID | Fase | Horas | O | M | P | PERT | Fim acum. |
|----|------|------:|--:|--:|--:|-----:|-----------|
| … | … | … | … | … | … | … | … |

### Monte Carlo (percentis de entrega — calendário)

| Percentil | Dias esforço | Data |
|-----------|-------------:|------|
| P50 | … | … |
| P85 | … | … |
| P95 | … | … |

Compromisso recomendado neste cenário: **calendário P85** = {date}.

---

## Tabela 2 — Cenário P85 (objetivo: 50% mais rápido = {Y} h/FP)

{same structure as Tabela 1}

---

## Tabela 3 — Cenário P50 (objetivo: 85% mais rápido = {Z} h/FP)

{same structure as Tabela 1}

---

## Comparativo dos três cenários de produtividade

| # | Cenário | h/FP | Horas | Entrega P50 | Entrega P85 | Entrega P95 | Cabe no teto? |
|--:|---------|-----:|------:|-------------|-------------|-------------|---------------|
| 1 | P100 — atual | … | … | … | … | … | … |
| 2 | P85 — objetivo 50% mais rápido | … | … | … | … | … | … |
| 3 | P50 — objetivo 85% mais rápido | … | … | … | … | … | … |

**Compromisso oficial (default):** calendário P85 do cenário de produtividade **P100** = {date}.

---

## Notas

- Feriados: {não descontados | lista}
- Premissas: …
- ⚠️ Revisão humana obrigatória antes de compromisso com cliente.
```

## Header rules

- Prefer explicit table titles: `Tabela N — Cenário P100 (produtividade atual: X h/FP)`.
- Never label Monte Carlo percentile row as "cenário P85" without word **calendário** / **entrega**.

## `roadmap.md` update

Rewrite or patch PM roadmap so stakeholders see:

```markdown
## Delivery schedule (triple productivity)

| Cenário de produtividade | Entrega P85 (calendário) |
|--------------------------|--------------------------|
| P100 — atual | … |
| P85 — objetivo 50% mais rápido | … |
| P50 — objetivo 85% mais rápido | … |

Official commitment (default): P100 calendar P85 = …
Artifact: [05-cronograma-tres-cenarios.md](05-cronograma-tres-cenarios.md)
```
