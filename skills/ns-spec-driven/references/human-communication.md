# Human communication (chat)

Delivery face + workers talk **to human**. Separate from agent-facing file compression (`../../../ns-harness/references/agent-artifact-compress.md`).

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
| Section symbols / codes without expansion: "§5.3 item 4", "RL3", "D04", `FPA08` alone | Same — no standalone context |
| Asking human to confirm/recall product error codes, ticket ids, `FPA*` / internal enums | Human cannot answer from memory; ask **observable** outcome (when, HTTP, what client sees). Codes stay in `source/` / `clarify-contract.md` |
| Dumping detector ids `D1` `D2` `D3` in Gate 0 chat | Ask the gap in behavior words; ids stay in `unknowns-register.md` |
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
| After clarification | Stop at Gate 0 — see **Gate 0 voice**. Do not ask to write requirements until Gate 0 passes. |
| Gate 0 (inputs) | Numbered `1.` `2.` …. Human may answer by number **or** `Tudo sim` / `all yes` for remaining **yes/no confirms only**. Open questions still need a value. Silence / `proceed` ≠ confirm. |
| Gate 1 (requirements) | Path + plain-language highlights + coverage counts + out-of-scope list + clear ask. See **Gate 1 highlights** below. |
| Gate 2 (scope) | "Here is the feature/scope summary. OK to proceed, or what should change?" — feature titles in words, not only `Feature 00N`. |
| Gate 3 (tasks) | "Task plan: N backend, M frontend, … (~K worker batches, prefer 4–7 tasks each). Shall I generate the task files?" — always before any `task-*.md` |
| Gate 4 (delivery units) | Per `gates.md` — **ask before compute**; never say "I grouped N units" before file exists. Skip when GitLab not possible; mention `npx @nextstage-brasil/harness --preset gitlab` once if human cited GitLab. After file written: may summarize unit count from table. |
| Missing prepare | "This repo still needs `/ns-harness prepare this repo` before we can plan safely. Run that, or say if you want to continue anyway." |

## Gate 1 highlights

Confirm `requirements.md`: do **not** dump shorthand. Per notable point or open question:

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

Artifacts keep `Feature 00N`, decision codes, section numbering — chat translates.

## Gate 0 voice

Before any `requirements.md`:

1. List **open categories** in words (actors, error matrix, …).
2. Say **counts**: critical open, major open.
3. Restate **assumed premises** and **impact**.
4. Ask **numbered** items `1.` `2.` `3.` … — one sequence: open questions first, then sensitive confirms. **Values** = behavior (page size, when blocked, HTTP, copy, pin vs range, conflict sides). **Not** source codes (`FPA08`, ticket ids). **Not** detector ids (`D1`/`D2`/`D3`) in chat — ask the gap in words.
5. Close with how to answer: `Reply by number, e.g. 1: …  2: yes` **or** `Tudo sim` / `all yes` if every **remaining** item is a yes/no confirm (proposed value already stated).
6. Map `1:` / `2:` replies onto those items. Partial set → re-ask **only missing numbers**.
7. **`Tudo sim` / `all yes` / `sim em todos` / `yes to all`:** treat as **yes** on every numbered item that is a yes/no confirm of a stated value. **Does not** answer open questions (pick HTTP, who, timeout). If any open question still unanswered → accept bulk-yes on confirms, re-ask **only** those open numbers.
8. Silence, `proceed`, `quick mode`, `assume`, `pode seguir` on a sensitive confirm: **reject**, re-ask **that number**. Bulk-yes is not those phrases.

**Bad:** Unnumbered paragraphs. "Proceeding with defaults for 422 vs 400." / "Only FPA08 is defined for errors — confirm?"

**Good:**

```
1. When the payload is missing company_id, should the API return 422 or 400?
2. When the partner exceeds the successful request cap (40 per minute or 10 000 per day), same block as a failed login, a different HTTP status, or still open?
3. Confirm: page starts at 1 and size is 300? (yes/no)

Reply by number, e.g. 1: 400  2: same block  3: yes
If 3–N are only yes/no confirms: Tudo sim is enough for those. Not for 1–2.
```

## Internal names (agent-only)

Keep `Clarify`, `Specify`, `Consistency`, `Partition`, `Tasks`, `Execute`, `Close` in orchestration tables, logs, and skill handoffs — **not** in human-facing prompts unless human already used those terms.
