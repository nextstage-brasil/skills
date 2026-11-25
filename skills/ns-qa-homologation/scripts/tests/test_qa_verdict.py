#!/usr/bin/env python3
"""Tests for the Q7 verdict rubric (qa_verdict_rules.py, qa_gate.py --verdict). Stdlib only.

Every rejection asserts its specific reason; rubric rows are checked with exact
verdicts and reasons so a neighbouring row cannot make a case pass.
"""

from __future__ import annotations

import json
import re
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    RUN_ID,
    SKILL,
    clone,
    filled_profile_text,
    publishable_ledger,
    repin_profile,
    run_gate,
    write_ledger,
    write_publishable_run,
    write_repo_with_profile,
)
from qa_common import round_half_up  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)
from qa_policy import (  # noqa: E402
    BLOCKED_SCENARIO_RATIO,
    CRITICALITY_WEIGHTS,
    JUDGE_MIN_SCORE,
    JUDGE_WEIGHTS,
    MAX_ATTACHMENTS_PER_COMMENT,
    QaPolicy,
)
from qa_schema_lite import load_schema  # noqa: E402
from qa_verdict_rules import AC_STATUS_ORDER, DERIVED_FACTOR, FLAKY_CREDIT, VERDICTS, evaluate  # noqa: E402

VERDICT_SCHEMA = load_schema(SKILL / "templates" / "qa-verdict.schema.json")
RUBRIC_DOC = SKILL / "references" / "verdict-rubric.md"
POLICY_DOC = SKILL / "references" / "profile-schema-policy.md"
REPORT_TEMPLATE = SKILL / "references" / "report.template.md"


def _scenario(sid: str, covers: list[str], status: str = "pass", **extra) -> dict:
    scenario = {"id": sid, "covers": covers, "type": "positive", "lane": "runner", "status": status,
                "attempts": 1, "triage": None, "data_source": "real", "evidence": [], "history": []}
    scenario.update(extra)
    return scenario


def _ledger(criteria: list[tuple[str, str, str]], scenarios: list[dict], findings: list[dict] | None = None) -> dict:
    """Minimal ledger for the pure rubric (consistency is the ledger gate's job)."""
    return {
        "ledger_version": 1,
        "run_id": RUN_ID,
        "issue": {"dev": "group/app#42", "qa": "group/qa#7"},
        "mr": {"ref": "group/app!9", "commit": "abc1234"},
        "environment": {"commit": "abc1234", "url": "http://localhost", "health": "ok", "resets": 0},
        "criteria": [{"id": ac, "text": ac, "source": source, "criticality": level} for ac, level, source in criteria],
        "scenarios": scenarios,
        "findings": findings or [],
        "residual_state": [],
        "judge_rounds": [],
    }


def _finding(fid: str, scenario: str, severity: str, klass: str = "delivery_defect") -> dict:
    return {"id": fid, "scenario": scenario, "severity": severity, "class": klass, "reproduced": 2}


TWO_ACS = [("AC-1", "critical", "issue"), ("AC-2", "medium", "issue")]


def _two(status_1: str = "pass", status_2: str = "pass") -> list[dict]:
    return [_scenario("S-1", ["AC-1"], status_1), _scenario("S-2", ["AC-2"], status_2)]


