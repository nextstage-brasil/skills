# Browser tools (capability detection)

Browser lane needs capabilities, not one fixed tool (ADR-07). Pick tool by profile `execution.browser_tool_preference`; probe; record tool + missing capabilities in ledger. Never invent a result a tool cannot capture.

## Capabilities

| Capability | Use | Evidence kind | Required |
| ---------- | --- | ------------- | -------- |
| `navigate` | Open URL / route of env under test | — | yes |
| `a11y_snapshot` | Read accessible tree; assert text, roles, state | — | no (lower confidence) |
| `screenshot` | Save image **file** under `<run_dir>/raw/` (image shown only to model ≠ evidence) | `screenshot` | yes |
| `console` | Read console messages (JS errors) | `console` | no |
| `network` | Read requests + status codes (unexpected 4xx/5xx) | `network` | no |
| `storage` | Read/run script on page: session keys (`auth.session_check`), DOM PII masking | — | no (no masking → `pii_scrubbed: false`) |

## Tool map

Ids = values for `browser_tool_preference` and ledger `tool.name`. Call names typical; vary by version — probe decides.

| Id | Typical calls (navigate · snapshot · screenshot · console · network · script) |
| -- | ----------------------------------------------------------------------------- |
| `playwright-mcp` | `browser_navigate` · `browser_snapshot` · `browser_take_screenshot` · `browser_console_messages` · `browser_network_requests` · `browser_evaluate` |
| `claude-in-chrome` | `navigate` · `read_page` · `computer` screenshot · `read_console_messages` · `read_network_requests` · `javascript_tool` |
| `claude-browser-pane` | `navigate` · `read_page` · `computer` screenshot · `read_console_messages` · `read_network_requests` · `javascript_tool` |
| `cursor-ide-browser` | `browser_navigate` · `browser_snapshot` · `browser_take_screenshot` · console/network tools when listed · script tool when listed |

Unknown id in profile → `--check-profile` warning; skipped.

## Selection (Q6 start, once per run)

1. Order = `browser_tool_preference`; empty → table order.
2. First id whose tools exist in session → probe against env URL: navigate; snapshot; screenshot to `<run_dir>/raw/probe.png` (file must exist); read console; read network; run script reading one storage key.
3. Probe lacks `navigate` or `screenshot` → next id.
4. None qualifies → browser lane **blocked**: each browser scenario `status: blocked`, `tool: {name: none, missing: [<all capabilities>]}`, `triage: ENV`, `blocked_reason: "no browser tool with navigate + screenshot"`. Runner lane unaffected.
5. Chosen tool for whole run (same tool for every browser scenario); write `tool: {name: <id>, missing: [<failed probes>]}` on each.

## Rules

- Missing capability → its evidence kind absent; gate rejects evidence of a missing capability. Report §6 lists tool + missing; judge `evidence` dimension loses the scenario when a missing capability is in `evidence.capture` (`homologation-judge.md`).
- Session: reuse when `auth.session_check` keys present; login via `auth.strategy` once; credentials never printed or captured.
- PII masking via script channel before each screenshot (`execution-lanes.md` → Evidence). Script unavailable → screenshots stay local (`pii_scrubbed: false`) unless `pii_fields` empty.
- Tool answers unexpectedly (unknown format, incoherent state) → stall (`failure-triage.md`), not a triage class.
