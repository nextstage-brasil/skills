#!/usr/bin/env python3
"""Tests for the Q7b homologation judge (qa_judge_rules.py, qa_judge.py) and the ledger
records it consumes (adherence, mock_reason, judge_rounds). Stdlib only.

Dimension tests use the pure judge on hand-built ledgers; loop and round tests go
through the CLI on a run dir that passes the ledger gate. Every rejection asserts
its specific reason.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    PUBLISHABLE_PLAN_YML,
    SKILL,
    base_ledger,
    run_attempt,
    run_gate,
    repin_profile,
    run_judge,
    sha256_bytes,
    write_json,
    write_ledger,
    write_publishable_run,
)
from qa_judge_rules import (  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)
    DATA_REALISM,
    DIMENSIONS,
    SPEC_FIX_CREDIT,
    AdherenceMissing,
    judge,
    loop_state,
)
from qa_policy import QaPolicy  # noqa: E402
from qa_schema_lite import load_schema  # noqa: E402

JUDGMENT_SCHEMA = load_schema(SKILL / "templates" / "qa-judgment.schema.json")
JUDGE_DOC = SKILL / "references" / "homologation-judge.md"


def _scenario(sid: str, covers: list[str], kind: str = "positive", status: str = "pass", **extra) -> dict:
    scenario = {"id": sid, "covers": covers, "type": kind, "lane": "runner", "status": status, "attempts": 1,
                "triage": None, "data_source": "real", "evidence": [], "history": [run_attempt("pass")]}
    scenario.update(extra)
    return scenario


def _ledger(criteria: list[tuple[str, str]], scenarios: list[dict], non_adherent: dict | None = None) -> dict:
    """Pure-judge ledger; adherence true for every executed pair unless listed in non_adherent {(S, AC): reason}."""
    non_adherent = non_adherent or {}
    adherence = [
        {"scenario": item["id"], "ac": ac, "adherent": (item["id"], ac) not in non_adherent,
         "reason": non_adherent.get((item["id"], ac), "shows the behavior")}
        for item in scenarios if item["status"] in ("pass", "fail", "flaky") for ac in item["covers"]
    ]
    return {
        "run_id": "42-20261124T1200Z",
        "criteria": [{"id": ac, "text": ac, "source": "issue", "criticality": level} for ac, level in criteria],
        "scenarios": scenarios,
        "findings": [],
        "judge_rounds": [],
        "adherence": adherence,
    }


def _plan(scenarios: list[dict], areas: dict[str, list[str]] | None = None, waivers: list[dict] | None = None) -> dict:
    """areas: {IA-n: [scenario ids]}; default one direct area linked to every scenario."""
    areas = areas if areas is not None else {"IA-1": [item["id"] for item in scenarios]}
    return {
        "areas": [{"id": area, "kind": "direct", "summary": area} for area in areas],
        "scenarios": [{"id": item["id"], "areas": [a for a, ids in areas.items() if item["id"] in ids]}
                      for item in scenarios],
        "waivers": waivers or [],
    }


def _gaps(result: dict, dimension: str) -> list[tuple]:
    return [(gap["ref"], gap["reason"], gap["actionable"]) for gap in result["missing_for_10"]
            if gap["dimension"] == dimension]


class DimensionTests(unittest.TestCase):
    def _judge(self, ledger, plan=None, blocked=None, policy=None) -> dict:
        result = judge(ledger, plan or _plan(ledger["scenarios"]), blocked or [], policy or QaPolicy())
        self.assertEqual(JUDGMENT_SCHEMA.validate(result), [])
        return result

    def _ratio(self, result: dict, dimension: str) -> float:
        return result["dimensions"][dimension]["ratio"]

    def test_full_score(self):
        result = self._judge(_ledger([("AC-1", "low")], [_scenario("S-1", ["AC-1"])]))
        self.assertEqual((result["score"], result["missing_for_10"], result["actionable_gaps"]), (10.0, [], 0))
        self.assertEqual(result["loop"], {"state": "passed", "reason": "score 10 >= judge.min_score 8.5"})
        self.assertEqual(list(result["dimensions"]), list(DIMENSIONS))

    def test_adherence_missing_raises(self):
        ledger = _ledger([("AC-1", "low")], [_scenario("S-1", ["AC-1"]), _scenario("S-2", ["AC-1"], status="not_run")])
        ledger["adherence"] = []
        with self.assertRaises(AdherenceMissing) as caught:
            judge(ledger, _plan(ledger["scenarios"]), [], QaPolicy())
        self.assertEqual(caught.exception.pairs, ["S-1/AC-1"])

    def test_coverage_weighted_and_gap_classes(self):
        scenarios = [
            _scenario("S-1", ["AC-1"]),
            _scenario("S-2", ["AC-2"]),
            _scenario("S-3", ["AC-3"], status="not_run", not_run_reason="stopped", history=[]),
            _scenario("S-4", ["AC-4"], status="blocked", blocked_reason="no browser tool", triage="ENV", history=[]),
        ]
        ledger = _ledger([("AC-1", "critical"), ("AC-2", "high"), ("AC-3", "medium"), ("AC-4", "low")], scenarios,
                         {("S-2", "AC-2"): "asserts a different screen"})
        result = self._judge(ledger)
        self.assertAlmostEqual(self._ratio(result, "coverage"), 0.4, places=4)  # 4 / (4+3+2+1)
        self.assertEqual(_gaps(result, "coverage"), [
            ("AC-2", "no executed adherent scenario (S-2 not adherent: asserts a different screen)", True),
            ("AC-3", "no executed adherent scenario (S-3 not run)", True),
            ("AC-4", "no executed adherent scenario (S-4 blocked: no browser tool)", False),
        ])

    def test_depth_required_types_waiver_and_blocked(self):
        scenarios = [
            _scenario("S-1", ["AC-1"]),
            _scenario("S-2", ["AC-1"], kind="business_rule", status="blocked", blocked_reason="reseed cap exhausted",
                      triage="DATA", history=[]),
            _scenario("S-3", ["AC-2"], kind="negative"),
        ]
        waivers = [{"ac": "AC-1", "type": "negative", "reason": "no invalid input exists"}]
        result = self._judge(_ledger([("AC-1", "critical"), ("AC-2", "medium")], scenarios),
                             _plan(scenarios, waivers=waivers))
        self.assertAlmostEqual(self._ratio(result, "depth"), (4 / 3) / 6, places=4)
        self.assertEqual(_gaps(result, "depth"), [
            ("AC-1", "negative waived in plan.yml: no invalid input exists", False),
            ("AC-1", "no executed adherent business_rule scenario (S-2 blocked: reseed cap exhausted)", False),
            ("AC-2", "no executed adherent positive scenario", True),
        ])

    def test_impact(self):
        scenarios = [_scenario("S-1", ["AC-1"]),
                     _scenario("S-2", ["AC-1"], status="blocked", blocked_reason="env", triage="ENV", history=[]),
                     _scenario("S-3", ["AC-1"], kind="negative"),
                     _scenario("S-4", ["AC-1"], status="not_run", not_run_reason="stopped", history=[])]
        ledger = _ledger([("AC-1", "low")], scenarios, {("S-3", "AC-1"): "wrong page"})
        plan = _plan(scenarios, {"IA-1": ["S-1"], "IA-2": ["S-2"], "IA-3": ["S-3"], "IA-4": [], "IA-5": ["S-2", "S-4"]})
        result = self._judge(ledger, plan)
        self.assertAlmostEqual(self._ratio(result, "impact"), 0.2, places=4)
        self.assertEqual(_gaps(result, "impact"), [
            ("IA-2", "direct area without an executed adherent scenario", False),
            ("IA-3", "direct area without an executed adherent scenario", True),
            ("IA-4", "direct area without an executed adherent scenario", True),
            ("IA-5", "direct area without an executed adherent scenario", True),
        ])
        no_diff = self._judge(ledger, _plan(scenarios, {}))
        self.assertEqual((self._ratio(no_diff, "impact"), _gaps(no_diff, "impact")), (1.0, []))

    def test_evidence(self):
        def shot(sid: str, scrubbed: bool) -> dict:
            return {"kind": "screenshot", "path": f"evidence/{sid}-01-x.png", "sha256": "a" * 64, "pii_scrubbed": scrubbed}

        scenarios = [
            _scenario("S-1", ["AC-1"], evidence=[shot("S-1", False)]),
            _scenario("S-2", ["AC-1"], lane="browser", tool={"name": "tool-x", "missing": ["console", "storage"]},
                      evidence=[shot("S-2", True)]),
            _scenario("S-3", ["AC-1"], lane="browser", tool={"name": "tool-y", "missing": []},
                      evidence=[shot("S-3", True)]),
        ]
        ledger = _ledger([("AC-1", "low")], scenarios)
        result = self._judge(ledger)
        self.assertAlmostEqual(self._ratio(result, "evidence"), 1 / 3, places=4)
        self.assertEqual(_gaps(result, "evidence"), [
            ("S-1", "evidence/S-1-01-x.png not PII-masked: re-capture with every pii_fields selector", True),
            ("S-2", "browser tool tool-x lacks console", False),
        ])
        no_console = self._judge(ledger, policy=QaPolicy(capture=("screenshot", "network")))
        self.assertEqual([gap[0] for gap in _gaps(no_console, "evidence")], ["S-1"])

    def test_data_realism(self):
        scenarios = [_scenario("S-1", ["AC-1"]),
                     _scenario("S-2", ["AC-1"], data_source="db_fixture"),
                     _scenario("S-3", ["AC-1"], data_source="response_intercept", mock_reason="third-party payment")]
        result = self._judge(_ledger([("AC-1", "low")], scenarios))
        self.assertAlmostEqual(self._ratio(result, "data_realism"), (1 + DATA_REALISM["db_fixture"]) / 3, places=4)
        self.assertEqual(_gaps(result, "data_realism"), [
            ("S-2", "data_source db_fixture: replace with real data", True),
            ("S-3", "data_source response_intercept: third-party payment", False),
        ])

    def test_stability(self):
        fixed = [run_attempt("fail", health="ok", signals=["spec_error"]), run_attempt("pass", change="spec_fix")]
        scenarios = [_scenario("S-1", ["AC-1"], status="flaky", triage="FLAKY"),
                     _scenario("S-2", ["AC-1"], history=fixed, attempts=2, triage="TEST"),
                     _scenario("S-3", ["AC-1"])]
        result = self._judge(_ledger([("AC-1", "low")], scenarios))
        self.assertAlmostEqual(self._ratio(result, "stability"), (0 + SPEC_FIX_CREDIT + 1) / 3, places=4)
        self.assertEqual(_gaps(result, "stability"), [
            ("S-1", "flaky", False), ("S-2", "1 spec fix(es) (TEST) before passing", False)])

    def test_nothing_executed(self):
        for status, actionable in (("not_run", True), ("blocked", False)):
            with self.subTest(status=status):
                extra = {"not_run_reason": "x"} if status == "not_run" else {"blocked_reason": "x", "triage": "ENV"}
                ledger = _ledger([("AC-1", "low")], [_scenario("S-1", ["AC-1"], status=status, history=[], **extra)])
                result = self._judge(ledger)
                for dimension in ("evidence", "data_realism", "stability"):
                    self.assertEqual(self._ratio(result, dimension), 0.0)
                    self.assertEqual(_gaps(result, dimension), [(None, "no executed scenario", actionable)])

    def test_blocked_run_makes_every_gap_not_actionable(self):
        ledger = _ledger([("AC-1", "critical")], [_scenario("S-1", ["AC-1"], data_source="db_fixture")])
        result = self._judge(ledger, blocked=["environment.health is failed"])
        self.assertTrue(result["missing_for_10"])
        self.assertFalse(any(gap["actionable"] for gap in result["missing_for_10"]))
        self.assertEqual((result["actionable_gaps"], result["blocked_reasons"]), (0, ["environment.health is failed"]))
        self.assertEqual(result["loop"]["state"], "ended_below_min")

    def test_score_uses_profile_weights(self):
        ledger = _ledger([("AC-1", "low")], [_scenario("S-1", ["AC-1"], data_source="response_intercept")])
        weights = {"coverage": 5, "depth": 1, "impact": 1, "evidence": 1, "data_realism": 2, "stability": 0}
        result = self._judge(ledger, policy=QaPolicy(judge_weights=weights, min_score=9))
        self.assertEqual((result["score"], result["min_score"]), (8.0, 9))
        self.assertEqual(result["dimensions"]["data_realism"], {"weight": 2, "ratio": 0.0, "points": 0.0})


class ScoreRoundingTests(unittest.TestCase):
    def test_third_decimal_five_rounds_half_up(self):
        ledger = _ledger([("AC-1", "low")], [_scenario("S-1", ["AC-1"])])
        weights = {"coverage": 8.125, "depth": 0, "impact": 0, "evidence": 0, "data_realism": 0, "stability": 0}
        result = judge(ledger, _plan(ledger["scenarios"]), [], QaPolicy(judge_weights=weights))
        self.assertEqual(result["score"], 8.13)  # round() would give 8.12


class LoopStateTests(unittest.TestCase):
    def test_rows(self):
        gain = [{"round": 1, "score_before": 7, "score_after": 8, "added": ["S-2"]}]
        flat = [{"round": 1, "score_before": 8, "score_after": 8, "added": ["S-2"]}]
        cases = [
            ((8.5, 8.5, 3, flat), "passed", "score 8.5 >= judge.min_score 8.5"),
            ((8.49, 8.5, 0, gain), "ended_below_min", "no actionable gap left"),
            ((8.0, 8.5, 2, flat), "ended_below_min", "round 1 raised no score"),
            ((8.0, 8.5, 2, gain), "complement", "2 actionable gap(s): plan only those (Q4-Q7b)"),
            ((8.0, 8.5, 1, []), "complement", "1 actionable gap(s): plan only those (Q4-Q7b)"),
        ]
        for args, state, reason in cases:
            with self.subTest(args=args[:3]):
                self.assertEqual(loop_state(*args), {"state": state, "reason": reason})


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class JudgeCliTests(unittest.TestCase):
    """Complement fixture: AC-1 critical with only a positive scenario + S-2 intercepted data -> 8.43, complement."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

        def complement(ledger, _run_dir):
            ledger["criteria"][0]["criticality"] = "critical"
            ledger["scenarios"][1]["data_source"] = "response_intercept"

        self.profile, self.run_dir = write_publishable_run(self.root, ledger_mutate=complement)
        self.ledger_path = self.run_dir / "qa-ledger.json"

    def tearDown(self):
        self._tmp.cleanup()

    def _judge(self, *extra: str) -> tuple[int, dict]:
        return run_judge(["--run-dir", str(self.run_dir), "--profile", str(self.profile), *extra], cwd=self.root)

    def _add_scenario(self, sid: str, kind: str, data_source: str = "real", adherent: bool = True) -> None:
        """Browser scenario on AC-1 (pass, masked screenshot) in ledger + plan.yml, with its adherence."""
        ledger = _read(self.ledger_path)
        content = f"png-{sid}".encode()
        relative = f"evidence/{sid}-01-shot.png"
        (self.run_dir / relative).write_bytes(content)
        ledger["scenarios"].append({
            "id": sid, "covers": ["AC-1"], "type": kind, "lane": "browser", "status": "pass", "attempts": 1,
            "triage": None, "data_source": data_source, "tool": {"name": "playwright-mcp", "missing": []},
            "history": [run_attempt("pass")],
            "evidence": [{"kind": "screenshot", "path": relative, "sha256": sha256_bytes(content), "pii_scrubbed": True}],
        })
        ledger["adherence"].append({"scenario": sid, "ac": "AC-1", "adherent": adherent, "reason": "checked"})
        write_ledger(self.run_dir, ledger)
        plan = (self.run_dir / "plan.yml").read_text(encoding="utf-8").replace("waivers: []\n", "")
        plan += (f"  - {{ id: {sid}, title: t, covers: [AC-1], areas: [IA-1], type: {kind}, lane: browser, "
                 "data: none, existing: [], automate: false }\nwaivers: []\n")
        (self.run_dir / "plan.yml").write_text(plan, encoding="utf-8")

    def _assert_rejected(self, result: tuple[int, dict], reason: str) -> None:
        code, payload = result
        self.assertEqual(code, 2, payload)
        self.assertTrue(any(reason in error for error in payload["errors"]), f"{reason!r} not in {payload['errors']}")

    def test_first_judgment_written(self):
        code, payload = self._judge()
        self.assertEqual(code, 0, payload)
        stored = _read(self.run_dir / "qa-judgment.json")
        self.assertEqual({key: payload[key] for key in stored}, stored)
        self.assertEqual((stored["score"], stored["loop"]["state"], stored["actionable_gaps"]), (8.43, "complement", 3))

    def test_round_recorded_then_passed(self):
        self._add_scenario("S-3", "negative")
        self._assert_rejected(self._judge(), "ledger changed since the last judgment: record the complement round")
        code, payload = self._judge("--record-round")
        self.assertEqual(code, 0, payload)
        rounds = _read(self.ledger_path)["judge_rounds"]
        self.assertEqual(rounds, [{"round": 1, "score_before": 8.43, "score_after": 9.13, "added": ["S-3"]}])
        self.assertEqual((payload["loop"]["state"], payload["rounds"]), ("passed", 1))
        code, payload = self._judge()  # idempotent re-run
        self.assertEqual(code, 0, payload)
        code, payload = run_gate(["--check-ledger", str(self.ledger_path)])
        self.assertEqual(code, 0, payload)
        self._assert_rejected(self._judge("--record-round"), "previous judgment passed judge.min_score")

    def test_explicit_added_items(self):
        ledger = _read(self.ledger_path)
        ledger["scenarios"][1]["mock_reason"] = "no sandbox"
        write_ledger(self.run_dir, ledger)
        code, payload = self._judge("--record-round", "--added", "S-2 mock_reason recorded")
        self.assertEqual(code, 0, payload)
        self.assertEqual(_read(self.ledger_path)["judge_rounds"][0]["added"], ["S-2 mock_reason recorded"])

    def test_round_refusals(self):
        (self.run_dir / "qa-judgment.json").unlink()
        self._assert_rejected(self._judge("--record-round"),
                              "--record-round needs a previous qa-judgment.json (the first judgment opens the cycle)")
        self.assertEqual(self._judge()[0], 0)
        self._assert_rejected(self._judge("--record-round"), "round changed nothing since the last judgment")
        ledger = _read(self.ledger_path)
        ledger["adherence"][0]["reason"] = "re-checked: asserts the stored record"
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge("--record-round"), "round adds nothing: no new scenario; pass --added")

    def test_no_gain_round_ends_cycle_and_resume_needs_continue(self):
        self.assertEqual(self._judge()[0], 0)
        self._add_scenario("S-3", "negative", data_source="response_intercept", adherent=False)
        code, payload = self._judge("--record-round")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["loop"], {"state": "ended_below_min", "reason": "round 1 raised no score"})
        self._add_scenario("S-4", "negative")
        self._assert_rejected(self._judge("--record-round"),
                              "cycle ended below judge.min_score: a new round needs the human answer 'continue'")
        run = _read(self.run_dir / "run.json")
        write_json(self.run_dir / "run.json", {**run, "phase": "Q9"})
        self._assert_rejected(self._judge("--record-round"), "run.json /phase: Q9 must have state passed in /phases")
        run["pauses"].append({"at": "2026-11-24T15:00Z", "phase": "Q7b", "reason": "below_min_score",
                              "resolved_at": "2026-11-24T15:10Z", "answer": "continue"})
        write_json(self.run_dir / "run.json", run)
        code, payload = self._judge("--record-round")
        self.assertEqual(code, 0, payload)
        second = _read(self.ledger_path)["judge_rounds"][1]
        self.assertEqual((second["round"], second["resume"], second["added"]), (2, True, ["S-4"]))
        code, payload = run_gate(["--check-ledger", str(self.ledger_path)])
        self.assertEqual(code, 0, payload)

    def test_rounds_must_match_judgments(self):
        self.assertEqual(self._judge()[0], 0)
        ledger = _read(self.ledger_path)
        ledger["judge_rounds"] = [{"round": 1, "score_before": 7.0, "score_after": 8.0, "added": ["S-2"]}]
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge(), "judge_rounds changed outside qa_judge.py --record-round")
        self._add_scenario("S-3", "negative")
        self._assert_rejected(self._judge("--record-round"), "judge_rounds changed outside qa_judge.py --record-round")
        (self.run_dir / "qa-judgment.json").unlink()
        self._assert_rejected(self._judge(), "judge_rounds present without a previous qa-judgment.json: "
                                             "rounds are recorded only by --record-round")

    def test_forged_no_gain_round_refused(self):
        judgment = _read(self.run_dir / "qa-judgment.json")
        ledger = _read(self.ledger_path)
        ledger["judge_rounds"] = [{"round": 1, "score_before": judgment["score"], "score_after": judgment["score"],
                                   "added": ["nothing"]}]
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge(), "judge_rounds changed outside qa_judge.py --record-round")

    def test_input_refusals(self):
        ledger = _read(self.ledger_path)
        ledger["adherence"] = ledger["adherence"][:1]
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge(), "adherence decision missing for S-2/AC-2")
        ledger["adherence"].append({"scenario": "S-2", "ac": "AC-1", "adherent": True, "reason": "x"})
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge(), "ledger rejected: /adherence/1: S-2 does not cover AC-1")
        (self.run_dir / "plan.yml").unlink()
        ledger["adherence"].pop()
        write_ledger(self.run_dir, ledger)
        self._assert_rejected(self._judge(), "plan.yml missing but run.json shows Q4 passed")
        run = _read(self.run_dir / "run.json")
        run["phases"] = [item for item in run["phases"] if item["phase"] != "Q4"]
        run["phase"] = "Q7b"
        write_json(self.run_dir / "run.json", run)
        self._assert_rejected(self._judge(), "plan.yml required: the judge reads areas and waivers")

    def test_previous_judgment_checked(self):
        self.assertEqual(self._judge()[0], 0)
        judgment = _read(self.run_dir / "qa-judgment.json")
        write_json(self.run_dir / "qa-judgment.json", {**judgment, "run_id": "7-20261124T1200Z"})
        self._assert_rejected(self._judge(), "qa-judgment.json belongs to run 7-20261124T1200Z")
        write_json(self.run_dir / "qa-judgment.json", {**judgment, "score": 11})
        self._assert_rejected(self._judge(), "qa-judgment.json /score: above maximum 10")
        (self.run_dir / "qa-judgment.json").write_text("{", encoding="utf-8")
        code, payload = self._judge()
        self.assertEqual(code, 3, payload)
        self.assertTrue(payload["errors"][0].startswith("qa-judgment.json: invalid JSON"), payload)

    def test_min_score_from_profile(self):
        profile = self.profile.read_text(encoding="utf-8").replace("min_score: 8.5", "min_score: 8.4")
        self.profile.write_text(profile, encoding="utf-8")
        (self.run_dir / "qa-judgment.json").unlink()
        self._assert_rejected(self._judge(), "profile changed since Q0: sha256 ")
        repin_profile(self.profile, self.run_dir)
        code, payload = self._judge()
        self.assertEqual(code, 0, payload)
        self.assertEqual((payload["min_score"], payload["loop"]["state"]), (8.4, "passed"))

    def test_usage_errors_exit_3(self):
        cases = {
            ("--added", "S-9"): "usage: --added needs --record-round",
            ("--record-round", "--added", " "): "usage: --added item must not be blank",
        }
        for extra, reason in cases.items():
            with self.subTest(extra=extra):
                code, payload = self._judge(*extra)
                self.assertEqual((code, payload["errors"]), (3, [reason]))
        code, payload = run_judge(["--run-dir", str(self.run_dir)])
        self.assertEqual(code, 3, payload)
        self.assertTrue(payload["errors"][0].startswith("usage:"), payload)


