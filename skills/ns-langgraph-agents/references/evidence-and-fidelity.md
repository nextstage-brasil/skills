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

## Conversation-observed locale

**Doctrine name:** conversation-observed locale — **not** fixed/bootstrap locale as SoT. Product prompt piece `injected` (`prompt-and-capability-injection.md`) ≠ reply language/formatting — never call reply locale “injected locale”.

### Detection first

Resolve `turnLocale` from:

1. Recent human message(s) — script, tokens, language signals
2. Optional: LLM-light intent slots `locale` / `speechLanguage` when heuristic weak (generic slots; no domain vocab in `src/`)
3. Spoken currency (“reais”, “dollars”) may set `currencyHint` without locking language

### Where it lives

`turnLocale` **ephemeral** — turn state or field cleared in guard. **FORBIDDEN** sticky persona locale in checkpointer. PT→EN mid-thread changes formatting next turn.

### Formatting

Code `Intl` with resolved `turnLocale` (`formatUserFacing` / siblings under `conversation/locale/`). LLM **MUST NOT** invent separators (`1.234,56`). Evidence numbers stay raw until format step.

### Override (weak)

`configurable.locale` = optional a11y/app **hint**. Clear conversation evidence wins. No hint + ambiguous → product default (RNF), often `pt-BR`.

### Motor invariant (`base_invariant`)

Format numbers/dates for user’s language **this turn**; follow conversation, not fixed product locale.

### Flow

```
guard (clear turnLocale / currencyHint)
  → … → intent_classify (optional locale/speechLanguage slots)
  → resolveConversationLocale(messages, { hint: configurable.locale, intentSlots })
  → set turnLocale (+ currencyHint)
  → evidence raw (numbers)
  → composer + formatUserFacing(turnLocale)
```

Helpers: `templates/snippets/conversation-locale.ts.snippet`. Placement: `src/conversation/locale/`. Resolve step: after guard clear, before composer format — typically end of `intent_classify` or dedicated pre-composer helper.

### Forbidden

| Wrong | Why |
| ----- | --- |
| Bootstrap / `.env` locale as primary SoT | Ignores turn language |
| Persist chosen locale as eternal thread truth | Sticky formatting across language switch |
| Composer guesses formats without Intl | Fidelity + separator bugs |
| Treat `configurable.locale` as hard lock | App hint overrides conversation |

## Anti-patterns

`references/anti-patterns.md` — null-as-zero, discovery-as-evidence, gather-as-writer, generic clarify over `externalError`, fixed/bootstrap locale SoT, sticky thread locale, LLM-invented number format.

## Related

- Topology: `references/architectures.md`
- Prompt split: `references/prompt-and-capability-injection.md`
- Locale helpers: `templates/snippets/conversation-locale.ts.snippet`
- MCP normalize: `references/mcp-complex-access.md`, `context-window.ts.snippet`
