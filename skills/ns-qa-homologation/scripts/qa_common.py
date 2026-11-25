#!/usr/bin/env python3
"""Helpers shared by the qa_gate rule modules. Stdlib only."""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path, PurePosixPath

# Resource ids are interpolated into commands (docker, git, stack tools): the
# JSON schemas and templates/qa-env.template.sh enforce this same pattern.
RESOURCE_ID_PATTERN = r"^(?!.*\.\.)[A-Za-z0-9.][A-Za-z0-9._/:@+-]*$"
_RUN_ID = re.compile(r"^([0-9]+)-([0-9]{8})T([0-9]{4})Z$")

# Evidence layout (relative to the run dir): JUnit reports under results/, every
# per-scenario capture under evidence/ as S-<n>-<seq>-<slug>.<ext> (qa_evidence.py).
ID_DIGITS = "[0-9]{1,6}"  # S-n / AC-n / F-n / seq: bounded so int() never sees a huge digit run
JUNIT_KIND = "junit"
JUNIT_PATH = re.compile(r"^results/[A-Za-z0-9][A-Za-z0-9._-]*\.xml$")
CAPTURE_PATH = re.compile(rf"^evidence/(S-{ID_DIGITS})-([0-9]{{2,6}})-([a-z0-9]+(?:-[a-z0-9]+)*)\.([a-z0-9]+)$")
_HASH_CHUNK_BYTES = 1024 * 1024
CAPTURE_EXTENSIONS = {
    "screenshot": ("png", "jpg", "jpeg", "webp"),
    "console": ("log", "txt", "json"),
    "network": ("har", "json"),
    "runner_video": ("mp4", "webm"),
}


# Scenario statuses that prove the scenario actually ran (verdict, judge, ledger lane rules).
EXECUTED_STATUSES = ("pass", "fail", "flaky")


class CliError(Exception):
    """Script failure carrying one or more reasons (printed as JSON "errors")."""

    def __init__(self, *errors: str):
        super().__init__("; ".join(errors))
        self.errors = list(errors)


class Rejected(CliError):
    """Input refused by a rule (exit 2)."""


class InvalidInput(CliError):
    """Input cannot be read or evaluated (exit 3)."""


def write_text_atomic(path: Path, text: str) -> None:
    """Temp file in the same dir + os.replace: readers never see a half-written file."""
    handle, temp = tempfile.mkstemp(prefix=f".{path.name}-", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            stream.write(text)
        os.replace(temp, path)
    except BaseException:
        Path(temp).unlink(missing_ok=True)
        raise


def write_json_atomic(path: Path, payload: object) -> None:
    write_text_atomic(path, json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def canonical_sha256(value: object) -> str:
    """Hash of a JSON value independent of key order and whitespace."""
    text = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def round_half_up(value: float, places: int) -> float:
    """Decimal rounding (0.125 -> 0.13), never banker's rounding of binary floats."""
    quantum = Decimal(1).scaleb(-places)
    return float(Decimal(repr(value)).quantize(quantum, rounding=ROUND_HALF_UP))


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def id_key(identifier: str) -> int:
    """Numeric order of S-n / AC-n / F-n ids (digits bounded by ID_DIGITS)."""
    return int(identifier.rsplit("-", 1)[1])


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
    except RecursionError as exc:
        raise ValueError("invalid JSON: nesting too deep") from exc


def evidence_path_problem(kind: str, path: str, scenario_id: str) -> str | None:
    """Why a ledger evidence path breaks the layout for its kind and owning scenario (None = fine)."""
    if kind == JUNIT_KIND:
        return None if JUNIT_PATH.match(path) else f"junit path {path} must be results/<name>.xml"
    match = CAPTURE_PATH.match(path)
    if not match:
        return f"{kind} path {path} must be evidence/S-<n>-<seq>-<slug>.<ext>"
    owner, _seq, _slug, extension = match.groups()
    if owner != scenario_id:
        return f"{kind} path {path} names {owner}, not {scenario_id}"
    if extension not in CAPTURE_EXTENSIONS[kind]:
        return f"{kind} path {path}: extension .{extension} not in {', '.join(CAPTURE_EXTENSIONS[kind])}"
    return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(_HASH_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def evidence_file_problem(root: Path, relative: str, sha256: str) -> str | None:
    """Why a cited evidence file is unusable (None = fine): confined to the run dir, no symlink
    on any path component, regular file, matching sha256 (hashed in 1 MiB chunks)."""
    parts = PurePosixPath(relative)
    if parts.is_absolute() or ".." in parts.parts or "\\" in relative:
        return f"path {relative} escapes the run dir"
    target = root
    for part in parts.parts:
        target = target / part
        if target.is_symlink():
            return f"path {relative} goes through a symlink (refused)"
    if not target.is_file():
        return f"file {relative} not found"
    if not target.resolve().is_relative_to(root.resolve()):
        return f"path {relative} resolves outside the run dir"
    try:
        digest = sha256_file(target)
    except OSError as exc:
        return f"file {relative} unreadable: {exc.strerror or exc}"
    return None if digest == sha256 else f"sha256 mismatch for {relative}"
