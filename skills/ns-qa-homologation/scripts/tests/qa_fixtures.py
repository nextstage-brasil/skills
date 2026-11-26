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
CLEANUP_PLAN = SCRIPTS / "qa_cleanup_plan.py"
TRIAGE = SCRIPTS / "qa_triage.py"
JUNIT_TO_LEDGER = SCRIPTS / "junit_to_ledger.py"
EVIDENCE = SCRIPTS / "qa_evidence.py"
ENV_TEMPLATE = SKILL / "templates" / "qa-env.template.sh"
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


def _run_script(script: Path, args: list[str], cwd: Path | None) -> tuple[int, dict]:
    result = subprocess.run(
        [sys.executable, str(script), *args],
        text=True,
        capture_output=True,
        cwd=str(cwd) if cwd else None,
        check=False,
    )
    payload = json.loads(result.stdout) if result.stdout.strip() else {}
    return result.returncode, payload


def run_gate(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(GATE, args, cwd)


def run_cleanup_plan(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(CLEANUP_PLAN, args, cwd)


def run_triage(args: list[str]) -> tuple[int, dict]:
    return _run_script(TRIAGE, args, None)


def run_junit_to_ledger(args: list[str]) -> tuple[int, dict]:
    return _run_script(JUNIT_TO_LEDGER, args, None)


def run_evidence(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(EVIDENCE, args, cwd)


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


def run_attempt(
    outcome: str,
    change: str = "none",
    health: str = "unknown",
    signals: list[str] | None = None,
    suggested_class: str | None = None,
    source: str | None = None,
) -> dict:
    """One ledger history entry (explicit run)."""
    attempt = {
        "outcome": outcome,
        "change": change,
        "health": health,
        "signals": signals or [],
        "suggested_class": suggested_class,
    }
    if source is not None:
        attempt["source"] = source
    return attempt


def base_ledger(run_dir: Path) -> dict:
    """Valid ledger; writes its evidence files under run_dir."""
    files = {
        "results/run-1.xml": b'<testsuite name="records"><testcase name="save stores the record @S-1 @AC-1"/></testsuite>',
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
        "environment": {"commit": "abc1234", "url": "http://localhost:8080", "health": "ok", "resets": 0},
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
                "history": [run_attempt("pass", source="results/run-1.xml")],
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
                "tool": {"name": "playwright-mcp", "missing": ["storage"]},
                "history": [
                    run_attempt("fail", health="ok", suggested_class="PRODUCT"),
                    run_attempt("fail", health="ok", suggested_class="PRODUCT"),
                ],
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


RUN_ID = "42-20261124T1200Z"
RUN_NS = "qa-42-20261124t1200z"


def base_run() -> dict:
    """Valid run.json: script-provider L1 run that passed every gate (Q0-Q7b), one resource of every kind."""
    stamp = "2026-11-24T12:00:00Z"

    def resource(kind: str, rid: str, phase: str, via: str) -> dict:
        return {"kind": kind, "id": rid, "created_at": stamp, "created_by_phase": phase, "via": via}

    return {
        "run_version": 1,
        "run_id": RUN_ID,
        "issue": {"dev": "group/app#42", "qa": "group/qa#7"},
        "level": {"declared": "L2", "effective": "L1", "caps": ["1 inferred field(s) cap autonomy at L1"]},
        "profile_sha256": "a" * 64,
        "environment": {"provider": "script"},
        "phase": "Q7b",
        "phases": [
            {"phase": phase, "state": "passed", "updated_at": stamp}
            for phase in ("Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q7b")
        ],
        "created_resources": [
            resource("evidence_dir", f"docs/qa/{RUN_ID}", "Q0", "agent"),
            resource("worktree", f".worktrees/{RUN_NS}", "Q5", "qa-env"),
            resource("image", f"{RUN_NS}-app:latest", "Q5", "qa-env"),
            resource("volume", f"{RUN_NS}_db", "Q5", "qa-env"),
            resource("database", "qa_42_20261124t1200z", "Q5", "qa-env"),
            resource("container", f"{RUN_NS}-app-1", "Q5", "qa-env"),
        ],
        "checkpoints": [{"window": 1, "at": stamp, "decision": "continue"}],
        "pauses": [
            {"at": stamp, "phase": "Q5", "reason": "checkpoint", "resolved_at": stamp, "answer": "continue"}
        ],
    }


def write_json(path: Path, payload: object) -> Path:
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def env_output(command: str, **payload) -> dict:
    """Valid qa-env stdout for one command; keyword arguments override the payload."""
    defaults = {
        "up": {
            "urls": [{"name": "app", "url": "http://localhost:49153"}],
            "commit": None,
            "created_resources": [{"kind": "container", "id": f"{RUN_NS}-app-1"}],
        },
        "health": {"checks": [{"name": f"{RUN_NS}-app-1", "ok": True, "detail": "healthy"}]},
        "seed": {"data": [{"entity": "user", "ref": f"qa-bot-{RUN_ID}", "data_source": "real"}]},
        "reset": {"data": [], "created_resources": []},
        "down": {"removed": [{"kind": "container", "id": f"{RUN_NS}-app-1"}], "failed": None, "skipped": []},
        "info": {"urls": [{"name": "app", "url": "http://localhost:49153"}], "commit": "abc1234"},
    }
    envelope = {"contract_version": 1, "command": command, "run_id": RUN_ID, "ok": True, "error": None}
    return {**envelope, **defaults[command], **payload}


JUDGE = SCRIPTS / "qa_judge.py"
PUBLISH_PLAN = SCRIPTS / "qa_publish_plan.py"
STAMP = "2026-11-24T12:00:00Z"

PUBLISHABLE_PLAN_YML = """plan_version: 1
areas:
  - { id: IA-1, kind: direct, summary: "Form save handler" }
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
    title: "List shows the saved record"
    covers: [AC-2]
    areas: [IA-1]
    type: positive
    lane: browser
    data: none
    existing: []
    automate: false
waivers: []
"""

# L2+ report.md: results live in the script summary block, so §1 and §8 restate none of them.
L2_REPORT_MD = (
    "# Homologation report — group/app#42\n\n## 1. Summary\n\n- Scenarios planned: 2\n\n"
    "## 3. Acceptance criteria\n\n| AC-1 | Save applies a 50% discount |\n\n"
    "## 8. Homologation score and next steps\n\n- Loop: passed\n"
)


def run_judge(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(JUDGE, args, cwd)


def run_publish(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(PUBLISH_PLAN, args, cwd)


def publishable_ledger(run_dir: Path) -> dict:
    """Ledger that scores 10 and is Homologated: two medium/low criteria, real data, masked screenshots."""
    ledger = base_ledger(run_dir)
    ledger["criteria"] = [
        {"id": "AC-1", "text": "Save stores the record", "source": "issue", "criticality": "medium"},
        {"id": "AC-2", "text": "List shows the record", "source": "issue", "criticality": "low"},
    ]
    second = ledger["scenarios"][1]
    second.update(type="positive", status="pass", attempts=1, triage=None, data_source="real",
                  history=[run_attempt("pass")])
    ledger["findings"] = []
    ledger["judge_rounds"] = []
    ledger["adherence"] = [
        {"scenario": "S-1", "ac": "AC-1", "adherent": True, "reason": "asserts the stored record"},
        {"scenario": "S-2", "ac": "AC-2", "adherent": True, "reason": "screenshot shows the record in the list"},
    ]
    return ledger


def publishable_run_json() -> dict:
    """run.json of an effective L2 run that passed Q0-Q7b (no pause, no publication yet)."""
    phases = ("Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q7b")
    return {
        "run_version": 1,
        "run_id": RUN_ID,
        "issue": {"dev": "group/app#42", "qa": "group/qa#7"},
        "level": {"declared": "L2", "effective": "L2", "caps": []},
        "profile_sha256": "a" * 64,
        "environment": {"provider": "url"},
        "phase": "Q7b",
        "phases": [{"phase": phase, "state": "passed", "updated_at": STAMP} for phase in phases],
        "created_resources": [
            {"kind": "evidence_dir", "id": f"docs/qa/{RUN_ID}", "created_at": STAMP, "created_by_phase": "Q0",
             "via": "agent"},
        ],
        "checkpoints": [],
        "pauses": [],
    }


def write_publishable_run(root: Path, ledger_mutate=None, run_mutate=None,
                          profile_replacements: dict[str, str] | None = None) -> tuple[Path, Path]:
    """Repo + profile (L2) + run dir with ledger, plan, run.json, verdict.json, qa-judgment.json, report.md."""
    replacements = {"autonomy_level: L1  ": "autonomy_level: L2  ", **(profile_replacements or {})}
    profile = write_repo_with_profile(root, filled_profile_text(replacements))
    run_dir = root / "docs" / "qa" / RUN_ID
    run_dir.mkdir(parents=True)
    ledger = publishable_ledger(run_dir)
    if ledger_mutate:
        ledger_mutate(ledger, run_dir)
    write_ledger(run_dir, ledger)
    (run_dir / "plan.yml").write_text(PUBLISHABLE_PLAN_YML, encoding="utf-8")
    run = publishable_run_json()
    run["profile_sha256"] = sha256_bytes(profile.read_bytes())
    if run_mutate:
        run_mutate(run)
    write_json(run_dir / "run.json", run)
    code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile", str(profile)], cwd=root)
    if code != 0:
        raise AssertionError(f"fixture verdict failed: {payload}")
    code, payload = run_judge(["--run-dir", str(run_dir), "--profile", str(profile)], cwd=root)
    if code != 0:
        raise AssertionError(f"fixture judge failed: {payload}")
    (run_dir / "report.md").write_text(L2_REPORT_MD, encoding="utf-8")
    return profile, run_dir


def repin_profile(profile: Path, run_dir: Path) -> None:
    """Tests that edit the profile on purpose re-pin run.json (as a new Q0 would)."""
    path = run_dir / "run.json"
    run = json.loads(path.read_text(encoding="utf-8"))
    run["profile_sha256"] = sha256_bytes(profile.read_bytes())
    write_json(path, run)


AUTOMATION = SCRIPTS / "qa_automation.py"
LINT = SCRIPTS / "lint_e2e_antipatterns.py"
E2E_SPEC = "cypress/e2e/save.cy.ts"
MR_URL = "https://gitlab.example.com/group/e2e/-/merge_requests/5"


def run_automation(args: list[str], cwd: Path | None = None, env: dict | None = None) -> tuple[int, dict]:
    if env is None:
        return _run_script(AUTOMATION, args, cwd)
    import os

    result = subprocess.run([sys.executable, str(AUTOMATION), *args], text=True, capture_output=True,
                            cwd=str(cwd) if cwd else None, check=False, env={**os.environ, **env})
    return result.returncode, json.loads(result.stdout) if result.stdout.strip() else {}


def run_lint(args: list[str], cwd: Path | None = None) -> tuple[int, dict]:
    return _run_script(LINT, args, cwd)


def automation_passed() -> dict:
    """run.json automation of a Q8 that opened its MR (two green runs + approved review on one spec set)."""
    from qa_automation_rules import specs_sha256

    specs = [{"path": E2E_SPEC, "sha256": "c" * 64}]
    digest = specs_sha256(specs)
    runs = [{"source": f"automation/run-{n}.xml", "sha256": str(n) * 64, "specs_sha256": digest, "green": True,
             "outcomes": [{"scenario": "S-1", "outcome": "pass"}], "at": STAMP} for n in (1, 2)]
    review = {"round": 1, "reviewer": "ns-reviewer", "verdict": "Approved", "score": 10, "lint_findings": 0,
              "lint_rules": ["raw-selector", "fixed-wait"], "lint_config_sha256": None, "specs_sha256": digest, "at": STAMP}
    return {"scenarios": ["S-1"], "excluded": [], "skip_reason": None, "branch": "qa/42-save-form", "specs": specs,
            "runs": runs, "reviews": [review], "subject": "cover form save", "commit_specs_sha256": digest,
            "commit": "d" * 40, "pushed": True,
            "mr": {"iid": 5, "url": MR_URL}}


def automation_skipped(reason: str = "no plan scenario marked automate: true") -> dict:
    return {"scenarios": [], "excluded": [], "skip_reason": reason, "branch": None, "specs": [], "runs": [],
            "reviews": [], "subject": None, "commit_specs_sha256": None, "commit": None, "pushed": False, "mr": None}
