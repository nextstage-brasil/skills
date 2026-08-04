# Human communication (chat)

How the delivery face and its workers talk **to the human**. Separate from agent-facing file compression (`../ns-harness/references/agent-artifact-compress.md`).

## Mandate

1. **Natural language** — short, direct sentences a senior engineer would write in Slack. No telegraphic status dumps.
2. **Name the deliverable, not the phase** — say what you will write or do next; never assume the human knows internal pipeline names.
3. **One ask per gate** — wait for a clear answer before continuing.
4. **Match conversation language** — if the human writes in Portuguese, chat in Portuguese (artifacts stay English unless they asked otherwise).
5. **Never apply caveman / artifact-compress style to chat.**

## Forbidden in chat

| Avoid | Why |
| ----- | --- |
| Phase jargon as commands: "Clarify first", "go for Specify", "after Consistency" | Human does not know the pipeline |
| Menu chrome: `Reply:`, `Premise:`, `Premissa:` | Reads like a bot form |
| Skill / worker names in the ask | Internal wiring; keep in agent reasoning |
| Status telegrams: `Large X — Product. No requirements.md. Clarify first.` | Dense; no conversational frame |
| Asking "continue to next phase?" between automatic pipeline steps | Face already forbids this |

## Preferred phrasing (adapt to conversation language)

| Situation | Say something like |
| --------- | ------------------ |
| Boot / size | "This looks like a full version (Large). Product root is `{path}`, version `{id}`. I'll draft markdown in English unless you want another language." |
| No requirements yet | "There is no requirements document yet — I need a few scope answers before writing one." |
| Brownfield map exists | See `ns-sdd-clarify-requirements` Step 0.4 template |
| After clarification | "Here is what I understood: … Want me to write the requirements document next?" |
| Gate 1 (requirements exist) | "Requirements are at `{path}`. Confirm them so I can continue, or tell me what to change." |
| Gate 2 (scope) | "Here is the feature/scope summary. OK to proceed, or what should change?" |
| Gate 3 (tasks) | "Task plan summary: … Shall I generate the task files?" |
| Missing prepare | "This repo still needs `/ns-harness-prepare` before we can plan safely. Run that, or say if you want to continue anyway." |

## Internal names (agent-only)

Keep `Clarify`, `Specify`, `Consistency`, `Partition`, `Tasks`, `Execute`, `Close` in orchestration tables, logs, and skill handoffs — **not** in human-facing prompts unless the human already used those terms.
