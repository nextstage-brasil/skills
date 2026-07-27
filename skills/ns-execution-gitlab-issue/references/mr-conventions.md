# Merge request conventions

Single MR per issue (monorepo model — no per-repo MR map).

## Creation (via MCP)

- **Source:** `{WORK_BRANCH}`
- **Target:** `{SOURCE_BRANCH}` (confirmed in Gate 1)
- **Title:** `Draft: {imperative title}` (Portuguese or English per team — issue title often PT)
- **Description line 1:** `Related to {ISSUE_URL}`
- **Labels:** `Status: In progress` (or config equivalent)
- **Draft:** `true` until review passes

## Gate 0 reuse

If `REUSE_MODE = true`, reuse the existing MR — never open a second one. Record its URL as `MR_URLS`.

## After approval

- Mark MR ready (remove draft) per team process.
- Human or workflow merges — not required in skill unless asked.

## project_id

Resolve per `mcp-gitlab-usage`; confirm the trio with the human before creating or reusing the MR.
