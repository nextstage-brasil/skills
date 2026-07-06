# Partition workflow (orchestrator)

After `version-partitioner` completes:

## Gate Roadmap

Present roadmap table. **Stop** until human confirms validation.

## Per-slice loop (topological order)

For each subversion where `status` is not `planned` / `completed`:

1. Set active path: `{product_root}/docs/versions/{version_san}/subversions/{subversion_san}/`
2. Run Gate 2 on slice requirements
3. Run `analyze-consistency` on slice
4. Gate 3 if needed
5. Generate tasks into slice `tasks/`
6. Update roadmap row `status` → `planned`

Do **not** regenerate master requirements.

Slice task IDs start at `001` per subversion.
