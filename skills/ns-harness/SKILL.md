---
name: ns-harness
description: "(NS) NextStage harness face — session boot, artifact layout, AND brownfield prepare. Use whenever the user says /ns-harness, prepare this repo, harness prepare, generate architecture rules, architecture-rules.md, write AGENTS.md, reverse-engineer the codebase, engenharia reversa, brownfield map, or bootstrap brownfield — even if they name ns-harness-prepare, ns-architecture-rules, ns-agent-generator, ns-codebase-reverse-spec, or ns-bootstrap-brownfield. Route to references/prepare.md (full chain) or the matching worker reference. Do NOT use for coding, SDD versions, or GitLab issue execution."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.5"
---

# NextStage Harness

Project harness face. Other catalog skills point here for **session boot** + artifact paths. Also runs brownfield onboarding via local references — no separate prepare/architecture/agents/reverse/brownfield skills.

**Consumer skill convention:** point to `references/session-boot.md`; require **Session boot (blocking)** before other steps. Do not duplicate boot sequence in skill bodies or frontmatter `description`.

## Dispatch (this skill as face)

**Session boot** (`references/session-boot.md`) first — pick **one** row. First matching signal wins.

| Signal | Reference |
| ------ | --------- |
| Prepare this repo / harness prepare / onboard brownfield / full prepare / stale context after refactor | `references/prepare.md` (four workers in order) |
| Architecture rules / constitution / "how this repo works for the AI" / `.nextstage-harness/rules/architecture-rules.md` | `references/architecture-rules-generator.md` |
| Write/refresh `AGENTS.md` / `CLAUDE.md` / agent entry | `references/agents-md.md` |
| Reverse-engineer / engenharia reversa / business rules from code | `references/codebase-reverse-spec.md` |
| Brownfield map / analyze existing project (map only) | `references/bootstrap-brownfield.md` |
| `/ns-harness` with no qualifier | Show this table; ask once if intent unclear |

Bare `/ns-harness prepare this repo` **is** full `prepare.md`. Do **not** send user to retired slash names.

Read chosen reference **in full**; follow it. Do not improvise parallel workflow.

## Shared references (other skills)

| File | When to read |
| ---- | ------------ |
| `references/session-boot.md` | Session boot (blocking), rules paths, MCP GitLab pointers |
| `references/rules-sync.md` | Canonical rules layout, manifest schema, `harness sync` |
| `references/artifact-layout.md` | SDD artifact paths under `docs/versions/`, living specs, handoff rules |
| `references/code-skill-routing.md` | Entry priority + handoffs between implementation skills |
| `references/subagent-dispatch.md` | **MUST** dispatch harness `*-agent` bridges when available |
| `references/agent-artifact-compress.md` | **Pre-save** on agent-facing drafts only (caveman ultra; never chat) |
| `references/project-skill-authoring.md` | Author project-local skills — requires Anthropics `skill-creator` + `harness sync` |

Read only file(s) the active workflow names. Do not assume stack unless detected in rules or context.
