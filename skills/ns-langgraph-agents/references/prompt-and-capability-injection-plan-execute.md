# Prompt and capability injection — plan_execute

Load when locking Prompt/Capability plan, `plan_execute` gather vs composer, or mode-resolved `injected`.

## Mode-resolved `injected` (single graph)

`base_invariant` (motor) **same every turn** — any mode, any phase. Never mode-swap motor rules.

`injected` (layer 1 canonical body) **may resolve per turn/mode** — not always one fixed file per product. Resolver picks body + output schema from classification result.

**Mode pick:** analyst JSON + **conditional edge** (`routeAfterAnalyst`). **One graph** — modes = branches, not subgraphs.

Structured mode output: JSON mode + Zod parse; schema selected by mode (same pattern as other structured turns).

**Example (adapt per product):**

| Mode | `injected` source | Output schema | State/config precondition |
| ---- | ----------------- | ------------- | ------------------------- |
| `search` | General search prompt file or fragment | Free text or domain reply schema | None beyond thread context |
| `personal_scoped` | Personal-scope prompt overlay | Domain reply schema | `personal_id` in state or `configurable` — missing → clarify, do not proceed |
| `document_validation` | Validation prompt (no search tools) | JSON actions for validation pipeline | Submitted document ref in state; no search branch |

Document mode example: read submitted doc, return structured JSON of validation actions — bind/search tools off for that branch.

## Analyst vs composer prompts (`plan_execute`)

Split compose per phase. Motor pieces stay in `base_invariant`; product persona/tone in `injected`:

| Phase | `base_invariant` owns | `injected` owns | Must not include |
| ----- | --------------------- | --------------- | ---------------- |
| **Analyst** | JSON plan; no user Markdown; no `bindTools` | Optional short analyst persona | Deliver/formatting skills, final Markdown |
| **Executor** | Tool discipline; hydrate evidence | — | User-facing Markdown |
| **Composer** | Composer sole-writer; evidence-narration; Intl via `turnLocale` | Skill auto-inject, user tone | Tool-call authoring; inventing number/date separators |

Deliver skill on analyst hop = premature Markdown. Bind deliver skills on composer only.

**Locale ≠ product `injected`:** reply language/formatting = conversation-observed (`evidence-and-fidelity.md`). `configurable.locale` weak hint for `resolveConversationLocale` only — never paste into `injected` as SoT. Do not bake fixed product locale into `injected`.

Analyst nudge: system section in composed invoke payload — no fake `HumanMessage`; do not write nudge into durable `messages`. Skip nudge when `discoveryBrief` confirms catalog absence.

## Prompt / Capability plan (required shape)

```markdown
### Prompt / Capability plan
- Compose: base_invariant + injected (rebuild per invoke; not in state/checkpointer/durable messages)
- Motor (`base_invariant`): [gather-no-Markdown / sole-writer / tool discipline / …]
- Product (`injected`): canonical path + persona/tone notes; mode-resolved: yes/no; modes: [...]; resolver: ...
- System layers touched: [1–7 numbers]
- Canonical prompt path: src/conversation/prompts/...
- Session overlay: yes/no (configurable field names)
- Bind list: [wire names]
- Auto-inject skills: [ids] (exclusive of bind)
- Truncate caps: tool=CONTEXT_TOOL_OUTPUT_MAX_CHARS; skill=CONTEXT_SKILL_BODY_MAX_CHARS
- Bind parity: every dispatchable tool listed above, or unbound+[test]
- Spec paths to sync: [graph-spec sections]
```

Related references: `references/prompt-and-capability-injection.md` Related.
