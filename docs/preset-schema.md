# Preset schema

Declarative preset format for `@nextstage-brasil/harness` **1.x**. Presets reference **internal monorepo paths**, not `repo#skill` URLs.

## Schema

```json
{
  "name": "spec-driven",
  "requires_harness": ">=1.0.0",
  "description": "Full SDD cycle without external integrations",
  "includes": [
    "skills/code/ns-coder",
    "skills/code/ns-reviewer",
    "skills/code/ns-investigator",
    "skills/code/ns-autonomous",
    "skills/sdd/ns-spec-driven",
    "skills/sdd/ns-living-spec"
  ],
  "warnings": []
}
```

## Fields

| Field | Required | Type | Description |
| ----- | -------- | ---- | ----------- |
| `name` | yes | string | Preset identifier (matches filename without `.json`). |
| `requires_harness` | yes | semver range | Minimum harness version (`>=1.0.0` for this release). |
| `description` | yes | string | Human-readable summary for `harness list --presets`. |
| `extends` | no | string \| string[] | Parent preset(s) to merge before applying `includes`. |
| `includes` | no | string[] | Skill paths relative to repo root (e.g. `skills/code/ns-coder`). |
| `warnings` | no | string[] | Shown after install (e.g. experimental labs skills). |

## Resolution algorithm

1. Load the requested preset JSON.
2. If `extends` is present, load each parent preset recursively (array = merge all parents).
3. Merge all `includes` from parents and the current preset; deduplicate preserving first-seen order.
4. Resolve each path to a skill directory; delegate installation to Skills CLI.
5. For each installed skill with `depends`, warn if a peer is not in the resolved set (manual install workaround until `vercel-labs/skills#861`).

## Aliases

`presets/index.json` maps alias names to the same JSON file:

| Alias | Target |
| ----- | ------ |
| `project-manager` | `presets/project-manager.json` |
| `frontend-prototype` | `presets/frontend.json` |
| `spec-driven-gitlab` | `presets/gitlab.json` |
| `gitlab` | `presets/gitlab.json` |

## Notes

- Presets do **not** list internal SDD phase references (clarify, specify, etc.) — only the face skill `ns-spec-driven`.
- `spec-driven` lists `code/*`, `ns-spec-driven`, and `ns-living-spec`.
- `gitlab` extends `spec-driven` and adds GitLab skills. Alias: `spec-driven-gitlab`.
