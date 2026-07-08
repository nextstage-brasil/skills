# Planning-depth self-decision

The engine decides its own planning depth from the descriptor (issue payload or standalone plan text) — nobody hands it a depth externally.

## Single work unit (no SDD artifacts)

Use when the change is contained and can be described in one paragraph without losing information:

- Touches a small, predictable set of files (roughly ≤ 5, one layer or a tight cross-layer pair).
- Acceptance criteria are already explicit and don't need to be decomposed into sub-tasks to be actionable.
- No meaningful sequencing/dependency structure — it's one coherent piece of work.

Proceed straight to dispatch (`multi-agent-dispatch.md`) with a single implicit unit. Do not create `requirements.md`, `tasks/`, or `execution-plan.md` for this path — that would be planning overhead for work that doesn't need it (same principle `code-coder` follows for ad-hoc tasks).

## Requirements + tasks + execution-plan

Use when the descriptor is multi-part or ambiguous enough that skipping decomposition would risk missed scope or wrong sequencing:

- Multiple independent areas of change (e.g. backend + frontend + migration) that benefit from being tracked separately.
- Acceptance criteria are broad or implicit and need to be broken into verifiable pieces.
- The work has real dependency structure — some pieces must land before others.

Generate, under `{product_root}/docs/versions/{version_san}/` (version allocated as fix/feat from the descriptor content, per `../nextstage-harness/references/artifact-layout.md`):

- `requirements.md` — light version: scope, acceptance criteria, out-of-scope, one paragraph each — this is a self-approved internal artifact, not the full `clarify-requirements` → `requirements-generator` human-gated chain.
- `tasks/task-NNN-*.md` — one per work unit, same shape as `task-generator` output but generated internally.
- `execution-plan.md` — the DAG: which units are independent (parallelizable) and which have edges (sequential), used directly by `multi-agent-dispatch.md`.

Do this before dispatching anything. Both Engine mode and the standalone pipeline follow this same heuristic — the only difference is where `{version_san}` comes from (issue slug vs. standalone descriptor).

## When in doubt

Default to the lighter option. Over-planning a contained change wastes a round-trip; under-planning a genuinely multi-part change surfaces as scope drift during dispatch, which is more expensive to unwind. If dispatch reveals the single-unit assumption was wrong (files span unrelated areas, or a real dependency emerges), stop and re-run this decision rather than pushing through.
