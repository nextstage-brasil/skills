#!/usr/bin/env python3
"""JSON Schema (2020-12) subset validator for the QA templates. Stdlib only.

Supports exactly the keywords the bundled schemas use. An unknown keyword
raises ``SchemaLiteError`` so a schema edit can never be silently ignored.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_ANNOTATIONS = {"$schema", "$id", "title", "description", "$defs", "default"}
_ASSERTIONS = {
    "$ref",
    "type",
    "const",
    "enum",
    "pattern",
    "minLength",
    "minimum",
    "maximum",
    "minItems",
    "uniqueItems",
    "items",
    "required",
    "properties",
    "additionalProperties",
    "anyOf",
    "allOf",
    "if",
    "then",
    "else",
}
_SUPPORTED = _ANNOTATIONS | _ASSERTIONS


class SchemaLiteError(ValueError):
    """Schema uses a construct this validator does not implement."""


def load_schema(path: Path) -> "SchemaLite":
    return SchemaLite(json.loads(path.read_text(encoding="utf-8")))


def _json_equal(left: object, right: object) -> bool:
    if isinstance(left, bool) or isinstance(right, bool):
        return type(left) is type(right) and left == right
    return left == right


def _type_ok(expected: object, value: object) -> bool:
    if not isinstance(expected, str):
        raise SchemaLiteError(f"unsupported type form {expected!r} (single type name only)")
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    checks = {
        "string": lambda v: isinstance(v, str),
        "boolean": lambda v: isinstance(v, bool),
        "null": lambda v: v is None,
        "object": lambda v: isinstance(v, dict),
        "array": lambda v: isinstance(v, list),
    }
    if expected not in checks:
        raise SchemaLiteError(f"unsupported type '{expected}'")
    return checks[expected](value)


class SchemaLite:
    def __init__(self, schema: dict):
        self.root = schema

    def validate(self, instance: object) -> list[str]:
        errors: list[str] = []
        self._check(self.root, instance, "", errors)
        return errors

    def _is_valid(self, schema: dict, instance: object) -> bool:
        errors: list[str] = []
        self._check(schema, instance, "", errors)
        return not errors

    def _resolve(self, ref: str) -> dict:
        prefix = "#/$defs/"
        if not ref.startswith(prefix):
            raise SchemaLiteError(f"unsupported $ref '{ref}'")
        name = ref[len(prefix) :]
        try:
            return self.root["$defs"][name]
        except KeyError as exc:
            raise SchemaLiteError(f"unknown $ref '{ref}'") from exc

    def _check(self, schema: dict, value: object, ptr: str, errors: list[str]) -> None:
        unknown = set(schema) - _SUPPORTED
        if unknown:
            raise SchemaLiteError(f"unsupported keyword(s) {sorted(unknown)} at '{ptr or '/'}'")
        where = ptr or "/"
        if "$ref" in schema:
            self._check(self._resolve(schema["$ref"]), value, ptr, errors)
        if "type" in schema and not _type_ok(schema["type"], value):
            errors.append(f"{where}: expected {schema['type']}")
            return
        if "const" in schema and not _json_equal(schema["const"], value):
            errors.append(f"{where}: must equal {json.dumps(schema['const'])}")
        if "enum" in schema and not any(_json_equal(option, value) for option in schema["enum"]):
            errors.append(f"{where}: must be one of {json.dumps(schema['enum'])}")
        if isinstance(value, str):
            self._check_string(schema, value, where, errors)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            self._check_number(schema, value, where, errors)
        if isinstance(value, list):
            self._check_array(schema, value, ptr, errors)
        if isinstance(value, dict):
            self._check_object(schema, value, ptr, errors)
        self._check_combinators(schema, value, ptr, errors)

    def _check_string(self, schema: dict, value: str, where: str, errors: list[str]) -> None:
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{where}: shorter than {schema['minLength']}")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{where}: does not match {schema['pattern']}")

    def _check_number(self, schema: dict, value: float, where: str, errors: list[str]) -> None:
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{where}: below minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{where}: above maximum {schema['maximum']}")

    def _check_array(self, schema: dict, value: list, ptr: str, errors: list[str]) -> None:
        where = ptr or "/"
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{where}: needs at least {schema['minItems']} item(s)")
        if schema.get("uniqueItems"):
            seen = [json.dumps(item, sort_keys=True) for item in value]
            if len(seen) != len(set(seen)):
                errors.append(f"{where}: items must be unique")
        if "items" in schema:
            if not isinstance(schema["items"], dict):
                raise SchemaLiteError("only schema-valued 'items' is supported")
            for index, item in enumerate(value):
                self._check(schema["items"], item, f"{ptr}/{index}", errors)

    def _check_object(self, schema: dict, value: dict, ptr: str, errors: list[str]) -> None:
        where = ptr or "/"
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{where}: missing required '{key}'")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in value:
                if key not in properties:
                    errors.append(f"{where}: unknown key '{key}'")
        elif isinstance(schema.get("additionalProperties"), dict):
            raise SchemaLiteError("schema-valued additionalProperties is not supported")
        for key, sub in properties.items():
            if key in value:
                self._check(sub, value[key], f"{ptr}/{key}", errors)

    def _check_combinators(self, schema: dict, value: object, ptr: str, errors: list[str]) -> None:
        where = ptr or "/"
        if "anyOf" in schema and not any(self._is_valid(sub, value) for sub in schema["anyOf"]):
            errors.append(f"{where}: does not match any allowed shape")
        for sub in schema.get("allOf", []):
            self._check(sub, value, ptr, errors)
        if "if" in schema:
            branch = "then" if self._is_valid(schema["if"], value) else "else"
            if branch in schema:
                self._check(schema[branch], value, ptr, errors)
