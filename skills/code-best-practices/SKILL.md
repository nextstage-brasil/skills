---
name: code-best-practices
description: (NS) Security, compatibility, and modern web quality pass — headers, CSP, dependencies, accessibility baselines, and pragmatic modernization. Use when the user asks to harden security, fix CSP/CORS/headers, improve compatibility, or modernize stack quality — even without saying "best practices". Orthogonal to code-reviewer SOLID/MR gate. Do NOT use for full MR review (use code-reviewer) or feature implementation (use code-coder / nextstage-sdd).
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - nextstage-harness
---

# Best Practices

Focused **quality and security hygiene** pass — not a substitute for senior code review.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`. Read `architecture-rules.md` and security-related harness rules.

## When to use

| Request | This skill | Use instead |
| ------- | ---------- | ----------- |
| Security headers / CSP / HSTS | Yes | — |
| Dependency audit / known CVE sweep | Yes | — |
| Browser compatibility baseline | Yes | — |
| Accessibility quick pass (landmarks, alt, labels) | Yes | — |
| "Review this MR" / SOLID deep dive | No | `code-reviewer` |
| New feature implementation | No | `code-coder` / `nextstage-sdd` |

## Workflow

1. **Scope** — web app surface, API gateway, or static assets; confirm `{product_root}`.
2. **Baseline** — read `references/checklist.md`; tick only applicable sections.
3. **Scan** — configs (nginx, Vite, Next, Laravel middleware, etc.) without assuming stack.
4. **Report** — findings table: severity, location, recommendation, effort.
5. **Fix** — minimal safe diffs when user asked to implement; otherwise report only.

## Overlap with code-reviewer

- **This skill:** cross-cutting hygiene (headers, deps, compat checklist).
- **code-reviewer:** change-specific SOLID, tests, maintainability on a diff.

A delivery may use both sequentially — face skill routes explicitly.

## Forbidden

- Declaring production secure without evidence
- Breaking existing integrations without calling out risk
- Replacing threat modeling for high-risk domains (escalate to human)
