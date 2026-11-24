# Q3 Impact mapping

MR diff → direct/indirect areas → regression targets. Output `<run_dir>/impact.md`; areas mirrored into `plan.yml` `areas`.

## Input

`read_merge_request` diffs from intake. No MR → `impact.md` states "no diff"; `areas: []`; plan from ACs only.

## Steps

1. List changed files (path, +/-). Skip lockfiles, generated output, pure test files (note them).
2. **Direct areas:** user/API-visible surfaces the diff changes — route/screen, endpoint, job/command, migration/schema, permission rule, message/copy.
3. **Indirect areas:** one hop out. For each changed shared symbol (component, service, helper, model, column, permission, config key) find consumers via exact-symbol search (import/call/column name). Each consumer surface outside direct set = indirect area.
4. Assign `IA-n` ids; direct first.
5. Link each area to ACs it touches (may be none for indirect).
6. Regression idea per area: smallest scenario proving the surface still works.

Bounded: changed files + one consumer hop. No whole-repo read. Consumer hop explodes (>15 surfaces from one symbol) → group by module, one area per module; note grouping.

## `impact.md`

| Column | Content |
| ------ | ------- |
| Area | `IA-n` |
| Kind | `direct` \| `indirect` |
| Surface | route / screen / endpoint / job |
| Evidence | changed file(s) or consumer file:line |
| ACs | linked `AC-n` or `—` |
| Regression idea | one line |

Plus: changed-files list; skipped files + reason; grouping notes.

## Gate

Every area (direct **and** indirect) → ≥1 scenario in `plan.yml` (`areas: [IA-n]`). Checked by `qa_gate.py --check-plan`. Indirect area scenario = `type: regression` smoke unless an AC scenario already exercises it.
