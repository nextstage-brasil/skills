---
name: ns-harness
description: (NS) Harness discovery, artifact layout, and SDD planning gates for NextStage skills. Installed automatically as a dependency — use when resolving AGENTS.md, .nextstage-harness/rules, docs/versions paths, or confirmation gates. Do NOT use as a standalone feature workflow; pair with domain skills for coding, SDD, or GitLab execution.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.2"
---

# NextStage Harness

Shared reference documents for NextStage skills. Consumer skills point here for path resolution and planning gates — workflow logic stays in those skills.

**Consumer skill convention:** point to `references/harness-discovery.md` and require **Session boot (blocking)** before other steps. Do not duplicate the boot sequence in skill bodies or frontmatter `description`; keep only skill-specific steps after boot (e.g. `git diff`, domain refs).

## References

| File                              | When to read                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `references/harness-discovery.md` | Session boot (blocking), `{product_root}`, rules paths, MCP GitLab pointers |
| `references/rules-sync.md`        | Canonical rules layout, manifest schema, `harness sync`                           |
| `references/artifact-layout.md`   | SDD artifact paths under `docs/versions/`, living specs, handoff rules            |
| `references/gates.md`             | Human confirmation gates before requirements, scope, or task generation           |
| `references/code-skill-routing.md`  | Entry priority and handoffs between `ns-code-*`, `ns-spec-driven`, and GitLab execution skills |
| `references/agent-artifact-compress.md` | **Pre-save** on agent-facing prepare/worker drafts (caveman ultra; not for humans) |

Read only the file(s) the active consumer skill names. Do not assume monorepo layout or stack unless discovery resolves it.
