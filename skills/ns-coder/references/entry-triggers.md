# Entry triggers — priority 5 (default)

Skill: `ns-coder`. Host scans after priorities 1–4; also **fallback** when no row matches.

## Use when

- "Fix …" / "fix this bug" / "quick fix" / "hotfix"
- "Implement …" / "just implement" / "add field to …"
- "Change X to Y" (small ad-hoc diff)
- "Make it work" / "resolve this error" (action, not analysis only)
- Stack trace **+** "fix this" / "what's wrong and fix it"
- Concrete coding task without `execution-handoff.md`
- BRD handoff with `diagnosis_complete: true`

## Do not use as entry

- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` (priority 1)
- Feature / version / SDD / multi-day → `ns-spec-driven` (priority 2)
- Autonomous multi-step local plan → `ns-autonomous` (priority 3)
- Product report / screen expected vs actual, no implement words, **no** `diagnosis_complete` → `ns-bug-report-diagnosis` (priority 4a)
- BRD / parent handoff with `diagnosis_complete: true` → **this skill** (implement). Do not redirect to 4a.
- Diagnosis only (stack/CI/log), no implement words → `ns-investigator` (priority 4b)
- Version with `execution-handoff.md` → `references/run-implementation.md` via `ns-spec-driven`

## vs priority 4a / 4b

See `../../ns-bug-report-diagnosis/references/entry-triggers.md` and `../../ns-investigator/references/entry-triggers.md`. **Heuristic:** code change requested → this skill; screen story **without** `diagnosis_complete` → 4a; stack/CI → 4b. Payload `diagnosis_complete: true` = implement intent.

## Fallback

No qualifier matches → this skill. If scope stays unclear after one question, escalate per SKILL.md stop conditions.
