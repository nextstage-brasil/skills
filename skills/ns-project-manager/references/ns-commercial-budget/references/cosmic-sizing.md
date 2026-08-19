# COSMIC sizing (commercial budget)

**Gate:** apply this file only when the human explicitly asked for COSMIC, CFP, or cosmic functions. Default commercial budget is Function Points only (`fp-sizing.md`). Do not add a CFP section, do not size E/R/W/X, and do not offer COSMIC unsolicited.

When gated in: agent sizes E/R/W/X per Feature internally. **Deliverable:** summary table + method reference only — no per-Feature rationale prose.

## Data movements (agent reference)

| Symbol | Name | Count when |
|--------|------|------------|
| **E** | Entry | Data in from functional user (human or external system) |
| **R** | Read | Data read from persistent storage |
| **W** | Write | Data persisted or deleted |
| **X** | Exit | Data out to functional user |

**CFP** = E + R + W + X per Feature. **ΣCFP** = sum across Features.

## Rules of thumb (agent only)

1. Size functional process — not widgets or CRUD verbs alone.
2. One movement = one data group per process — not per field or user.
3. Duplicate read same group: one R unless distinct purpose.
4. Validation on entered data only: no extra R.
5. Outbound notification/API response: X.
6. Integration: inbound = E; outbound = X; local cache = W (+ R when reused).

## Deliverable (Estimativas)

```markdown
### COSMIC (CFP)

| Feature | E | R | W | X | CFP |
|---------|---|---|---|---|-----|
| … | | | | | |
| **Σ** | | | | | **{ΣCFP}** |

**Referência:** COSMIC FSM — contagens de movimentação de dados (E/R/W/X) por processo funcional.
```

No **Racional COSMIC** paragraph. No per-Feature sub-blocks in saved doc.

## Anti-patterns

- Inflate CFP with out-of-scope screens.
- Identical E/R/W/X on every Feature without reading flow.
- Story points labeled CFP.
- `RF` / Requisito Funcional labels — use `Feature 00N`.

## Relation to FP

Separate methods. FP is always required. COSMIC is additive and optional. FP detail in `fp-sizing.md`. Hours stay FP × productivity unless the human asked to size hours from CFP.
