# QA profile schema — execution

Continuation of `profile-schema.md` (legend, YAML subset, gate extras there). `R` = required. Default `—` = none; profile must set it.

### `execution`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `runner` | R | `cypress`\|`playwright`\|`none` | — | No harness default. `none` → critical AC max verdict = `policy.runner_none_critical_cap`; Q8 no-op |
| `e2e_root` | when runner ≠ `none` | path | — | In-repo dir or external E2E repo (own `AGENTS.md`). L3: relative, inside project, no `..` (worktree `repo_root`) |
| `e2e_authoring` | — | `auto`\|`repo-local`\|`ns-e2e-tests` | `auto` | `auto`: E2E repo's own skills when present, else `ns-e2e-tests` (D34) |
| `e2e_git.base_branch` | when L3 | branch | — | Q8 branch start + MR target; never pushed |
| `e2e_git.branch_pattern` | when L3 | string | — | Placeholders `{iid}` `{run_id}` `{slug}`; MUST hold `{iid}` or `{run_id}`; render = valid branch |
| `e2e_git.commit_prefix` | when L3 | string | — | One line, ≤50 chars. Commit subject + MR title = prefix + subject |
| `e2e_git.commit_language` | when L3 | BCP 47 tag | — | Target repo convention (D39); overrides catalog English for that repo only |
| `e2e_git.remote` | — | remote name | `origin` | Fetch + push target |
| `e2e_git.protected_branches` | — | branch or `*` glob[] | `[]` | Never pushed, never Q8 branch; `base_branch` always protected |
| `e2e_lint.forbid_spec_intercepts` | — | bool | `false` | Lint rule `spec-intercept` on (also on when E2E repo `.e2e-antipatterns.json` sets it) |
| `browser_tool_preference` | — | tool id[] | `[]` | Browser lane order; ids: `browser-tools.md` |
| `stability_runs` | — | int ≥2 | `2` | Consecutive green runs on one spec set before Q8 commit |
| `runner_retries_during_verification` | R | `0` | `0` | Runner retries off; stability via explicit runs |
| `budget.max_scenarios` | — | `unlimited` \| int | `unlimited` | Full plan by risk order |
| `budget.checkpoint_min` | — | int | `60` | Recurring check-in, not work limit |
| `budget.on_checkpoint` | — | `ask` | `ask` | Finish in-flight cycle → pause → ask; wait indefinitely |
| `budget.on_stall` | — | `ask` | `ask` | Unforeseen no-progress → stop + ask, any time |

Names (branch, base, remote, protected) = strict charset `[A-Za-z0-9._/-]` (protected adds `*`), no `..` / leading `-`: they become git argv (`automation-handoff.md`). Invalid → `--check-profile` exit 3.
