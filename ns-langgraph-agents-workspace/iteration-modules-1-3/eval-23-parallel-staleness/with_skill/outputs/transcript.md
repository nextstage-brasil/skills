# Eval 23 — Parallel producer staleness (with_skill)

**Prompt:** Two parallel extract producers join into a summary. One finished on an older invoice version; the other is current. Both tool calls succeeded. What do we compensate?

## Answer

Per `references/error-and-reliability.md` § **Parallel producer staleness** and **Fan-out aggregation**: each producer must record **input version at start** and **version current at completion**; a mismatch means that producer’s output is stale even though the tool call succeeded. After the fan-out joins, run the consistency check **per producer** — compensate **only** the stale producer (re-run or undo its side effects against the current invoice version). Do **not** re-run the sibling that already completed on the current version; that wastes work and risks new divergence. The join must use **settle-all** (`Promise.allSettled`) so the good sibling’s result is preserved while only the stale branch is retried — not reject-on-first-failure, which would discard the valid extract. Without both start and finish version records, the stale branch is undetectable; that is the whole point of the two-version record.
