# Engineering split (business vs delivery)

Optional when scope mixes **stakeholder-verifiable capabilities** with **operational/architectural consequences** (typical brownfield: soft delete, link integrity, regression inventory, automated test suites).

Default deliverable: `commercial-budget-internal.md` (full internal view). When pattern applies, also emit `commercial-budget-costumer.md` (client export).

## When to apply

| Signal | Apply split? |
|--------|----------------|
| Logical delete / archival with product-wide consistency work | **Yes** |
| Inventory + fix of queries/reports/integrations assuming hard delete | **Yes** |
| Link/relationship integrity after entity lifecycle change | **Yes** |
| Dedicated automated verification Features (0 FP) | **Yes** — classify as `qualidade`, not client Features |
| Greenfield CRUD with no cross-cutting consequences | **No** — single doc, all items `negócio` |
| Human asks “versão cliente” / “pro cliente” / “sem itens de engenharia” | **Yes** |

If unsure: generate internal doc first; add client export when any scoped item fails **client sign-off test** below.

## Item classification (mandatory before Features)

Tag every scoped item during sizing (labels not shown in deliverable):

| Class | Meaning | Client Feature? | FP in client doc |
|-------|---------|-----------------|------------------|
| `negócio` | Capability stakeholder can verify and sign | **Yes** | Per-Feature row |
| `engenharia` | Operational consequence of `negócio` (consistency, inventory, link fixes) | **No** — absorb outcomes into parent `negócio` acceptance | Rolled into **Engenharia de consistência do produto** line |
| `qualidade` | Automated verification, test matrices, E2E gates | **No** — one RNF line on quality | **0** — effort stays in macro Testes |

### Classification rules

1. **`qualidade`** never numbered Feature in either doc. Hours stay in macro **Testes de implementação**.
2. **`engenharia`** never separate numbered Feature in **client** doc. In **internal** doc, may stay separate Features for delivery traceability.
3. **`engenharia`** acceptance outcomes merge into **parent `negócio` Feature** in client doc (product-verifiable; no internal jargon like “inventário” or “AEQ”).
4. Parent mapping: assign each `engenharia` item to exactly one `negócio` Feature (capability that triggers consequence). Example: link-query fixes parent = soft-delete business Feature.
5. Renumber client Features `001…N` contiguously — no gaps, no reference to internal Feature numbers.

## Client sign-off test

> Would client sign this Feature knowing what they buy?

If **no** (too operational/architectural): `engenharia` or `qualidade`, not client Feature.

Engineering boundary test still applies on merged criteria:

> Would engineering find missing boundary?

Both tests must pass on **client** doc.

## Two artifacts

| File | Audience | Features section | FP origem |
|------|----------|------------------|-----------|
| `commercial-budget-internal.md` | Delivery (internal) | All scoped items — `negócio`, `engenharia`, `qualidade` as separate Features when useful for traceability | Full **origem do cálculo** table |
| `commercial-budget-costumer.md` | Client export | `negócio` only (+ merged `engenharia` criteria in parents) | Summary table + **Engenharia de consistência** line; pointer to internal doc for element-level detail |

**Versioning:** independent **Sequência** per file (`document-versioning.md`).

**Suffix:** client reference field = `{version_san}-costumer`.

## Client doc — Features block

After `## Agrupamento de objetivos (Features)`, include:

```markdown
> **Nota de leitura:** este documento apresenta apenas **objetivos de negócio** verificáveis pelo solicitante. A consistência interna do produto faz parte da entrega, mas não aparece como feature separada — está embutida nos critérios de aceite abaixo e refletida no total de horas.
```

Omit block when project has no `engenharia` / `qualidade` items (single-doc mode).

## Client doc — FP table shape

```markdown
| Feature | FP | Justificativa |
|---------|-----|---------------|
| Feature 001 | {n} | {negócio} |
| … | | |
| **Subtotal negócio** | **{sum_negócio}** | Features verificáveis pelo solicitante |
| Engenharia de consistência do produto | {sum_engenharia} | Revisão de consultas, relatórios, integrações e vínculos; verificação automatizada complementar — incluída no total, não detalhada como feature de negócio |
| **Total** | **{total}** | Contagem delta |
```

- `sum_negócio + sum_engenharia` = **Total FP** (unchanged from internal doc).
- `qualidade` items: **0 FP** in both docs; never row in client FP table.
- COSMIC client table: per `negócio` Feature rows + optional **Engenharia de consistência** aggregate row; **Σ CFP** unchanged.

#### Origem do cálculo (client)

Summary table by capability (not ILF/EQ jargon), e.g.:

| Elemento | FP | Vinculado a |
|----------|-----|-------------|
| … | | Feature 00N |

Footer:

```markdown
> Detalhamento elemento a elemento (ILF, EI, EO, AEQ etc.) disponível na versão interna `commercial-budget-internal.md`.
```

## Internal doc — unchanged obligations

- Full per-Feature FP including `engenharia` and `qualidade` (0 FP) Features when they help delivery traceability.
- Full origem table with IFPUG/house types.
- Risks may name internal Feature numbers; **client** risks use product language only (no internal Feature refs).

## Workflow hook (generate step)

1. Size all items; classify each as `negócio` | `engenharia` | `qualidade`.
2. Write `commercial-budget-internal.md` (always).
3. If any `engenharia` or `qualidade` items exist **or** human requested client export: derive and write `commercial-budget-costumer.md` from internal doc using `assets/commercial-budget-costumer.template.md`.
4. Report both paths in Stop summary when client file exists.

## Anti-patterns

- Client doc listing “Inventário de fluxos…” or “Verificação automatizada…” as numbered Features.
- Client FP total lower than internal total (hours must match).
- Gaps in client Feature numbering (001, 002, 005).
- `engenharia` criteria only in client doc with no parent Feature — orphan boundaries.
- Removing `engenharia` FP from Total to “simplify” pricing — roll up, do not drop.
