# Q1 Intake

Resolve dev issue, QA issue, MRs, relevant comments. Output `<run_dir>/intake.md`. MCP calls per `mcp-gitlab-usage` (MCP-provisioned; read before first call).

## Steps

1. `read_issue` on invoked URL/IID.
2. **Classify** issue:

| Signal (profile `tracker.qa_issues`) | Class |
| ------------------------------------ | ----- |
| `mode: separate_project` + issue in `project` | QA issue |
| Title starts with any `signal.title_prefix` **or** has any `signal.labels` | QA issue |
| Else | Dev issue |

3. **Partner issue:** QA issue → dev issue via `link_relation` link, else issue ref in description. Dev issue → QA issue same way. `mode: none` → dev only; `issue.qa = null`. Partner not found with mode ≠ `none` → record gap; L0 continues; ≥L1 stops at Q1 (status sync needs both).
4. **MRs** (dev issue). Reuse `ns-execution-gitlab-issue` Gate 0 signal:
   - `list_issue_merge_requests` → prefer open/merged MR whose `source_branch` matches `work/<iid>-*`; else MR linked in issue/comments.
   - `read_merge_request` → `ref` (`<project>!<iid>`), head commit, target branch, file diffs (Q3 input).
   - Several MRs → list all; homologate head of each; ledger `mr` = MR that delivers the issue (latest merged/open). None → `mr: none` declared (later verdict Blocked; plan still built).
5. **Dev handoff:** `docs/qa/handoff/<dev iid>/qa-handoff.md` in the main checkout (written by `ns-execution-gitlab-issue` Phase 5; gitignored). Present → read; record path, `commit`, AC lines, verify steps. Header `commit` ≠ MR head → mark `stale`: keep ACs, treat verify steps as hints, log gap. Absent → record `none`; never an error.
6. **Comments:** `list_issue_comments` on both issues. Drop: authors in `tracker.ignore_authors`, system notes, comments carrying marker `ns-qa:run=`. Keep: scope/AC changes, reproduction steps, decisions. Summarize; quote ≤1 line each.
7. **Attachments:** `download_markdown_upload` only. Never open `/uploads/` URLs in browser.
8. **Status guard** (table: `profile-schema.md` → Q1 status guard). Read current `Status:` of each applicable side. Evaluate **all** sides before any write.

## Status sync by level

| Effective level | Action |
| --------------- | ------ |
| L0 | Read-only. Write planned transitions (`would set <key>`) or mismatch reason to `intake.md` |
| ≥ L1 | Apply via `set_issue_status` only (never `set_issue_labels`). Any side outside `*_from` / `*_running` → change nothing, log reason, stop at Q1 |

Status names come only from `tracker.status_source`. Key absent → skip that side + log; never guess a label.

## `intake.md` sections

| Section | Content |
| ------- | ------- |
| Issues | dev ref + title + state; QA ref or `none` (+ reason) |
| Merge requests | ref, state, source → target, head commit, files changed count |
| Dev handoff | path or `none`; handoff `commit`; `fresh` / `stale`; AC count; verify-step summary |
| Relevant comments | author role, date, one-line summary |
| Attachments | file → local path, what it shows |
| Status guard | per side: current key, target key, action (`set` / `no-op` / `would set` / `stop`) |
| Gaps | missing partner, missing MR, unreadable attachment |

## Gate

Dev issue resolved; MR identified or absence declared; status guard satisfied (≥L1) or recorded (L0). Else stop at Q1, nothing written to tracker.
