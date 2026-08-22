# Runtime configuration (not `fixtures/`)

Domain data lives here. Conversation prompts, locale, and presentation stay under `src/conversation/` — not in `src/graph/` or `src/llm/`.

| Path | Content |
|------|---------|
| `tenants/{tenant_id}/` | Optional tenant-specific data (JSON, catalogs) |
| `verticals/` | Optional playbook dir (`PLAYBOOKS_DIR`); **not** a substitute for graph modes |

Product **modes** (search vs scoped vs validation) belong in `src/conversation/prompts/` + `graph-spec.md` edges — not `config/verticals/` as the modeling approach.

Override dirs via `TENANTS_DIR` / `PLAYBOOKS_DIR` (`src/shared/config-paths.ts`).

See `references/runtime-layout.md` and `references/placement-and-domains.md`.