class LedgerJudgeRecordTests(unittest.TestCase):
    """--check-ledger rules for the records the judge consumes."""

    def _check(self, mutate) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = base_ledger(run_dir)
            ledger["adherence"] = [{"scenario": "S-1", "ac": "AC-1", "adherent": True, "reason": "ok"}]
            mutate(ledger)
            return run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])

    def test_valid_records(self):
        def valid(ledger):
            ledger["scenarios"][1]["mock_reason"] = "fixture only"
            ledger["judge_rounds"].append({"round": 3, "score_before": 8.0, "score_after": 8.6, "added": ["x"],
                                           "resume": True})

        code, payload = self._check(valid)
        self.assertEqual(code, 0, payload)

    def test_rejections(self):
        def duplicate(ledger):
            ledger["adherence"].append(dict(ledger["adherence"][0]))

        def unknown(ledger):
            ledger["adherence"][0]["scenario"] = "S-9"

        def not_executed(ledger):
            ledger["scenarios"].append({**ledger["scenarios"][0], "id": "S-3", "status": "not_run",
                                        "not_run_reason": "x", "history": [], "attempts": 0, "evidence": []})
            ledger["adherence"].append({"scenario": "S-3", "ac": "AC-1", "adherent": False, "reason": "x"})

        def mock_reason_on_real(ledger):
            ledger["scenarios"][0]["mock_reason"] = "x"

        def resume_not_boolean_true(ledger):
            ledger["judge_rounds"][1]["resume"] = False

        def continue_after_flat_round(ledger):
            ledger["judge_rounds"].append({"round": 3, "score_before": 8.0, "score_after": 8.6, "added": ["x"]})

        cases = {
            duplicate: "/adherence: duplicate decision S-1/AC-1",
            unknown: "/adherence/0: unknown scenario S-9",
            not_executed: "/adherence/1: S-3 is not_run; only executed scenarios are judged",
            mock_reason_on_real: "/scenarios/S-1: mock_reason only with data_source other than real",
            resume_not_boolean_true: "/judge_rounds/1/resume: must equal true",
            continue_after_flat_round: "/judge_rounds/1: a round without score gain must end the cycle "
                                       "(next round needs resume: true)",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._check(mutate)
                self.assertEqual(code, 2, payload)
                self.assertTrue(any(reason in error for error in payload["errors"]), payload["errors"])


class JudgeSyncTests(unittest.TestCase):
    def test_doc_tables_match_code(self):
        text = JUDGE_DOC.read_text(encoding="utf-8")
        for source, value in DATA_REALISM.items():
            self.assertIn(f"`{source}` {value:g}", text)
        self.assertIn(f"passed after ≥1 `spec_fix` run {SPEC_FIX_CREDIT:g}", text)
        for dimension in DIMENSIONS:
            self.assertIn(f"| `{dimension}` |", text)


if __name__ == "__main__":
    unittest.main()
