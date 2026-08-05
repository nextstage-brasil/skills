# Function Points (commercial budget)

FP sizes the version. Client sees **per-Feature FP + justification** and **origem do cálculo**. Team verifies nothing was skipped.

## Per-Feature (mandatory in Estimativas)

| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 00N | n | Product-language: what capability adds/changes and why that FP count |

Justificativa = why this Feature earns these points — not code. Tie to transactions, data groups, or house rules cited below.

## Origem do cálculo (mandatory)

Show traceable arithmetic. Pick one stated method; do not mix silently.

**IFPUG / NESMA-style (example shape):**

| Elemento | Tipo | Qtd | FP/u | Subtotal | Fonte |
|----------|------|-----|------|----------|-------|
| Cadastro ORCRIM | ILF | 1 | 10 | 10 | Feature 001 — novo grupo de dados |
| Consulta por documento | EQ | 1 | 4 | 4 | Feature 002 |
| … | | | | | |
| **Total** | | | | **{n}** | |

- **Fonte** column links each row to Feature(s) or reuse inventory (`extend` / `net-new`).
- Reuse / `extend` → discount or zero rows with one-line rationale.
- `[ASSUMPTION: …]` on complexity weights when not negotiated.

**House simplified count:** table still required — list what was counted and multiplier.

## Consistency

- Σ per-Feature FP = Total FP = Σ PF in macro table.
- FP ≠ CFP. State both methods in premissas when both used.

## Anti-patterns

- Single total with no per-Feature breakdown.
- Origem table missing or numbers that do not sum to Total FP.
- IFPUG jargon in Feature titles — keep jargon only in origem table headers if needed.
