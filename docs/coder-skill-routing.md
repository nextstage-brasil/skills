# Coder skill routing (current)

How NextStage implementation skills relate today. `ns-code-coder` is a **worker**, not the entry router — peer skills own GitLab, autonomous, and SDD flows.

```mermaid
flowchart TD
  U[User request] --> R{Qual entry?}

  R -->|"quick fix / implementa X"| C[ns-code-coder]
  R -->|ISSUE_URL| G[ns-execution-gitlab-issue]
  R -->|"roda autônomo local"| A[ns-code-autonomous]
  R -->|"feature / version / SDD"| S[ns-spec-driven]
  R -->|"bug / stack / CI fail"| I[ns-code-investigator]

  C -->|ISSUE_URL detectada| G
  C -->|muito grande| S
  C -->|bug obscuro| I
  C -->|diff ad-hoc| IMPL[Implement + review loop]
  IMPL --> REV[ns-code-reviewer]

  G -->|Phase 2 engine| A
  G -->|MR / status / time| GL[mcp-gitlab-usage]
  G -->|review gate| REV

  A -->|dispatch work units| C2[ns-code-coder subagent]
  C2 --> REV

  S -->|small / quick| C
  S -->|version + handoff| H[ns-sdd-execution-handoff-generator]
  H --> C
  H --> A

  I -->|root cause + fix proposal| U
```

## Who guides what

| Concern | Owner skill |
| -------- | ----------- |
| Ad-hoc diff + review loop | `ns-code-coder` |
| GitLab issue lifecycle | `ns-execution-gitlab-issue` |
| Multi-unit / worktree engine | `ns-code-autonomous` |
| Spec / version planning | `ns-spec-driven` |
| Root-cause debugging | `ns-code-investigator` |

## Install note

`ns-code-coder` `depends` pulls the full `ns-code-*` suite (install-time). That does **not** make coder the runtime router.
