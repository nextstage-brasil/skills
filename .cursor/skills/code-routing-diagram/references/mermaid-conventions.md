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
| `A` | `ns-autonomous` |
| `BRD` | `ns-bug-report-diagnosis` |
| `I` | `ns-investigator` |
| `C` | `ns-coder` |
| `C2` | `ns-coder` subagent under `A` |
| `H` | `run-implementation.md` (ns-coder) |
| `REV` | `ns-reviewer` |
| `JUDGE` | `ns-judge` (in-session after `Code Review: Approved`) |
| `GL` | `mcp-gitlab-usage` |
| `U2` / User decision | Diagnosis human gate (investigator or bug-report) before re-entry |
| `IMPL` | Implement + review loop inside coder |

## Required edges (minimum)

**Entry router (priorities on edge labels):**

- `R → G` (1 ISSUE_URL)
- `R → S` (2 feature / version / SDD)
- `R → A` (3 autonomous local)
- `R → BRD` (4a product report)
- `R → I` (4b stack / CI)
- `R → C` (5 default)

**Coder escalations:**

- `C → G`, `C → S`, `C → BRD`, `C → I`, `C → IMPL → REV`

**GitLab lifecycle:**

- `G → Cimpl` (Phase 2 external single)
- `G → A` (Phase 2 external multi)
- `G → GL`, `G → REV`
- `A → Cimpl` (1 unit) or `A → C2` (2+); `C2` defers to parent `REV`

**Spec-driven:**

- `S → C` (cheap quick), `S → H → Cimpl`, `H → A`

**Review then judge:**

- `REV → JUDGE` when `Approved` only

**Investigator / bug-report loop:**

- `I → U2 → R` (implement fix) — no direct `I → C`
- `BRD → C` (no URL + `diagnosis_complete`)
- `BRD → G` (`ISSUE_URL` + `diagnosis_complete`)
- `BRD → U2` only on diagnose-only opt-out

## Do not draw

- `C2 → G` as an active path — engine anti-cycle forbids re-entry; state in prose only
- Install-time `depends` edges
- Internal steps inside a skill unless they are explicit handoffs to another skill

## Label style

- Edge labels: short condition (`ISSUE_URL detected`, `Phase 2 engine`)
- Skill nodes: full `ns-*` name in bracket text for clarity in exports
