# Evidence and fidelity

State-backed evidence doctrine for MCP tool-heavy agents (`react_bounded`). LLM prose is **never** source of truth for numbers, entities, or tool outcomes.

## Principle

| Layer | Role |
| ----- | ---- |
| Tool payloads | Raw wire truth |
| Deterministic hydrate | Build `dataBundle` from payloads — reject `null→0`, empty-as-success |
| State channels | Composer reads channels; does not recompute analytics |
| Composer | Narrate only what channels prove |

## Evidence channels

| Channel | Set by | Composer behavior |
| ------- | ------ | ----------------- |
| `dataBundle` | Code hydrate after analytical MCP success | Whitelist numbers/units from bundle only |
| `discoveryBrief` | Discovery tools (`found[]`, `absent[]`) | No invented entities; respect confirmed absence |
| `externalError` | Classified MCP/auth/transport failure | User message above generic clarify |
| `turnDecisions` | Intent router, gather exit, bypass | Audit + optional transparency |

Placeholders: `templates/snippets/state.ts.snippet`. Declare in `graph-spec.md` when `architecture: react_bounded`.

## Discovery vs analytical evidence

| Call class | Counts as evidence? |
| ---------- | ------------------- |
| list/search/describe (discovery) | No — only fills `discoveryBrief` |
| fetch/query/aggregate (analytical) | Yes — feeds `dataBundle` |

Duplicate-skip and budget break require **analytical** evidence — not discovery poll alone. See `capability-governance.md`.

## Numeric fidelity gate

Post-composer (or early-return for long series):

1. Extract numbers from composer Markdown
2. Compare against `dataBundle` whitelist
3. Non-match → log + optional soft rewrite — **non-destructive** for long tabular output

Never coerce tool `null` to `0` without `rowCount` or shape proof.

## Partial / incomplete payloads

Flag bundle `incomplete: true` when multi-dim payload is partial. Composer may warn softly; surviving evidence beats generic clarify.

## Fidelity alert (observability-only)

Heuristic: proper nouns or numbers in composer text with no matching channel entry → `logFidelityAlert` (structured log). **Never** blocks turn. Wire in `references/observability.md`.

## Structured artifacts

Charts/tables: store artifact on state or `completed` envelope extras. Markdown fence is display — not chart SoT. Dev-chat may render artifact hook.

## Anti-patterns

Cross-links: `references/anti-patterns.md` — null-as-zero, discovery-as-evidence, gather-as-writer, generic clarify over `externalError`.

## Related

- Topology: `references/architectures.md` (`react_bounded`)
- Prompt split: `references/prompt-and-capability-injection.md`
- MCP normalize: `references/mcp-complex-access.md`, `context-window.ts.snippet`
