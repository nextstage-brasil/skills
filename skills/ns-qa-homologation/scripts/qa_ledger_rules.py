#!/usr/bin/env python3
"""qa-ledger.json consistency: schema + cross-checks without execution. Stdlib only.

The ledger is rejected (errors) when it is internally inconsistent. Conditions
that force verdict Blocked but are legal ledger states (no MR, commit mismatch,
unhealthy environment) are reported as ``blocked_reasons``, not errors.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Callable

from qa_common import find_duplicates
from qa_schema_lite import SchemaLite

_FAILURE_STATUSES = {"fail", "blocked", "flaky"}
_PRODUCT_MIN_REPRODUCTIONS = 2
_HASH_CHUNK_BYTES = 1024 * 1024


@dataclass
class LedgerReport:
    errors: list[str] = field(default_factory=list)
    blocked_reasons: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "blocked": bool(self.blocked_reasons),
            "blocked_reasons": self.blocked_reasons,
        }


@dataclass(frozen=True)
class _LedgerContext:
    ledger: dict
    evidence_root: Path

    @property
    def criteria_ids(self) -> list[str]:
        return [item["id"] for item in self.ledger["criteria"]]

    @property
    def scenarios(self) -> list[dict]:
        return self.ledger["scenarios"]


_Check = Callable[[_LedgerContext], list[str]]


def _unique_ids(ctx: _LedgerContext) -> list[str]:
    groups = {
        "criteria": ctx.criteria_ids,
        "scenarios": [item["id"] for item in ctx.scenarios],
        "findings": [item["id"] for item in ctx.ledger["findings"]],
    }
    return [f"/{name}: duplicate id {dup}" for name, ids in groups.items() for dup in find_duplicates(ids)]


def _known_covers(ctx: _LedgerContext) -> list[str]:
    known = set(ctx.criteria_ids)
    return [
        f"/scenarios/{scenario['id']}: covers unknown {ac}"
        for scenario in ctx.scenarios
        for ac in scenario["covers"]
        if ac not in known
    ]


def _every_criterion_covered(ctx: _LedgerContext) -> list[str]:
    covered = {ac for scenario in ctx.scenarios for ac in scenario["covers"]}
    return [f"/criteria/{ac}: not covered by any scenario" for ac in ctx.criteria_ids if ac not in covered]


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(_HASH_CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _evidence_problem(entry: dict, root: Path) -> str | None:
    relative = PurePosixPath(entry["path"])
    if relative.is_absolute() or ".." in relative.parts:
        return f"path {entry['path']} escapes the evidence dir"
    target = root / Path(*relative.parts)
    if not target.is_file():
        return f"file {entry['path']} not found"
    if not target.resolve().is_relative_to(root.resolve()):
        return f"path {entry['path']} resolves outside the evidence dir"
    try:
        digest = _sha256_file(target)
    except OSError as exc:
        return f"file {entry['path']} unreadable: {exc.strerror or exc}"
    if digest != entry["sha256"]:
        return f"sha256 mismatch for {entry['path']}"
    return None


def _evidence_files(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        for entry in scenario["evidence"]:
            problem = _evidence_problem(entry, ctx.evidence_root)
            if problem:
                errors.append(f"/scenarios/{scenario['id']}/evidence: {problem}")
    return errors


def _triage_consistency(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        where = f"/scenarios/{scenario['id']}"
        if scenario["status"] in _FAILURE_STATUSES and scenario["triage"] is None:
            errors.append(f"{where}: status {scenario['status']} requires a triage class")
        if (scenario["status"] == "flaky") != (scenario["triage"] == "FLAKY"):
            errors.append(f"{where}: status flaky and triage FLAKY must go together")
    return errors


def _findings_consistency(ctx: _LedgerContext) -> list[str]:
    scenario_ids = {item["id"] for item in ctx.scenarios}
    findings = ctx.ledger["findings"]
    errors = [
        f"/findings/{finding['id']}: references unknown scenario {finding['scenario']}"
        for finding in findings
        if finding["scenario"] not in scenario_ids
    ]
    for scenario in ctx.scenarios:
        if scenario["triage"] != "PRODUCT":
            continue
        linked = [finding for finding in findings if finding["scenario"] == scenario["id"]]
        if not linked:
            errors.append(f"/scenarios/{scenario['id']}: triage PRODUCT without a finding")
        errors.extend(
            f"/findings/{finding['id']}: PRODUCT finding reproduced {finding['reproduced']} < {_PRODUCT_MIN_REPRODUCTIONS}"
            for finding in linked
            if finding["reproduced"] < _PRODUCT_MIN_REPRODUCTIONS
        )
    return errors


def _judge_rounds_sequence(ctx: _LedgerContext) -> list[str]:
    rounds = ctx.ledger["judge_rounds"]
    errors = []
    for index, item in enumerate(rounds):
        where = f"/judge_rounds/{index}"
        if item["round"] != index + 1:
            errors.append(f"{where}: round must be {index + 1}")
        if index and item["score_before"] != rounds[index - 1]["score_after"]:
            errors.append(f"{where}: score_before must equal previous score_after")
        if item["score_after"] <= item["score_before"] and index != len(rounds) - 1:
            errors.append(f"{where}: a round without score gain must end the cycle")
    return errors


_CROSS_CHECKS: tuple[_Check, ...] = (
    _unique_ids,
    _known_covers,
    _every_criterion_covered,
    _evidence_files,
    _triage_consistency,
    _findings_consistency,
    _judge_rounds_sequence,
)


def _commits_match(left: str, right: str) -> bool:
    """Short and full SHAs match when one is a prefix of the other (schema enforces lowercase hex)."""
    return left.startswith(right) or right.startswith(left)


def _blocked_reasons(ledger: dict) -> list[str]:
    reasons = []
    environment = ledger["environment"]
    merge_request = ledger["mr"]
    if merge_request is None:
        reasons.append("mr is null: deployed commit cannot be verified")
    elif not _commits_match(environment["commit"], merge_request["commit"]):
        reasons.append(
            f"environment.commit {environment['commit']} != mr.commit {merge_request['commit']}"
        )
    if environment["health"] != "ok":
        reasons.append(f"environment.health is {environment['health']}")
    return reasons


def check_ledger(ledger: object, evidence_root: Path, schema: SchemaLite) -> LedgerReport:
    report = LedgerReport(errors=schema.validate(ledger))
    if report.errors:
        return report
    ctx = _LedgerContext(ledger=ledger, evidence_root=evidence_root)
    for check in _CROSS_CHECKS:
        report.errors.extend(check(ctx))
    report.blocked_reasons = _blocked_reasons(ledger)
    return report
