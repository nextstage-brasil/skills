#!/usr/bin/env python3
"""Fixture builders shared by test_qa_gate.py and mutate_qa_gate.py."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

TESTS = Path(__file__).resolve().parent
SCRIPTS = TESTS.parent
SKILL = SCRIPTS.parent
GATE = SCRIPTS / "qa_gate.py"
PROFILE_TEMPLATE = SKILL / "templates" / "qa-profile.template.md"
PLACEHOLDER = re.compile(r"<[^<>\n]+>")
RUNNER_PLACEHOLDER = "<cypress | playwright | none>"

sys.path.insert(0, str(SCRIPTS))

SYNC_CONFIG = """# GitLab sync config
```yaml
status_backlog: "Status: Backlog"
status_in_progress: "Status: In progress"
status_ready_for_homologation: "Status: Ready"
status_in_homologation: "Status: In QA"
status_homologated: "Status: Accepted"
status_homologation_rejected: "Status: Rejected"
```
"""


def run_gate(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    result = subprocess.run(
        [sys.executable, str(GATE), *args],
        text=True,
        capture_output=True,
        cwd=str(cwd) if cwd else None,
        check=False,
    )
    payload = json.loads(result.stdout) if result.stdout.strip() else {}
    return result.returncode, payload


def filled_profile_text(replacements: dict[str, str] | None = None) -> str:
    """Template with every placeholder filled; optional raw text replacements after."""
    text = PROFILE_TEMPLATE.read_text(encoding="utf-8").replace(RUNNER_PLACEHOLDER, "playwright")
    counter = iter(range(1, 1000))
    text = PLACEHOLDER.sub(lambda _: f"filled-{next(counter)}", text)
    for old, new in (replacements or {}).items():
        if old not in text:
            raise AssertionError(f"fixture replacement target missing: {old!r}")
        text = text.replace(old, new)
    return text


def write_repo_with_profile(root: Path, profile_text: str, sync_config: bool = True) -> Path:
    context = root / "docs" / "context"
    context.mkdir(parents=True, exist_ok=True)
    if sync_config:
        (context / "gitlab-sync-config.md").write_text(SYNC_CONFIG, encoding="utf-8")
    profile = context / "qa-profile.md"
    profile.write_text(profile_text, encoding="utf-8")
    return profile


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def base_ledger(run_dir: Path) -> dict:
    """Valid ledger; writes its evidence files under run_dir."""
    files = {
        "results/run-1.xml": b"<testsuite tests='1'/>",
        "evidence/S-1-01-saved.png": b"png-bytes-1",
        "evidence/S-2-01-error.png": b"png-bytes-2",
    }
    for relative, content in files.items():
        target = run_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    digest = {relative: sha256_bytes(content) for relative, content in files.items()}
    return {
        "ledger_version": 1,
        "run_id": "42-20261124T1200Z",
        "issue": {"dev": "group/app#42", "qa": "group/qa#7"},
        "mr": {"ref": "group/app!9", "commit": "abc1234def5678"},
        "environment": {"commit": "abc1234", "url": "http://localhost:8080", "health": "ok"},
        "criteria": [
            {"id": "AC-1", "text": "Save stores the record", "source": "issue", "criticality": "critical"},
            {"id": "AC-2", "text": "Invalid input shows an error", "source": "derived", "criticality": "medium"},
        ],
        "scenarios": [
            {
                "id": "S-1",
                "covers": ["AC-1"],
                "type": "positive",
                "lane": "runner",
                "status": "pass",
                "attempts": 1,
                "triage": None,
                "data_source": "real",
                "evidence": [
                    {"kind": "junit", "path": "results/run-1.xml", "sha256": digest["results/run-1.xml"]},
                    {
                        "kind": "screenshot",
                        "path": "evidence/S-1-01-saved.png",
                        "sha256": digest["evidence/S-1-01-saved.png"],
                        "pii_scrubbed": True,
                    },
                ],
            },
            {
                "id": "S-2",
                "covers": ["AC-2"],
                "type": "negative",
                "lane": "browser",
                "status": "fail",
                "attempts": 2,
                "triage": "PRODUCT",
                "data_source": "db_fixture",
                "evidence": [
                    {
                        "kind": "screenshot",
                        "path": "evidence/S-2-01-error.png",
                        "sha256": digest["evidence/S-2-01-error.png"],
                        "pii_scrubbed": True,
                    }
                ],
            },
        ],
        "findings": [
            {"id": "F-1", "scenario": "S-2", "severity": "medium", "class": "delivery_defect", "reproduced": 2}
        ],
        "residual_state": [],
        "judge_rounds": [
            {"round": 1, "score_before": 7.5, "score_after": 8.0, "added": ["S-2"]},
            {"round": 2, "score_before": 8.0, "score_after": 8.0, "added": []},
        ],
    }


def write_ledger(run_dir: Path, ledger: dict) -> Path:
    path = run_dir / "qa-ledger.json"
    path.write_text(json.dumps(ledger), encoding="utf-8")
    return path


ACCEPTANCE_YML = """acceptance_version: 1
issue: group/app#42
criteria:
  - id: AC-1
    text: "Saving a valid form stores the record"
    source: issue
    criticality: critical
    ambiguity: clear
    origin: "issue description"
  - id: AC-2
    text: "Invalid input shows an inline error"
    source: derived
    criticality: medium
    ambiguity: clear
    assumption: "Issue omits validation; derived from the MR diff"
"""

PLAN_YML = """plan_version: 1
areas:
  - { id: IA-1, kind: direct, summary: "Form save handler" }
  - { id: IA-2, kind: indirect, summary: "Record list view" }
scenarios:
  - id: S-1
    title: "Save valid form"
    covers: [AC-1]
    areas: [IA-1]
    type: positive
    lane: runner
    data: "one draft record"
    existing: []
    automate: true
  - id: S-2
    title: "Save rejects missing required field"
    covers: [AC-1]
    areas: [IA-1]
    type: negative
    lane: runner
    data: none
    existing: []
    automate: true
  - id: S-3
    title: "Saved record appears in the list"
    covers: [AC-1]
    areas: [IA-2]
    type: regression
    lane: runner
    data: none
    existing: ["tests-e2e/list.spec.ts (route /records)"]
    automate: false
  - id: S-4
    title: "Inline error on invalid input"
    covers: [AC-2]
    areas: []
    type: positive
    lane: browser
    data: none
    existing: []
    automate: false
waivers:
  - { ac: AC-1, type: business_rule, reason: "Save has no business rule beyond required fields" }
"""


def write_plan_run(run_dir: Path, acceptance: str = ACCEPTANCE_YML, plan: str = PLAN_YML) -> Path:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "acceptance.yml").write_text(acceptance, encoding="utf-8")
    (run_dir / "plan.yml").write_text(plan, encoding="utf-8")
    return run_dir


def clone(data: dict) -> dict:
    return copy.deepcopy(data)
