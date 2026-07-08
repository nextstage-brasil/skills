# Doubt resolution protocol

Applies identically in Engine mode and standalone — only the escalation channel differs (structured event to caller vs. direct chat).

## Sequence

1. **Self-ask** — before implementing a unit, name the doubt precisely: what's ambiguous, and what would change depending on the answer.
2. **Docs-first lookup** — search `docs/context/` and `docs/specs/` (see `../nextstage-harness/references/artifact-layout.md`) for an existing answer before asking anyone. Most doubts about stack, conventions, or prior decisions are already documented.
3. **Self-answer non-destructive doubts** — if docs don't resolve it but the doubt is non-destructive (see criteria below), pick the most conventional/reversible interpretation, note the assumption in the unit's checkpoint commit message or the delivery report, and proceed. Don't stop the pipeline for reversible judgment calls.
4. **Escalate destructive doubts** — stop dispatch of the affected unit(s) and raise the doubt per the escalation shape below. Do not guess on anything destructive.

## Destructive criteria

A doubt is destructive when getting it wrong would be costly or irreversible to correct after delivery. Non-exhaustive signals:

- Data loss or schema/migration decisions that are hard to reverse once run against real data.
- Public contract changes (API shape, function signatures other code depends on) where the wrong choice breaks callers outside this run's scope.
- Deleting or overwriting existing production logic/config where intent is ambiguous.
- Security/auth/permission boundaries.
- Anything the descriptor explicitly flags as needing confirmation.

Everything else — naming, internal structure, which of several equally valid conventions to follow, test coverage depth — is non-destructive: self-answer and move on.

## Escalation event shape (Engine mode)

Return this to `execute-gitlab-issue` instead of mutating any GitLab state:

```json
{
  "questions": ["..."],
  "options": ["Option A — ...", "Option B — ..."],
  "recommended_default": "Option A",
  "blocked_unit_ids": ["task-003"]
}
```

The caller owns turning this into an issue comment (`@author` mention), status change, and chat question. Units not blocked by this doubt continue and report their own status independently.

## Escalation in standalone mode

No caller to hand this to — pause dispatch of the affected unit(s), ask the same structured question directly in chat, and wait. This is the only gate in the standalone pipeline besides the review loop. On answer, resume dispatch for the previously blocked unit(s) with the answer folded into their context.

## Resume

Once an answer arrives (chat and/or issue comment in Engine mode), append it to the relevant unit's context and re-run dispatch for exactly the units that were blocked — don't re-dispatch units that already completed.
