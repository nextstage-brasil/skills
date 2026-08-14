# business/

Single catalog skill: `ns-project-manager` (face). Commercial budget, delivery schedule, and requirements enricher live under `references/ns-*/` with their own `SKILL.md` + `references/` (no evals).

```bash
npx @nextstage-brasil/harness --preset project-manager --yes
```

Standalone Claude (no harness):

```bash
node packages/harness/scripts/build-external.mjs --preset project-manager
```

Output: `dist/external/ns-project-manager/` and `dist/external/ns-project-manager.zip`.
