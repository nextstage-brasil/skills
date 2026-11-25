#!/usr/bin/env python3
"""Tests for Q9 approval + publication (qa_publish_rules.py, qa_publish_plan.py) and the
run.json publication rules (--check-run). Stdlib only; posts nothing.

Every refusal asserts its specific reason.
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    RUN_ID,
    SKILL,
    base_run,
    clone,
    L2_REPORT_MD,
    run_cleanup_plan,
    run_gate,
    run_judge,
    run_publish,
    sha256_bytes,
    write_json,
    write_ledger,
    write_publishable_run,
)
from qa_publish_rules import (  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)
    PreviewFormatError,
    PublicationPlan,
    StatusChange,
    Summary,
    Target,
    comment_bodies,
    marker,
    parse_preview,
    render_preview,
)

PUBLICATION_DOC = SKILL / "references" / "publication.md"


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


class PublishFlowTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def _setup(self, **kwargs) -> None:
        self.profile, self.run_dir = write_publishable_run(self.root, **kwargs)

    def _publish(self, command: str, *extra: str) -> tuple[int, dict]:
        return run_publish([command, "--run-dir", str(self.run_dir), "--profile", str(self.profile), *extra],
                           cwd=self.root)

    def _ok(self, command: str, *extra: str) -> dict:
        code, payload = self._publish(command, *extra)
        self.assertEqual(code, 0, payload)
        return payload

    def _refused(self, result: tuple[int, dict], reason: str) -> None:
        code, payload = result
        self.assertEqual(code, 2, payload)
        self.assertTrue(any(reason in error for error in payload["errors"]), f"{reason!r} not in {payload['errors']}")

    def _run(self) -> dict:
        return _read(self.run_dir / "run.json")

    def _save_run(self, run: dict) -> None:
        write_json(self.run_dir / "run.json", run)

    def _rejudge(self) -> None:
        """Fixture edited before any complement: start the judgment over."""
        (self.run_dir / "qa-judgment.json").unlink()
        code, payload = run_gate(["--verdict", str(self.run_dir / "qa-ledger.json"), "--profile", str(self.profile)],
                                 cwd=self.root)
        self.assertEqual(code, 0, payload)
        code, payload = run_judge(["--run-dir", str(self.run_dir), "--profile", str(self.profile)], cwd=self.root)
        self.assertEqual(code, 0, payload)

    def _approve(self) -> None:
        self._ok("preview")
        self._ok("approval", "--answer", "approve")

    def test_full_flow(self):
        self._setup()
        preview = self._ok("preview")
        run = self._run()
        self.assertEqual(run["pauses"][-1]["reason"], "preview_approval")
        self.assertIsNone(run["pauses"][-1]["answer"])
        self.assertEqual(preview["preview_sha256"], sha256_bytes((self.run_dir / "preview.md").read_bytes()))
        code, payload = run_cleanup_plan(["--run", str(self.run_dir / "run.json"), "--outcome", "paused"])
        self.assertEqual((code, payload["steps"]), (0, []))
        self._ok("approval", "--answer", "approve")
        run = self._run()
        self.assertEqual(run["publication"]["approvals"][0]["answer"], "approve")
        self.assertEqual(run["publication"]["approvals"][0]["preview_sha256"], preview["preview_sha256"])
        payload = self._ok("payload")
        self.assertEqual(payload["target"], {"project": "group/qa", "issue": "group/qa#7", "kind": "qa"})
        self.assertEqual(payload["status"], {"key": "status_homologated", "label": "Status: Accepted"})
        self.assertEqual(len(payload["comments"]), 1)
        comment = payload["comments"][0]
        self.assertEqual(comment["marker"], f"<!-- ns-qa:run={RUN_ID};kind=qa -->")
        report = (self.run_dir / "report.md").read_text(encoding="utf-8")
        summary = ("**Verdict:** `homologated` · **Confidence:** 100%\n"
                   "**Homologation score:** 10/10 (minimum 8.5) · loop `passed` · rounds 0\n"
                   "**Reasons:** every criterion pass with machine evidence; no finding; no cap")
        self.assertEqual(comment["body"], f"{comment['marker']}\n\n{summary}\n\n{report}")
        preview_text = (self.run_dir / "preview.md").read_text(encoding="utf-8")
        for row in ("| Verdict | `homologated` |", "| Confidence | 100% |",
                    "| Homologation score | 10/10 (minimum 8.5; loop `passed`; rounds 0) |", "| Not uploaded | none |"):
            self.assertIn(row, preview_text)
        self.assertEqual([item["path"] for item in comment["attachments"]],
                         ["evidence/S-1-01-saved.png", "evidence/S-2-01-error.png"])
        self.assertEqual(comment["attachments"][0]["covers"], ["AC-1"])
        result = self._ok("record", "--state", "published", "--note-id", "991")
        self.assertEqual((result["state"], result["evidence_upload"], result["note_ids"]), ("published", "complete", ["991"]))
        self.assertEqual(_read(self.run_dir / "publish.json")["preview_sha256"], preview["preview_sha256"])
        for command in ("preview", "payload"):
            self._refused(self._publish(command), "publication already recorded (published): nothing to do")
        run = self._run()
        run["phases"].append({"phase": "Q9", "state": "passed", "updated_at": "2026-11-24T15:00Z"})
        run["phase"] = "Q9"
        self._save_run(run)
        self.assertEqual(run_gate(["--check-run", str(self.run_dir / "run.json")])[0], 0)
        code, plan = run_cleanup_plan(["--run", str(self.run_dir / "run.json"), "--outcome", "success",
                                       "--profile", str(self.profile)], cwd=self.root)
        self.assertEqual(code, 0, plan)
        self.assertEqual(plan["steps"][-1]["action"], "delete")

    def test_level_and_gate_refusals(self):
        self._setup(run_mutate=lambda run: run["level"].update(declared="L1", effective="L1"))
        self._refused(self._publish("preview"), "effective L1: no publication (report stays local)")
        run = self._run()
        run["level"].update(declared="L2", effective="L2")
        run["phases"] = run["phases"][:-1]
        run["phase"] = "Q7"
        self._save_run(run)
        self._refused(self._publish("preview"), "Q7b not passed in run.json: publish only after the verdict and the judge")

    def test_stale_verdict_and_judgment(self):
        self._setup()
        verdict = _read(self.run_dir / "verdict.json")
        write_json(self.run_dir / "verdict.json", {**verdict, "confidence": 99})
        self._refused(self._publish("preview"), "verdict.json stale or edited: re-run qa_gate.py --verdict")
        write_json(self.run_dir / "verdict.json", verdict)
        judgment = _read(self.run_dir / "qa-judgment.json")
        write_json(self.run_dir / "qa-judgment.json", {**judgment, "score": 9.99})
        self._refused(self._publish("preview"), "qa-judgment.json stale or edited: re-run qa_judge.py")

    def test_below_min_needs_publish_anyway(self):
        def low(ledger, _run_dir):  # every gap not actionable: waived types + unavoidable mock -> ended_below_min
            ledger["criteria"][0]["criticality"] = "critical"
            ledger["scenarios"][1].update(data_source="response_intercept", mock_reason="external service")

        plan_waivers = ("waivers:\n  - { ac: AC-1, type: negative, reason: none }\n"
                        "  - { ac: AC-1, type: business_rule, reason: none }\n")
        self._setup(ledger_mutate=low)
        plan = (self.run_dir / "plan.yml").read_text(encoding="utf-8").replace("waivers: []\n", plan_waivers)
        (self.run_dir / "plan.yml").write_text(plan, encoding="utf-8")
        self._rejudge()
        judgment = _read(self.run_dir / "qa-judgment.json")
        self.assertEqual((judgment["score"], judgment["loop"]["state"]), (8.43, "ended_below_min"))
        self._refused(self._publish("preview"), "score 8.43 < judge.min_score 8.5: publication needs the human answer "
                                                "publish_anyway on a below_min_score pause (D50)")
        run = self._run()
        run["pauses"].append({"at": "2026-11-24T15:00Z", "phase": "Q7b", "reason": "below_min_score",
                              "resolved_at": "2026-11-24T15:10Z", "answer": "stop"})
        self._save_run(run)
        self._refused(self._publish("preview"), "score 8.43 < judge.min_score 8.5")
        run["pauses"][-1]["answer"] = "publish_anyway"
        self._save_run(run)
        self._ok("preview")

    def test_complement_loop_blocks_publication(self):
        def complement(ledger, _run_dir):
            ledger["criteria"][0]["criticality"] = "critical"
            ledger["scenarios"][1]["data_source"] = "response_intercept"

        self._setup(ledger_mutate=complement)
        self._refused(self._publish("preview"), "judge loop not finished (complement): run the complement round first")

    def test_report_refusals(self):
        self._setup()
        (self.run_dir / "report.md").write_text(" \n", encoding="utf-8")
        self._refused(self._publish("preview"), "report.md is empty")
        (self.run_dir / "report.md").write_text("see <!-- ns-qa:run=1-x -->\n", encoding="utf-8")
        self._refused(self._publish("preview"), "report.md contains the idempotency marker prefix ns-qa:run=")
        (self.run_dir / "report.md").unlink()
        code, payload = self._publish("preview")
        self.assertEqual(code, 3, payload)
        self.assertTrue(payload["errors"][0].startswith("report.md:"), payload)

    def test_evidence_folder_and_attachment_integrity(self):
        self._setup(run_mutate=lambda run: run.update(created_resources=[]))
        self._refused(self._publish("preview"), "run.json registers no evidence_dir: local evidence folder unknown")
        run = self._run()
        run["created_resources"] = [{"kind": "evidence_dir", "id": f"docs/qa/{RUN_ID}", "created_at": "2026-11-24T12:00Z",
                                     "created_by_phase": "Q0", "via": "agent"}]
        self._save_run(run)
        self._ok("preview")
        self._ok("approval", "--answer", "approve")
        (self.run_dir / "evidence" / "S-2-01-error.png").write_bytes(b"tampered")
        self._refused(self._publish("payload"), "sha256 mismatch for evidence/S-2-01-error.png")

    def test_pause_and_answer_sequence(self):
        self._setup()
        self._refused(self._publish("approval", "--answer", "approve"), "no open preview_approval pause: run preview first")
        self._refused(self._publish("payload"), "preview.md not approved (last answer: None)")
        self._ok("preview")
        self._refused(self._publish("preview"), "open preview_approval pause: record the answer first (approval)")
        self._ok("approval", "--answer", "adjust")
        self._refused(self._publish("payload"), "preview.md not approved (last answer: adjust)")
        (self.run_dir / "report.md").write_text(L2_REPORT_MD + "v2\n", encoding="utf-8")
        self._ok("preview")
        (self.run_dir / "report.md").write_text(L2_REPORT_MD + "v3\n", encoding="utf-8")
        self._refused(self._publish("approval", "--answer", "approve"), "preview.md stale or edited: regenerate (preview)")
        self._ok("approval", "--answer", "do_not_publish")
        self._refused(self._publish("preview"), "human answered do_not_publish: run ended unpublished (incomplete)")
        self.assertEqual([item["answer"] for item in self._run()["publication"]["approvals"]],
                         ["adjust", "do_not_publish"])

    def test_other_open_pause_blocks_preview(self):
        self._setup(run_mutate=lambda run: run["pauses"].append(
            {"at": "2026-11-24T15:00Z", "phase": "Q7b", "reason": "stall", "resolved_at": None, "answer": None}))
        self._refused(self._publish("preview"), "open stall pause: answer it first")
        self._refused(self._publish("approval", "--answer", "approve"), "no open preview_approval pause: run preview first")

    def test_preview_changed_after_approval(self):
        self._setup()
        self._approve()
        preview = self.run_dir / "preview.md"
        preview.write_text(preview.read_text(encoding="utf-8") + "extra\n", encoding="utf-8")
        self._refused(self._publish("payload"), "preview.md changed after approval (sha256 mismatch)")

    def test_artifacts_changed_after_approval(self):
        self._setup()
        self._approve()
        (self.run_dir / "report.md").write_text(L2_REPORT_MD + "other\n", encoding="utf-8")
        self._refused(self._publish("payload"), "preview.md stale or edited")

    def test_record_outcomes(self):
        self._setup()
        self._approve()
        self._refused(self._publish("record", "--state", "published", "--not-uploaded", "evidence/S-2-01-error.png"),
                      "--not-uploaded must list exactly the files the approved preview reports not uploaded (none)")
        self._refused(self._publish("record", "--state", "offline"), "state offline needs publish-payload.md")
        offline = self._ok("payload", "--offline")
        text = Path(offline["payload_file"]).read_text(encoding="utf-8")
        self.assertIn(f"<!-- ns-qa:run={RUN_ID};kind=qa -->", text)
        self.assertIn("Attach: `evidence/S-1-01-saved.png`, `evidence/S-2-01-error.png`", text)
        result = self._ok("record", "--state", "offline")
        self.assertEqual(result["evidence_upload"], "none")
        code, plan = run_cleanup_plan(["--run", str(self.run_dir / "run.json"), "--outcome", "gate_failure"])
        self.assertEqual((code, plan["steps"]), (0, []))
        result = self._ok("record", "--state", "published")
        self.assertEqual(result["evidence_upload"], "complete")

    def test_failed_upload_needs_new_preview_and_approval(self):
        self._setup()
        self._approve()
        self._refused(self._publish("preview", "--not-uploaded", "evidence/S-9-01-x.png"),
                      "--not-uploaded evidence/S-9-01-x.png is not an attachment of the preview")
        preview = self._ok("preview", "--not-uploaded", "evidence/S-2-01-error.png")
        text = (self.run_dir / "preview.md").read_text(encoding="utf-8")
        self.assertIn("| Not uploaded | `evidence/S-2-01-error.png` |", text)
        self.assertIn(f"**Reservation — evidence upload partial:** not uploaded, kept locally in "
                      f"`docs/qa/{RUN_ID}/evidence`: `evidence/S-2-01-error.png` (S-2: AC-2)", text)
        self._refused(self._publish("payload"), "preview.md changed after approval (sha256 mismatch)")
        self._ok("approval", "--answer", "approve")
        payload = self._ok("payload")
        self.assertEqual(payload["not_uploaded"], ["evidence/S-2-01-error.png"])
        self.assertEqual([item["path"] for item in payload["comments"][0]["attachments"]], ["evidence/S-1-01-saved.png"])
        self._refused(self._publish("record", "--state", "published"),
                      "--not-uploaded must list exactly the files the approved preview reports not uploaded "
                      "(evidence/S-2-01-error.png)")
        self._refused(self._publish("record", "--state", "offline", "--not-uploaded", "evidence/S-2-01-error.png"),
                      "--not-uploaded with state offline: nothing was uploaded")
        result = self._ok("record", "--state", "published", "--not-uploaded", "evidence/S-2-01-error.png")
        self.assertEqual((result["evidence_upload"], preview["preview_sha256"] == result["preview_sha256"]),
                         ("partial", True))

    def test_not_uploaded_rebatches_remaining_files(self):
        self._setup(profile_replacements={"attachments: { max_per_comment: 10 }": "attachments: { max_per_comment: 1 }"})
        self._ok("preview", "--not-uploaded", "evidence/S-1-01-saved.png")
        self._ok("approval", "--answer", "approve")
        comments = self._ok("payload")["comments"]
        self.assertEqual([[item["path"] for item in comment["attachments"]] for comment in comments],
                         [["evidence/S-2-01-error.png"]])

    def test_not_uploaded_repacks_consecutively(self):
        def four_shots(ledger, run_dir):
            for scenario in ledger["scenarios"]:
                content = f"png-{scenario['id']}-2".encode()
                relative = f"evidence/{scenario['id']}-02-more.png"
                (run_dir / relative).write_bytes(content)
                scenario["evidence"].append({"kind": "screenshot", "path": relative, "sha256": sha256_bytes(content),
                                             "pii_scrubbed": True})

        self._setup(ledger_mutate=four_shots,
                    profile_replacements={"attachments: { max_per_comment: 10 }": "attachments: { max_per_comment: 2 }"})
        self._approve()
        full = self._ok("payload")["comments"]
        self.assertEqual([[item["path"] for item in comment["attachments"]] for comment in full], [
            ["evidence/S-1-01-saved.png", "evidence/S-1-02-more.png"],
            ["evidence/S-2-01-error.png", "evidence/S-2-02-more.png"]])
        self._ok("preview", "--not-uploaded", "evidence/S-1-01-saved.png")
        self._ok("approval", "--answer", "approve")
        comments = self._ok("payload")["comments"]
        self.assertEqual([[item["path"] for item in comment["attachments"]] for comment in comments], [
            ["evidence/S-1-02-more.png", "evidence/S-2-01-error.png"], ["evidence/S-2-02-more.png"]])
        self.assertEqual([comment["marker"] for comment in comments],
                         [f"<!-- ns-qa:run={RUN_ID};kind=qa -->", f"<!-- ns-qa:run={RUN_ID};kind=qa;part=2 -->"])
        self.assertEqual(comments[1]["body"], f"{comments[1]['marker']}\n\n`{RUN_ID}` · 2/2\n")
        self.assertEqual([item["comment"] for comment in comments for item in comment["attachments"]], [1, 1, 2])

    def test_every_attachment_not_uploaded_is_partial(self):
        self._setup()
        files = ("evidence/S-1-01-saved.png", "evidence/S-2-01-error.png")
        self._ok("preview", *(arg for path in files for arg in ("--not-uploaded", path)))
        self._ok("approval", "--answer", "approve")
        self.assertEqual(self._ok("payload")["comments"][0]["attachments"], [])
        result = self._ok("record", "--state", "published", *(arg for path in files for arg in ("--not-uploaded", path)))
        self.assertEqual(result["evidence_upload"], "partial")

    def test_result_claims_in_sections_1_and_8_refused(self):
        self._setup()

        def report(section_1: str = "- Scenarios planned: 2", section_8: str = "- Loop: passed",
                   middle: str = "") -> str:
            return f"# R\n\n## 1. Summary\n\n{section_1}\n\n{middle}## 8. Score\n\n{section_8}\n"

        label = "names verdict label 'Homologated': the summary block is the single source"
        cases = {
            "verdict line §1": (report("- Verdict: see below"),
                                "report.md (outside §2-§7) restates the verdict ('verdict:'): the summary block is the single source"),
            "label §1 even correct": (report("- Outcome: Homologated"), f"report.md (outside §2-§7) {label}"),
            "lowercase label §8": (report(section_8="homologated"), f"report.md (outside §2-§7) {label}"),
            "label split by markup": (report("- Outcome: **Homo**lo\u200bga&shy;[ted](x)"), f"report.md (outside §2-§7) {label}"),
            "score §8 even correct": (report(section_8="- Score: 10 / 10"),
                                      "report.md (outside §2-§7) states a score (10 / 10): the summary block is the single source"),
            "comma score §1": (report("- Nota: 8,43/10"),
                               "report.md (outside §2-§7) states a score (8,43/10): the summary block is the single source"),
            "percent §1": (report("- Confidence: 83%"),
                           "report.md (outside §2-§7) states a percentage (83%): the summary block is the single source"),
            "por cento §8": (report(section_8="- confiança de 83 por cento"),
                             "report.md (outside §2-§7) states a percentage (83 por cento): the summary block is the single source"),
            "nbsp inside label": (report("- Outcome: Not\u00a0homologated"),
                                  "report.md (outside §2-§7) names verdict label 'Not homologated': the summary block is the single source"),
            "PERCENT word": (report("- Confidence: 83 PERCENT"),
                             "report.md (outside §2-§7) states a percentage (83 percent): the summary block is the single source"),
            "Blocked label": (report("- Outcome Blocked"),
                              "report.md (outside §2-§7) names verdict label 'Blocked': the summary block is the single source"),
            "claim in title area": ("# R\n\nRun summary: 10/10\n\n## 1. S\n\n- x\n\n## 8. Score\n\n- y\n",
                                    "report.md (outside §2-§7) states a score (10/10): the summary block is the single source"),
            "claim in §9": (report() + "\n## 9. Extra\n\n- confidence 83%\n",
                            "report.md (outside §2-§7) states a percentage (83%): the summary block is the single source"),
            "setext §1": ("# R\n\n1. Summary\n==========\n\n- Outcome: Homologated\n\n## 3. AC\n\n- a\n\n"
                          "## 8. Score\n\n- y\n", f"report.md (outside §2-§7) {label}"),
            "fullwidth percent": (report("- confidence 100％"),
                                  "report.md (outside §2-§7) states a percentage (100%): the summary block is the single source"),
            "duplicate §1 claim in first": ("# R\n\n## 1. S\n\n- 83%\n\n## 3. AC\n\n- a\n\n## 1. S again\n\n- b\n\n"
                                            "## 8. Score\n\n- y\n",
                                            "report.md (outside §2-§7) states a percentage (83%): the summary block"),
            "fenced fake §3 heading in §1": ("# R\n\n## 1. S\n\n```\n## 3. fake\n```\n- Outcome: Homologated\n\n"
                                             "## 3. AC\n\n- a\n\n## 8. Score\n\n- y\n", f"report.md (outside §2-§7) {label}"),
            "commented fake §3 heading in §1": ("# R\n\n## 1. S\n\n<!--\n## 3. fake\n-->\n- Outcome: Homologated\n\n"
                                                "## 8. Score\n\n- y\n", f"report.md (outside §2-§7) {label}"),
            "§8 claim after free sections": (report(section_8="- confidence 83%", middle="## 3. AC\n\n- a\n\n"),
                                             "report.md (outside §2-§7) states a percentage (83%): the summary block"),
            "label with double space": (report("- Outcome: Not  homologated"),
                                        "report.md (outside §2-§7) names verdict label 'Not homologated'"),
            "setext §1 then ATX sections": ("# R\n\n1. Summary\n==========\n\n- Outcome: Homologated\n\n## 2. Src\n\n"
                                            "## 3. AC\n\n- 50% discount\n\n## 8. Score\n\n- y\n",
                                            f"report.md (outside §2-§7) {label}"),
            "free heading after §8": (report() + "\n## 5. Notes\n\n- Homologated\n",
                                      f"report.md (outside §2-§7) {label}"),
            "free heading before §1": ("# R\n\n## 3. Early\n\n- Homologated\n\n## 1. S\n\n- x\n\n## 8. Score\n\n- y\n",
                                       f"report.md (outside §2-§7) {label}"),
            "H1 inside §1 is not the title": ("## 1. S\n\n# Homologated\n\n## 8. Score\n\n- y\n",
                                              f"report.md (outside §2-§7) {label}"),
            "setext §1 after free §3 ends its span": ("# R\n\n## 1. S\n\n- x\n\n## 3. AC\n\n- a\n\n1. Again\n========\n\n"
                                                      "- Outcome: Homologated\n\n## 8. Score\n\n- y\n",
                                                      f"report.md (outside §2-§7) {label}"),
            "no §1 heading": ("# R\n\n## 8. Score\n\n- Loop: passed\n",
                              "report.md has no section 1 heading ('## 1. ...'): the template keeps 8 numbered sections"),
            "no §8 heading": ("# R\n\n## 1. Summary\n\n- x\n",
                              "report.md has no section 8 heading ('## 8. ...'): the template keeps 8 numbered sections"),
        }
        for name, (text, reason) in cases.items():
            with self.subTest(case=name):
                (self.run_dir / "report.md").write_text(text, encoding="utf-8")
                self._refused(self._publish("preview"), reason)
        accepted = report(
            "- Executed: 2 pass · 0 blocked\n- Requested level L3 ran as L2",
            "| coverage | 3 | 1.0 | 3 |",
            "## 2. Sources\n\n- MR merged; 83% of files touched\n\n"
            "## 3. Acceptance criteria\n\n- AC-1: Save applies a 50% discount; desconto de 10 por cento\n\n"
            "## 5. Plan\n\n- 3/10 scenarios automated; blocked scenarios 0% (limit 20%)\n\n"
            "## 7. Everything that keeps confidence below 100%\n\n- an order that is not homologated cannot ship\n\n",
        )
        (self.run_dir / "report.md").write_text(accepted, encoding="utf-8")
        self._ok("preview")
        heading_forms = ("# R\n\n   ### 1) Summary\n\n- Prehomologated drafts; NotBlocked flag\n\n"
                         "## 03. AC\n\n- 50% discount; Homologated\n\n```\n## 8. fake\n```\n- 3/10\n\n7. Gaps\n-------\n\n- below 100%\n\n#8. Score\n\n- y\n")
        self._ok("approval", "--answer", "adjust")
        (self.run_dir / "report.md").write_text(heading_forms, encoding="utf-8")
        self._ok("preview")
        self._ok("approval", "--answer", "adjust")
        setext_free = "# R\n\n## 1. S\n\n- x\n\n3. AC\n=====\n\n- 50% discount; Homologated\n\n## 8. Score\n\n- y\n"
        (self.run_dir / "report.md").write_text(setext_free, encoding="utf-8")
        self._ok("preview")  # setext §3 opens a free span inside what would otherwise be §1
        self._ok("approval", "--answer", "adjust")
        titled = ("# Split payment in 10/10 installments: 5% fee — group/app#42\n\n## 1. S\n\n- 8/100 items\n\n"
                  "## 8. Score\n\n- y\n")
        (self.run_dir / "report.md").write_text(titled, encoding="utf-8")
        self._ok("preview")  # the template title line is issue text; "8/100" is not a score claim
        self._ok("approval", "--answer", "adjust")
        commented = "<!--\n# x\n-->\n\n# Release 10/10 — group/app#42\n\n## 1. S\n\n- x\n\n## 8. Score\n\n- y\n"
        (self.run_dir / "report.md").write_text(commented, encoding="utf-8")
        self._ok("preview")  # an H1 inside a comment is not the title; the real title line stays exempt

    def test_title_blanking_keeps_offsets(self):
        self._setup()
        title = "# Split payment in 10/10 installments with a 5% fee for partners — group/app#42\n\n"
        accepted = title + "## 1. S\n\n- x\n\n## 3. AC\n50% discount\n\n## 8. Score\n\n- y\n"
        (self.run_dir / "report.md").write_text(accepted, encoding="utf-8")
        self._ok("preview")
        self._ok("approval", "--answer", "adjust")
        refused = title + "## 1. S\n\n- x\n\n## 3. AC\n\n- a\n\n## 8. Score\n83% confidence\n"
        (self.run_dir / "report.md").write_text(refused, encoding="utf-8")
        code, payload = self._publish("preview")
        self.assertEqual((code, payload["errors"]), (2, [
            "report.md (outside §2-§7) states a percentage (83%): the summary block is the single source"]))

    def test_unnumbered_h2_before_section_1_is_scanned(self):
        self._setup()
        for text in ("# Title — group/app#42\n\n## Context Homologated\n\n## 1. S\n\n- x\n\n## 8. Score\n\n- y\n",
                     "## Context Homologated\n\n# Title — group/app#42\n\n## 1. S\n\n- x\n\n## 8. Score\n\n- y\n"):
            with self.subTest(text=text[:24]):
                (self.run_dir / "report.md").write_text(text, encoding="utf-8")
                code, payload = self._publish("preview")
                self.assertEqual((code, payload["errors"]), (2, [
                    "report.md (outside §2-§7) names verdict label 'Homologated': the summary block is the single source"]))

    def test_setext_dash_heading_is_section_1(self):
        self._setup()
        text = "# R\n\n1. Summary\n----------\n\n- Outcome: Homologated\n\n## 8. Score\n\n- y\n"
        (self.run_dir / "report.md").write_text(text, encoding="utf-8")
        code, payload = self._publish("preview")
        self.assertEqual((code, payload["errors"]), (2, [
            "report.md (outside §2-§7) names verdict label 'Homologated': the summary block is the single source"]))
        ordered = ("# R\n\n1. Summary\n==========\n\n- Outcome: Homologated\n\n## 2. Src\n\n## 3. AC\n\n"
                   "- 50% discount; 3/10 items\n\n## 4. I\n\n## 5. P\n\n## 6. E\n\n## 7. G\n\n## 8. Score\n\n- y\n")
        (self.run_dir / "report.md").write_text(ordered, encoding="utf-8")
        code, payload = self._publish("preview")
        self.assertEqual((code, payload["errors"]), (2, [
            "report.md (outside §2-§7) names verdict label 'Homologated': the summary block is the single source"]))

    def test_profile_pinned(self):
        self._setup()
        self.profile.write_text(self.profile.read_text(encoding="utf-8").replace("min_score: 8.5", "min_score: 1"),
                                encoding="utf-8")
        self._refused(self._publish("preview"), "profile changed since Q0: sha256 ")

    def test_unmasked_screenshots_never_attached(self):
        def unmasked(ledger, _run_dir):
            for scenario in ledger["scenarios"]:
                for entry in scenario["evidence"]:
                    if entry["kind"] == "screenshot":
                        entry["pii_scrubbed"] = False

        self._setup(ledger_mutate=unmasked)
        self._approve()
        text = (self.run_dir / "preview.md").read_text(encoding="utf-8")
        self.assertIn("Not publishable (PII not masked; kept locally): `evidence/S-1-01-saved.png`, "
                      "`evidence/S-2-01-error.png`", text)
        self.assertEqual(self._ok("payload")["comments"][0]["attachments"], [])
        self.assertEqual(self._ok("record", "--state", "published")["evidence_upload"], "not_needed")

    def test_batches_and_part_markers(self):
        self._setup(profile_replacements={"attachments: { max_per_comment: 10 }": "attachments: { max_per_comment: 1 }"})
        self._approve()
        comments = self._ok("payload")["comments"]
        self.assertEqual([comment["marker"] for comment in comments],
                         [f"<!-- ns-qa:run={RUN_ID};kind=qa -->", f"<!-- ns-qa:run={RUN_ID};kind=qa;part=2 -->"])
        self.assertEqual(comments[1]["body"], f"{comments[1]['marker']}\n\n`{RUN_ID}` · 2/2\n")
        self.assertEqual([[item["path"] for item in comment["attachments"]] for comment in comments],
                         [["evidence/S-1-01-saved.png"], ["evidence/S-2-01-error.png"]])

    def test_status_key_absent_from_source(self):
        self._setup()
        sync = self.root / "docs" / "context" / "gitlab-sync-config.md"
        sync.write_text(sync.read_text(encoding="utf-8").replace('status_homologated: "Status: Accepted"\n', ""),
                        encoding="utf-8")
        self._ok("preview")
        self.assertIn("| Status | none — key status_homologated absent from docs/context/gitlab-sync-config.md: "
                      "status step skipped |", (self.run_dir / "preview.md").read_text(encoding="utf-8"))

    def test_status_follows_verdict(self):
        def medium_finding(ledger, _run_dir):
            ledger["findings"] = [{"id": "F-1", "scenario": "S-2", "severity": "medium", "class": "copy", "reproduced": 1}]

        self._setup(ledger_mutate=medium_finding)
        self._approve()
        payload = self._ok("payload")
        self.assertEqual((payload["status"], payload["status_reason"]),
                         (None, "verdict with_reservations: QA issue stays in qa_running"))

    def test_mode_none_targets_dev_issue(self):
        self._setup(run_mutate=lambda run: run["issue"].update(qa=None))
        ledger = _read(self.run_dir / "qa-ledger.json")
        ledger["issue"]["qa"] = None
        write_ledger(self.run_dir, ledger)
        self._rejudge()
        self._approve()
        payload = self._ok("payload")
        self.assertEqual(payload["target"], {"project": "group/app", "issue": "group/app#42", "kind": "dev"})
        self.assertEqual(payload["comments"][0]["marker"], f"<!-- ns-qa:run={RUN_ID};kind=dev -->")
        self.assertEqual(payload["status_reason"], "no QA issue: development issue status unchanged")


class StatusLabelTests(unittest.TestCase):
    def test_label_forms(self):
        from qa_profile_rules import status_labels

        text = ('status_a: "Status: A"  # comment\n  status_b: \'B x\'\nstatus_c: plain label # c\n'
                '# status_d: "D"\nstatus_e:\nstatus_f: ""\n')
        self.assertEqual(status_labels(text), {"status_a": "Status: A", "status_b": "B x", "status_c": "plain label"})


class StatusRuleTests(unittest.TestCase):
    def test_status_change_rows(self):
        from qa_publish_rules import status_change

        qa, dev = Target("g/qa#7", "qa"), Target("g/app#1", "dev")
        result = {"homologated": "status_ok", "homologation_rejected": "status_ko"}
        labels = {"status_ok": "S: ok", "status_ko": "S: ko"}
        cases = [
            ((qa, "homologated", result, labels), StatusChange("status_ok", "S: ok", "verdict homologated")),
            ((qa, "not_homologated", result, labels), StatusChange("status_ko", "S: ko", "verdict not_homologated")),
            ((qa, "blocked", result, labels), StatusChange(None, None, "verdict blocked: QA issue stays in qa_running")),
            ((qa, "homologated", {}, labels),
             StatusChange(None, None, "tracker.status_result.homologated not set: status step skipped")),
            ((dev, "homologated", result, labels),
             StatusChange(None, None, "no QA issue: development issue status unchanged")),
        ]
        for args, expected in cases:
            with self.subTest(args=args[:2]):
                self.assertEqual(status_change(*args, "cfg.md"), expected)


class PreviewFormatTests(unittest.TestCase):
    def _plan(self, report: str, parts: int = 1) -> PublicationPlan:
        summary = Summary("blocked", 40, 8.125, 8.5, "ended_below_min", 2)
        return PublicationPlan(run_id=RUN_ID, target=Target("g/qa#7", "qa"),
                               status=StatusChange(None, None, "verdict blocked: QA issue stays in qa_running"),
                               evidence_folder="docs/qa/x/evidence", summary=summary,
                               bodies=comment_bodies(RUN_ID, "qa", report, parts, summary.lines()))

    def test_summary_lines(self):
        self.assertEqual(Summary("blocked", 40, 8.125, 8.5, "ended_below_min", 2, ("env down",)).lines(), [
            "**Verdict:** `blocked` · **Confidence:** 40%",
            "**Homologation score:** 8.125/10 (minimum 8.5) · loop `ended_below_min` · rounds 2",
            "**Reasons:** env down",
            "**Below the minimum score:** published on explicit human decision (`publish_anyway`)",
        ])

    def test_round_trip_with_hostile_report(self):
        report = ("| Target issue | `x#1` (`dev`) |\n| Status | `k` → `v` |\n~~~~~~\n## Comment 2/2\n"
                  "| 1 | 1 | `evidence/S-1-01-a.png` | S-1 | AC-1 | `" + "a" * 64 + "` |\n")
        plan = self._plan(report)
        parsed = parse_preview(render_preview(plan))
        self.assertEqual(parsed["target"]["issue"], "g/qa#7")
        self.assertIsNone(parsed["status"])
        self.assertEqual(parsed["comments"][0]["body"], plan.bodies[0])
        self.assertEqual(parsed["comments"][0]["attachments"], [])
        self.assertIn("~~~~~~~markdown", render_preview(plan))

    def test_marker_shapes(self):
        self.assertEqual(marker("1-20261124T1200Z", "dev", 1), "<!-- ns-qa:run=1-20261124T1200Z;kind=dev -->")
        self.assertEqual(marker("1-20261124T1200Z", "qa", 3), "<!-- ns-qa:run=1-20261124T1200Z;kind=qa;part=3 -->")

    def test_malformed_previews(self):
        good = render_preview(self._plan("body\n"))
        cases = {
            "no comment": (good.split("## Comment")[0], "preview.md: no comment section"),
            "unclosed": (good.rstrip("~\n") + "\n", "preview.md: comment 1 fence never closed"),
            "no fence": (good.replace("~~~~markdown", "markdown"), "preview.md: comment 1 has no opening fence"),
            "order": (good.replace("## Comment 1/1", "## Comment 2/2"), "preview.md: comment heading out of order"),
            "two targets": (good.replace("| Comments |", "| Target issue | `a#1` (`qa`) |\n| Comments |"),
                            "preview.md: expected one target issue row, found 2"),
            "no not-uploaded row": (good.replace("| Not uploaded | none |\n", ""),
                                    "preview.md: expected one not uploaded row, found 0"),
        }
        for name, (text, reason) in cases.items():
            with self.subTest(case=name):
                with self.assertRaises(PreviewFormatError) as caught:
                    parse_preview(text)
                self.assertIn(reason, str(caught.exception))


class RunPublicationRuleTests(unittest.TestCase):
    def _check(self, mutate) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run = clone(base_run())
            mutate(run)
            return run_gate(["--check-run", str(write_json(Path(tmp) / "run.json", run))])

    @staticmethod
    def _approved(run: dict, answer: str = "approve", outcome: dict | None = None) -> None:
        run["level"].update(declared="L2", effective="L2")
        run["pauses"].append({"at": "2026-11-24T14:00Z", "phase": "Q9", "reason": "preview_approval",
                              "resolved_at": "2026-11-24T14:01Z", "answer": answer})
        run["publication"] = {"approvals": [{"answer": answer, "preview_sha256": "c" * 64, "at": "2026-11-24T14:01Z"}],
                              "outcome": outcome}

    def test_valid(self):
        published = {"state": "published", "evidence_upload": "complete", "at": "2026-11-24T14:05Z"}

        def full(run):
            self._approved(run, outcome=published)
            run["phases"].append({"phase": "Q9", "state": "passed", "updated_at": "2026-11-24T14:06Z"})
            run["phase"] = "Q9"
            run["created_resources"][1].update(repo_root="e2e")
            run["pauses"].insert(1, {"at": "2026-11-24T13:00Z", "phase": "Q7b", "reason": "below_min_score",
                                     "resolved_at": "2026-11-24T13:10Z", "answer": "publish_anyway"})

        code, payload = self._check(full)
        self.assertEqual(code, 0, payload)

    def test_rejections(self):
        offline = {"state": "offline", "evidence_upload": "complete", "at": "2026-11-24T14:05Z"}
        cases = {
            "publication at L1": (lambda run: (self._approved(run), run["level"].update(declared="L1", effective="L1")),
                                  "/publication: effective L1 never publishes (local report only)"),
            "approval without pause": (lambda run: (self._approved(run), run["pauses"].pop()),
                                       "/publication/approvals: 1 approval(s) but 0 answered preview_approval pause(s)"),
            "answer differs": (lambda run: (self._approved(run), run["pauses"][-1].update(answer="adjust")),
                               "/publication/approvals/0: answer approve but its pause answer is adjust"),
            "outcome after adjust": (lambda run: self._approved(run, "adjust", offline | {"evidence_upload": "none"}),
                                     "/publication/outcome: needs the last approval to be approve"),
            "offline with upload": (lambda run: self._approved(run, outcome=offline),
                                    "/publication/outcome: state offline with evidence_upload complete (offline <-> none)"),
            "q9 without outcome": (lambda run: (self._approved(run), run["phases"].append(
                {"phase": "Q9", "state": "passed", "updated_at": "2026-11-24T14:06Z"})),
                                   "/phases: Q9 passed needs publication outcome published"),
            "q9 with offline outcome": (lambda run: (self._approved(run, outcome=offline | {"evidence_upload": "none"}),
                                                     run["phases"].append({"phase": "Q9", "state": "passed",
                                                                           "updated_at": "2026-11-24T14:06Z"})),
                                        "/phases: Q9 passed needs publication outcome published"),
            "repo_root on container": (lambda run: run["created_resources"][-1].update(repo_root="."),
                                       "repo_root only on worktree resources"),
            "repo_root unsafe": (lambda run: run["created_resources"][1].update(repo_root="../e2e"),
                                 "/created_resources/1/repo_root: does not match"),
            "publish_anyway on preview": (lambda run: run["pauses"].append(
                {"at": "2026-11-24T14:00Z", "phase": "Q9", "reason": "preview_approval",
                 "resolved_at": "2026-11-24T14:01Z", "answer": "publish_anyway"}),
                                          "answer publish_anyway not valid for reason preview_approval"),
        }
        for name, (mutate, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._check(mutate)
                self.assertEqual(code, 2, payload)
                self.assertTrue(any(reason in error for error in payload["errors"]), payload["errors"])


class PublicationSyncTests(unittest.TestCase):
    def test_verdict_labels_from_report_template(self):
        from qa_artifacts import REPORT_TEMPLATE, verdict_labels

        self.assertEqual(verdict_labels(REPORT_TEMPLATE.read_text(encoding="utf-8")), {
            "homologated": "Homologated", "with_reservations": "Homologated with reservations",
            "not_homologated": "Not homologated", "blocked": "Blocked"})

    def test_doc_names_marker_and_answers(self):
        text = PUBLICATION_DOC.read_text(encoding="utf-8")
        self.assertIn("`<!-- ns-qa:run=<run_id>;kind=<dev\\|qa> -->`", text)
        self.assertIn("`<!-- ns-qa:run=<run_id>;kind=<k>;part=<n> -->`", text)
        for answer in ("approve", "adjust", "do_not_publish"):
            self.assertIn(f"| `{answer}` |", text)
        for state in ("not_needed", "complete", "partial", "none"):
            self.assertIn(f"`{state}`", text)


if __name__ == "__main__":
    unittest.main()
