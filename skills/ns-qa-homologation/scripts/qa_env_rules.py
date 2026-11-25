#!/usr/bin/env python3
"""qa-env subcommand output checks (references/qa-env-contract.md). Stdlib only.

Output that breaks the contract is a stall (stop + ask), never an ENV retry:
the agent cannot trust a script that answers in an unexpected shape.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from qa_common import embeds_run_id, find_duplicates
from qa_schema_lite import SchemaLite

_ENVELOPE = {"contract_version", "command", "run_id", "ok", "error"}
_COMMAND_KEYS = {
    "up": {"urls", "commit", "created_resources"},
    "health": {"checks"},
    "seed": {"data"},
    "reset": {"data", "created_resources"},
    "down": {"removed", "failed", "skipped"},
    "info": {"urls", "commit"},
}


@dataclass
class EnvOutputReport:
    errors: list[str] = field(default_factory=list)
    command: str | None = None
    created_resources: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "command": self.command,
            "created_resources": self.created_resources,
        }


def _foreign_keys(output: dict) -> list[str]:
    allowed = _ENVELOPE | _COMMAND_KEYS[output["command"]]
    return [f"/{key}: not allowed for command {output['command']}" for key in sorted(set(output) - allowed)]


def _ok_error_pairing(output: dict) -> list[str]:
    if output["ok"] and output["error"] is not None:
        return ["/error: must be null when ok is true"]
    if not output["ok"] and output["error"] is None:
        return ["/error: required when ok is false"]
    return []


def _command_consistency(output: dict) -> list[str]:
    command = output["command"]
    errors = []
    if command == "health":
        all_ok = bool(output["checks"]) and all(check["ok"] for check in output["checks"])
        if output["ok"] != all_ok:
            errors.append("/ok: health ok must equal every check ok (and at least one check)")
    if command == "down" and output["ok"] and output["failed"] is not None:
        errors.append("/failed: down cannot be ok when a removal failed")
    if command == "info" and output["ok"] and output["commit"] is None:
        errors.append("/commit: info must report the deployed commit")
    if "urls" in output:
        errors.extend(f"/urls: duplicate name {name}" for name in find_duplicates([u["name"] for u in output["urls"]]))
    return errors


def _resource_problems(output: dict) -> list[str]:
    run_id = output["run_id"]
    errors = []
    for key in ("created_resources", "removed", "skipped"):
        items = output.get(key, [])
        pairs = [f"{item['kind']}:{item['id']}" for item in items]
        errors.extend(f"/{key}: duplicate resource {pair}" for pair in find_duplicates(pairs))
        errors.extend(
            f"/{key}/{item['kind']}:{item['id']}: id does not embed run_id {run_id} (not run-owned)"
            for item in items
            if not embeds_run_id(item["id"], run_id)
        )
    return errors


def _data_problems(output: dict) -> list[str]:
    return [
        f"/data/{item['entity']}: ref {item['ref']} does not embed run_id {output['run_id']}"
        for item in output.get("data", [])
        if not embeds_run_id(item["ref"], output["run_id"])
    ]


def check_env_output(output: object, schema: SchemaLite, expected_run_id: str | None = None) -> EnvOutputReport:
    report = EnvOutputReport(errors=schema.validate(output))
    if report.errors:
        return report
    report.command = output["command"]
    if expected_run_id is not None and output["run_id"] != expected_run_id:
        report.errors.append(f"/run_id: {output['run_id']} != expected {expected_run_id}")
    for check in (_foreign_keys, _ok_error_pairing, _command_consistency, _resource_problems, _data_problems):
        report.errors.extend(check(output))
    report.created_resources = output.get("created_resources", [])
    return report
