# Prompt and capability injection

How model gets **system text** + **callable capabilities**. Mis-wire = dual prompt paths, truncated doctrine, dead tools, fake user turns.

Read before system-prompt compose, skill auto-inject, MCP bind, or local tool registration.

## Non-negotiable — `base_invariant` + `injected`

**Applicability:** greenfield **MUST** / intentional redesign **MUST** / brownfield **RECOMMENDED** (same as skill Applicability).

| Piece | Name | Owns |
| ----- | ---- | ---- |
| Motor | `base_invariant` | Rigid factory rules — gather MUST NOT emit user-facing Markdown; composer sole-writer; tool discipline; bind/truncate doctrine |
| Product | `injected` | Persona, tone, domain product prompt |

**REQUIRED compose each LLM invoke:** `base_invariant + injected`. Rebuild for invoke. **FORBIDDEN** store composed system/persona text in graph state, checkpointer, or durable `messages` history.

**Why:** (1) leak via checkpoint/logs/resume; (2) sticky persona glued into conversation history — later turns inherit stale system text.

**vs summary `SystemMessage`:** persisted `SystemMessage` at index 0 for **summaries** OK — see `message-content-blocks.md`. That is **not** full composed system/persona prompt. Full system = rebuild `base_invariant + injected` at invoke only.

Motor rules live in `base_invariant` (or shared motor fragment), **not** only inside product persona files.

## System prompt — mandatory layers (order)

Compose via helper outside god-node (`composeSystemPrompt`). Layers feed `base_invariant` and/or `injected`; final string = `base_invariant + injected` per turn. Order matters:

| # | Layer | Source | Bucket | Notes |
| - | ----- | ------ | ------ | ----- |
| 1 | Canonical body | File under `src/conversation/prompts/` | Usually `injected` (persona/role) | Single source for product role/behavior |
| 2 | Opacity / safety fixed rules | Shared constants or prompt fragment | Prefer `base_invariant` | Keep short |
| 3 | Data-plane truth | Runtime connection state | Either; often `injected` overlay | Never claim tools agent cannot call |
| 4 | Session context overlay | `RunnableConfig.configurable` | `injected` | **Overlay**, not body replace; never persist into graph state |
| 5 | Scope anchors | Computed helpers (period, app ids, tenant labels) | `injected` | Deterministic strings from config/state refs |
| 6 | Optional skill body auto-inject | Skill markdown when product policy says so | Phase-dependent | Body-only; exclusivity below |
| 7 | Ephemeral runtime nudge | System section (`Runtime directive`) | Ephemeral `injected` / phase prompt | **Never** fake `HumanMessage` |

Motor invariants (gather-no-Markdown, composer sole-writer, tool discipline) always in `base_invariant` for that phase — gather vs composer may use different motor fragments; still never persist composed result.

### Session overlay vs canonical body

| Concept | Meaning |
| ------- | ------- |
| Canonical system body | Versioned markdown in `conversation/prompts/` — product/`injected` base |
| Session context overlay | Per-request text from `configurable` — appends; does not replace body |
| `base_invariant` | Motor rules rebuilt each invoke — not durable history |
| Graph state / checkpointer / durable `messages` | **MUST NOT** store composed system/persona prompt or secrets |

Names matter: "required system prompt" ≠ session overlay ≠ summary `SystemMessage`.

### Nudges

Runtime nudges (force format, one-shot) = layer 7 of composed system text. Fake user turns pollute history, break trim/summarize, train model on fake dialogue.

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

Split compose per phase. Motor pieces stay in `base_invariant`; product persona/tone in `injected`:

| Phase | `base_invariant` owns | `injected` owns | Must not include |
| ----- | --------------------- | --------------- | ---------------- |
| **Gather** | Tool discipline; gather MUST NOT emit user-facing Markdown; MCP wire hints | Optional short gather persona (no deliver templates) | Deliver/formatting skills, final Markdown, chart prose |
| **Composer** | Composer sole-writer; evidence-narration discipline | Skill auto-inject, formatting, locale, user tone | Tool-call authoring beyond evidence narration |

Deliver skill in gather = premature Markdown in tool loop. Bind deliver skills on composer turn only (or auto-inject in composer compose).

Gather nudge: system section in composed invoke payload — no fake `HumanMessage`; do not write nudge into durable `messages`. Skip nudge when `discoveryBrief` confirms catalog absence.

## Prompt / Capability plan (required shape)

```markdown
### Prompt / Capability plan
- Compose: base_invariant + injected (rebuild per invoke; not in state/checkpointer/durable messages)
- Motor (`base_invariant`): [gather-no-Markdown / sole-writer / tool discipline / …]
- Product (`injected`): canonical path + persona/tone notes
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

- Placement: `references/placement-and-domains.md`
- Token pipeline: `references/context-window-and-tokens.md`
- Summary `SystemMessage` vs full system: `references/message-content-blocks.md`
- MCP governance: `references/capability-governance.md`
- Review anti-patterns: `references/anti-patterns.md`
