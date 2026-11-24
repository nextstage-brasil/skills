<!-- Canonical snippet for installed skills. Keep in sync with packages/harness/templates/snippets/acceptance-tier.md -->
## Acceptance tier

Named, narrow exception to **Docker and testing** + **Test tiers**. Tier = agent-run E2E/acceptance tests inside a **homologation run** the human explicitly invoked (`ns-qa-homologation`). Trigger defines tier — not test type or environment. E2E runs the user explicitly requests under other skills keep their existing rules.

- **Scope:** homologation run only, within `autonomy_level` declared in project QA profile (`docs/context/qa-profile.md`). Profile absent or invalid → no run.
- **Authorization:** human's explicit invocation of a homologation run = "human asks in this run" — for live tier and for `AGENTS.md` hard stop on mutating GitLab state. Scope = what QA profile + autonomy level permit; nothing wider.
- **Docker exception:** inside that run, agent **MAY** create, restart, remove **only** resources it registered in its own run manifest (`run.json`) at creation time. Unregistered resources (shared/daily stack, base images, other runs' containers, volumes, worktrees) — **MUST NOT** touch; ask per Docker rule.
- **Host runner:** inside that run, agent **MAY** run project E2E runner on host. Test-container rule unchanged for every other suite.
- **Default tier unchanged:** acceptance tier never joins default test command, default CI, or `ns-coder` / `ns-backend-tests` run loop.
