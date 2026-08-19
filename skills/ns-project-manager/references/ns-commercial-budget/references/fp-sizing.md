# Function Points (commercial budget)

FP sizes version. Client sees **per-Feature FP + justification** and **origem do cálculo**. Team verifies nothing skipped.

## Internal doc (`commercial-budget-internal.md`)

### Per-Feature (mandatory in Estimativas)

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 00N | n | Product-language: what capability adds/changes and why that FP count |

Justificativa = why this Feature earns these points — not code. Tie to transactions, data groups, or house rules cited below.

## Origem do cálculo (mandatory)

Show traceable arithmetic. Pick one stated method; do not mix silently.

**IFPUG / NESMA-style (example shape):**

| Elemento | Tipo | Qtd | FP/u | Subtotal | Fonte |
|----------|------|-----|------|----------|-------|
| Cadastro de parceiros | ILF | 1 | 10 | 10 | Feature 001 — novo grupo de dados |
| Consulta por documento | EQ | 1 | 4 | 4 | Feature 002 |
| … | | | | | |
| **Total** | | | | **{n}** | |

- **Fonte** column links each row to Feature(s) or reuse inventory (`extend` / `net-new`).
- Reuse / `extend`: discount or zero rows with one-line rationale.
- `[ASSUMPTION: …]` on complexity weights when not negotiated.

**House simplified count:** table still required — list what was counted and multiplier.

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
