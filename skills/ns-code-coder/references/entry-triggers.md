# Entry triggers — priority 5 (default)

Skill: `ns-code-coder`. Host scans after priorities 1–4; also **fallback** when no row matches.

## Use when

- "Fix …" / "fix this bug" / "quick fix" / "hotfix"
- "Implement …" / "just implement" / "add field to …"
- "Change X to Y" (small ad-hoc diff)
- "Make it work" / "resolve this error" (action, not analysis only)
- Stack trace **+** "fix this" / "what's wrong and fix it"
- Concrete coding task without `execution-handoff.md`

## Do not use as entry

- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` (priority 1)
- Feature / version / SDD / multi-day → `ns-spec-driven` (priority 2)
- Autonomous multi-step local plan → `ns-code-autonomous` (priority 3)
- Diagnosis only, no implement words → `ns-code-investigator` (priority 4)
- Version with `execution-handoff.md` → `ns-sdd-execution-handoff-generator` run-implementation

## vs priority 4 (`ns-code-investigator`)

See `../../ns-code-investigator/references/entry-triggers.md`. **Heuristic:** code change requested → this skill; understanding only → investigator.

## Fallback

No qualifier matches → this skill. If scope stays unclear after one question, escalate per SKILL.md stop conditions.
