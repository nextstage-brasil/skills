---
name: ns-mcp-shield
description: >-
  (NS) Secure MCP server design, tool schemas, authn/authz, deployment, and security review —
  OWASP GenAI "Practical Guide for Secure MCP Server Development" (v1.0). Use whenever designing
  an MCP server or tool, writing tool descriptions/schemas, implementing MCP OAuth/OIDC, deploying
  an MCP server, or threat-modeling / reviewing MCP code — even when the user only asks to "add a
  tool", "expose X via MCP", or "wire this MCP". Do NOT use for generic web headers/CSP
  (ns-best-practices) or MR/SOLID review (ns-reviewer).
license: CC-BY-SA-4.0
metadata:
  author: nextstage-brasil
  version: "1.0"
---

# MCP Shield — Secure MCP Server Development

MCP servers bridge AI assistants and external tools/data. They often run with **delegated user permissions**, have **dynamic tool-based architectures**, and let the model **chain tool calls** — so one vulnerability has amplified impact. Apply these controls from architecture through production.

## When to use

| Request | This skill | Use instead |
| ------- | ---------- | ----------- |
| Design / harden an MCP server | Yes | — |
| Add or review MCP tool schemas / descriptions | Yes | — |
| MCP OAuth 2.1 / OIDC / token delegation | Yes | — |
| Security review / threat model of MCP code | Yes | — |
| Generic CSP / security headers / web a11y | No | `ns-best-practices` |
| MR SOLID / maintainability review | No | `ns-reviewer` |
| LangGraph / crew topology ADR | No | `ns-agent-architecture` |

## Workflow

### Designing / building

1. Before writing a tool, answer: what data does it touch, what side effects does it have, who may call it, what is the worst thing a manipulated model could do with it?
2. Read `references/vulnerability-landscape.md` for the risk vocabulary.
3. Apply `references/controls.md` (sections 1–8) to the design or implementation.
4. Finish with `references/minimum-bar.md` — every unmet item is a defect to fix before ship.

### Reviewing

1. Walk `references/minimum-bar.md` item by item.
2. For each failed item report: **risk** (from the landscape), **where** it occurs (`file:line` when possible), and the **concrete control** from `controls.md` that fixes it.
3. An unmet item is a **finding**, not a suggestion.

## Report format (reviews)

```markdown
| Severity | Finding | Location | Risk | Control |
| -------- | ------- | -------- | ---- | ------- |
| Critical | … | `path:line` | Tool poisoning / … | controls §N — … |
```

Severity guide: Critical = remote auth missing, token passthrough, or cross-tenant leak; High = missing schema validation, secrets to LLM, or over-broad tools; Medium = missing quotas/HITL/audit; Low = hardening hygiene.

## References

| File | When to read |
| ---- | ------------ |
| `references/vulnerability-landscape.md` | Naming risks in findings or design notes |
| `references/controls.md` | Implementing or remediating controls 1–8 |
| `references/minimum-bar.md` | Every review and pre-ship gate |

## Attribution

Adapted from *A Practical Guide for Secure MCP Server Development* v1.0 (February 2026), OWASP GenAI Security Project (genai.owasp.org), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Changes: restructured as an agent skill (workflow, progressive disclosure, checklist formatting). Distributed under the same license.
