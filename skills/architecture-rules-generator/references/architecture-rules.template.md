# Architecture Rules — {project_name}

Technical constitution for AI agents. Business behavior lives in `{specs_or_docs_path}`.

## Scope

- **Product root** = `{product_root}` ({standalone | monorepo path}).
- Work inside this scope unless the user expands it.
- Agent harness: read `AGENTS.md` first; skills in `{skills_path}`; canonical rules in `.nextstage-harness/rules/`.

## Stack

| Layer | Technology |
| ----- | ---------- |
| {layer} | {technology} |

{optional_local_urls_block}

## Repository layout

```
{abbreviated_tree}
```

{optional_module_table}

## Architecture

{pattern_bullets — entry points, API conventions, module boundaries, auth, multitenancy}

### Generated / do not edit

{forbidden_paths_and_why}

## Development and testing

{docker_table_or_commands}

| Suite | Location | Run |
| ----- | -------- | --- |
| {suite} | {path} | `{command}` |

## Implementation discipline

{only_rules_found_in_repo — minimal diff, languages, completion style, git constraints}

## Key references

| Topic | File |
| ----- | ---- |
| {topic} | `{path}` |
