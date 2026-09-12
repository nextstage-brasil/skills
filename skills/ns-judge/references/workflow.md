# ns-judge workflow (scripts + residual)

Load when running `ns-judge`. Parent already has `Code Review: Approved`. Else stop.

Upstream shape cite (do not paste): https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/(quality)/the-judge/SKILL.md (v1.4.0).

## Probe

```bash
command -v python3
```

Missing → preflight **skipped**. Residual LLM still runs. Not `Blocked`.

Script dir: skill `scripts/` (installed copy under `.agents/skills/ns-judge/scripts/`).

| Script | Command | Exit |
| ------ | ------- | ---- |
| AC law | `python3 scripts/prove_ac.py --mode adhoc\|closure\|issue [--repo .] [--version VERSION_SAN] [--requirements PATH] [--ac-file PATH]` | **0** none missing; **2** Rejected (skip residual LLM); **1** skip scripts, continue LLM |
| Bypasses | `git diff \| python3 scripts/scan_bypasses.py` | **always 0** |
| Output gate | `python3 scripts/review_gate.py findings.json` | **0** JSON ok; **1** edit JSON, not product Blocked |

Any script **1** (except prove **2**) → skip remaining scripts; residual still runs.

`prove_ac.py` **2**: caller formats fix map, `Delivery Review: Rejected`, **no** judge LLM.

## Token law (script only)

Regex **not** in SKILL body. `prove_ac.py` extracts from checkbox lines under `#### Acceptance criteria:` (`- [ ]` / `- [x]`).

Sources:

- **closure** — `docs/versions/{version_san}/sdd/requirements.md`. Parent **MUST** pass `--version` or `--requirements` when more than one `docs/versions/*` exists. Never first-glob.
- **issue** — `--ac-file` (synthesis). Python never calls GitLab
- **adhoc** — skip unless `--requirements` / `--ac-file`

≥1 token, zero hits outside the source file → P0. Zero tokens on a line → unscored for residual. Hits ≠ feature works.

**closure extra (same Rejected bar):**

- `source/` exists, `spec-coverage.md` missing
- mappable ledger row `unmapped`
- `ui-contract.md` testid / copy literals missing in repo
- Layout SSoT `## Quick visual checklist` backtick/quoted/`data-testid` literals missing

## Residual LLM

Runs when prove **0** or scripts skipped.

Judge:

- Naked suppressions from `scan_bypasses.py` (noqa, eslint-disable, `@ts-ignore`, test skip)
- Claim without evidence (AC token still required when source present)
- Leftover not already caught by tests

**Do not** restate phpunit/lint/CI failures.

Skip-Python: still emit score 1–10 + `Delivery Review:` line. `Approved` only at **10** with zero Criticals.

## findings.json

```json
{
  "score": 10,
  "verdict": "Approved",
  "findings": [
    {
      "id": "C1",
      "sev": "P0",
      "issue": "one-line",
      "evidence": [{ "type": "internal", "ref": "path:line" }]
    }
  ],
  "report": "…\nDelivery Review: Approved"
}
```

P0/P1 **need** `evidence` `type:internal` + `ref` matching `path:line`. `Delivery Review:` last line **must** match `verdict`. `Approved` requires `score == 10` and zero P0. Gate fail → edit JSON, re-run `review_gate.py`.

## Parent sequence

SoT: `../../ns-reviewer/references/review-gate-workflow.md`.

Order: tests; then `ns-reviewer`; then `ns-judge` only if `Code Review: Approved`; then `ns-living-spec` only if `Delivery Review: Approved`.

Product files changed after judge Rejected → code review again (must `Approved`) → judge again. Judge never first look at new code.

Max 3 code rounds; max 3 judge rounds after a clean Approved code verdict.
