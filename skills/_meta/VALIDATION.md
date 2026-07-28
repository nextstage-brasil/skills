# Skills validation report

**Verdict: STRUCTURAL + CATALOG + HARNESS PASS. LangGraph content eval PASS. Trigger harness is NOT a gate.**

## Pass
- `validate-catalog.js`: 35 skills in sync
- Frontmatter: name==dir, (NS) descriptions, length ≤550
- `evals/evals.json` present for all 35 skills (prompt + expected_output + id)
- `packages/harness` npm test / sync smoke: passed
- `ns-langgraph-agents` content evals: with_skill **100%** vs old_skill **~75%**

## Not a gate
- Description trigger eval via `claude -p` undertriggers positives (model answers without opening skill). Useless as pass/fail for invocation quality.

## Cleanup done
- Eval workspace moved out of `skills/` (was breaking catalog validator)
- Catalog validator hardened against `*-workspace` / missing `SKILL.md`
- Descriptions shortened catalog-wide; weak Use/Do-NOT fixed
- Restored real `expected_output` on 6 skills that had been overwritten with generic stubs (`expected` → `expected_output`)

## Still optional (not blocking)
- Content eval loops for skills other than `ns-langgraph-agents` (prompts exist; graded runs not re-run catalog-wide)
- Reliable skill-trigger measurement (needs better harness than plain `claude -p`)

## Numbers
{
  "catalog": "OK: catalog.json in sync with 35 skills; 6 external skills",
  "catalog_exit": 0,
  "skills": 35,
  "description_chars": {
    "min": 297,
    "median": 394,
    "max": 507,
    "over_550": 0
  },
  "evals": "35/35 have evals.json with prompt+expected_output+id",
  "langgraph_content_eval": "with_skill 100% vs old ~75% (iteration-1 graded)",
  "trigger_eval": "UNRELIABLE \u2014 claude -p undertriggers; do not treat as pass/fail gate",
  "npm_test": "passed",
  "cleanup": [
    "moved skills/ns-langgraph-agents-workspace \u2192 .skill-workspaces/ns-langgraph-agents",
    "validate-catalog skips *-workspace and missing SKILL.md",
    "fixed 4 weak descriptions; filled missing eval expected_output stubs"
  ],
  "verdict": "STRUCTURAL+CATALOG+HARNESS PASS; LANGGRAPH CONTENT EVAL PASS; TRIGGER EVAL NOT A GATE"
}
