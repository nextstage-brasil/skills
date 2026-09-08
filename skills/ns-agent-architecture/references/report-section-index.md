# ADR section index

Fill `docs/specs/agent-architecture.md` after `scripts/scaffold-report.py`. Do **not** read `report-template.md` into context. Scaffold writes the inner ADR only (`# Multi-Agent Architecture` …). No authoring preamble. No outer ` ```markdown ` fence.

**Missing dest:** from product root:

```bash
python3 .agents/skills/ns-agent-architecture/scripts/scaffold-report.py
```

Source-repo fallback:

```bash
python3 skills/ns-agent-architecture/scripts/scaffold-report.py
```

**Exists:** update in place; append Changelog + Interview Record. Never re-scaffold (wipes history).

## Fill order

| Section | Fill |
| ------- | ---- |
| Changelog | Append session line; never wipe |
| Problem Statement | Original unprompted request |
| Reference Architecture | Colored Mermaid + component table |
| Gateway calibration | Iff Gateway classifies |
| Subtask Decomposition | Type, P1, P2, P3, component |
| Trade-off Budget | Per component; extra rows if interactive vs batch |
| Orchestration pattern | Per segment + why |
| Failure / Compensation / Inter-agent events | Multi-agent only — omit else; no N/A stub |
| Architecture Change Signal | One sentence, one element |
| Why this design | Decision record |
| Interview Record + Assumptions | Append; `confirmed` / `assumed` |
| Functional Requirements | Numbered, testable |
| MVP Scope | In/out |
| Framework Recommendation | Chosen + one-line alternative |
| Proposed Architecture | State schema, constraints, error contract |
| LangGraph flow **or** CrewAI team | Chosen framework only |
| Agent Design | Per-agent I/O, tools, models, acceptance |
| Recommended Tooling Stack | Agent tools + infra |
| Implementation Plan | Phased |
| Next Steps and Risks | Open risks |

## LangGraph node flowchart (MUST)

- One `flowchart TB` happy-path column. Paint **nodes** with five-block `classDef`. **FORBIDDEN:** `subgraph` per doctrine block.
- Approval Gate = dashed `-.->` (`interrupt` / error). Compact color→block→node legend under mermaid.

## CrewAI

Team table only if CrewAI won. No stub heading for the rejected framework.
