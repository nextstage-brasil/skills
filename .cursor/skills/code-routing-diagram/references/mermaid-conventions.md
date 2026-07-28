# Mermaid conventions — code skill routing

## Diagram type

`flowchart TD` — top-down handoffs between skills and the user.

## Required nodes

| Node | Meaning |
| ---- | ------- |
| `U` / User request | Entry from human |
| `R` / Entry router | Host priority scan 1→5 (not a skill) |
| `G` | `ns-execution-gitlab-issue` |
| `S` | `ns-spec-driven` |
| `A` | `ns-code-autonomous` |
| `I` | `ns-code-investigator` |
| `C` | `ns-code-coder` |
| `C2` | `ns-code-coder` subagent under `A` |
| `H` | `ns-sdd-execution-handoff-generator` |
| `REV` | `ns-code-reviewer` |
| `GL` | `mcp-gitlab-usage` |
| `U2` / User decision | Investigator human gate before re-entry |
| `IMPL` | Implement + review loop inside coder |

## Required edges (minimum)

**Entry router (priorities on edge labels):**

- `R → G` (1 ISSUE_URL)
- `R → S` (2 feature / version / SDD)
- `R → A` (3 autonomous local)
- `R → I` (4 root-cause only)
- `R → C` (5 default)

**Coder escalations:**

- `C → G`, `C → S`, `C → I`, `C → IMPL → REV`

**GitLab lifecycle:**

- `G → A` (Phase 2 engine)
- `G → GL`, `G → REV`
- `A → C2 → REV`

**Spec-driven:**

- `S → C`, `S → H → C`, `H → A`

**Investigator loop:**

- `I → U2 → R` (implement fix) — no direct `I → C`

## Do not draw

- `C2 → G` as an active path — engine anti-cycle forbids re-entry; state in prose only
- Install-time `depends` edges
- Internal steps inside a skill unless they are explicit handoffs to another skill

## Label style

- Edge labels: short condition (`ISSUE_URL detected`, `Phase 2 engine`)
- Skill nodes: full `ns-*` name in bracket text for clarity in exports
