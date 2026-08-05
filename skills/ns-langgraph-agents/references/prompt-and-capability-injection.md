# Prompt and capability injection

How the model receives **system text** and **callable capabilities**. Mis-wiring here causes dual prompt paths, truncated doctrine, dead tools, and fake user turns.

Read before changing system prompt composition, skill auto-inject, MCP bind, or local tool registration.

## System prompt — mandatory layers (order)

Compose once (prefer `composeSystemPrompt` outside the god-node). Order matters:

| # | Layer | Source | Notes |
| - | ----- | ------ | ----- |
| 1 | Canonical body | File under `src/conversation/prompts/` | Single source of truth for role/behavior |
| 2 | Opacity / safety fixed rules | Shared constants or prompt fragment | Only if product requires; keep short |
| 3 | Data-plane truth | Runtime connection state | Connected vs absent capabilities — never claim tools the agent cannot call |
| 4 | Session context overlay | `RunnableConfig.configurable` (e.g. session overlay fields) | **Overlay**, not replacement of canonical body; never persist into graph state |
| 5 | Scope anchors | Computed helpers (period, app ids, tenant labels) | Deterministic strings from config/state refs |
| 6 | Optional skill body auto-inject | Skill markdown body when product policy says so | Body-only; see exclusivity below |
| 7 | Ephemeral runtime nudge | Extra section in system prompt (`Runtime directive`) | **Never** as a fake `HumanMessage` |

### Session overlay vs canonical body

| Concept | Meaning |
| ------- | ------- |
| Canonical system body | Versioned markdown in `conversation/prompts/` — always the base |
| Session context overlay | Per-request text from `configurable` — appends/augments; does not replace body |
| Graph state | Must **not** store system prompts or secrets |

Docs and code must use these names so "required system prompt" is never confused with a session overlay.

### Nudges

Runtime nudges (force format, one-shot instructions) go in layer 7 of the system prompt. Injecting them as user turns pollutes history, confuses trim/summarize, and trains the model on fake dialogue.

## Capability primitives

| Primitive | Wire name | Bind | Inject mode |
| --------- | --------- | ---- | ----------- |
| Local tool | `{name}` | Must appear in `bindTools` if tools node can execute it | Execution in tools node |
| MCP tool | `mcp__{server}__{tool}` | Allowlist ∩ local classification before bind | `ToolMessage` truncated with tool/MCP cap |
| Skill procedure | `use_skill__{id}` | Bind **or** auto-inject — not both for the same id | Body-only; no I/O |

Wire names: `^[a-zA-Z0-9_-]{1,128}$`. Use `__` separators. Colons only in **internal** ids (`mcp:server:tool`). Colon in a new wire name is a Critical review finding; legacy parsers may keep colon splits only to read old checkpoints.

## Hard rules

### Allowlist and classification

- Filter at discovery; bind only allowlisted tools.
- Classify locally (`read | write | destructive | admin`); never trust remote "read-only" metadata.

### Truncate parity

| Cap | Applies to |
| --- | ---------- |
| `CONTEXT_TOOL_OUTPUT_MAX_CHARS` | Tool and MCP `ToolMessage` bodies |
| `CONTEXT_SKILL_BODY_MAX_CHARS` | Skill procedure bodies (auto-inject **and** `use_skill` return) |

Do **not** reuse the tool/MCP cap for skill doctrine — that silently cuts procedures. Auto-inject and `use_skill` for the same skill family must share the **same minimum fidelity** (same cap and truncation policy).

### Bind parity

Every tool the tools node can dispatch must be present in `bindTools` for that turn — otherwise the model cannot call it.

Exceptions require an **explicit unbound** decision documented in `graph-spec.md` plus a test that asserts the tool stays unbound. "Registered in tools node but forgotten in bind" is a defect, not a feature.

### Skill exclusivity

For a given skill id:

- **Either** auto-inject body into the system prompt (layer 6),
- **Or** expose `use_skill__{id}` via bind,

not both in the same bind/inject plan unless the product records an explicit dual-mode decision (rare; default is exclusive).

### Compose outside the god-node

Extract compose, bind list construction, and routing helpers from the agent node. A `*.node.ts` file orchestrates; it must not contain the entire doctrine (~hundreds of LOC of prompt assembly).

## Gather vs deliver prompts (`react_bounded`)

Split system prompts for gather + composer:

| Phase | Prompt owns | Must not include |
| ----- | ----------- | ---------------- |
| **Gather** | Tool discipline, MCP wire hints, nudge tools on `needsData` | Deliver/formatting skills, final Markdown templates, chart prose |
| **Composer** | Skill auto-inject, formatting, locale, user tone | Tool-call authoring beyond evidence narration |

Deliver skill in gather = premature Markdown in tool loop. Bind deliver skills on composer turn only (or auto-inject in composer compose).

Gather nudge: single `SystemMessage` section — no fake `HumanMessage`. Skip nudge when `discoveryBrief` confirms catalog absence.

## Prompt / Capability plan (required shape)

```markdown
### Prompt / Capability plan
- System layers touched: [1–7 numbers]
- Canonical prompt path: src/conversation/prompts/...
- Session overlay: yes/no (configurable field names)
- Bind list: [wire names]
- Auto-inject skills: [ids] (exclusive of bind)
- Truncate caps: tool=CONTEXT_TOOL_OUTPUT_MAX_CHARS; skill=CONTEXT_SKILL_BODY_MAX_CHARS
- Bind parity: every dispatchable tool listed above, or unbound+[test]
- Spec paths to sync: [graph-spec sections]
```

## Related

- Placement of prompt files: `references/placement-and-domains.md`
- Token pipeline: `references/context-window-and-tokens.md`
- MCP governance: `references/capability-governance.md`
- Review anti-patterns: `references/anti-patterns.md`
