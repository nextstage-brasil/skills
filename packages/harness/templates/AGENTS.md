# AGENTS.md template (reference)

The CLI does **not** copy this file. `harness agents-md` generates `AGENTS.md` from `packages/harness/src/generateAgentsMd.js`.

Shared **Docker and testing** rules: `snippets/docker-and-testing.md` (inlined into generated output).

For brownfield refinement, use the `harness-agents-md` skill (`skills/harness-agents-md/`).

Generated output includes a **local overrides** rule: when `agents.local.md` exists at `{product_root}` (case-insensitive), agents read it after `AGENTS.md`.
