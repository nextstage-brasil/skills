---
name: ns-judge
description: "(NS) Delivery proof after Code Review: Approved. AC tokens, spec-coverage ledger, ui-contract testid/copy, visual checklist vs repo. Approved only at score 10; score 9 = Rejected. Use at version closure, GitLab issue delivery, or ad-hoc after reviewer Approved — even without naming this skill. Do NOT run before Code Review: Approved. Do NOT replace ns-reviewer SOLID/security. Do NOT write product code."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
  - ns-reviewer
---

# Delivery Judge

Proof that shipped diff matches **input ACs**. Not SOLID. Not security. Code quality already passed `ns-reviewer`.

Shape (not a vendor copy): [the-judge SKILL.md v1.4.0](https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/(quality)/the-judge/SKILL.md). Reimplement here. Do **not** paste that file. No GitHub APPROVE, emoji, banned-word gate, six LLM passes, `post_review.py`.

## When

Parent already holds `Code Review: Approved` from `ns-reviewer` / `reviewer-agent`. Same parent then reads this `SKILL.md` **in-session**. No `judge-agent` in v1. Human `/ns-judge` = session face only.

| Parent | Mode | AC source |
| ------ | ---- | --------- |
| `run-implementation` Step 5 | `closure` | `sdd/requirements.md` |
| `ns-autonomous` standalone close | `closure` | same |
| `ns-coder` ad-hoc / C2 | `adhoc` | `--requirements` / `--ac-file` if present; else skip AC proof |
| `ns-execution-gitlab-issue` Phase 4 | `issue` | `--ac-file` from synthesis (Python never calls GitLab) |

`ns-reviewer` **MUST NOT** dispatch this skill.

No `Code Review: Approved` → **stop**. Do not judge. Tell parent run reviewer first.

## Session boot

See `../../ns-harness/references/session-boot.md`. Cold start this judge run: Session boot 1–6 before probe. Never tool-Read `AGENTS.md`.

## Probe (Python optional)

`command -v python3`. Missing **or** any script exit **1** → preflight **skipped**. Residual LLM still runs. **Never** `Blocked` because Python absent.

Details + CLI: `references/workflow.md`. Token regex lives in `scripts/prove_ac.py` only — not this body.

## Workflow

1. Confirm last code verdict is `Code Review: Approved`. Else stop.
2. Probe Python. If present:
   - `prove_ac.py` for active mode
   - `git diff \| python3 scripts/scan_bypasses.py` (always exit 0)
3. `prove_ac.py` exit **2** → format fix map (`../ns-reviewer/references/review-fix-map.template.md`), last line `Delivery Review: Rejected`. **No** residual LLM.
4. Residual LLM (scripts skipped **or** prove exit 0): leftover that tests did **not** already catch. Do **not** restate phpunit/lint. Naked suppressions from `scan_bypasses.py` = judge in residual. Claim needs evidence (Pass E, stricter: AC tokens).
5. Write `findings.json`. Run `review_gate.py`. Gate fail → edit JSON, re-run. Not product `Blocked`.
6. Last line: `Delivery Review: {Approved|Rejected|Blocked}`. Score in Executive Summary.

## Score gate (same table as ns-reviewer)

Copy. Do not invent second rubric. `Approved` = zero Criticals **and** score **= 10**. Score **9** = `Rejected` (Lift).

| Score | Meaning | Verdict impact |
|-------|---------|----------------|
| **10** | Ship as-is | **`Approved`** (only eligible score) |
| **9** | Near-bar leftover on AC/ledger/ui-contract item | **`Rejected`** — Lift |
| **≤8** | Below bar / missing AC token / unmet ledger | **`Rejected`** |

**`Approved` only when all true:**

1. Zero Critical findings
2. Overall score **= 10**/10
3. Every scored AC token hit in repo (when AC source present)

Missing AC token / unmet ledger / missing testid → Critical **or** cap ≤8 → cannot be 10.

Skip-Python residual: same 10-only rule. LLM still emits score + verdict.

`review_gate.py` rejects JSON that claims `Approved` with score ≠ 10 or with P0 findings.

## Modes

### closure

`prove_ac.py --mode closure [--repo .] [--version VERSION_SAN] [--requirements PATH]`

Law: `#### Acceptance criteria:` checkbox lines. Tokens: backticks, quoted strings, `data-testid`, HTTP `\b[1-5][0-9]{2}\b` (in script). ≥1 token and zero repo hits → P0 Rejected. Zero tokens on a line → unscored (residual). Script does **not** claim the feature works.

Also: ledger missing / unmapped; `ui-contract` testid/copy; visual checklist literals. Same Rejected bar.

### issue

`--mode issue --ac-file PATH`. Synthesis file. No GitLab in Python.

### adhoc

Skip AC proof unless `--requirements` or `--ac-file`. Residual still runs. Parent report may mark AC proof `n/a`.

## Required output

### Approved

### Executive Summary

- Score **10**
- One sentence vs rubric
- Two-line assessment
- AC proof: `pass` \| `n/a` (adhoc, no source)

Then: `Delivery Review: Approved`

### Rejected / Blocked

### Executive Summary

- Score 1–10
- One sentence
- Two-line assessment

### Fix map (agent)

`../ns-reviewer/references/review-fix-map.template.md`

Then: `Delivery Review: Rejected` or `Delivery Review: Blocked`

## Constraints

- **Read-only** on product files
- No dispatch from `ns-reviewer`
- No GitHub review API
- Findings need `evidence: [{type:internal,ref:path:line}]` for P0/P1
- Residual does not restate what tests already catch

## References

| File | When |
| ---- | ---- |
| `references/workflow.md` | Probe, skip, CLI, findings.json |
| `../ns-reviewer/references/review-gate-workflow.md` | Parent sequence (code then judge) |
| `../ns-reviewer/references/review-fix-map.template.md` | Rejected body |
| `scripts/prove_ac.py` | AC / ledger / ui-contract / visual law |
| `scripts/scan_bypasses.py` | Diff stdin candidates |
| `scripts/review_gate.py` | findings.json gate |
