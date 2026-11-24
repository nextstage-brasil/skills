#!/usr/bin/env python3
"""QA profile checks: schema, cross-field rules, effective autonomy. Stdlib only."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

from qa_schema_lite import SchemaLite
from qa_yaml_lite import extract_yaml_block, parse

_LEVELS = ("L0", "L1", "L2", "L3")
_INFERRED_CAP = "L1"
# Highest level whose phases exist in this skill version. Raise when Q5-Q9 land.
IMPLEMENTED_MAX_LEVEL = "L0"
_IMPLEMENTED_REASON = "phases Q5-Q9 not implemented in this skill version: run is plan + local report"
_PLACEHOLDER = re.compile(r"^<[^<>]+>$")
_STATUS_KEY_LINE = re.compile(r"^\s*(status_[a-z0-9_]+)\s*:", re.MULTILINE)
_JUDGE_WEIGHT_TOTAL = 10.0
_WEIGHT_TOLERANCE = 1e-9


@dataclass
class ProfileReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    inferred: list[str] = field(default_factory=list)
    declared_level: str | None = None
    effective_level: str | None = None
    level_caps: list[str] = field(default_factory=list)
    profile_sha256: str | None = None

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "warnings": self.warnings,
            "inferred": self.inferred,
            "autonomy_declared": self.declared_level,
            "autonomy_effective": self.effective_level,
            "autonomy_caps": self.level_caps,
            "profile_sha256": self.profile_sha256,
        }


def _iter_scalars(node: object, path: str = ""):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _iter_scalars(value, f"{path}.{key}" if path else str(key))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from _iter_scalars(value, f"{path}.{index}")
    else:
        yield path, node


def _placeholder_errors(data: dict) -> list[str]:
    return [
        f"{path}: unfilled placeholder {value}"
        for path, value in _iter_scalars(data)
        if isinstance(value, str) and _PLACEHOLDER.match(value)
    ]


def _judge_weight_errors(data: dict) -> list[str]:
    weights = (data.get("judge") or {}).get("weights")
    if not isinstance(weights, dict) or not weights:
        return []
    numbers = [value for value in weights.values() if isinstance(value, (int, float))]
    if len(numbers) != len(weights):
        return []
    total = sum(numbers)
    if abs(total - _JUDGE_WEIGHT_TOTAL) > _WEIGHT_TOLERANCE:
        return [f"judge.weights: must sum to {_JUDGE_WEIGHT_TOTAL:g}, got {total:g}"]
    return []


def _configured_status_keys(data: dict) -> list[tuple[str, str]]:
    tracker = data.get("tracker") or {}
    keys: list[tuple[str, str]] = []
    for section in ("status_sync", "status_result"):
        for name, value in (tracker.get(section) or {}).items():
            if isinstance(value, str):
                keys.append((f"tracker.{section}.{name}", value))
    return keys


def _status_key_warnings(data: dict, repo: Path) -> list[str]:
    """Absent status keys are skipped + logged at run time, never an error."""
    source = (data.get("tracker") or {}).get("status_source")
    if not isinstance(source, str) or _PLACEHOLDER.match(source):
        return []
    path = (repo / source).resolve()
    if not path.is_file():
        return [f"tracker.status_source: {source} not found; every status step will be skipped"]
    try:
        defined = set(_STATUS_KEY_LINE.findall(path.read_text(encoding="utf-8")))
    except (OSError, UnicodeDecodeError) as exc:
        return [f"tracker.status_source: {source} unreadable ({exc}); every status step will be skipped"]
    return [
        f"{where}: key '{key}' absent from {source}; that status step will be skipped"
        for where, key in _configured_status_keys(data)
        if key not in defined
    ]


def _evidence_dir_warnings(data: dict) -> list[str]:
    directory = (data.get("evidence") or {}).get("dir")
    if isinstance(directory, str) and not directory.startswith("docs/qa/"):
        return [f"evidence.dir: {directory} is outside gitignored docs/qa/; evidence may be versioned"]
    return []


def _min_level(*levels: str) -> str:
    return _LEVELS[min(_LEVELS.index(level) for level in levels)]


def _effective_level(declared: str, inferred: list[str]) -> tuple[str, list[str]]:
    caps: list[tuple[str, str]] = [(IMPLEMENTED_MAX_LEVEL, _IMPLEMENTED_REASON)]
    if inferred:
        caps.append((_INFERRED_CAP, f"{len(inferred)} inferred field(s) cap autonomy at {_INFERRED_CAP}"))
    effective = _min_level(declared, *(level for level, _ in caps))
    reasons = [reason for level, reason in caps if _LEVELS.index(level) < _LEVELS.index(declared)]
    return effective, reasons


def check_profile(profile_path: Path, repo: Path, schema: SchemaLite) -> ProfileReport:
    """Raises OSError / YamlLiteError when the profile cannot be read or parsed."""
    raw = profile_path.read_bytes()
    report = ProfileReport(profile_sha256=hashlib.sha256(raw).hexdigest())
    parsed = parse(extract_yaml_block(raw.decode("utf-8")))
    if not isinstance(parsed.data, dict):
        report.errors.append("/: profile YAML block must be a mapping")
        return report
    data = parsed.data
    report.inferred = parsed.inferred
    report.warnings.extend(
        f"{path}: comment mentions 'inferred' but does not start with it; treated as inferred"
        for path in parsed.unclear_inferred
    )
    report.errors.extend(schema.validate(data))
    report.errors.extend(_placeholder_errors(data))
    report.errors.extend(_judge_weight_errors(data))
    report.warnings.extend(_status_key_warnings(data, repo))
    report.warnings.extend(_evidence_dir_warnings(data))
    declared = data.get("autonomy_level")
    if declared in _LEVELS:
        report.declared_level = declared
        if not report.errors:
            report.effective_level, report.level_caps = _effective_level(declared, report.inferred)
    return report
