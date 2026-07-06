# Merge request conventions

## Creation (via MCP)

- **Source:** `{WORK_BRANCH}`
- **Target:** `{SOURCE_BRANCH}` (confirmed in Gate 1)
- **Title:** `Draft: {imperative title}` (Portuguese or English per team — issue title often PT)
- **Description line 1:** `Related to {ISSUE_URL}`
- **Labels:** `Status: In progress` (or config equivalent)
- **Draft:** `true` until review passes

## Multirepo

- One MR per affected repository
- Record `MR_URLS` map repo → URL for review phase
- `code-reviewer` diffs each MR branch pair

## After approval

- Mark MR ready (remove draft) per team process
- Human or workflow merges — not required in skill unless asked

## project_id

Resolve per repository — backend and frontend may differ. Confirm trio with human per `mcp-gitlab-usage`.
