# Minimal change

Smallest diff that fully solves task. Read at step 4 (**Identify minimal diff**). Gates in `SKILL.md` (Ask-before, large change) still win.

## Rules

1. **Reuse ladder** — before new code, stop at first hit: existing helper/pattern in codebase → standard library/platform feature → already-installed dependency → minimum new code.
2. **No speculation** — no option, config flag, wrapper, type conversion, or "for later" code the task did not ask for.
3. **Bug fix** — grep all callers of touched function. Fix root cause once in shared code, not per caller.
4. **Moved/merged code** keeps its validation and error handling.
5. **Equal-size options** — pick the one correct on edge cases (empty, null, boundary, concurrency).
6. **New non-trivial logic** (branch, loop, parser, money, security) leaves one small test. Assert-based self-check only for one-off scripts — runtime asserts can be disabled in production.
7. **Known-limit shortcut** gets one-line comment: `shortcut: <limit>, <when to upgrade>`.
8. **Never cut:** validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything user asked for.

## Reconcile with SSoT / DRY / OCP

"Minimal" = minimal **scope**. Not license to leave touched module worse on SSoT/DRY/OCP. `ns-reviewer` caps score at **7** for that. Conflict: keep diff in scope, but do not leave or add second source of truth, copy-paste branch, or hard-coded switch in touched module. Fix needs out-of-scope change → Ask-before / large change gate, report in `Skipped / not checked / risk`.
