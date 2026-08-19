# Function Points (commercial budget)

FP sizes version. Client sees **per-Feature FP + justification** and **origem do cálculo**. Team verifies nothing skipped.

## Internal doc (`commercial-budget-internal.md`)

### Per-Feature (mandatory in Estimativas)

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 00N | n | Product-language: what capability adds/changes and why that FP count |

Justificativa = why this Feature earns these points — not code. Tie to IFPUG transactions and data groups (or the human-named method).

## Method

**Default: IFPUG CPM** (unadjusted Function Points). Do not ask which method. Switch only if the human already named another (NESMA, house simplified, etc.). Never mix methods in one origem table.

State the method on the origem heading, e.g. `Origem do cálculo (IFPUG CPM)`.

## Origem do cálculo (mandatory)

Show traceable IFPUG arithmetic (unless another method was named).

**Function types:** ILF, EIF (data); EI, EO, EQ (transactional). One row per elementary process or logical file (or net-new/extend delta).

**Complexity → FP/u** (IFPUG unadjusted weights). If DET/RET/FTR unknown, use **Average** and mark `[ASSUMPTION: complexity Average]`.

| Tipo | Low | Average | High |
|------|-----|---------|------|
| ILF | 7 | 10 | 15 |
| EIF | 5 | 7 | 10 |
| EI | 3 | 4 | 6 |
| EO | 4 | 5 | 7 |
| EQ | 3 | 4 | 6 |

| Elemento | Tipo | Qtd | Complexidade | FP/u | Subtotal | Fonte |
|----------|------|-----|--------------|------|----------|-------|
| Cadastro de parceiros | ILF | 1 | Average | 10 | 10 | Feature 001 — novo grupo de dados |
| Consulta por documento | EQ | 1 | Average | 4 | 4 | Feature 002 |
| … | | | | | | |
| **Total** | | | | | **{n}** | |

- **Fonte** column links each row to Feature(s) or reuse inventory (`extend` / `net-new`).
- Reuse / `extend`: discount or zero rows with one-line rationale.
- Do not invent VAF / adjusted FP unless the human asked for adjusted IFPUG.

**Other method (human-named only):** same table obligation — list units, weights, and Fonte. Do not offer NESMA or house count unsolicited.

## Client export (`commercial-budget-costumer.md`)

When `engineering-split.md` applies:

| Row type | Content |
|----------|---------|
| Per `negócio` Feature | FP + product-language justificativa |
| **Subtotal negócio** | Σ `negócio` FP |
| **Engenharia de consistência do produto** | Σ `engenharia` FP — plain-language rollup, no internal Feature numbers |
| **Total** | Same as internal — `subtotal + engenharia` |

- `qualidade` items: **0 FP** — never client Feature row.
- **Origem do cálculo:** summary by capability (Elemento | FP | Vinculado a); footer points to internal doc for ILF/EQ detail.
- Do **not** reduce Total FP or hours vs internal doc.

## Consistency

- Σ per-Feature FP = Total FP = Σ PF in macro table.
- FP ≠ CFP. Mention COSMIC in premissas only when the human asked and CFP is in the doc.

## Anti-patterns

- Single total with no per-Feature breakdown.
- Origem table missing or numbers that do not sum to Total FP.
- IFPUG jargon in Feature titles — keep jargon only in origem table headers if needed.
- NESMA or house count when the human did not name that method.