class RubricTests(unittest.TestCase):
    policy = QaPolicy()

    def _verdict(self, ledger: dict, blocked: list[str] | None = None, policy: QaPolicy | None = None) -> dict:
        result = evaluate(ledger, blocked or [], policy or self.policy)
        self.assertEqual(VERDICT_SCHEMA.validate(result), [])
        return result

    def test_homologated(self):
        result = self._verdict(_ledger(TWO_ACS, _two()))
        self.assertEqual((result["verdict"], result["label_key"], result["confidence"]),
                         ("homologated", "verdict_homologated", 100))
        self.assertEqual(result["reasons"], ["every criterion pass with machine evidence; no finding; no cap"])
        self.assertEqual((result["caps"], result["missing_for_100"], result["mocked"]), ([], [], []))

    def test_ledger_blocked_reasons_win_over_everything(self):
        ledger = _ledger(TWO_ACS, _two("fail"), [_finding("F-1", "S-1", "blocker")])
        result = self._verdict(ledger, ["mr is null: deployed commit cannot be verified"])
        self.assertEqual((result["verdict"], result["reasons"]),
                         ("blocked", ["mr is null: deployed commit cannot be verified"]))
        self.assertEqual(result["missing_for_100"][0],
                         {"ac": None, "scenario": None, "reason": "mr is null: deployed commit cannot be verified"})

    def test_not_homologated_rows(self):
        cases = {
            "critical fail": (_ledger(TWO_ACS, _two("fail")), ["critical AC-1 fail"]),
            "high delivery defect": (
                _ledger(TWO_ACS, _two(), [_finding("F-1", "S-2", "high")]), ["finding F-1 high delivery_defect"]),
            "blocker delivery defect": (
                _ledger(TWO_ACS, _two(), [_finding("F-2", "S-1", "blocker")]), ["finding F-2 blocker delivery_defect"]),
        }
        for name, (ledger, reasons) in cases.items():
            with self.subTest(case=name):
                result = self._verdict(ledger)
                self.assertEqual((result["verdict"], result["reasons"]), ("not_homologated", reasons))

    def test_not_homologated_beats_unbased_critical(self):
        ledger = _ledger([("AC-1", "critical", "issue"), ("AC-2", "critical", "issue")], _two("fail", "blocked"))
        self.assertEqual(self._verdict(ledger)["verdict"], "not_homologated")

    def test_blocked_rows(self):
        passing = [_scenario(f"S-{n}", ["AC-2"]) for n in range(3, 7)]  # 1 blocked of 6: below the ratio
        for status in ("blocked", "not_run"):
            with self.subTest(status=status):
                result = self._verdict(_ledger(TWO_ACS, _two(status) + passing))
                self.assertEqual((result["verdict"], result["reasons"]),
                                 ("blocked", [f"critical AC-1 {status}: no basis to judge"]))

    def test_blocked_ratio_boundary(self):
        acs = [("AC-1", "critical", "issue")] + [(f"AC-{n}", "low", "issue") for n in range(2, 6)]

        def ledger(blocked_count: int, total: int) -> dict:
            scenarios = [_scenario("S-1", ["AC-1"])]
            scenarios += [_scenario(f"S-{n}", [f"AC-{n}"], "blocked" if n - 1 <= blocked_count else "pass")
                          for n in range(2, total + 1)]
            return _ledger(acs[:total], scenarios)

        at_ratio = self._verdict(ledger(1, 5))  # 1/5 = 20%: not above the ratio
        self.assertEqual((at_ratio["verdict"], at_ratio["blocked_scenario_ratio"]), ("with_reservations", 0.2))
        above = self._verdict(ledger(1, 4))  # 1/4 = 25%
        self.assertEqual(above["verdict"], "blocked")
        self.assertEqual(above["reasons"], ["blocked scenarios 25% > verdict.blocked_scenario_ratio 20%"])
        custom = self._verdict(ledger(1, 4), policy=QaPolicy(blocked_scenario_ratio=0.3))
        self.assertEqual(custom["verdict"], "with_reservations")

    def test_reservations(self):
        cases = {
            "medium fail": (_two(status_2="fail"), [], ["medium AC-2 fail"]),
            "medium flaky": (_two(status_2="flaky"), [], ["medium AC-2 flaky"]),
            "medium not run": (_two(status_2="not_run"), [], ["medium AC-2 not_run"]),
            "high blocked": ([_scenario("S-1", ["AC-1"]), _scenario("S-2", ["AC-2"], "blocked")]
                             + [_scenario(f"S-{n}", ["AC-1"]) for n in range(3, 7)], [], "HIGH"),
            "medium finding": (_two(), [_finding("F-1", "S-2", "medium")], ["finding F-1 medium delivery_defect"]),
            "high other class": (_two(), [_finding("F-1", "S-2", "high", "environment")],
                                 ["finding F-1 high environment"]),
        }
        for name, (scenarios, findings, reasons) in cases.items():
            with self.subTest(case=name):
                criteria = TWO_ACS
                if reasons == "HIGH":
                    criteria, reasons = [("AC-1", "critical", "issue"), ("AC-2", "high", "issue")], ["high AC-2 blocked"]
                result = self._verdict(_ledger(criteria, scenarios, findings))
                self.assertEqual((result["verdict"], result["reasons"]), ("with_reservations", reasons))

    def test_caps(self):
        cases = {
            "flaky critical": (_ledger(TWO_ACS, _two("flaky")), QaPolicy(),
                               "critical AC-1 flaky: verdict.flaky_on_critical_cap"),
            "derived critical": (_ledger([("AC-1", "critical", "derived"), ("AC-2", "medium", "issue")], _two()),
                                 QaPolicy(), "critical AC-1 derived (assumption): verdict.derived_critical_cap"),
            "runner none": (_ledger(TWO_ACS, _two()), QaPolicy(runner_none=True),
                            "execution.runner none with critical criteria: policy.runner_none_critical_cap"),
        }
        for name, (ledger, policy, cap) in cases.items():
            with self.subTest(case=name):
                result = self._verdict(ledger, policy=policy)
                self.assertEqual((result["verdict"], result["caps"], result["reasons"]),
                                 ("with_reservations", [cap], [cap]))

    def test_runner_none_without_critical_is_no_cap(self):
        ledger = _ledger([("AC-1", "high", "issue")], [_scenario("S-1", ["AC-1"])])
        self.assertEqual(self._verdict(ledger, policy=QaPolicy(runner_none=True))["verdict"], "homologated")

    def test_caps_listed_even_when_stronger_row_decides(self):
        result = self._verdict(_ledger([("AC-1", "critical", "derived")], [_scenario("S-1", ["AC-1"], "fail")]))
        self.assertEqual(result["verdict"], "not_homologated")
        self.assertEqual(result["caps"], ["critical AC-1 derived (assumption): verdict.derived_critical_cap"])

    def test_worst_status_wins_per_criterion(self):
        for statuses, expected in ((("pass", "flaky"), "flaky"), (("flaky", "not_run"), "not_run"),
                                   (("not_run", "blocked"), "blocked"), (("blocked", "fail"), "fail")):
            with self.subTest(statuses=statuses):
                scenarios = [_scenario("S-1", ["AC-1"], statuses[0]), _scenario("S-2", ["AC-1"], statuses[1])]
                result = self._verdict(_ledger([("AC-1", "low", "issue")], scenarios))
                self.assertEqual(result["criteria"][0]["status"], expected)

    def test_confidence_formula(self):
        criteria = [("AC-1", "critical", "issue"), ("AC-2", "critical", "issue"), ("AC-3", "high", "issue"),
                    ("AC-4", "medium", "issue")]
        scenarios = [_scenario(f"S-{n}", [f"AC-{n}"], "not_run" if n == 4 else "pass") for n in range(1, 5)]
        self.assertEqual(self._verdict(_ledger(criteria, scenarios))["confidence"], 85)  # 11/13
        credit_cases = {("flaky", "issue"): 50, ("pass", "derived"): 50, ("flaky", "derived"): 25, ("fail", "issue"): 0}
        for (status, source), expected in credit_cases.items():
            with self.subTest(status=status, source=source):
                ledger = _ledger([("AC-1", "low", source)], [_scenario("S-1", ["AC-1"], status)])
                self.assertEqual(self._verdict(ledger)["confidence"], expected)

    def test_confidence_uses_profile_weights_and_rounds_half_up(self):
        ledger = _ledger([("AC-1", "critical", "issue"), ("AC-2", "low", "issue")], _two(status_2="fail"))
        weights = {"critical": 7, "high": 3, "medium": 2, "low": 1}
        result = self._verdict(ledger, policy=QaPolicy(criticality_weights=weights))
        self.assertEqual((result["confidence"], result["weights"]), (88, weights))  # 7/8 = 87.5 -> 88

    def test_missing_for_100_and_mocked(self):
        scenarios = [
            _scenario("S-1", ["AC-1"], "pass", data_source="db_fixture", mock_reason="no sandbox for payments"),
            _scenario("S-2", ["AC-2"], "blocked", triage="DATA", blocked_reason="reseed cap exhausted"),
            _scenario("S-3", ["AC-2"], "not_run", not_run_reason="stopped at checkpoint",
                      data_source="response_intercept"),
        ]
        ledger = _ledger([("AC-1", "high", "derived"), ("AC-2", "medium", "issue")], scenarios,
                         [_finding("F-1", "S-2", "low", "copy")])
        result = self._verdict(ledger)
        self.assertEqual(result["missing_for_100"], [
            {"ac": "AC-1", "scenario": None, "reason": "derived criterion (assumption)"},
            {"ac": "AC-2", "scenario": "S-2", "reason": "blocked (triage DATA): reseed cap exhausted"},
            {"ac": "AC-2", "scenario": "S-3", "reason": "not_run: stopped at checkpoint"},
            {"ac": None, "scenario": "S-2", "reason": "finding F-1 low copy"},
        ])
        self.assertEqual(result["mocked"], [
            {"scenario": "S-1", "covers": ["AC-1"], "data_source": "db_fixture", "mock_reason": "no sandbox for payments"},
            {"scenario": "S-3", "covers": ["AC-2"], "data_source": "response_intercept"},
        ])

    def test_mocked_data_never_caps(self):
        scenarios = [_scenario("S-1", ["AC-1"], data_source="response_intercept"),
                     _scenario("S-2", ["AC-2"], data_source="db_fixture")]
        result = self._verdict(_ledger(TWO_ACS, scenarios))
        self.assertEqual((result["verdict"], result["confidence"], len(result["mocked"])), ("homologated", 100, 2))

    def test_flaky_covering_scenario_listed(self):
        scenarios = [_scenario("S-1", ["AC-1"]), _scenario("S-2", ["AC-1"], "flaky", triage="FLAKY")]
        result = self._verdict(_ledger([("AC-1", "low", "issue")], scenarios))
        self.assertEqual(result["missing_for_100"], [{"ac": "AC-1", "scenario": "S-2", "reason": "flaky (triage FLAKY)"}])

    def test_derived_with_zero_credit_not_listed_twice(self):
        ledger = _ledger([("AC-1", "low", "derived")], [_scenario("S-1", ["AC-1"], "fail", triage="PRODUCT")])
        self.assertEqual(self._verdict(ledger)["missing_for_100"],
                         [{"ac": "AC-1", "scenario": "S-1", "reason": "fail (triage PRODUCT)"}])

    def test_fingerprint_ignores_judge_records_only(self):
        ledger = _ledger(TWO_ACS, _two())
        base = self._verdict(ledger)["ledger_fingerprint"]
        judged = clone(ledger)
        judged["adherence"] = [{"scenario": "S-1", "ac": "AC-1", "adherent": True, "reason": "x"}]
        judged["judge_rounds"] = [{"round": 1, "score_before": 1, "score_after": 2, "added": ["S-2"]}]
        self.assertEqual(self._verdict(judged)["ledger_fingerprint"], base)
        changed = clone(ledger)
        changed["environment"]["resets"] = 1
        self.assertNotEqual(self._verdict(changed)["ledger_fingerprint"], base)


class VerdictCliTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_writes_verdict_file_equal_to_stdout(self):
        profile, run_dir = write_publishable_run(self.root)
        code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile", str(profile)],
                                 cwd=self.root)
        self.assertEqual(code, 0, payload)
        stored = json.loads((run_dir / "verdict.json").read_text(encoding="utf-8"))
        self.assertEqual({key: payload[key] for key in stored}, stored)
        self.assertEqual((payload["mode"], payload["verdict"], payload["confidence"]), ("verdict", "homologated", 100))

    def test_profile_required(self):
        code, payload = run_gate(["--verdict", str(self.root / "qa-ledger.json")])
        self.assertEqual(code, 3, payload)
        self.assertEqual(payload["errors"], ["usage: --verdict needs --profile <qa-profile.md>"])

    def test_invalid_profile_exit_3(self):
        profile = write_repo_with_profile(self.root, filled_profile_text({"min_score: 8.5": "min_score: 11"}))
        code, payload = run_gate(["--verdict", str(self.root / "qa-ledger.json"), "--profile", str(profile)],
                                 cwd=self.root)
        self.assertEqual(code, 3, payload)
        self.assertTrue(any("/judge/min_score: above maximum 10" in error for error in payload["errors"]), payload)

    def test_rejected_ledger_writes_nothing(self):
        profile = write_repo_with_profile(self.root, filled_profile_text())
        run_dir = self.root / "run"
        run_dir.mkdir()
        ledger = publishable_ledger(run_dir)
        ledger["scenarios"][0]["evidence"][0]["sha256"] = "0" * 64
        write_ledger(run_dir, ledger)
        code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile", str(profile)],
                                 cwd=self.root)
        self.assertEqual(code, 2, payload)
        self.assertTrue(any(error.startswith("ledger rejected: ") and "sha256 mismatch" in error
                            for error in payload["errors"]), payload)
        self.assertFalse((run_dir / "verdict.json").exists())

    def test_invalid_run_manifest_refused(self):
        profile, run_dir = write_publishable_run(self.root)
        run = json.loads((run_dir / "run.json").read_text(encoding="utf-8"))
        (run_dir / "run.json").write_text(json.dumps({**run, "phase": "Q9"}), encoding="utf-8")
        code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile", str(profile)],
                                 cwd=self.root)
        self.assertEqual(code, 2, payload)
        self.assertEqual(payload["errors"], ["run.json /phase: Q9 must have state passed in /phases"])

    def test_blocked_ledger_gives_blocked_verdict(self):
        def no_mr(ledger, _run_dir):
            ledger["mr"] = None

        profile, run_dir = write_publishable_run(self.root, ledger_mutate=no_mr)
        verdict = json.loads((run_dir / "verdict.json").read_text(encoding="utf-8"))
        self.assertEqual((verdict["verdict"], verdict["reasons"]),
                         ("blocked", ["mr is null: deployed commit cannot be verified"]))

    def test_runner_none_profile_caps(self):
        profile = filled_profile_text().replace("runner: playwright", "runner: none")
        context = self.root / "docs" / "context"
        _profile, run_dir = write_publishable_run(self.root)
        (context / "qa-profile.md").write_text(profile, encoding="utf-8")
        ledger = json.loads((run_dir / "qa-ledger.json").read_text(encoding="utf-8"))
        ledger["criteria"][0]["criticality"] = "critical"
        write_ledger(run_dir, ledger)
        code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile",
                                  str(context / "qa-profile.md")], cwd=self.root)
        self.assertEqual(code, 2, payload)
        self.assertTrue(payload["errors"][0].startswith("profile changed since Q0: sha256 "), payload)
        repin_profile(context / "qa-profile.md", run_dir)
        code, payload = run_gate(["--verdict", str(run_dir / "qa-ledger.json"), "--profile",
                                  str(context / "qa-profile.md")], cwd=self.root)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["caps"], ["execution.runner none with critical criteria: policy.runner_none_critical_cap"])


