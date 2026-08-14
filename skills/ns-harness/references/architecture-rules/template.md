<!-- harness-rule: body only — edit cursor.alwaysApply and cursor.description in .nextstage-harness/manifest.json; run harness sync after. Do not put YAML apply metadata in this file. -->

# Architecture Rules — {project_name}

Technical constitution for AI agents. Business behavior lives in `{specs_or_docs_path}`.

## Scope

- Work inside the repo unless the user expands scope.
- Agent harness: obey `AGENTS.md` (already in context); skills in `{skills_path}`; canonical rules in `.nextstage-harness/rules/`.

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

Project-specific only — universal agent rules live in `AGENTS.md` (Docker and testing).

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
