#!/usr/bin/env python3
"""Helpers shared by the qa_gate rule modules. Stdlib only."""

from __future__ import annotations

import json
import re
from pathlib import Path

# Resource ids are interpolated into commands (docker, git, stack tools): the
# JSON schemas and templates/qa-env.template.sh enforce this same pattern.
RESOURCE_ID_PATTERN = r"^(?!.*\.\.)[A-Za-z0-9.][A-Za-z0-9._/:@+-]*$"
_RUN_ID = re.compile(r"^([0-9]+)-([0-9]{8})T([0-9]{4})Z$")


def find_duplicates(ids: list[str]) -> list[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for item in ids:
        (duplicates if item in seen else seen).add(item)
    return sorted(duplicates)


def run_id_regex(run_id: str) -> str:
    """Boundary-aware run-id match (POSIX ERE; same rule as the template's `owned`).

    iid not preceded by a digit, optional [-_.] separator, date, t, time, z,
    not followed by [0-9a-z]; compared on the lower-cased raw id.
    """
    match = _RUN_ID.match(run_id)
    if not match:
        raise ValueError(f"run_id {run_id!r} is not <iid>-<YYYYMMDD>T<HHMM>Z")
    iid, date, time = match.groups()
    return f"(^|[^0-9]){iid}[-_.]?{date}t{time}z([^0-9a-z]|$)"


def embeds_run_id(value: str, run_id: str) -> bool:
    """Run-owned names carry the run id; separators and case vary per tool (qa-42-..., qa_42_...)."""
    return re.search(run_id_regex(run_id), value.lower()) is not None


def load_json(path: Path) -> object:
    """Raises ValueError with a one-line reason when the file is unreadable or not JSON."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(exc.strerror or str(exc)) from exc
    except UnicodeDecodeError as exc:
        raise ValueError(f"not UTF-8: {exc}") from exc
    try:
        return json.loads(text)
    except ValueError as exc:
        raise ValueError(f"invalid JSON: {exc}") from exc
