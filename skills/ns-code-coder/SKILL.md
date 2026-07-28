---
name: ns-code-coder
description: (NS) Central execution worker for ad-hoc coding — bug fixes, isolated components, small refactors, scripts, migrations — without full SDD planning. Entry priority 5 (default): use when the user says "just implement this", "quick fix", "add a field to the form", or gives a concrete coding task without execution-handoff — even without naming an agent. Also runs as C2 subagent under ns-code-autonomous work units. NOT the front door — do NOT use for GitLab ISSUE_URL (ns-execution-gitlab-issue), multi-day or version scope (ns-spec-driven), root-cause-only diagnosis without implement request (ns-code-investigator), or when execution-handoff.md exists (ns-sdd-execution-handoff-generator run-implementation). Do NOT generate requirements.md, task files, or execution-handoff.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.2"
depends:
  - ns-harness
  - ns-code-investigator
  - ns-code-frontend-design
  - ns-code-best-practices
  - ns-code-backend-tests
  - ns-code-e2e-tests
  - ns-code-docs-writer
  - ns-code-reviewer
  - ns-code-autonomous
---

# Code Coder

Central **execution worker** for ad-hoc diffs (and as `C2` subagent under `ns-code-autonomous`). **Not the front door** — the host agent picks entry per `../ns-harness/references/code-skill-routing.md`.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. Load rules from `{harness_root}/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `{harness_root}` is absent.

## Routing (read first)

Entry priority **5** (default). Harness table: `../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

### Escalation out

| Signal | Redirect |
| ------ | -------- |
| GitLab `ISSUE_URL` detected | `ns-execution-gitlab-issue` |
| Multi-day / version / SDD scope | `ns-spec-driven` |
| Obscure bug, root cause unclear | `ns-code-investigator` |
| Ad-hoc diff ready | `ns-code-reviewer` (review loop below) |

### When to use (entry)

- Bug fixes and hotfixes outside a planned version
- Isolated component, hook, service, or utility
- Small refactors (≤ 1 file or tight group)
- Scripts, migrations, seeds outside version lifecycle
- "Just implement this" without `execution-handoff.md`

### When invoked as C2 (engine mode)

When `ns-code-autonomous` dispatches this skill as a work-unit subagent inside an existing worktree: follow the unit scope only. Do **not** re-route to `ns-execution-gitlab-issue` if an `ISSUE_URL` appears in code or comments — that is context, not a routing signal. Escalate new destructive doubts to the caller (`A`), not to GitLab skills.

For full planned versions with `execution-handoff.md`, follow
`../ns-sdd-execution-handoff-generator/references/run-implementation.md` and update the
handoff per `../ns-sdd-execution-handoff-generator/SKILL.md` — not this skill's ad-hoc
cycle below.

## Session inputs

| Variable             | Required                                                        |
| -------------------- | --------------------------------------------------------------- |
| `{product_root}`     | Yes (or infer if single obvious product)                        |
| `{task_description}` | Yes                                                             |
| `{target_layer}`     | Infer when possible: frontend, backend, infra, tests, fullstack |

## Scope isolation

Operate only under `{product_root}/**` plus harness docs. Do not read other products in a monorepo unless asked.

## Boot (mandatory)

1. Read `AGENTS.md`
2. Load layer rules from harness when present (architecture always; backend/frontend/tests/e2e by layer)
3. Load product context: follow **Implementation boot rule** in `../ns-harness/references/artifact-layout.md`
4. `git status` and `git diff`
5. **Read target files before writing**

## Implementation rules

- **Diff-first** — only required lines; no unrelated formatting
- **Prefer editing** existing files over new files
- **Large change gate:** >1 file simultaneously, >20 lines in one file, or public contract change → one-line plan, wait for approval
- **No commits** unless human explicitly asks — when committing, see `../ns-harness/references/agent-git-identity.md`
- **No SDD artifacts** — no `task-NNN.md`, `requirements.md`, `execution-handoff.md`
- **No gratuitous comments** unless requested
- Run tests per `AGENTS.md` Docker and testing; project-specific container and commands live in `architecture-rules.md`

## Per-task cycle

1. Understand task
2. Load rules
3. Explore relevant files
4. Identify minimal diff
5. Apply (or present plan if large-change gate)
6. Run tests if in scope
7. **Review loop** — invoke `ns-code-reviewer` and iterate on findings (see below)
8. Report what changed, final review verdict, and follow-ups

## Review loop (mandatory)

After tests pass (step 6), run an internal review loop before reporting done.

- Invoke `ns-code-reviewer` on the working-tree diff (`git diff`) — no `ISSUE_URL`, no version-closure path. Just the ad-hoc diff.
- **Max 3 rounds.** After each review:
  - **No Critical Issues** (satisfactory score) → proceed to report.
  - **Critical Issues** with rounds left → apply the minimal diff that resolves each Critical (`ns-code-reviewer` is read-only, so this skill applies the fixes), re-run tests if in scope, then re-review.
  - **Rounds exhausted** with Criticals still open → **stop and report as blocked**. List the unresolved Criticals. Do not report success.
- Keep fixes within the original task scope. If a Critical finding requires changes outside scope (public contract, cross-product, multi-day work), stop and escalate per **Stop conditions** instead of expanding the diff.
- Warnings and Suggestions do not block: carry them into the final report as follow-ups.

## Stop conditions

| Condition                                       | Action               |
| ----------------------------------------------- | -------------------- |
| `{product_root}` unclear with multiple products | Ask once             |
| Large change gate                               | Plan + wait          |
| Public contract or cross-product boundary       | Stop, explain, ask   |
| Task needs multi-day SDD planning               | Redirect to `ns-spec-driven` |

## Related skills

- `ns-code-reviewer` — mandatory review loop after implementation (see **Review loop**)
- `ns-code-investigator` — if blocked by unclear bug
- `ns-code-autonomous` — autonomous multi-agent execution (GitLab issue or local plan); for a GitLab issue, use `ns-execution-gitlab-issue` instead

## Forbidden

- SDD artifact generation
- Cross-product access without scope
- Commits without explicit request
- Refactors outside task scope
