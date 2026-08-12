# Build or evolve the prototype

Implement under **`{product_root}/prototype/` only**.

## Mode

| Detection | Action |
| --------- | ------ |
| `prototype/` missing | Scaffold modern runnable UI; implement in-scope screens |
| `prototype/` present | Evolve in place — extend/change screens; no `vN/prototype/` |

State mode to user before large writes.

## Fidelity

- Mirror **flows, fields, states** from capture/AS-IS.
- Empty, loading, error, permission-denied when evidenced.
- Do **not** clone legacy stack (old framework, CSS soup, dead deps). Modern maintainable stack for repo (ask once if ambiguous).

## Design

1. Load `ns-code-frontend-design` (`SKILL.md` + references).
2. Check `docs/context/design-brief.md` when present; else minimal distinctive direction (no generic AI slop).
3. Clarity + production-grade interaction over pixel-perfect dated chrome — keep information architecture faithful.

## Forbidden

- Parallel version folders for prototype
- Invent business screens outside agreed scope
- Throwaway spaghetti — must stay evolvable
- Ask "version folder" name for layout

## After meaningful evolve

Optionally remind user **commit** (git = version history).
