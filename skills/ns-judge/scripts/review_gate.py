#!/usr/bin/env python3
"""Validate ns-judge findings.json. Gate fail = edit JSON, not product Blocked."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

EVIDENCE_REF = re.compile(r"^\S+:\d+$")
VERDICT_LINE = re.compile(r"^Delivery Review:\s*(Approved|Rejected|Blocked)\s*$", re.MULTILINE)
BLOCKING_SEV = {"P0", "P1"}


def derive_verdict(score: int, findings: list[dict]) -> str:
    has_p0 = any(str(item.get("sev", "")).upper() == "P0" for item in findings)
    if has_p0 or score != 10:
        return "Rejected"
    return "Approved"


def evidence_ok(item: dict) -> bool:
    evidence = item.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        return False
    for entry in evidence:
        if not isinstance(entry, dict):
            return False
        if entry.get("type") != "internal":
            return False
        ref = entry.get("ref", "")
        if not isinstance(ref, str) or not EVIDENCE_REF.match(ref):
            return False
    return True


def validate(payload: dict) -> list[str]:
    errors: list[str] = []
    score = payload.get("score")
    if not isinstance(score, int) or score < 1 or score > 10:
        errors.append("score must be integer 1-10")
        score = 0
    findings = payload.get("findings")
    if not isinstance(findings, list):
        errors.append("findings must be a list")
        findings = []
    for index, item in enumerate(findings):
        if not isinstance(item, dict):
            errors.append(f"findings[{index}] must be object")
            continue
        sev = str(item.get("sev", "")).upper()
        if sev in BLOCKING_SEV and not evidence_ok(item):
            errors.append(
                f"findings[{index}] sev {sev} needs evidence [{{type:internal,ref:path:line}}]"
            )
    claimed = payload.get("verdict")
    derived = derive_verdict(score, findings) if score else "Rejected"
    if claimed not in {"Approved", "Rejected", "Blocked"}:
        errors.append("verdict must be Approved|Rejected|Blocked")
    elif claimed == "Approved" and (score != 10 or any(str(i.get("sev", "")).upper() == "P0" for i in findings)):
        errors.append("Approved requires score == 10 and zero P0")
    elif claimed == "Approved" and derived != "Approved":
        errors.append("verdict Approved does not match derived Rejected")
    report = payload.get("report")
    if isinstance(report, str) and report.strip():
        match = None
        for line in report.strip().splitlines()[::-1]:
            match = VERDICT_LINE.match(line.strip())
            if match:
                break
        if match is None:
            errors.append("report last Delivery Review: line missing")
        elif claimed in {"Approved", "Rejected", "Blocked"} and match.group(1) != claimed:
            errors.append("Delivery Review: line must match verdict")
    return errors


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print("usage: review_gate.py findings.json", file=sys.stderr)
        return 1
    path = Path(args[0])
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"ok": False, "errors": [str(exc)]}))
        return 1
    if not isinstance(payload, dict):
        print(json.dumps({"ok": False, "errors": ["root must be object"]}))
        return 1
    errors = validate(payload)
    print(json.dumps({"ok": not errors, "errors": errors}))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
