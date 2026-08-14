# Partition workflow (orchestrator)

After `version-partitioner.md` completes:

## Gate Roadmap

Present roadmap table. **Stop** until human confirms validation.

## Per-slice loop (topological order)

For each subversion where `status` not `planned` / `completed`:

1. Set active path: `docs/versions/{version_san}/subversions/{subversion_san}/`
2. Run Gate 2 on slice requirements
3. Run `analyze-consistency.md` on slice
4. Gate 3 (**always** — count by layer/type + estimated batches; see `gates.md`)
5. Generate tasks into slice `tasks/` (**MUST** `task-writer-agent` when available — `task-generator.md`)
6. Update roadmap row `status` to `planned`

Do **not** regenerate master requirements.

Slice task IDs start at `001` per subversion.
