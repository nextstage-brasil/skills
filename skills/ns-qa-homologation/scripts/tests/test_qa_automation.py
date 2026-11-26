#!/usr/bin/env python3
"""Tests for Q8 automation: qa_automation_rules.py (pure), qa_automation.py (CLI), run.json automation
rules (--check-run) and the L3 publication preview. Stdlib only; offline: git is never executed.

Every rejection asserts its specific reason so an unrelated rule cannot make it pass.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    E2E_SPEC,
    MR_URL,
    SKILL,
    STAMP,
    automation_passed,
    automation_skipped,
    base_run,
    clone,
    filled_profile_text,
    repin_profile,
    sha256_bytes,
    run_automation,
    run_judge,
    run_gate,
    run_publish,
    write_json,
    write_publishable_run,
)
from qa_automation_rules import (  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)
    MAX_REVIEW_ROUNDS,
    AutomationError,
    GitCommands,
    GitPolicy,
    author_identity,
    branch_problem,
    check_git_argv,
    commit_message,
    git_profile_problems,
    mr_text,
    mr_url_problem,
    pattern_problem,
    protected_problem,
    remote_problem,
    review_problem,
    select_scenarios,
    sha_problem,
    slugify,
    selection_problems,
    stability,
    subject_problem,
    text_problem,
)
from qa_policy import E2E_REMOTE, E2E_REVIEWER, STABILITY_RUNS  # noqa: E402

WT = ".worktrees/qa-42-20261124t1200z-e2e"
WT_PATH = f"e2e/{WT}"
GIT = GitPolicy(base_branch="main", branch_pattern="qa/{iid}-{slug}", commit_prefix="test(e2e):", remote="origin",
                protected=("release/*", "stable"))
SPEC_OK = "describe('save', () => {\n  it('stores the record @S-1 @AC-1', () => {\n    cy.get('[data-testid=save]').click()\n  })\n})\n"
HANDOFF_DOC = SKILL / "references" / "automation-handoff.md"
EXECUTION_DOC = SKILL / "references" / "profile-schema-execution.md"
REVIEW_DOC = SKILL.parent / "ns-reviewer" / "references" / "e2e-spec-review.md"


class ReasonAssertions(unittest.TestCase):
    def assertReason(self, errors: list[str], expected: str):
        self.assertTrue(any(expected in error for error in errors), f"{expected!r} not in {errors}")


def _junit(*cases: tuple[str, str]) -> str:
    body = "".join(
        f'<testcase name="{name}">{"<failure/>" if outcome == "fail" else "<skipped/>" if outcome == "skipped" else ""}'
        "</testcase>" for name, outcome in cases)
    return f'<testsuite name="save">{body}</testsuite>'


class RulesTests(ReasonAssertions):
    def test_branch_names(self):
        for name in ("qa/42-save", "feature/x.y", "QA_1"):
            self.assertIsNone(branch_problem(name), name)
        cases = {
            "": "must match", "-x": "must match", "--force": "must match", "a b": "must match", "a;b": "must match",
            "a$(id)": "must match", "a`id`": "must match", "a\nb": "must match", "a@{1}": "must match",
            "~x": "must match", "a" * 201: "must match", "a..b": "no '..'", "a//b": "no '..'", "a/.b": "no '..'",
            "a.lock": "'.lock'", "a.lock/b": "'.lock'", "a/": "trailing", "a.": "trailing", "HEAD": "reserved",
        }
        for name, reason in cases.items():
            with self.subTest(name=name):
                self.assertIn(reason, branch_problem(name) or "")

    def test_remote_and_protected(self):
        self.assertIsNone(remote_problem("origin"))
        for name in ("-o", "a b", "a..b", "a/b", ""):
            self.assertIn("must match", remote_problem(name) or "", name)
        self.assertIsNone(protected_problem("release/*"))
        for name in ("-x", "a..b", "a b", "[ab]", "a?"):
            self.assertIn("must be a branch name or '*' glob", protected_problem(name) or "", name)

    def test_branch_pattern(self):
        self.assertIsNone(pattern_problem("qa/{iid}-{slug}"))
        self.assertIsNone(pattern_problem("qa/{run_id}"))
        self.assertIn("placeholder(s) user unknown", pattern_problem("qa/{iid}-{user}"))
        self.assertIn("must contain {iid} or {run_id}", pattern_problem("qa/{slug}"))
        self.assertIn("renders an invalid branch", pattern_problem("-{iid}"))
        self.assertIn("renders an invalid branch", pattern_problem("qa/../{iid}"))

    def test_derive_branch(self):
        self.assertEqual(GIT.derive_branch("42", "42-20261124T1200Z", "Relatório: ação #1!"), "qa/42-relatorio-acao-1")
        self.assertEqual(slugify("x" * 60), "x" * 40)
        with self.assertRaisesRegex(AutomationError, "needs {slug}"):
            GIT.derive_branch("42", "42-20261124T1200Z", "日本語")
        with self.assertRaisesRegex(AutomationError, "needs {slug}"):
            GIT.derive_branch("42", "42-20261124T1200Z", None)
        clash = GitPolicy("42", "{iid}", "p", "origin", ())
        with self.assertRaisesRegex(AutomationError, "base branch or protected"):
            clash.derive_branch("42", "42-20261124T1200Z", None)
        glob = GitPolicy("main", "release/{iid}", "p", "origin", ("release/*",))
        with self.assertRaisesRegex(AutomationError, "base branch or protected"):
            glob.derive_branch("42", "42-20261124T1200Z", None)

    def test_emitted_argv_pass_guard_and_never_force(self):
        commands = GitCommands(WT_PATH, GIT, "qa/42-save")
        emitted = commands.branch() + commands.commit([E2E_SPEC], "m", "A <a@b.c>") + commands.push()
        for argv in emitted:
            self.assertEqual(argv[:3], ["git", "-C", WT_PATH])
            self.assertFalse(any(arg in ("-f", "--force", "--no-verify") or arg.startswith("+") for arg in argv))
        self.assertEqual(emitted[-1][-1], "refs/heads/qa/42-save:refs/heads/qa/42-save")
        self.assertEqual(emitted[3][4:6], ["--message=m", "--author=A <a@b.c>"])

    def test_guard_refuses_force_merge_and_foreign_push(self):
        own = "qa/42-save"
        cases = {
            "merge": (["git", "-C", WT_PATH, "merge", "x"], "only git -C <worktree>"),
            "rebase": (["git", "-C", WT_PATH, "rebase", "main"], "only git -C <worktree>"),
            "reset": (["git", "-C", WT_PATH, "reset", "--hard"], "only git -C <worktree>"),
            "no -C": (["git", "push", "origin", own], "only git -C <worktree>"),
            "not git": (["sh", "-C", WT_PATH, "push"], "only git -C <worktree>"),
            "force": (["git", "-C", WT_PATH, "push", "--force", "origin", f"refs/heads/{own}:refs/heads/{own}"], "flag --force"),
            "short f": (["git", "-C", WT_PATH, "push", "-f", "origin", f"refs/heads/{own}:refs/heads/{own}"], "flag -f"),
            "lease": (["git", "-C", WT_PATH, "push", "--force-with-lease=x", "origin", "r"], "flag --force-with-lease"),
            "delete": (["git", "-C", WT_PATH, "push", "--delete", "origin", own], "flag --delete"),
            "no verify": (["git", "-C", WT_PATH, "commit", "--no-verify", "--message=m"], "flag --no-verify"),
            "amend": (["git", "-C", WT_PATH, "commit", "--amend"], "flag --amend"),
            "plus": (["git", "-C", WT_PATH, "push", "origin", f"+refs/heads/{own}:refs/heads/{own}"], "refspec"),
            "delete refspec": (["git", "-C", WT_PATH, "push", "origin", f":refs/heads/{own}"], "refspec"),
            "to base": (["git", "-C", WT_PATH, "push", "origin", f"refs/heads/{own}:refs/heads/main"], "refspec"),
            "other branch": (["git", "-C", WT_PATH, "push", "origin", "refs/heads/x:refs/heads/x"], "refspec"),
            "switch -C": (["git", "-C", WT_PATH, "switch", "-C", own, "origin/main"], "flag -C"),
            "force create": (["git", "-C", WT_PATH, "switch", "--force-create", own], "flag --force-create"),
            "discard": (["git", "-C", WT_PATH, "switch", "--discard-changes", "-c", own], "flag --discard-changes"),
            "receive pack": (["git", "-C", WT_PATH, "push", "--receive-pack=sh", "origin", "r"], "flag --receive-pack"),
            "upload pack": (["git", "-C", WT_PATH, "fetch", "--upload-pack=sh", "origin", "main"], "flag --upload-pack"),
            "push option": (["git", "-C", WT_PATH, "push", "-o", "ci.skip", "origin", "r"], "flag -o"),
        }
        for name, (argv, reason) in cases.items():
            with self.subTest(case=name):
                with self.assertRaises(AutomationError) as caught:
                    check_git_argv(argv, GIT, own)
                self.assertIn(reason, str(caught.exception))
        with self.assertRaisesRegex(AutomationError, "base or protected"):
            check_git_argv(["git", "-C", WT_PATH, "push", "origin", "refs/heads/stable:refs/heads/stable"], GIT, "stable")

    def test_author_identity(self):
        self.assertIsNone(author_identity(None, "a@b.c"))
        self.assertIsNone(author_identity("A", ""))
        self.assertEqual(author_identity("Test Agent", "qa@example.com"), "Test Agent <qa@example.com>")
        for name, email in (("A <x@y>", "a@b.c"), ("A\nB", "a@b.c"), ("A", "a b@c"), ("A", "a>@b.c")):
            with self.assertRaisesRegex(AutomationError, "unsafe for --author"):
                author_identity(name, email)

    def test_text_sha_url(self):
        self.assertIsNone(text_problem("cover save", "subject", 72))
        self.assertIn("1-72 characters", text_problem("x" * 73, "subject", 72))
        self.assertIn("1-72 characters", text_problem("  ", "subject", 72))
        self.assertIn("one line", text_problem("a\nb", "subject", 72))
        self.assertIn("one line", text_problem("a\u2028b", "subject", 72))
        self.assertIn("one line", text_problem("a\u202eb", "subject", 72))
        self.assertIn("marker prefix", text_problem("x ns-qa:run=1", "subject", 72))
        self.assertIsNone(subject_problem("cobrir salvamento #42"))
        self.assertIn("@mention", subject_problem("cover save cc @maintainer"))
        self.assertIn("1-72 characters", subject_problem(""))
        self.assertIsNone(sha_problem("a" * 40))
        self.assertIsNone(sha_problem("b" * 64))
        for sha in ("A" * 40, "a" * 39, "g" * 40, "--amend", "HEAD"):
            self.assertIn("full lowercase hex sha", sha_problem(sha) or "", sha)
        self.assertIsNone(mr_url_problem(MR_URL, 5))
        for url, iid in ((MR_URL, 6), ("javascript:alert(1)", 5), (MR_URL + "/diffs", 5), ("https://h/-/merge_requests/5", 5),
                         ("https://h/g/p/-/merge_requests/5 x", 5), ("ftp://h/g/p/-/merge_requests/5", 5)):
            self.assertIn("merge_requests", mr_url_problem(url, iid) or "", url)

    def test_selection_and_no_op(self):
        ledger = {"scenarios": [{"id": "S-1", "status": "pass"}, {"id": "S-2", "status": "fail"},
                                {"id": "S-3", "status": "pass"}, {"id": "S-4", "status": "pass"}]}

        def scenario(sid, lane="runner", existing=(), automate=True):
            return {"id": sid, "lane": lane, "existing": list(existing), "automate": automate}

        plan = {"scenarios": [scenario("S-1"), scenario("S-2"), scenario("S-3", existing=["a.cy.ts (@AC-1)"]),
                              scenario("S-4", lane="browser")]}
        chosen = select_scenarios(plan, ledger, False)
        self.assertEqual(chosen.scenarios, ("S-1",))
        self.assertEqual([item["reason"] for item in chosen.excluded], [
            "ledger status fail: only passing scenarios become regression specs", "existing runner coverage reused",
            "lane browser: only runner scenarios are automated"])
        self.assertIsNone(chosen.skip_reason)
        self.assertEqual(select_scenarios(plan, ledger, True).skip_reason, "execution.runner none: no runner to automate with")
        unmarked = {"scenarios": [scenario("S-1", automate=False)]}
        self.assertEqual(select_scenarios(unmarked, ledger, False).skip_reason, "no plan scenario marked automate: true")
        for status in ("blocked", "not_run", "flaky"):
            ledger["scenarios"][1]["status"] = status
            self.assertEqual(select_scenarios({"scenarios": [scenario("S-2")]}, ledger, False).excluded[0]["reason"],
                             f"ledger status {status}: only passing scenarios become regression specs")
        ledger["scenarios"][1]["status"] = "fail"
        failing = {"scenarios": [scenario("S-2")]}
        self.assertEqual(select_scenarios(failing, ledger, False).skip_reason,
                         "no automatable scenario (S-2 ledger status fail: only passing scenarios become regression specs)")

    def test_stability_window(self):
        def run(n, green, specs="x"):
            return {"source": f"automation/run-{n}.xml", "green": green, "specs_sha256": specs}

        self.assertTrue(stability([run(1, True), run(2, True)], "x", 2)["stable"])
        self.assertFalse(stability([run(1, True)], "x", 2)["stable"])
        flaky = stability([run(1, True), run(2, False), run(3, True), run(4, True)], "x", 2)
        self.assertEqual((flaky["stable"], flaky["red"], flaky["window"]), (False, ["automation/run-2.xml"], 4))
        fixed = stability([run(1, False, "old"), run(2, True), run(3, True)], "x", 2)
        self.assertEqual((fixed["stable"], fixed["window"]), (True, 2))
        self.assertFalse(stability([run(1, True), run(2, True, "old")], "x", 2)["stable"])
        reverted = stability([run(1, True), run(2, False, "B"), run(3, True)], "x", 2)
        self.assertEqual((reverted["stable"], reverted["window"]), (False, 1))

    def test_review_problem(self):
        self.assertIsNone(review_problem("Approved", 10, 0))
        self.assertIsNone(review_problem("Rejected", 9, 0))
        self.assertIn("needs score 10 and 0 lint findings", review_problem("Approved", 9, 0))
        self.assertIn("needs score 10 and 0 lint findings", review_problem("Approved", 10, 1))
        self.assertIn("is Approved, not Rejected", review_problem("Rejected", 10, 0))
        self.assertIsNone(review_problem("Rejected", 10, 2))

    def test_selection_problems(self):
        ledger = {"scenarios": [{"id": "S-1", "status": "pass"}]}
        plan = {"scenarios": [{"id": "S-1", "lane": "runner", "existing": [], "automate": True}]}
        recorded = {"scenarios": ["S-1"], "excluded": [], "skip_reason": None}
        self.assertEqual(selection_problems(recorded, plan, ledger, False), [])
        self.assertIn("selection or skip_reason differs from recomputation",
                      selection_problems({**recorded, "scenarios": [], "skip_reason": "lazy"}, plan, ledger, False)[0])
        self.assertIn("missing", selection_problems(None, plan, ledger, False)[0])

    def test_commit_message_and_mr_text(self):
        self.assertEqual(commit_message("test(e2e):", "cobrir salvamento", "g/app#42"),
                         "test(e2e): cobrir salvamento\n\nRelated to g/app#42\n")
        run = {"run_id": "42-20261124T1200Z", "issue": {"dev": "g/app#42"},
               "automation": {**automation_passed(), "subject": "cover save"}}
        plan = {"scenarios": [{"id": "S-1", "covers": ["AC-1"], "title": "Save | list"}]}
        title, description = mr_text(run, plan, "test(e2e):", "ns-reviewer", 2)
        self.assertEqual(title, "test(e2e): cover save")
        self.assertTrue(description.startswith("<!-- ns-qa:run=42-20261124T1200Z;kind=e2e -->\n"))
        self.assertIn("| S-1 | AC-1 | Save \\| list |", description)
        self.assertEqual([line for line in description.split("\n") if line.startswith("Related to")], ["Related to g/app#42"])
        plan["scenarios"][0]["title"] = "Save <!-- ns-qa:run=9-x -->"
        with self.assertRaisesRegex(AutomationError, "open with the run marker and carry it once"):
            mr_text(run, plan, "test(e2e):", "ns-reviewer", 2)
        plan["scenarios"][0]["title"] = "x\nRelated to g/other#1"
        _title, description = mr_text(run, plan, "test(e2e):", "ns-reviewer", 2)
        self.assertIn("| S-1 | AC-1 | x Related to g/other#1 |", description)
        self.assertEqual([line for line in description.split("\n") if line.startswith("Related to")], ["Related to g/app#42"])
        self.assertIn("Lint: 0 findings; rules enforced: raw-selector, fixed-wait", description)
        plan["scenarios"][0]["title"] = "ping @group/all and @S-1"
        _title, description = mr_text(run, plan, "test(e2e):", "ns-reviewer", 2)
        self.assertIn("| S-1 | AC-1 | ping `@group/all` and `@S-1` |", description)
        with self.assertRaisesRegex(AutomationError, "MR title must not contain an @mention"):
            mr_text(run, plan, "@team test:", "ns-reviewer", 2)
        _title, description = mr_text(run, plan, "test(e2e):", "@owner", 2)
        self.assertIn("Review: `@owner` round", description)
        self.assertEqual(git_profile_problems({"commit_prefix": "@team test:"}, lambda _v: False),
                         ["execution.e2e_git: commit_prefix must not contain an @mention"])


def _l3_run(run: dict) -> None:
    run["level"].update(declared="L3", effective="L3")
    run["created_resources"].append({"kind": "worktree", "id": WT, "created_at": STAMP, "created_by_phase": "Q6",
                                     "via": "agent", "repo_root": "e2e"})


class _AutomationRepo(ReasonAssertions):
    """Temp project: L3 profile (e2e_root e2e, base main, protected release/*), run dir after Q7b, E2E worktree."""

    profile_edits: dict = {}

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.profile, self.run_dir = write_publishable_run(
            self.root, run_mutate=_l3_run, profile_replacements={"autonomy_level: L1  ": "autonomy_level: L3  "})
        text = self.profile.read_text(encoding="utf-8")
        text = re.sub(r"e2e_root: filled-\d+", "e2e_root: e2e", text)
        text = re.sub(r"base_branch: filled-\d+", "base_branch: main", text)
        text = text.replace("protected_branches: []", 'protected_branches: ["release/*"]')
        for old, new in self.profile_edits.items():
            text = text.replace(old, new)
        self.profile.write_text(text, encoding="utf-8")
        repin_profile(self.profile, self.run_dir)
        self.worktree = self.root / "e2e" / WT
        self.wt_abs = os.path.abspath(self.worktree)
        (self.worktree / "cypress" / "e2e").mkdir(parents=True)
        (self.worktree / ".git").write_text("gitdir: ../../.git/worktrees/e2e\n", encoding="utf-8")
        self.write_spec(SPEC_OK)
        (self.run_dir / "automation").mkdir()
        self.reports = 0

    def tearDown(self):
        self._tmp.cleanup()

    def write_spec(self, text: str, name: str = E2E_SPEC) -> None:
        (self.worktree / name).write_text(text, encoding="utf-8")

    def go(self, command: str, *args: str, env: dict | None = None) -> tuple[int, dict]:
        code, payload = run_automation(
            [command, "--run-dir", str(self.run_dir), "--profile", str(self.profile), "--repo", str(self.root), *args],
            cwd=self.root, env=env)
        self.assertIn(code, (0, 2, 3), payload)
        self.assertIn("ok", payload, "stdout must be the JSON envelope (no traceback)")
        return code, payload

    def ok(self, command: str, *args: str, env: dict | None = None) -> dict:
        code, payload = self.go(command, *args, env=env)
        self.assertEqual(code, 0, payload)
        return payload

    def refused(self, reason: str, command: str, *args: str, code: int = 2, env: dict | None = None) -> dict:
        actual, payload = self.go(command, *args, env=env)
        self.assertEqual(actual, code, payload)
        self.assertReason(payload["errors"], reason)
        return payload

    def report(self, *cases: tuple[str, str], name: str | None = None) -> str:
        self.reports += 1
        relative = f"automation/{name or f'run-{self.reports}'}.xml"
        text = _junit(*cases).replace("<testsuite ", f'<testsuite timestamp="2026-11-24T10:{self.reports:02d}:00" ', 1)
        (self.run_dir / relative).write_text(text, encoding="utf-8")
        return relative

    def green(self) -> dict:
        return self.ok("record-run", "--junit", self.report(("stores the record @S-1 @AC-1", "pass")))

    def run_json(self) -> dict:
        return json.loads((self.run_dir / "run.json").read_text(encoding="utf-8"))

    def edit_run(self, mutate) -> None:
        run = self.run_json()
        mutate(run)
        write_json(self.run_dir / "run.json", run)

    def to_review(self) -> None:
        self.ok("plan", "--title", "Save form")
        self.ok("specs", "--spec", E2E_SPEC)
        self.green()
        self.green()

    def to_commit(self) -> dict:
        self.to_review()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        return self.ok("commit", "--subject", "cover form save")

    def to_mr(self) -> dict:
        self.to_commit()
        self.ok("record-commit", "--sha", "a" * 40)
        return self.ok("record-push")

    def edit_plan(self, old: str, new: str) -> None:
        """Plan change before Q8 = a new Q7b judgment (plan_sha256 pinned)."""
        plan = self.run_dir / "plan.yml"
        text = plan.read_text(encoding="utf-8")
        self.assertIn(old, text)
        plan.write_text(text.replace(old, new), encoding="utf-8")
        code, payload = run_judge(["--run-dir", str(self.run_dir), "--profile", str(self.profile)], cwd=self.root)
        self.assertEqual(code, 0, payload)

    def mark_q8(self, state: str) -> None:
        """Agent step after the script: Q8 passed (phase advances) or skipped (phase stays Q7b)."""

        def mutate(run):
            run["phases"].append({"phase": "Q8", "state": state, "updated_at": STAMP})
            if state == "passed":
                run["phase"] = "Q8"

        self.edit_run(mutate)


class AutomationFlowTests(_AutomationRepo):
    def test_full_flow_records_mr_and_feeds_preview(self):
        plan = self.ok("plan", "--title", "Save form")
        self.assertEqual(plan["branch"], "qa/42-save-form")
        self.assertEqual(plan["argv"], [
            ["git", "-C", self.wt_abs, "fetch", "origin", "main"],
            ["git", "-C", self.wt_abs, "switch", "--no-track", "-c", "qa/42-save-form", "origin/main"]])
        self.ok("specs", "--spec", E2E_SPEC)
        self.assertFalse(self.green()["stability"]["stable"])
        self.assertTrue(self.green()["stability"]["stable"])
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        commit = self.ok("commit", "--subject", "cobrir salvamento")
        self.assertEqual(commit["message"], "test(e2e): cobrir salvamento\n\nRelated to group/app#42\n")
        self.assertEqual(commit["argv"][1][:5], ["git", "-C", self.wt_abs, "commit", f"--message={commit['message']}"])
        push = self.ok("record-commit", "--sha", "a" * 40)["argv"]
        self.assertEqual(push, [["git", "-C", self.wt_abs, "push", "--set-upstream", "origin",
                                 "refs/heads/qa/42-save-form:refs/heads/qa/42-save-form"]])
        mr = self.ok("record-push")
        description = (self.run_dir / "automation" / "mr.md").read_text(encoding="utf-8")
        self.assertEqual((mr["title"], mr["source_branch"], mr["target_branch"]),
                         ("test(e2e): cobrir salvamento", "qa/42-save-form", "main"))
        self.assertIn("Stability: 2 consecutive green runs on these specs, runner retries 0", description)
        self.assertIn("Lint: 0 findings; rules enforced: raw-selector, fixed-wait, force-action, cypress-env, "
                      "focused-or-skipped, uncaught-exception", description)
        self.assertTrue(description.rstrip().endswith("Related to group/app#42"))
        self.ok("record-mr", "--iid", "5", "--url", MR_URL)
        self.mark_q8("passed")
        code, payload = run_gate(["--check-run", str(self.run_dir / "run.json")])
        self.assertEqual(code, 0, payload)
        self.refused("Q8 already passed", "record-push")
        preview = run_publish(["preview", "--run-dir", str(self.run_dir), "--profile", str(self.profile),
                               "--repo", str(self.root)], cwd=self.root)
        self.assertEqual(preview[0], 0, preview[1])
        text = (self.run_dir / "preview.md").read_text(encoding="utf-8")
        self.assertIn(f"| E2E merge request | {MR_URL} (!5) |", text)
        self.assertIn(f"**E2E automation:** {MR_URL} (!5)", text)

    def test_author_from_agent_identity_env(self):
        self.to_review()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        env = {"AGENT_GIT_AUTHOR_NAME": "Test Agent", "AGENT_GIT_AUTHOR_EMAIL": "qa@example.com"}
        argv = self.ok("commit", "--subject", "cover", env=env)["argv"][1]
        self.assertIn("--author=Test Agent <qa@example.com>", argv)
        self.refused("unsafe for --author", "commit", "--subject", "cover",
                     env={**env, "AGENT_GIT_AUTHOR_NAME": "X <evil@x> --amend"})

    def test_no_op_skip_is_recorded_and_accepted(self):
        self.edit_plan("automate: true", "automate: false")
        result = self.ok("plan")
        self.assertEqual((result["skip"], result["reason"]), (True, "no plan scenario marked automate: true"))
        self.assertEqual(self.run_json()["automation"], automation_skipped())
        self.refused("Q8 already planned", "plan")
        self.refused("Q8 is a no-op", "specs", "--spec", E2E_SPEC)
        self.mark_q8("skipped")
        code, payload = run_gate(["--check-run", str(self.run_dir / "run.json")])
        self.assertEqual(code, 0, payload)
        run_publish(["preview", "--run-dir", str(self.run_dir), "--profile", str(self.profile), "--repo", str(self.root)],
                    cwd=self.root)
        text = (self.run_dir / "preview.md").read_text(encoding="utf-8")
        self.assertIn("| E2E merge request | none — no plan scenario marked automate: true |", text)

    def test_existing_coverage_only_is_a_no_op(self):
        self.edit_plan("existing: []\n    automate: true", "existing: [\"x.cy.ts (@AC-1)\"]\n    automate: true")
        result = self.ok("plan")
        self.assertEqual(result["reason"], "no automatable scenario (S-1 existing runner coverage reused)")

    def test_preconditions(self):
        self.edit_run(lambda run: run["level"].update(effective="L2"))
        self.refused("effective L2: Q8 automation runs at L3 only", "plan")
        self.edit_run(lambda run: run["level"].update(effective="L3"))
        self.edit_run(lambda run: (run["phases"].pop(), run.update(phase="Q7")))
        self.refused("Q7b not passed: Q8 runs after the judge", "plan")
        self.edit_run(lambda run: (run["phases"].append({"phase": "Q7b", "state": "passed", "updated_at": STAMP}),
                                   run.update(phase="Q7b")))
        self.edit_run(lambda run: run["created_resources"].pop())
        self.refused("0 run-owned E2E worktree(s) with repo_root e2e", "plan")
        self.edit_run(_l3_run)
        self.refused("branch_pattern needs {slug}", "plan")
        self.profile.write_text(self.profile.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        self.refused("profile changed since Q0", "plan")

    def test_missing_or_symlinked_worktree(self):
        moved = self.root / "elsewhere"
        self.worktree.rename(moved)
        self.refused(f"worktree {WT_PATH} missing on disk", "plan", "--title", "x")
        self.worktree.symlink_to(moved, target_is_directory=True)
        self.refused(f"worktree {WT_PATH}: symlink refused", "plan", "--title", "x")

    def test_spec_paths_confined(self):
        self.ok("plan", "--title", "x")
        (self.root / "outside.cy.ts").write_text("x", encoding="utf-8")
        (self.worktree / "link.cy.ts").symlink_to(self.root / "outside.cy.ts")
        cases = {"../../../outside.cy.ts": "must be a relative path", "/etc/passwd": "must be a relative path",
                 "-rf": "must be a relative path", "a//b.cy.ts": "must be a relative path",
                 "link.cy.ts": "symlink refused", "cypress/e2e/none.cy.ts": "not a file in the E2E worktree"}
        for path, reason in cases.items():
            with self.subTest(path=path):
                self.refused(reason, "specs", f"--spec={path}")
        self.refused("spec listed twice", "specs", "--spec", E2E_SPEC, "--spec", E2E_SPEC)

    def test_record_run_rules(self):
        self.ok("plan", "--title", "x")
        self.refused("no spec declared", "record-run", "--junit", self.report(("a @S-1", "pass")))
        self.ok("specs", "--spec", E2E_SPEC)
        (self.run_dir / "results").mkdir(exist_ok=True)
        (self.run_dir / "results" / "r.xml").write_text(_junit(("a @S-1", "pass")), encoding="utf-8")
        self.refused("must be automation/<name>.xml", "record-run", "--junit", "results/r.xml")
        self.refused("must be automation/<name>.xml", "record-run", "--junit", "automation/../results/r.xml")
        doctype = self.report(("a @S-1", "pass"))
        (self.run_dir / doctype).write_text('<!DOCTYPE x [<!ENTITY e "x">]><testsuite/>', encoding="utf-8")
        self.refused("DOCTYPE declaration refused", "record-run", "--junit", doctype)
        self.refused("no test case maps to an automated scenario", "record-run", "--junit",
                     self.report(("untagged", "pass")))
        first = self.report(("a @S-1", "pass"))
        self.ok("record-run", "--junit", first)
        self.refused("already recorded (same path or same content", "record-run", "--junit", first)
        copy = "automation/copy.xml"
        (self.run_dir / copy).write_bytes((self.run_dir / first).read_bytes())
        self.refused("already recorded (same path or same content", "record-run", "--junit", copy)
        spaced = "automation/spaced.xml"
        (self.run_dir / spaced).write_text((self.run_dir / first).read_text(encoding="utf-8").replace("><", ">\n  <") + " ",
                                           encoding="utf-8")
        self.refused("already recorded (same path or same content", "record-run", "--junit", spaced)
        padded = "automation/padded.xml"  # comment-padded copy: same content, not a second execution
        (self.run_dir / padded).write_text("<!-- rerun -->" + (self.run_dir / first).read_text(encoding="utf-8")
                                           .replace("<testcase", "<!-- x --><testcase"), encoding="utf-8")
        self.refused("already recorded (same path or same content", "record-run", "--junit", padded)
        skipped = self.ok("record-run", "--junit", self.report(("a @S-1", "pass"), ("other", "skipped")))
        self.assertEqual((skipped["green"], skipped["skipped_cases"]), (False, ["other"]))
        red = self.ok("record-run", "--junit", self.report(("a @S-1", "pass"), ("helper", "fail")))
        self.assertEqual((red["green"], red["failed_cases"]), (False, ["helper"]))
        self.write_spec(SPEC_OK + "// changed\n")
        self.refused("spec changed since declared: cypress/e2e/save.cy.ts", "record-run", "--junit",
                     self.report(("a @S-1", "pass")))

    def test_flaky_spec_never_commits_until_changed(self):
        self.ok("plan", "--title", "x")
        self.ok("specs", "--spec", E2E_SPEC)
        self.green()
        self.ok("record-run", "--junit", self.report(("stores @S-1", "fail")))
        self.green()
        self.assertEqual(self.green()["stability"]["red"], ["automation/run-2.xml"])
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        self.refused("spec set not stable: 4 run(s) on it, 2 green required, red: automation/run-2.xml",
                     "commit", "--subject", "x")
        self.write_spec(SPEC_OK.replace("click()", "click()\n    cy.contains('Saved').should('be.visible')"))
        self.ok("specs", "--spec", E2E_SPEC)
        self.green()
        self.assertTrue(self.green()["stability"]["stable"])
        self.refused("last review is not Approved", "commit", "--subject", "x")
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        self.ok("commit", "--subject", "x")

    def test_review_gate(self):
        self.to_review()
        self.refused("needs score 10 and 0 lint findings (got 9, 0)", "record-review", "--verdict", "Approved",
                     "--score", "9")
        self.write_spec(SPEC_OK.replace("click()", "click({ force: true })\n    cy.wait(500)"))
        self.ok("specs", "--spec", E2E_SPEC)
        refused = self.refused("needs score 10 and 0 lint findings (got 10, 2)", "record-review", "--verdict",
                               "Approved", "--score", "10")
        self.assertReason(refused["errors"], f"lint {E2E_SPEC}:3 force-action")
        self.assertReason(refused["errors"], f"lint {E2E_SPEC}:4 fixed-wait")
        first = self.ok("record-review", "--verdict", "Rejected", "--score", "7")
        self.assertEqual((first["round"], first["approved"], len(first["lint"]), first["stall"]), (1, False, 2, False))
        self.assertTrue(self.ok("record-review", "--verdict", "Blocked", "--score", "3")["stall"])
        self.assertTrue(self.ok("record-review", "--verdict", "Rejected", "--score", "8")["stall"])
        self.refused(f"max {MAX_REVIEW_ROUNDS} review rounds reached", "record-review", "--verdict", "Approved",
                     "--score", "10")

    def test_intercept_rule_from_profile(self):
        self.tearDown()
        type(self).profile_edits = {"forbid_spec_intercepts: false": "forbid_spec_intercepts: true"}
        try:
            self.setUp()
        finally:
            type(self).profile_edits = {}
        self.to_review()
        self.write_spec(SPEC_OK.replace("click()", "click()\n    cy.intercept('GET', '/api')"))
        self.ok("specs", "--spec", E2E_SPEC)
        self.refused(f"lint {E2E_SPEC}:4 spec-intercept", "record-review", "--verdict", "Approved", "--score", "10")

    def test_repo_lint_config_overrides(self):
        self.to_review()
        self.write_spec(SPEC_OK.replace("click()", "click()\n    cy.wait(500)"))
        self.ok("specs", "--spec", E2E_SPEC)
        checkout = self.root / "e2e" / ".e2e-antipatterns.json"
        checkout.write_text('{"version": 1, "disable": ["fixed-wait"]}', encoding="utf-8")
        (self.worktree / ".e2e-antipatterns.json").write_bytes(checkout.read_bytes())
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        review = self.run_json()["automation"]["reviews"][0]
        self.assertNotIn("fixed-wait", review["lint_rules"])
        self.assertEqual(review["lint_config_sha256"], sha256_bytes(checkout.read_bytes()))
        checkout.write_text('{"version": 2}', encoding="utf-8")
        (self.worktree / ".e2e-antipatterns.json").unlink()
        self.refused("lint: config version must be 1", "record-review", "--verdict", "Rejected", "--score", "1", code=3)

    def test_worktree_lint_config_cannot_weaken_rules(self):
        """P4: a config written in the agent-owned worktree never replaces the E2E repo's own rules."""
        self.to_review()
        self.write_spec(SPEC_OK.replace("click()", "click({force: true})\n    cy.wait(500)\n    cy.get('.btn')"))
        self.ok("specs", "--spec", E2E_SPEC)
        (self.worktree / ".e2e-antipatterns.json").write_text(
            '{"version": 1, "disable": ["raw-selector", "fixed-wait", "force-action"]}', encoding="utf-8")
        self.green()
        self.green()
        self.refused("worktree .e2e-antipatterns.json differs from the E2E repo checkout", "record-review",
                     "--verdict", "Approved", "--score", "10")
        (self.worktree / ".e2e-antipatterns.json").unlink()
        refused = self.refused("needs score 10 and 0 lint findings", "record-review", "--verdict", "Approved",
                               "--score", "10")
        self.assertReason(refused["errors"], f"lint {E2E_SPEC}:3 force-action")

    def test_commit_rules(self):
        self.to_review()
        self.refused("last review is not Approved", "commit", "--subject", "x")
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        for subject, reason in (("a\nb", "one line"), ("x" * 73, "1-72 characters"), ("x ns-qa:run=1", "marker prefix")):
            self.refused(reason, "commit", "--subject", subject)
        self.refused("no commit planned", "record-commit", "--sha", "a" * 40)
        self.ok("commit", "--subject", "x")
        self.refused("full lowercase hex sha", "record-commit", "--sha", "A" * 40)
        self.refused("full lowercase hex sha", "record-commit", "--sha=--amend")
        self.refused("no commit recorded", "record-push")
        self.ok("record-commit", "--sha", "a" * 40)
        self.refused(f"commit {'a' * 40} recorded: spec set, runs and reviews are final", "specs", "--spec", E2E_SPEC)
        self.refused(f"commit {'a' * 40} recorded: spec set, runs and reviews are final", "commit", "--subject", "y")

    def test_mr_rules(self):
        self.to_commit()
        self.ok("record-commit", "--sha", "a" * 40)
        self.refused("branch not pushed", "record-mr", "--iid", "5", "--url", MR_URL)
        self.ok("record-push")
        self.refused("merge_requests/6", "record-mr", "--iid", "6", "--url", MR_URL)
        mr = self.run_dir / "automation" / "mr.md"
        mr.write_text(mr.read_text(encoding="utf-8") + "edited\n", encoding="utf-8")
        self.refused("mr.md stale or edited", "record-mr", "--iid", "5", "--url", MR_URL)
        self.ok("record-push")
        self.ok("record-mr", "--iid", "5", "--url", MR_URL)
        self.refused("MR already recorded", "record-mr", "--iid", "5", "--url", MR_URL)
        self.refused("MR already recorded", "record-push")

    def test_run_json_branch_edited_to_protected_is_refused(self):
        self.ok("plan", "--title", "x")
        for branch in ("main", "release/42"):
            with self.subTest(branch=branch):
                self.edit_run(lambda run: run["automation"].update(branch=branch))
                self.refused(f"branch {branch} is the base branch or protected", "specs", "--spec", E2E_SPEC)

    def test_q8_before_q9_and_pause(self):
        self.to_review()
        self.edit_run(lambda run: run["pauses"].append({"at": STAMP, "phase": "Q8", "reason": "stall",
                                                        "resolved_at": None, "answer": None}))
        self.refused("open stall pause: answer it first", "record-review", "--verdict", "Rejected", "--score", "1")
        self.edit_run(lambda run: run["pauses"].pop())
        code, payload = run_publish(["preview", "--run-dir", str(self.run_dir), "--profile", str(self.profile),
                                     "--repo", str(self.root)], cwd=self.root)
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "Q8 not passed or skipped in run.json: at L3 automation runs before publication")

    def test_usage_errors_exit_3(self):
        cases = {
            "force flag": ["record-commit", "--sha", "a" * 40, "--force"],
            "merge command": ["merge"],
            "abbreviated option": ["record-mr", "--ii", "5", "--url", MR_URL],
            "nan score": ["record-review", "--verdict", "Approved", "--score", "nan"],
            "score above 10": ["record-review", "--verdict", "Approved", "--score", "11"],
            "iid zero": ["record-mr", "--iid", "0", "--url", MR_URL],
            "iid sign": ["record-mr", "--iid", "+5", "--url", MR_URL],
            "verdict": ["record-review", "--verdict", "approved", "--score", "10"],
        }
        for name, argv in cases.items():
            with self.subTest(case=name):
                code, payload = self.go(*argv)
                self.assertEqual(code, 3, payload)
                self.assertReason(payload["errors"], "usage:")
        code, payload = run_automation(["plan", "--run-dir", str(self.root / "none"), "--profile", str(self.profile),
                                        "--repo", str(self.root)], cwd=self.root)
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "run.json:")

    def test_status_is_read_only(self):
        before = (self.run_dir / "run.json").read_bytes()
        self.assertEqual(self.ok("status")["next"], "plan")
        self.assertEqual((self.run_dir / "run.json").read_bytes(), before)
        self.to_review()
        status = self.ok("status")
        self.assertEqual((status["next"], status["stability"]["stable"]), ("record-review", True))
        self.ok("specs", "--spec", E2E_SPEC)
        self.assertEqual(self.ok("status")["next"], "record-review")


IN_REPO_SPEC = f"e2e/{E2E_SPEC}"


class AutomationInRepoTests(_AutomationRepo):
    """Monorepo layout: e2e_root `e2e` is a folder of the product repo; the E2E worktree is a worktree of the
    whole repo (run.json repo_root "."), specs are relative to it and live under e2e_root."""

    def setUp(self):
        super().setUp()
        self.nested = self.worktree
        self.worktree = self.root / WT
        self.wt_abs = os.path.abspath(self.worktree)
        (self.worktree / "e2e" / "cypress" / "e2e").mkdir(parents=True)
        (self.worktree / ".git").write_text("gitdir: ../.git/worktrees/qa\n", encoding="utf-8")
        self.write_spec(SPEC_OK, IN_REPO_SPEC)

        def to_in_repo(run):
            run["created_resources"][-1]["repo_root"] = "."

        self.edit_run(to_in_repo)

    def declare(self) -> None:
        self.ok("plan", "--title", "Save form")
        self.ok("specs", "--spec", IN_REPO_SPEC)

    def test_full_flow_in_repo_worktree(self):
        plan = self.ok("plan", "--title", "Save form")
        self.assertEqual(plan["argv"][0][:3], ["git", "-C", self.wt_abs])
        self.ok("specs", "--spec", IN_REPO_SPEC)
        self.green()
        self.green()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        commit = self.ok("commit", "--subject", "cover form save")
        self.assertIn(IN_REPO_SPEC, commit["argv"][0])
        self.assertEqual(commit["argv"][0][:3], ["git", "-C", self.wt_abs])

    def test_spec_outside_e2e_root_refused(self):
        self.ok("plan", "--title", "x")
        self.write_spec("x", "backend.cy.ts")
        self.refused("must be inside e2e/", "specs", "--spec", "backend.cy.ts")

    def test_missing_worktree_names_repo_relative_path(self):
        self.worktree.rename(self.root / "elsewhere")
        self.refused(f"worktree {WT} missing on disk", "plan", "--title", "x")

    def test_lint_config_comes_from_repo_checkout(self):
        self.declare()
        self.green()
        self.green()
        (self.worktree / "e2e" / ".e2e-antipatterns.json").write_text(
            '{"version": 1, "disable": ["fixed-wait"]}', encoding="utf-8")
        self.refused("worktree .e2e-antipatterns.json differs from the E2E repo checkout", "record-review",
                     "--verdict", "Approved", "--score", "10")

    def test_both_layouts_registered_refused(self):
        self.edit_run(lambda run: run["created_resources"].append(
            dict(run["created_resources"][-1], id=WT + "-2", repo_root="e2e")))
        self.refused("under both repo_root e2e and .", "plan", "--title", "x")


class AutomationProbeTests(_AutomationRepo):
    """Regression tests for adversarial probes P1-P5."""

    def test_p1_hand_written_skip_refused_by_publication_and_cleanup(self):
        self.edit_run(lambda run: run.__setitem__("automation", automation_skipped("lazy")))
        self.mark_q8("skipped")
        code, payload = run_publish(["preview", "--run-dir", str(self.run_dir), "--profile", str(self.profile),
                                     "--repo", str(self.root)], cwd=self.root)
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "/automation: selection or skip_reason differs from recomputation")

    def test_p1_plan_flipped_after_judgment_refused(self):
        plan = self.run_dir / "plan.yml"
        plan.write_text(plan.read_text(encoding="utf-8").replace("automate: true", "automate: false"), encoding="utf-8")
        self.refused("plan.yml changed since the Q7b judgment", "plan")

    def test_p2_specs_redeclared_after_commit_argv(self):
        self.to_commit()
        self.write_spec(SPEC_OK, "cypress/e2e/other.cy.ts")
        self.ok("specs", "--spec", E2E_SPEC, "--spec", "cypress/e2e/other.cy.ts")
        self.assertEqual(self.run_json()["automation"]["subject"], None)
        self.green()
        self.green()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        self.refused("no commit planned", "record-commit", "--sha", "a" * 40)
        self.ok("commit", "--subject", "cover both")
        self.edit_run(lambda run: run["automation"].update(commit_specs_sha256="f" * 64))
        self.refused("spec set changed after commit argv was printed", "record-commit", "--sha", "a" * 40)

    def test_p3_worktree_must_be_linked_git_worktree(self):
        gitfile = self.worktree / ".git"
        gitfile.unlink()
        self.refused(f"worktree {WT_PATH} is not a linked git worktree", "plan", "--title", "x")
        gitfile.mkdir()
        self.refused(f"worktree {WT_PATH} is not a linked git worktree", "plan", "--title", "x")
        gitfile.rmdir()
        (self.root / "gitfile").write_text("gitdir: x\n", encoding="utf-8")
        gitfile.symlink_to(self.root / "gitfile")
        self.refused(f"worktree {WT_PATH} is not a linked git worktree", "plan", "--title", "x")

    def test_p3_worktree_resource_must_be_unique_and_agent_owned(self):
        def duplicate(run):
            entry = dict(run["created_resources"][-1], id=WT + "-2")
            run["created_resources"].append(entry)

        self.edit_run(duplicate)
        self.refused("2 run-owned E2E worktree(s) with repo_root e2e", "plan", "--title", "x")
        self.edit_run(lambda run: run["created_resources"].pop())
        self.edit_run(lambda run: (run["created_resources"][-1].update(via="qa-env"),
                                   run["environment"].update(provider="script")))
        self.refused("0 run-owned E2E worktree(s) with repo_root e2e", "plan", "--title", "x")

    def test_p5_support_file_not_linted_with_spec_rules(self):
        support = "cypress/support/commands.ts"
        (self.worktree / "cypress" / "support").mkdir(parents=True)
        self.write_spec("Cypress.Commands.add('login', () => { cy.request({url: Cypress.env('api')}) })\n"
                        "Cypress.Commands.add('stub', () => { cy.intercept('GET', '/api') })\n", support)
        self.ok("plan", "--title", "x")
        self.ok("specs", "--spec", E2E_SPEC, "--spec", support)
        self.green()
        self.green()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        self.write_spec(SPEC_OK + "cy.wait(300)\n", support)
        self.ok("specs", "--spec", E2E_SPEC, "--spec", support)
        self.refused(f"lint {support}:6 fixed-wait", "record-review", "--verdict", "Approved", "--score", "10")

    def test_subject_mention_refused(self):
        self.to_review()
        self.ok("record-review", "--verdict", "Approved", "--score", "10")
        self.refused("subject must not contain an @mention", "commit", "--subject", "ping @owner")


class CheckRunAutomationTests(ReasonAssertions):
    """run.json automation contract: each mutation of a valid L3 manifest flips --check-run to exit 2."""

    def _check(self, mutate) -> tuple[int, dict]:
        run = clone(base_run())
        run["level"].update(declared="L3", effective="L3")
        run["automation"] = automation_passed()
        run["phases"].append({"phase": "Q8", "state": "passed", "updated_at": STAMP})
        run["phase"] = "Q8"
        mutate(run)
        with tempfile.TemporaryDirectory() as tmp:
            return run_gate(["--check-run", str(write_json(Path(tmp) / "run.json", run))])

    def test_valid_l3_manifest(self):
        code, payload = self._check(lambda run: None)
        self.assertEqual(code, 0, payload)

    def test_mutations_rejected(self):
        def auto(**changes):
            return lambda run: run["automation"].update(changes)

        def q8(state):
            return lambda run: next(item for item in run["phases"] if item["phase"] == "Q8").update(state=state)

        def at_level(level):
            return lambda run: run["level"].update(effective=level)

        def run_field(index, **changes):
            return lambda run: run["automation"]["runs"][index].update(changes)

        def review_field(**changes):
            return lambda run: run["automation"]["reviews"][0].update(changes)

        def extra_reviews(run):
            reviews = run["automation"]["reviews"]
            for number in range(2, 5):
                reviews.insert(0, {**reviews[-1], "verdict": "Rejected", "score": 5})
            for index, review in enumerate(reviews):
                review["round"] = index + 1

        def published_without_q8(run):
            run["phases"] = [item for item in run["phases"] if item["phase"] != "Q8"]
            run["phase"] = "Q7b"
            run["publication"] = {"approvals": [], "outcome": None}

        skipped = automation_skipped()
        cases = {
            "L2 automation": (at_level("L2"), "/automation: effective L2 never automates"),
            "L2 Q8": (lambda run: (at_level("L2")(run), run.pop("automation")), "/phases: Q8 recorded at effective L2"),
            "passed without mr": (auto(mr=None), "/phases: Q8 passed needs automation.mr"),
            "skipped without reason": (q8("skipped"), "/phases: Q8 skipped needs automation.skip_reason"),
            "skip with work": (auto(skip_reason="x"), "/automation: skip_reason with recorded scenarios, specs, runs"),
            "no skip no branch": (lambda run: run.update(automation={**skipped, "skip_reason": None}),
                                  "no skip_reason needs scenarios and branch"),
            "selected and excluded": (auto(excluded=[{"scenario": "S-1", "reason": "x"}]), "S-1 both selected and excluded"),
            "duplicate excluded": (auto(excluded=[{"scenario": "S-2", "reason": "x"}] * 2), "/automation/excluded: duplicate S-2"),
            "branch dotdot": (auto(branch="qa/../main"), "/automation/branch: branch 'qa/../main': no '..'"),
            "branch option": (auto(branch="--force"), "/automation/branch"),
            "spec escapes": (lambda run: run["automation"]["specs"][0].update(path="a/../../x"), "/automation/specs"),
            "duplicate run source": (run_field(1, source="automation/run-1.xml"), "source automation/run-1.xml recorded twice"),
            "duplicate run content": (run_field(1, sha256="1" * 64), "recorded twice"),
            "outcomes mismatch": (run_field(0, outcomes=[{"scenario": "S-9", "outcome": "pass"}]),
                                  "/automation/runs/0: outcomes must name each automated scenario once"),
            "green with fail": (run_field(0, outcomes=[{"scenario": "S-1", "outcome": "fail"}]),
                                "/automation/runs/0: green with a scenario not pass"),
            "unstable commit": (run_field(0, green=False, outcomes=[{"scenario": "S-1", "outcome": "fail"}]),
                                "/automation/commit: needs >= 2 green runs on the committed spec set"),
            "spec set changed": (lambda run: run["automation"]["specs"][0].update(sha256="e" * 64),
                                 "/automation/commit: needs the last review Approved on the committed spec set"),
            "approved at 9": (review_field(score=9), "/automation/reviews/0: verdict Approved needs score 10"),
            "approved with lint": (review_field(lint_findings=1), "verdict Approved needs score 10 and 0 lint findings"),
            "round numbering": (review_field(round=2), "/automation/reviews/0: round must be 1"),
            "four rounds": (extra_reviews, f"/automation/reviews: 4 rounds > max {MAX_REVIEW_ROUNDS}"),
            "commit without subject": (auto(subject=None), "/automation/commit: needs subject"),
            "subject marker": (auto(subject="x ns-qa:run=1"), "/automation/subject: subject must not contain the marker"),
            "pushed without commit": (auto(commit=None, mr=None), "/automation/pushed: needs commit"),
            "mr without push": (auto(pushed=False), "/automation/mr: needs pushed branch"),
            "mr url": (auto(mr={"iid": 6, "url": MR_URL}), "/automation/mr: MR url must be"),
            "publication before q8": (published_without_q8, "/publication: at L3 Q8 (passed or skipped) runs before Q9"),
        }
        for name, (mutate, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._check(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)


class L2PreviewUnchangedTests(unittest.TestCase):
    def test_no_automation_row_below_l3(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            profile, run_dir = write_publishable_run(root)
            code, payload = run_publish(["preview", "--run-dir", str(run_dir), "--profile", str(profile),
                                         "--repo", str(root)], cwd=root)
            self.assertEqual(code, 0, payload)
            text = (run_dir / "preview.md").read_text(encoding="utf-8")
            self.assertNotIn("E2E merge request", text)
            self.assertNotIn("E2E automation", text)


class AutomationSyncTests(unittest.TestCase):
    """Defaults and limits in code = template + docs."""

    def test_defaults_match_template_and_doc(self):
        template = filled_profile_text()
        self.assertIn(f"stability_runs: {STABILITY_RUNS}\n", template)
        self.assertIn(f"e2e_reviewer: {E2E_REVIEWER}\n", template)
        self.assertIn(f"remote: {E2E_REMOTE}\n", template)
        doc = EXECUTION_DOC.read_text(encoding="utf-8")
        self.assertIn(f"| `stability_runs` | — | int ≥2 | `{STABILITY_RUNS}` |", doc)
        self.assertIn(f"| `e2e_git.remote` | — | remote name | `{E2E_REMOTE}` |", doc)
        schema = json.loads((SKILL / "templates" / "qa-profile.schema.json").read_text(encoding="utf-8"))
        self.assertEqual(schema["properties"]["execution"]["properties"]["stability_runs"]["minimum"], 2)

    def test_handoff_doc_names_subcommands_rounds_and_rules(self):
        from qa_automation import _COMMANDS
        from lint_e2e_antipatterns import RULES

        doc = HANDOFF_DOC.read_text(encoding="utf-8")
        for command in _COMMANDS:
            self.assertIn(f"`{command}", doc)
        self.assertIn(f"max {MAX_REVIEW_ROUNDS} rounds", doc)
        review = REVIEW_DOC.read_text(encoding="utf-8")
        for rule in RULES:
            self.assertIn(f"`{rule}`", review)

    def test_automation_defaults_env_names_documented(self):
        doc = HANDOFF_DOC.read_text(encoding="utf-8")
        self.assertIn("AGENT_GIT_AUTHOR_NAME", doc)


if __name__ == "__main__":
    unittest.main()
