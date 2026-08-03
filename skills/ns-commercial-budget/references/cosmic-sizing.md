# COSMIC sizing (commercial budget)

Size each Feature with COSMIC FSM data movements, then roll up to total CFP for the version.

## Data movements

| Symbol | Name | Count when |
|--------|------|------------|
| **E** | Entry | Data crosses the boundary **into** the software from a functional user (human or external system) |
| **R** | Read | Data is retrieved from persistent storage inside the software |
| **W** | Write | Data is persisted or deleted in storage inside the software |
| **X** | Exit | Data crosses the boundary **out** of the software to a functional user |

**CFP for one Feature** = E + R + W + X (integer counts of distinct data-group movements in that functional process).

**ΣCFP** = sum of CFP across all Features in the budget.

## Rules of thumb

1. Size the **functional process** the Feature describes — not UI widgets, screens, or CRUD verbs alone.
2. One movement = one data group crossing or touching persistence once in that process. Do not multiply by “number of fields” or “number of users”.
3. Same data group read twice for the same process → still **one** Read (unless clearly distinct functional purposes documented).
4. Validation that only uses entered data (no persistence read) → no extra R.
5. Notifications / emails / API responses that leave the system → Exit.
6. Integrations: inbound payload → Entry; outbound call/payload → Exit; local cache of remote data → Write (+ Read when reused).

## Per-Feature block (required in Estimates)

```markdown
### Feature 00N — {title}
| E | R | W | X | CFP |
|---|---|---|---|-----|
| n | n | n | n | n |

Rationale: {one short paragraph tying movements to the Feature description}
```

Then a version total table: ΣE, ΣR, ΣW, ΣX, **ΣCFP**.

## Anti-patterns

- Inflating CFP with speculative admin screens or reports not in scope.
- Counting HTTP status codes, log lines, or framework boilerplate as movements.
- Copying the same E/R/W/X template onto every Feature without reading the flow.
- Using story points or t-shirt sizes labeled as “CFP”.
- Omitting rationale when E/R/W/X look identical across unrelated Features.
- Labeling Features as `RF` / “Requisito Funcional” (legacy naming — use `Feature 00N`).

## Relation to Function Points

IFPUG/NESMA-style FP (or a simplified transactional FP count) may appear as a **separate** estimate with its own rationale. Do not treat FP ≡ CFP. Both can coexist; state methods clearly.
