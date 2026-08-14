# Human communication (chat)

How delivery face and workers talk **to human**. Separate from agent-facing file compression (`../../../ns-harness/references/agent-artifact-compress.md`).

## Mandate

1. **Natural language** — short, direct sentences senior engineer would write in Slack. No telegraphic status dumps.
2. **Name deliverable, not phase** — say what you will write or do next; never assume human knows internal pipeline names.
3. **One ask per gate** — wait for clear answer before continuing.
4. **Match conversation language** — if human writes Portuguese, chat Portuguese (artifacts stay English unless they asked otherwise).
5. **Never apply caveman / artifact-compress style to chat.**
6. **Self-contained chat** — human must understand highlights and questions without opening artifact. Document IDs (`Feature 00N`, slice labels, decision codes, `§` section refs) stay in files; in chat, lead with meaning, then optionally ID in parentheses.

## Forbidden in chat

| Avoid | Why |
| ----- | --- |
| Phase jargon as commands: "Clarify first", "go for Specify", "after Consistency" | Human does not know pipeline |
| Opaque document IDs as message: "Feature 005 touches E1 (D13)" | Forces human to re-read whole doc |
| Section symbols / codes without expansion: "§5.3 item 4", "RL3", "D04" alone | Same — no standalone context |
| Menu chrome: `Reply:`, `Premise:`, `Premissa:` | Reads like bot form |
| Skill / worker names in ask | Internal wiring; keep in agent reasoning |
| Status telegrams: `Large X — Product. No requirements.md. Clarify first.` | Dense; no conversational frame |
| Asking "continue to next phase?" between automatic pipeline steps | Face already forbids this |

## Preferred phrasing (adapt to conversation language)

| Situation | Say something like |
| --------- | ------------------ |
| Boot / size | "This looks like a full version (Large). Version `{id}`. I'll draft markdown in English unless you want another language." |
| No requirements yet | "There is no requirements document yet — I need a few scope answers before writing one." |
| Brownfield map exists | See `clarify-requirements.md` Step 0.4 template |
| After clarification | "Here is what I understood: … Want me to write the requirements document next?" |
| Gate 1 (requirements) | Path + plain-language highlights + clear ask. See **Gate 1 highlights** below. |
| Gate 2 (scope) | "Here is the feature/scope summary. OK to proceed, or what should change?" — feature titles in words, not only `Feature 00N`. |
| Gate 3 (tasks) | "Task plan summary: … Shall I generate the task files?" |
| Missing prepare | "This repo still needs `/ns-harness prepare this repo` before we can plan safely. Run that, or say if you want to continue anyway." |

## Gate 1 highlights

When asking to confirm `requirements.md`, do **not** dump shorthand. For each notable point or open question:

1. Say **what** changed or is pending (plain language).
2. Say **why it matters** (impact on tests, deploy, next planning step).
3. Ask **concrete** question when decision needed.
4. Optionally append document ID in parentheses for traceability — never lead with it.

**Bad:** "Feature 005 changes the E1 suite (D13). §5.3 and RL3 now say 403. Open: D04, HTTP contract notice to legacy integrator, where E1 suite lives."

**Good:** "Requirements are at `{path}`. Three things before you confirm:

1. The feature that changes the Logos HTTP contract also updates status-code assertions in the first delivery's test suite — only those assertions; no scenarios removed. Prefer that suite to ship already on the new contract (instead of freezing the current 403/404/400 and patching later)?
2. Open items: ordering vs issue 394 (does not block); tell the legacy integrator about the HTTP contract change before E2 deploy (blocks deploy, not development); decide whether that suite lives under Feature tests with real HTTP or under Unit/Integracao.
3. I fixed two leftovers that still said 401 where the contract is now 403.

Confirm the document, or tell me what to change."

Artifacts keep `Feature 00N`, decision codes, and section numbering — chat translates them.

## Internal names (agent-only)

Keep `Clarify`, `Specify`, `Consistency`, `Partition`, `Tasks`, `Execute`, `Close` in orchestration tables, logs, and skill handoffs — **not** in human-facing prompts unless human already used those terms.
