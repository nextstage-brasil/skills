#!/usr/bin/env python3
"""Mutation tests: each mutation of a consistent fixture (ledger, run manifest, plan) must flip qa_gate to exit 2."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    ACCEPTANCE_YML,
    PLAN_YML,
    base_ledger,
    base_run,
    clone,
    run_gate,
    write_json,
    write_ledger,
    write_plan_run,
)
from qa_yaml_lite import parse  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)


def tamper_evidence_file(ledger: dict, run_dir: Path) -> None:
    (run_dir / ledger["scenarios"][0]["evidence"][1]["path"]).write_bytes(b"tampered")


def delete_evidence_file(ledger: dict, run_dir: Path) -> None:
    (run_dir / ledger["scenarios"][0]["evidence"][0]["path"]).unlink()


def flip_hash_char(ledger: dict, _run_dir: Path) -> None:
    entry = ledger["scenarios"][0]["evidence"][0]
    entry["sha256"] = ("0" if entry["sha256"][0] != "0" else "1") + entry["sha256"][1:]


def drop_covering_scenario(ledger: dict, _run_dir: Path) -> None:
    ledger["scenarios"] = [item for item in ledger["scenarios"] if "AC-1" not in item["covers"]]


def drop_residual_state(ledger: dict, _run_dir: Path) -> None:
    del ledger["residual_state"]


def orphan_finding(ledger: dict, _run_dir: Path) -> None:
    ledger["findings"][0]["scenario"] = "S-99"


def duplicate_scenario_id(ledger: dict, _run_dir: Path) -> None:
    ledger["scenarios"][1]["id"] = ledger["scenarios"][0]["id"]


LEDGER_MUTATIONS = {
    tamper_evidence_file: "sha256 mismatch for evidence/S-1-01-saved.png",
    delete_evidence_file: "file results/run-1.xml not found",
    flip_hash_char: "sha256 mismatch for results/run-1.xml",
    drop_covering_scenario: "/criteria/AC-1: not covered by any scenario",
    drop_residual_state: "missing required 'residual_state'",
    orphan_finding: "/findings/F-1: references unknown scenario S-99",
    duplicate_scenario_id: "/scenarios: duplicate id S-1",
}

def rename_resource_outside_run(run: dict) -> None:
    run["created_resources"][-1]["id"] = "shared-stack-app-1"


def register_resource_twice(run: dict) -> None:
    run["created_resources"].append(dict(run["created_resources"][0]))


def switch_provider_to_url(run: dict) -> None:
    run["environment"]["provider"] = "url"


def escape_evidence_dir(run: dict) -> None:
    run["created_resources"][0]["id"] = "../" + run["created_resources"][0]["id"]


def inject_shell_into_id(run: dict) -> None:
    run["created_resources"][-1]["id"] += "; rm -rf ~"


def claim_other_run(run: dict) -> None:
    run["created_resources"][-1]["id"] = run["created_resources"][-1]["id"].replace("qa-42-", "qa-142-")


RUN_MUTATIONS = {
    rename_resource_outside_run: "id does not embed run_id",
    register_resource_twice: "/created_resources: duplicate resource evidence_dir:",
    switch_provider_to_url: "provider url has no qa-env script",
    escape_evidence_dir: "/created_resources/0/id: does not match",
    inject_shell_into_id: "/created_resources/5/id: does not match",
    claim_other_run: "id does not embed run_id",
}

PLAN_MUTATIONS = {
    "drop_negative": (
        ACCEPTANCE_YML,
        PLAN_YML.replace("type: negative", "type: regression"),
        "acceptance.criteria.AC-1: critical needs a negative scenario",
    ),
    "drop_waiver_reason": (
        ACCEPTANCE_YML,
        PLAN_YML.replace(', reason: "Save has no business rule beyond required fields"', ""),
        "plan.yml /waivers/0: missing required 'reason'",
    ),
    "orphan_area": (
        ACCEPTANCE_YML,
        PLAN_YML.replace("areas: [IA-2]", "areas: []"),
        "plan.areas.IA-2: indirect area has no scenario",
    ),
    "unknown_ac": (
        ACCEPTANCE_YML,
        PLAN_YML.replace("covers: [AC-2]", "covers: [AC-2, AC-9]"),
        "plan.scenarios.S-4: covers unknown AC-9",
    ),
    "duplicate_ac": (
        ACCEPTANCE_YML.replace("id: AC-2", "id: AC-1"),
        PLAN_YML,
        "acceptance.criteria: duplicate id AC-1",
    ),
}


class _ReasonCase(unittest.TestCase):
    def assertRejected(self, code: int, payload: dict, reason: str):
        self.assertEqual(code, 2, payload)
        self.assertTrue(any(reason in error for error in payload["errors"]), f"{reason!r} not in {payload['errors']}")


class MutateInferredMarker(unittest.TestCase):
    """Dropping or rewording a '# inferred' marker must change the inferred set."""

    def test_marker_mutations(self):
        base = "a:\n  b: x # inferred from config\n"
        self.assertEqual(parse(base).inferred, ["a.b"])
        self.assertEqual(parse(base.replace(" # inferred from config", "")).inferred, [])
        self.assertEqual(parse(base.replace("inferred", "INFERRED")).inferred, ["a.b"])
        mention = parse(base.replace("# inferred from config", "# not inferred"))
        self.assertEqual((mention.inferred, mention.unclear_inferred), (["a.b"], ["a.b"]))


class MutateLedger(_ReasonCase):
    def test_baseline_consistent(self):
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            code, payload = run_gate(["--check-ledger", str(write_ledger(run_dir, base_ledger(run_dir)))])
            self.assertEqual(code, 0, payload)

    def test_each_mutation_rejected(self):
        for mutate, reason in LEDGER_MUTATIONS.items():
            with self.subTest(mutation=mutate.__name__), tempfile.TemporaryDirectory() as tmp:
                run_dir = Path(tmp)
                ledger = clone(base_ledger(run_dir))
                mutate(ledger, run_dir)
                code, payload = run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])
                self.assertRejected(code, payload, reason)


class MutateRun(_ReasonCase):
    def test_baseline_consistent(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, payload = run_gate(["--check-run", str(write_json(Path(tmp) / "run.json", base_run()))])
            self.assertEqual(code, 0, payload)

    def test_each_mutation_rejected(self):
        for mutate, reason in RUN_MUTATIONS.items():
            with self.subTest(mutation=mutate.__name__), tempfile.TemporaryDirectory() as tmp:
                run = clone(base_run())
                mutate(run)
                code, payload = run_gate(["--check-run", str(write_json(Path(tmp) / "run.json", run))])
                self.assertRejected(code, payload, reason)


class MutatePlan(_ReasonCase):
    def test_baseline_consistent(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, payload = run_gate(["--check-plan", str(write_plan_run(Path(tmp)))])
            self.assertEqual(code, 0, payload)

    def test_each_mutation_rejected(self):
        for name, (acceptance, plan, reason) in PLAN_MUTATIONS.items():
            with self.subTest(mutation=name), tempfile.TemporaryDirectory() as tmp:
                self.assertNotEqual((acceptance, plan), (ACCEPTANCE_YML, PLAN_YML), "mutation must change input")
                code, payload = run_gate(["--check-plan", str(write_plan_run(Path(tmp), acceptance, plan))])
                self.assertRejected(code, payload, reason)


if __name__ == "__main__":
    unittest.main()
