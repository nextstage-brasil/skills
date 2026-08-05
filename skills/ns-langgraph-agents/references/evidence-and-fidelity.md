# Evidence and fidelity

`react_bounded` + MCP tool-heavy. LLM prose **never** SoT for numbers, entities, tool outcomes.

## Principle

| Layer | Role |
| ----- | ---- |
| Tool payloads | Raw wire truth |
| Deterministic hydrate | `dataBundle` from payloads — reject `null→0`, empty-as-success |
| State channels | Composer reads channels; no analytics recompute |
| Composer | Narrate only what channels prove |

## Evidence channels

| Channel | Set by | Composer |
| ------- | ------ | -------- |
| `dataBundle` | Hydrate after analytical MCP success | Whitelist numbers/units only |
| `discoveryBrief` | Discovery tools (`found[]`, `absent[]`) | No invented entities; honor absence |
| `externalError` | Classified MCP/auth/transport failure | Above generic clarify |
| `turnDecisions` | Router, gather exit, bypass | Audit + optional transparency |

Placeholders: `templates/snippets/state.ts.snippet`. Declare in `graph-spec.md` when `architecture: react_bounded`.

## Discovery vs analytical evidence

| Call class | Evidence? |
| ---------- | --------- |
| list/search/describe (discovery) | No — `discoveryBrief` only |
| fetch/query/aggregate (analytical) | Yes — `dataBundle` |

Duplicate-skip and budget break need **analytical** evidence — not discovery poll alone. `capability-governance.md`.

## Numeric fidelity gate

Post-composer (or early-return long series):

1. Extract numbers from composer Markdown
2. Compare `dataBundle` whitelist
3. Non-match: log + optional soft rewrite — **non-destructive** for long tables

Never coerce tool `null` to `0` without `rowCount` or shape proof.

## Partial payloads

Bundle `incomplete: true` on partial multi-dim payload. Composer soft warn; surviving evidence beats generic clarify.

## Fidelity alert (observability-only)

Proper nouns or numbers in composer with no channel match: `logFidelityAlert`. **Never** blocks turn. `references/observability.md`.

## Structured artifacts

Charts/tables: artifact on state or `completed` envelope extras. Markdown fence = display, not chart SoT. Dev-chat may render hook.

## Anti-patterns

`references/anti-patterns.md` — null-as-zero, discovery-as-evidence, gather-as-writer, generic clarify over `externalError`.

## Related

- Topology: `references/architectures.md`
- Prompt split: `references/prompt-and-capability-injection.md`
- MCP normalize: `references/mcp-complex-access.md`, `context-window.ts.snippet`
