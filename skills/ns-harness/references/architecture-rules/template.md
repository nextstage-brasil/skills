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
| Live (on demand) | {live_path_or_marker} | `{live_command}` |

## Domain invariants

Non-negotiable rules. Each row: invariant + protected test path that guards it.

| Invariant | Protected test |
| --------- | -------------- |
| {invariant} | `{test_path}` |

## Implementation discipline

{only_rules_found_in_repo — minimal diff, languages, completion style, git constraints}

**Ask before:** new dependency; abstraction without 2 concrete uses; DB schema or shared contract change; CI/deploy/infra config; moving files across packages.

**Never:** secrets/keys/connection strings in versioned files; default-tier tests depending on network/live services/real LLM; weakening/deleting/skipping a test to make it pass; type escape hatch without justifying comment.

## Key references

| Topic | File |
| ----- | ---- |
| {topic} | `{path}` |