class VerdictSyncTests(unittest.TestCase):
    """Doc tables, template values and code constants describe the same rubric."""

    def test_credit_table_matches_code(self):
        text = RUBRIC_DOC.read_text(encoding="utf-8")
        self.assertIn(f"| `pass` | 1 |", text)
        self.assertIn(f"| `flaky` | {FLAKY_CREDIT:g} |", text)
        self.assertIn(f"`source: derived` × {DERIVED_FACTOR:g}", text)
        order = " > ".join(f"`{status}`" for status in AC_STATUS_ORDER)
        self.assertIn(order, text)

    def test_verdicts_have_report_labels(self):
        text = REPORT_TEMPLATE.read_text(encoding="utf-8")
        for verdict in VERDICTS:
            self.assertRegex(text, rf"\| `verdict_{verdict}` \| [^|]+ \|")

    def test_profile_defaults_match_template_and_docs(self):
        template = filled_profile_text()
        weights = ", ".join(f"{key}: {value:g}" for key, value in CRITICALITY_WEIGHTS.items())
        self.assertIn(f"criticality_weights: {{ {weights} }}", template)
        self.assertIn(f"blocked_scenario_ratio: {BLOCKED_SCENARIO_RATIO:g}", template)
        judge = ", ".join(f"{key}: {value:g}" for key, value in JUDGE_WEIGHTS.items())
        self.assertIn(f"weights: {{ {judge} }}", template)
        self.assertIn(f"min_score: {JUDGE_MIN_SCORE:g}", template)
        self.assertIn(f"max_per_comment: {MAX_ATTACHMENTS_PER_COMMENT}", template)
        self.assertEqual(sum(JUDGE_WEIGHTS.values()), 10)
        doc = POLICY_DOC.read_text(encoding="utf-8")
        rows = {match.group(1): match.group(2) for match in re.finditer(r"^\| `([a-z_]+)` \| [^|]* \| [^|]+ \| ([^|]+) \|",
                                                                         doc, re.MULTILINE)}
        self.assertEqual(rows["criticality_weights"].strip(), "`" + ", ".join(f"{v:g}" for v in CRITICALITY_WEIGHTS.values()) + "`")
        self.assertEqual(rows["blocked_scenario_ratio"].strip(), f"`{BLOCKED_SCENARIO_RATIO:g}`")
        self.assertEqual(rows["weights"].strip(), "`" + ", ".join(f"{v:g}" for v in JUDGE_WEIGHTS.values()) + "`")
        self.assertEqual(rows["min_score"].strip(), f"`{JUDGE_MIN_SCORE:g}`")

    def test_round_half_up(self):
        self.assertEqual([round_half_up(0.125, 2), round_half_up(2.675, 2), round_half_up(84.5, 0)], [0.13, 2.68, 85.0])


if __name__ == "__main__":
    unittest.main()
