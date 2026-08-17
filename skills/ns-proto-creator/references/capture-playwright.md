# Capture with Playwright MCP

Capture **live product** as evidence for AS-IS docs and prototype. Screenshots + structured notes over guessing.

## Discover MCP

1. List MCP servers/tools; find Playwright (or browser) tools (navigate, snapshot, screenshot, click, fill, etc.).
2. Multiple Playwright profiles → ask which matches target env (once).
3. None available → stop capture; tell user enable Playwright MCP. No invent UI from memory.

## Navigate and record

1. Open base URL from boot.
2. Login only per user / project rules — **no** product-specific credentials in this skill.
3. Walk agreed scope (screens / roles / flows).
4. Per surface, capture:
   - Screenshot(s): default, empty, error, key alternate states when reachable
   - Structure: regions, navigation, primary actions
   - Fields and labels (required vs optional when visible)
   - **Fonts, icons, density** (tight/comfortable), notable motion
   - Role-gated differences when in scope

## Evidence hygiene

- Prefer a11y snapshots + screenshots over fragile CSS selectors in notes.
- Clear names under `docs/` (e.g. `docs/asis/screenshots/…`).
- Note unknowns explicit ("could not open modal X — permission denied"). No invent.

## Exit criteria

Enough evidence for AS-IS briefs + matching flows/fields/states in `prototype/` without guessing critical UI.
