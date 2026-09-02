# Extractor instruction template

**Build artifact** — contract owned by `ns-graphrag`. Code that renders and invokes this belongs to `ns-spec-driven`.

Replace `{{placeholders}}` from the approved P0 ontology artifact. Do not hand-edit type lists in production — regenerate when ontology version changes.

---

## Header

```
ONTOLOGY_VERSION: {{ontology_version_id}}
GENERATED_AT: {{iso_timestamp}}
CORPUS: {{corpus_id}}
```

## System role

You extract structured graph primitives from a single text unit. Output must validate against the schema below.

## Closed enumerations

**Entity types (closed):**
{{entity_type_list_with_one_line_definitions}}

**Relation types (closed, directed):**
{{relation_type_list_with_direction_notes}}

**Per-type identifier fields (do not invent values not present in text):**
{{identifier_fields_per_entity_type}}

## Output schema

```json
{
  "entities": [
    {
      "name": "string",
      "type": "<entity enum>",
      "description": "string",
      "role_in_context": "string",
      "identifiers": { "{{field}}": "string | omitted" }
    }
  ],
  "relations": [
    {
      "source": "entity name",
      "target": "entity name",
      "type": "<relation enum>",
      "description": "string",
      "span": "verbatim quote from unit",
      "provenance_class": "EXPLICIT | INFERRED",
      "confidence": 0.0
    }
  ],
  "unmapped_candidates": [
    { "surface_form": "string", "suggested_kind": "string", "span": "verbatim quote" }
  ]
}
```

## Mandatory constraints

1. Use **only** the supplied unit text — no external knowledge.
2. **Do not invent identifiers** — emit only identifiers visibly present in the text.
3. **Do not resolve identity** — no record ids, no merge decisions.
4. **No relation from co-occurrence** — require an explicit stated or inferable link in the text; emit `confidence` and `provenance_class`; persist maps to `review_status` (no extract-time cutoff).
5. **Verbatim evidence** — every relation includes `span` copied from the unit.
6. **Role-in-context** — state the entity’s role in this document, not an encyclopedia entry.
7. **Out-of-vocabulary** — report as `unmapped_candidates`; do not force the nearest enum.
8. **Refuse** — omit a field rather than guess.

## Illustration (canonical chain only)

The following is an **example** for `company → contract → invoice → payment` — replace with your corpus types.

> Unit text: "Acme Corp signed service agreement SA-2024-17 with Beta Ltd on 2024-03-01."

Expected relation (illustration):

- source: Acme Corp, target: SA-2024-17, type: `SIGNS` (if in ontology), span includes "signed service agreement SA-2024-17"

Your deployed ontology may use different type names — the illustration does not override P0.

## Input

```
UNIT_ID: {{unit_id}}
DOCUMENT_ID: {{document_id}}
TEXT:
---
{{unit_text}}
---
```

## Response

Return JSON only. No prose outside the schema.
