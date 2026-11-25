#!/usr/bin/env python3
"""Tests for run.json (--check-run), qa-env output (--check-env), the Q10 cleanup
planner and the qa-env template script. Stdlib only; offline: docker, git and the
stack tool are PATH stubs that only log their argv.

Every rejection asserts its specific reason so an unrelated rule cannot make it pass.
"""

from __future__ import annotations

import json
import os
import shlex
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    ENV_TEMPLATE,
    RUN_ID,
    RUN_NS,
    SKILL,
    base_run,
    clone,
    env_output,
    filled_profile_text,
    run_cleanup_plan,
    run_gate,
    write_json,
)
from qa_common import RESOURCE_ID_PATTERN  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)

RUN_DB = "qa_42_20261124t1200z"
FOREIGN_NS = "qa-142-20261124t1200z"  # another run whose iid ends with this run's iid
UNSAFE_IDS = (
    f"{RUN_NS}-app-1; rm -rf ~",
    f".worktrees/{RUN_NS} $(touch pwned)",
    f"{RUN_NS}`id`",
    f"{RUN_NS}$(id)",
    f"-{RUN_NS}",
    f"--force-{RUN_NS}",
    f"{RUN_NS}\nx",
    f"{RUN_NS}\tx",
    f"~/{RUN_NS}",
    f"/srv/.worktrees/{RUN_NS}",
    f"docs/qa/../{RUN_ID}",
)
_DOTDOT_LOOKAHEAD = "(?!.*\\.\\.)"


class ReasonAssertions(unittest.TestCase):
    def assertReason(self, errors: list[str], expected: str):
        self.assertTrue(any(expected in error for error in errors), f"{expected!r} not in {errors}")


def _open_pause(reason: str, phase: str = "Q6") -> dict:
    return {"at": "2026-11-24T13:00Z", "phase": phase, "reason": reason, "resolved_at": None, "answer": None}


def _set(path: list, value):
    def mutate(payload: dict) -> None:
        node = payload
        for key in path[:-1]:
            node = node[key]
        node[path[-1]] = value

    return mutate


def _completed_at(level: str, phases: tuple[str, ...]):
    def mutate(run: dict) -> None:
        run["level"]["effective"] = level
        run["level"]["declared"] = "L3"
        run["phases"] += [{"phase": phase, "state": "passed", "updated_at": "2026-11-24T14:00Z"} for phase in phases]
        run["phase"] = phases[-1]

    return mutate


class ResourceIdPatternSyncTests(unittest.TestCase):
    """One id rule: qa_common constant = both schemas = template (template checks '..' separately)."""

    def test_pattern_shared(self):
        for name in ("qa-run.schema.json", "qa-env-output.schema.json"):
            schema = json.loads((SKILL / "templates" / name).read_text(encoding="utf-8"))
            self.assertEqual(schema["$defs"]["resourceId"]["pattern"], RESOURCE_ID_PATTERN, name)
        template = ENV_TEMPLATE.read_text(encoding="utf-8")
        shell_pattern = RESOURCE_ID_PATTERN.replace(_DOTDOT_LOOKAHEAD, "")
        self.assertIn(f"ID_PATTERN='{shell_pattern}'", template)
        self.assertIn("[[ $1 != *..* ]]", template)


class CheckRunTests(ReasonAssertions):
    def _run(self, mutate=None, raw: str | None = None) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "run.json"
            if raw is not None:
                path.write_text(raw, encoding="utf-8")
            else:
                run = clone(base_run())
                if mutate:
                    mutate(run)
                write_json(path, run)
            return run_gate(["--check-run", str(path)])

    def test_valid_manifest(self):
        code, payload = self._run()
        self.assertEqual(code, 0, payload)
        self.assertEqual((payload["mode"], payload["paused"], payload["open_pause"]), ("run", False, None))

    def test_open_pause_reported_not_rejected(self):
        code, payload = self._run(lambda run: run["pauses"].append(_open_pause("stall")))
        self.assertEqual(code, 0, payload)
        self.assertTrue(payload["paused"])
        self.assertEqual(payload["open_pause"]["reason"], "stall")

    def test_url_provider_with_agent_resources_only(self):
        def url_provider(run):
            run["environment"]["provider"] = "url"
            run["created_resources"] = [item for item in run["created_resources"] if item["via"] == "agent"]

        code, payload = self._run(url_provider)
        self.assertEqual(code, 0, payload)

    def test_ownership_is_boundary_aware(self):
        for rid in (f"{RUN_DB}_db", "QA-42-20261124T1200Z-web", f"x.{RUN_ID}.y", "42.20261124t1200z", "qa4220261124t1200z"):
            with self.subTest(accepted=rid):
                code, payload = self._run(_set(["created_resources", 5, "id"], rid))
                self.assertEqual(code, 0, payload)
        for rid in (f"{FOREIGN_NS}-app-1", f"{RUN_NS}9", f"{RUN_NS}a", "qa-4220261124t1201z"):
            with self.subTest(rejected=rid):
                code, payload = self._run(_set(["created_resources", 5, "id"], rid))
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], "id does not embed run_id 42-20261124T1200Z (not run-owned)")

    def test_unsafe_ids_rejected(self):
        for rid in UNSAFE_IDS:
            with self.subTest(id=rid):
                code, payload = self._run(_set(["created_resources", 5, "id"], rid))
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], "/created_resources/5/id: does not match")

    def test_rejections_exit_2(self):
        def resources(run):
            return run["created_resources"]

        def duplicate(run):
            resources(run).append(dict(resources(run)[-1]))

        def agent_container(run):
            resources(run)[-1]["via"] = "agent"

        def qa_env_evidence(run):
            resources(run)[0]["via"] = "qa-env"

        def url_with_qa_env(run):
            run["environment"]["provider"] = "url"

        def none_with_qa_env(run):
            run["environment"]["provider"] = "none"

        def level_above_declared(run):
            run["level"]["effective"] = "L3"

        def phase_not_passed(run):
            run["phases"][-1]["state"] = "running"

        def duplicate_phase(run):
            run["phases"].append(dict(run["phases"][0]))

        def half_resolved_pause(run):
            run["pauses"][0]["answer"] = None

        def two_open_pauses(run):
            for reason in ("stall", "preview_approval"):
                run["pauses"].append(_open_pause(reason, "Q9"))

        def checkpoint_gap(run):
            run["checkpoints"].append({"window": 3, "at": "2026-11-24T14:00Z", "decision": "continue"})

        def pending_not_last(run):
            run["checkpoints"][0]["decision"] = "pending"
            run["checkpoints"].append({"window": 2, "at": "2026-11-24T14:00Z", "decision": "continue"})

        cases = {
            duplicate: f"duplicate resource container:{RUN_NS}-app-1",
            agent_container: "kind container cannot be created via agent",
            qa_env_evidence: "kind evidence_dir cannot be created via qa-env",
            url_with_qa_env: "provider url has no qa-env script",
            none_with_qa_env: "provider none has no qa-env script",
            level_above_declared: "effective L3 above declared L2",
            phase_not_passed: "/phase: Q7 must have state passed",
            duplicate_phase: "/phases: duplicate phase Q0",
            half_resolved_pause: "/pauses/0: resolved_at and answer must be set together",
            two_open_pauses: "2 open pauses",
            checkpoint_gap: "/checkpoints/1: window must be 2",
            pending_not_last: "/checkpoints/0: only the last checkpoint may be pending",
            _set(["created_resources", 0, "kind"], "network"): "/created_resources/0/kind: must be one of",
            _set(["run_id"], "run-42"): "/run_id: does not match",
            _set(["created_resources", 0, "created_at"], "yesterday"): "/created_resources/0/created_at: does not",
            _set(["pauses", 0, "answer"], "maybe"): "/pauses/0/answer: must be one of",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=getattr(mutate, "__name__", reason)):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_unreadable_exit_3(self):
        code, payload = self._run(raw="{not json")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "run: invalid JSON")
        code, payload = run_gate(["--check-run", "/nonexistent/run.json"])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "run:")


def _stopped_down(**payload) -> dict:
    base = {"ok": False, "error": "stopped", "removed": [], "failed": {"kind": "volume", "id": f"{RUN_NS}_db", "reason": "x"}}
    return env_output("down", **{**base, **payload})


class CheckEnvTests(ReasonAssertions):
    def _run(self, output: object, *extra: str) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            path = write_json(Path(tmp) / "out.json", output)
            return run_gate(["--check-env", str(path), *extra])

    def test_every_command_valid(self):
        for command in ("up", "health", "seed", "reset", "down", "info"):
            with self.subTest(command=command):
                code, payload = self._run(env_output(command), "--run-id", RUN_ID)
                self.assertEqual(code, 0, payload)
                self.assertEqual(payload["command"], command)

    def test_failed_outputs_that_keep_the_contract(self):
        cases = {
            "up": env_output("up", ok=False, error="compose up failed"),
            "health": env_output(
                "health", ok=False, error="unhealthy", checks=[{"name": "app", "ok": False, "detail": "exited"}]
            ),
            "down_refused": env_output("down", ok=False, error="not in run.json", removed=[]),
            "down_stopped": _stopped_down(skipped=[{"kind": "image", "id": f"{RUN_NS}-app:latest"}]),
        }
        for name, output in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(output)
                self.assertEqual(code, 0, payload)

    def test_up_reports_created_resources(self):
        code, payload = self._run(env_output("up"))
        self.assertEqual(payload["created_resources"], [{"kind": "container", "id": f"{RUN_NS}-app-1"}], payload)
        self.assertEqual(code, 0)

    def test_unsafe_ids_rejected_everywhere(self):
        for rid in UNSAFE_IDS:
            resource = [{"kind": "container", "id": rid}]
            outputs = {
                "created_resources": (env_output("up", created_resources=resource), "/id: does not match"),
                "removed": (env_output("down", removed=resource), "/id: does not match"),
                "skipped": (_stopped_down(skipped=resource), "/id: does not match"),
                "failed": (
                    _stopped_down(failed={"kind": "volume", "id": rid, "reason": "x"}),
                    "/failed: does not match any allowed shape",
                ),
            }
            for where, (output, reason) in outputs.items():
                with self.subTest(id=rid, where=where):
                    code, payload = self._run(output)
                    self.assertEqual(code, 2, payload)
                    self.assertReason(payload["errors"], reason)

    def test_rejections_exit_2(self):
        foreign = {"kind": "container", "id": f"{FOREIGN_NS}-app-1"}
        volume = {"kind": "volume", "id": f"{RUN_NS}_db"}
        cases = {
            "foreign key": (env_output("health", commit="abc1234"), "/commit: not allowed for command health"),
            "ok with error": (env_output("seed", error="boom"), "/error: must be null when ok is true"),
            "failure without error": (env_output("seed", ok=False), "/error: required when ok is false"),
            "health ok mismatch": (
                env_output("health", checks=[{"name": "app", "ok": False, "detail": "down"}]),
                "health ok must equal every check ok",
            ),
            "health without checks": (env_output("health", checks=[]), "health ok must equal every check ok"),
            "down ok with failure": (
                env_output("down", failed={**volume, "reason": "busy"}),
                "down cannot be ok when a removal failed",
            ),
            "info without commit": (env_output("info", commit=None), "/commit: info must report the deployed commit"),
            "foreign created": (
                env_output("up", created_resources=[{"kind": "image", "id": "postgres:16"}]),
                "/created_resources/image:postgres:16: id does not embed run_id",
            ),
            "other run created": (
                env_output("up", created_resources=[foreign]),
                f"/created_resources/container:{FOREIGN_NS}-app-1: id does not embed run_id",
            ),
            "foreign removed": (
                env_output("down", removed=[foreign]),
                f"/removed/container:{FOREIGN_NS}-app-1: id does not embed run_id",
            ),
            "foreign skipped": (
                _stopped_down(skipped=[foreign]),
                f"/skipped/container:{FOREIGN_NS}-app-1: id does not embed run_id",
            ),
            "duplicate created": (
                env_output("up", created_resources=[volume, volume]),
                f"/created_resources: duplicate resource volume:{RUN_NS}_db",
            ),
            "duplicate removed": (
                env_output("down", removed=[volume, volume]),
                f"/removed: duplicate resource volume:{RUN_NS}_db",
            ),
            "duplicate skipped": (
                _stopped_down(skipped=[foreign | {"id": f"{RUN_NS}-a"}] * 2),
                f"/skipped: duplicate resource container:{RUN_NS}-a",
            ),
            "data ref without run id": (
                env_output("seed", data=[{"entity": "user", "ref": "QA Bot", "data_source": "real"}]),
                "ref QA Bot does not embed run_id",
            ),
            "duplicate url name": (
                env_output("info", urls=[{"name": "app", "url": "a"}, {"name": "app", "url": "b"}]),
                "/urls: duplicate name app",
            ),
            "evidence from qa-env": (
                env_output("up", created_resources=[{"kind": "evidence_dir", "id": f"docs/qa/{RUN_ID}"}]),
                "/created_resources/0/kind: must be one of",
            ),
            "intercept seeded": (
                env_output("seed", data=[{"entity": "u", "ref": f"x-{RUN_ID}", "data_source": "response_intercept"}]),
                "/data/0/data_source: must be one of",
            ),
            "unknown command": ({**env_output("up"), "command": "restart"}, "/command: must be one of"),
        }
        for name, (output, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(output)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_run_id_mismatch(self):
        code, payload = self._run(env_output("info"), "--run-id", "7-20261124T1200Z")
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], f"/run_id: {RUN_ID} != expected 7-20261124T1200Z")

    def test_not_json_exit_3(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.json"
            path.write_text("compose: starting...\n", encoding="utf-8")
            code, payload = run_gate(["--check-env", str(path)])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "qa-env output: invalid JSON")


FULL_SUCCESS = "on_full_success: [containers, volumes, images, worktrees, evidence]"


class CleanupPlanTests(ReasonAssertions):
    def _plan(self, outcome: str, mutate=None, profile: str | None = None) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run = clone(base_run())
            if mutate:
                mutate(run)
            args = ["--run", str(write_json(Path(tmp) / "run.json", run)), "--outcome", outcome]
            if profile is not None:
                profile_path = Path(tmp) / "qa-profile.md"
                profile_path.write_text(profile, encoding="utf-8")
                args += ["--profile", str(profile_path)]
            return run_cleanup_plan(args)

    def test_success_l1_orders_steps_and_keeps_local_report(self):
        code, plan = self._plan("success")
        self.assertEqual(code, 0, plan)
        self.assertEqual(
            [(step["order"], step["kind"]) for step in plan["steps"]],
            [(1, "container"), (2, "volume"), (3, "database"), (4, "image"), (5, "worktree"), (6, "evidence_dir")],
        )
        evidence = plan["steps"][-1]
        self.assertEqual((evidence["action"], evidence["argv"], evidence["command"]), ("delete_except", None, None))
        self.assertEqual(evidence["keep_files"], ["report.md", "qa-ledger.json"])
        container = plan["steps"][0]
        manifest = container["argv"][5]
        self.assertTrue(manifest.endswith("run.json"), container)
        self.assertEqual(
            container["argv"],
            ["<environment.script>", "down", "--run", RUN_ID, "--manifest", manifest,
             "--resource", f"container:{RUN_NS}-app-1"],
        )
        self.assertEqual(shlex.split(container["command"]), container["argv"])
        self.assertIn("never --force", " ".join(plan["steps"][4]["preconditions"]))
        self.assertEqual(plan["keep"], [])
        self.assertTrue(plan["run_q10"])
        self.assertIn(f"run={RUN_ID} outcome=success level=L1 planned=6 kept=0", plan["log_line"])
        self.assertEqual(plan["log_path"], "docs/qa/cleanup.log")

    def test_agent_worktree_command_is_argv_without_force(self):
        def agent_worktree(run):
            run["created_resources"][1].update(id=f".worktrees/{RUN_NS}-e2e", via="agent")

        code, plan = self._plan("success", agent_worktree)
        self.assertEqual(code, 0, plan)
        step = next(item for item in plan["steps"] if item["kind"] == "worktree")
        self.assertEqual(step["argv"], ["git", "worktree", "remove", f".worktrees/{RUN_NS}-e2e"])
        self.assertNotIn("--force", step["command"])

    def test_commands_are_shell_quoted(self):
        profile = filled_profile_text({"script: scripts/qa-env.sh": 'script: "scripts/qa env;x.sh"'})
        code, plan = self._plan("success", profile=profile)
        self.assertEqual(code, 0, plan)
        step = plan["steps"][0]
        self.assertEqual(step["argv"][0], "scripts/qa env;x.sh")
        self.assertTrue(step["command"].startswith("'scripts/qa env;x.sh' down --run"), step["command"])
        self.assertEqual(shlex.split(step["command"]), step["argv"])

    def test_success_l2_l3_delete_whole_evidence_dir(self):
        for level, phases in (("L2", ("Q7b", "Q9")), ("L3", ("Q7b", "Q8", "Q9"))):
            with self.subTest(level=level):
                code, plan = self._plan("success", _completed_at(level, phases))
                self.assertEqual(code, 0, plan)
                self.assertEqual(plan["steps"][-1]["action"], "delete")
                self.assertNotIn("keep_files", plan["steps"][-1])

    def test_success_l1_with_score_phase(self):
        def scored(run):
            run["phases"].append({"phase": "Q7b", "state": "passed", "updated_at": "2026-11-24T14:00Z"})
            run["phase"] = "Q7b"

        code, plan = self._plan("success", scored)
        self.assertEqual(code, 0, plan)
        code, payload = self._plan("success", lambda run: scored(run) or run.update(phase="Q7"))
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "/phase: Q7 is not the final gate Q7b for L1")

    def test_success_rejected_unless_every_gate_passed(self):
        def at_q0(run):
            run["phases"] = run["phases"][:1]
            run["phase"] = "Q0"

        def failed_q6(run):
            run["phases"][6]["state"] = "failed"

        def running_q8(run):
            run["phases"].append({"phase": "Q8", "state": "running", "updated_at": "2026-11-24T14:00Z"})

        def l3_without_q8(run):
            _completed_at("L3", ("Q7b", "Q9"))(run)

        def l2_at_q7(run):
            run["level"]["effective"] = "L2"

        cases = {
            at_q0: "/phases: Q7 not passed (required for success at L1)",
            failed_q6: "/phases: Q6 is failed: run not complete",
            running_q8: "/phases: Q8 is running: run not complete",
            l3_without_q8: "/phases: Q8 not passed (required for success at L3)",
            l2_at_q7: "/phase: Q7 is not the final gate Q9 for L2",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._plan("success", mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], "outcome success not proven by run.json " + reason)
        code, plan = self._plan("blocked", failed_q6)
        self.assertEqual((code, plan["steps"]), (0, []))

    def test_each_required_gate_alone_blocks_success(self):
        def drop(phase: str, setup=None):
            def mutate(run):
                if setup:
                    setup(run)
                run["phases"] = [item for item in run["phases"] if item["phase"] != phase]

            mutate.__name__ = f"missing_{phase}"
            return mutate

        cases = (
            (drop("Q0"), "Q0", "L1"),
            (drop("Q6"), "Q6", "L1"),
            (drop("Q7b", _completed_at("L2", ("Q7b", "Q9"))), "Q7b", "L2"),
            (drop("Q8", _completed_at("L3", ("Q7b", "Q8", "Q9"))), "Q8", "L3"),
        )
        for mutate, phase, level in cases:
            with self.subTest(case=mutate.__name__):
                code, payload = self._plan("success", mutate)
                self.assertEqual(code, 2, payload)
                self.assertEqual(
                    payload["errors"],
                    [f"outcome success not proven by run.json /phases: {phase} not passed (required for success at {level})"],
                )

    def test_effective_l0_never_runs_q10(self):
        for outcome in ("success", "leftover", "blocked"):
            with self.subTest(outcome=outcome):
                code, plan = self._plan(outcome, _set(["level", "effective"], "L0"))
                self.assertEqual(code, 0, plan)
                summary = (plan["run_q10"], plan["steps"], plan["log_path"], plan["log_line"])
                self.assertEqual(summary, (False, [], None, None))
                self.assertEqual(len(plan["keep"]), 6)
                self.assertReason([item["reason"] for item in plan["keep"]], "effective L0: Q10 never runs")

    def test_profile_narrows_cleanup(self):
        profile = filled_profile_text(
            {
                FULL_SUCCESS: "on_full_success: [containers, volumes]",
                "keep_local_report_at_L1: true": "keep_local_report_at_L1: false",
                "log: docs/qa/cleanup.log": "log: docs/qa/custom-cleanup.log",
            }
        )
        code, plan = self._plan("success", profile=profile)
        self.assertEqual(code, 0, plan)
        self.assertEqual([step["kind"] for step in plan["steps"]], ["container", "volume", "database"])
        self.assertEqual(plan["steps"][0]["argv"][0], "scripts/qa-env.sh")
        kept = {item["kind"]: item["reason"] for item in plan["keep"]}
        self.assertEqual(kept["image"], "cleanup.on_full_success excludes images")
        self.assertEqual(kept["worktree"], "cleanup.on_full_success excludes worktrees")
        self.assertEqual(kept["evidence_dir"], "cleanup.on_full_success excludes evidence")
        self.assertEqual(plan["log_path"], "docs/qa/custom-cleanup.log")

    def test_profile_excluding_one_category(self):
        for category, kind in (("containers", "container"), ("worktrees", "worktree"), ("images", "image")):
            with self.subTest(category=category):
                narrowed = FULL_SUCCESS.replace(f"{category}, ", "")
                code, plan = self._plan("success", profile=filled_profile_text({FULL_SUCCESS: narrowed}))
                self.assertEqual(code, 0, plan)
                kept = [(item["kind"], item["reason"]) for item in plan["keep"]]
                self.assertEqual(kept, [(kind, f"cleanup.on_full_success excludes {category}")])
                self.assertNotIn(kind, [step["kind"] for step in plan["steps"]])

    def test_profile_without_l1_report_deletes_whole_evidence_dir(self):
        profile = filled_profile_text({"keep_local_report_at_L1: true": "keep_local_report_at_L1: false"})
        code, plan = self._plan("success", profile=profile)
        self.assertEqual(code, 0, plan)
        self.assertEqual(plan["steps"][-1]["action"], "delete")

    def test_invalid_profile_exit_3(self):
        cases = {
            "unknown cleanup key": ("  scope: run_owned_only\n", "  scope: run_owned_only\n  bogus: 1\n", "unknown key 'bogus'"),
            "on_full_success scalar": (FULL_SUCCESS, "on_full_success: 5", "/cleanup/on_full_success: expected array"),
            "keep flag not bool": (
                "keep_local_report_at_L1: true",
                "keep_local_report_at_L1: maybe",
                "/cleanup/keep_local_report_at_L1: expected boolean",
            ),
        }
        for name, (old, new, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._plan("success", profile=filled_profile_text({old: new}))
                self.assertEqual(code, 3, payload)
                self.assertReason(payload["errors"], reason)
        whole = filled_profile_text()
        start, end = whole.index("\ncleanup:\n") + 1, whole.index("\nverdict:\n") + 1
        code, payload = self._plan("success", profile=whole[:start] + "cleanup: x\n\n" + whole[end:])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "profile /cleanup: expected object")
        code, payload = self._plan("success", profile="no yaml block here\n")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "profile:")

    def test_failure_outcomes_keep_everything(self):
        for outcome, reason in (
            ("blocked", "verdict Blocked"),
            ("gate_failure", "kept for diagnosis"),
            ("upload_partial", "captures not uploaded"),
            ("incomplete", "kept until a human decides"),
        ):
            with self.subTest(outcome=outcome):
                code, plan = self._plan(outcome)
                self.assertEqual(code, 0, plan)
                self.assertEqual(plan["steps"], [])
                self.assertEqual(len(plan["keep"]), 6)
                self.assertReason([item["reason"] for item in plan["keep"]], reason)
                self.assertTrue(plan["run_q10"])

    def test_leftover_removes_only_qa_env_resources(self):
        code, plan = self._plan("leftover")
        self.assertEqual(code, 0, plan)
        kinds = [step["kind"] for step in plan["steps"]]
        self.assertEqual(kinds, ["container", "volume", "database", "image", "worktree"])
        self.assertEqual({step["via"] for step in plan["steps"]}, {"qa-env"})
        self.assertEqual([item["kind"] for item in plan["keep"]], ["evidence_dir"])

    def test_paused_runs_no_cleanup(self):
        def open_pause(run):
            run["pauses"].append(_open_pause("preview_approval", "Q9"))

        code, plan = self._plan("paused", open_pause)
        self.assertEqual(code, 0, plan)
        self.assertEqual((plan["run_q10"], plan["steps"], plan["log_line"]), (False, [], None))
        self.assertEqual(len(plan["keep"]), 6)

        code, payload = self._plan("success", open_pause)
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "open pause: outcome must be paused, got success")

        code, payload = self._plan("paused")
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "outcome paused but run.json has no open pause")

    def test_invalid_run_rejected(self):
        code, payload = self._plan("success", lambda run: run["created_resources"][-1].update(id="daily_backend_app"))
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "run.json /created_resources/container:daily_backend_app")
        code, payload = self._plan("success", lambda run: run["created_resources"][-1].update(id=UNSAFE_IDS[0]))
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "run.json /created_resources/5/id: does not match")

    def test_bad_input_exit_3(self):
        code, payload = run_cleanup_plan(["--run", "/nonexistent/run.json", "--outcome", "success"])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "run:")
        code, payload = self._plan("finished")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "usage:")


_DOCKER_STUB = r"""#!/usr/bin/env bash
printf 'docker %s\n' "$*" >>"$STUB_LOG"
if [ -n "${STUB_FAIL:-}" ] && [[ "$*" == *"$STUB_FAIL"* ]]; then exit 1; fi
case $1 in
  compose)
    shift
    while [ $# -gt 0 ]; do case $1 in -p | --project-directory | -f) shift 2 ;; *) break ;; esac; done
    case $1 in
      ps) if [ -n "${STUB_PS:-}" ]; then printf '%s\n' "$STUB_PS"; fi ;;
      port) echo "0.0.0.0:49153" ;;
    esac ;;
  volume) if [ "$2" = ls ] && [ -n "${STUB_VOLUMES:-}" ]; then printf '%s\n' "$STUB_VOLUMES"; fi ;;
  image) if [ "$2" = ls ] && [ -n "${STUB_IMAGES:-}" ]; then printf '%s\n' "$STUB_IMAGES"; fi ;;
  inspect) echo running ;;
esac
exit 0
"""

_GIT_STUB = r"""#!/usr/bin/env bash
printf 'git %s\n' "$*" >>"$STUB_LOG"
if [ -n "${STUB_FAIL:-}" ] && [[ "$*" == *"$STUB_FAIL"* ]]; then exit 1; fi
if [ "$1 $2" = "worktree add" ]; then mkdir -p "${@: -2:1}"; fi
if [ "$1 $2" = "worktree remove" ]; then rmdir "$3"; fi
case $* in *rev-parse*) echo abc1234def5678 ;; esac
exit 0
"""

_STACK_STUB = r"""#!/usr/bin/env bash
printf 'stack %s\n' "$*" >>"$STUB_LOG"
case $1 in
  resources) if [ -n "${STUB_STACK_RESOURCES:-}" ]; then printf '%s\n' "$STUB_STACK_RESOURCES"; fi ;;
  urls) if [ -z "${STUB_NO_URLS:-}" ]; then printf 'app\thttp://localhost:4000\n'; fi ;;
  commit) echo abc1234def5678 ;;
  health) if [ -n "${STUB_STACK_HEALTH:-}" ]; then printf '%s\n' "$STUB_STACK_HEALTH"; fi ;;
esac
exit 0
"""

_REMOVAL_WORDS = ("docker rm", "volume rm", "image rm", "worktree remove", "stack remove", "drop ")


@unittest.skipUnless(shutil.which("bash"), "bash required")
class EnvTemplateTests(ReasonAssertions):
    """templates/qa-env.template.sh, offline: fixed_url needs no tool; compose/slot use PATH stubs."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        for name, body in (("docker", _DOCKER_STUB), ("git", _GIT_STUB), ("stack", _STACK_STUB)):
            (bin_dir / name).write_text(body, encoding="utf-8")
            (bin_dir / name).chmod(0o755)
        self.log = self.tmp / "calls.log"
        self.log.write_text("", encoding="utf-8")
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
            "STUB_LOG": str(self.log),
            "QA_ENV_PROVIDER": "fixed_url",
            "QA_ENV_APP_URL": "http://app.invalid",
            "QA_ENV_API_URL": "http://api.invalid",
            "QA_ENV_COMPOSE_FILE": "compose.yml",
            "QA_ENV_APP_SERVICE": "web",
            "QA_ENV_APP_PORT": "80",
            "QA_ENV_API_SERVICE": "api",
            "QA_ENV_API_PORT": "3000",
            "QA_ENV_DROP_DATABASE_CMD": 'echo "drop $1" >>"$STUB_LOG"',
            "QA_ENV_STACK_CMD": str(bin_dir / "stack"),
        }

    def tearDown(self):
        self._tmp.cleanup()

    def _script(self, *args: str, **env: str) -> tuple[int, str]:
        result = subprocess.run(
            ["bash", str(ENV_TEMPLATE), *args],
            text=True,
            capture_output=True,
            cwd=str(self.tmp),
            env={**self.env, **env},
            check=False,
        )
        return result.returncode, result.stdout

    def _checked(self, stdout: str) -> dict:
        path = self.tmp / "out.json"
        path.write_text(stdout, encoding="utf-8")
        code, payload = run_gate(["--check-env", str(path), "--run-id", RUN_ID])
        self.assertEqual(code, 0, (payload, stdout))
        return json.loads(stdout)

    def _manifest(self, mutate=None) -> str:
        run = clone(base_run())
        if mutate:
            mutate(run)
        write_json(self.tmp / "run.json", run)
        return "run.json"

    def _calls(self) -> str:
        return self.log.read_text(encoding="utf-8")

    def assertNoRemoval(self):
        calls = self._calls()
        self.assertFalse(any(word in calls for word in _REMOVAL_WORDS), calls)

    def test_syntax(self):
        result = subprocess.run(["bash", "-n", str(ENV_TEMPLATE)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_fixed_url_outputs_keep_contract(self):
        seed = 'printf "user\\tQA ${QA_DATA_PREFIX}${QA_RUN_ID}\\treal\\n"'
        self._manifest()
        calls = {
            "up": (["up", "--run", RUN_ID, "--ref", "main"], {}, 0),
            "seed": (["seed", "--run", RUN_ID, "--prefix", "bot-"], {"QA_ENV_SEED_CMD": seed}, 0),
            "seed failure": (["seed", "--run", RUN_ID, "--prefix", "bot-"], {"QA_ENV_SEED_CMD": "exit 3"}, 1),
            "down nothing owned": (["down", "--run", RUN_ID, "--manifest", "run.json"], {}, 1),
        }
        for name, (args, env, expected) in calls.items():
            with self.subTest(call=name):
                code, stdout = self._script(*args, **env)
                self.assertEqual(code, expected, stdout)
                self._checked(stdout)

    def test_empty_middle_field_keeps_columns(self):
        code, stdout = self._script("seed", "--run", RUN_ID, "--prefix", "p-", QA_ENV_SEED_CMD='printf "user\\t\\treal\\n"')
        self.assertEqual(code, 0, stdout)
        self.assertEqual(json.loads(stdout)["data"], [{"entity": "user", "ref": "", "data_source": "real"}])

    def test_control_characters_never_break_json(self):
        seed = f'printf "u\\033x\\t{RUN_ID}\\"q\\treal\\n"'
        code, stdout = self._script("seed", "--run", RUN_ID, "--prefix", "p-", QA_ENV_SEED_CMD=seed)
        self.assertEqual(code, 0, stdout)
        self.assertEqual(json.loads(stdout)["data"], [{"entity": "ux", "ref": f'{RUN_ID}"q', "data_source": "real"}])

    def test_compose_up_registers_run_owned_resources(self):
        code, stdout = self._script(
            "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="compose",
            STUB_PS=f"{RUN_NS}-web-1", STUB_VOLUMES=f"{RUN_NS}_data", STUB_IMAGES=f"{RUN_NS}-web:latest",
        )
        self.assertEqual(code, 0, stdout)
        output = self._checked(stdout)
        expected = [
            ("container", f"{RUN_NS}-web-1"),
            ("image", f"{RUN_NS}-web:latest"),
            ("volume", f"{RUN_NS}_data"),
            ("worktree", f".worktrees/{RUN_NS}"),
        ]
        self.assertEqual(sorted((item["kind"], item["id"]) for item in output["created_resources"]), expected)
        self.assertEqual(output["commit"], "abc1234def5678")

    def test_compose_up_with_foreign_collected_id_exits_1(self):
        code, stdout = self._script(
            "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="compose", STUB_PS=f"{RUN_NS}-web-1\n{FOREIGN_NS}-web-1",
        )
        self.assertEqual(code, 1, stdout)
        output = self._checked(stdout)
        self.assertFalse(output["ok"])
        self.assertIn(f"container:{FOREIGN_NS}-web-1 is not run-owned", output["error"])
        self.assertNotIn(FOREIGN_NS, json.dumps(output["created_resources"]))
        self.assertIn(f"{RUN_NS}-web-1", json.dumps(output["created_resources"]))

    def test_compose_up_refuses_collected_ids_that_are_unsafe_or_not_this_run(self):
        for rid in (f"{RUN_NS}-é", f"{RUN_NS}a", f"{RUN_NS}-x;y"):
            with self.subTest(id=rid):
                code, stdout = self._script(
                    "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="compose", STUB_PS=f"{RUN_NS}-web-1\n{rid}",
                )
                self.assertEqual(code, 1, stdout)
                output = self._checked(stdout)
                self.assertIn("is not run-owned", output["error"])
                self.assertNotIn(rid, [item["id"] for item in output["created_resources"]])

    @unittest.skipUnless(
        "en_us.utf8" in subprocess.run(["locale", "-a"], capture_output=True, text=True, check=False).stdout.lower()
        .replace("-", ""),
        "en_US.UTF-8 locale not installed",
    )
    def test_utf8_locale_does_not_widen_id_ranges(self):
        locale = {"LC_ALL": "en_US.UTF-8", "LANG": "en_US.UTF-8"}
        code, stdout = self._script(
            "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="compose", STUB_PS=f"{RUN_NS}-é", **locale
        )
        self.assertEqual(code, 1, stdout)
        self.assertEqual(self._checked(stdout)["created_resources"], [{"kind": "worktree", "id": f".worktrees/{RUN_NS}"}])
        manifest = self._manifest(_set(["created_resources", 3, "id"], f"{RUN_NS}-ß"))
        code, stdout = self._script("down", "--run", RUN_ID, "--manifest", manifest, QA_ENV_PROVIDER="compose", **locale)
        self.assertEqual(code, 2, stdout)
        self.assertNoRemoval()

    def test_compose_up_failure_still_reports_created_resources(self):
        code, stdout = self._script(
            "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="compose", STUB_FAIL="up -d",
            STUB_PS=f"{RUN_NS}-web-1",
        )
        self.assertEqual(code, 1, stdout)
        output = self._checked(stdout)
        self.assertEqual(output["error"], "docker compose up failed")
        created = sorted((item["kind"], item["id"]) for item in output["created_resources"])
        self.assertEqual(created, [("container", f"{RUN_NS}-web-1"), ("worktree", f".worktrees/{RUN_NS}")])

    def test_down_resource_removes_only_that_resource(self):
        code, stdout = self._script(
            "down", "--run", RUN_ID, "--manifest", self._manifest(), "--resource", f"container:{RUN_NS}-app-1",
            QA_ENV_PROVIDER="compose",
        )
        self.assertEqual(code, 0, stdout)
        self.assertEqual(self._checked(stdout)["removed"], [{"kind": "container", "id": f"{RUN_NS}-app-1"}])
        calls = self._calls()
        self.assertIn(f"docker rm -f {RUN_NS}-app-1", calls)
        for other in ("volume rm", "image rm", "worktree remove", "drop "):
            self.assertNotIn(other, calls)

    def test_down_all_in_order_without_agent_resources(self):
        def with_agent_worktree(run):
            agent = {**run["created_resources"][1], "id": f".worktrees/{RUN_NS}-e2e", "via": "agent"}
            run["created_resources"].append(agent)

        (self.tmp / ".worktrees" / RUN_NS).mkdir(parents=True)
        (self.tmp / ".worktrees" / f"{RUN_NS}-e2e").mkdir(parents=True)
        manifest = self._manifest(with_agent_worktree)
        code, stdout = self._script("down", "--run", RUN_ID, "--manifest", manifest, QA_ENV_PROVIDER="compose")
        self.assertEqual(code, 0, stdout)
        output = self._checked(stdout)
        kinds = [item["kind"] for item in output["removed"]]
        self.assertEqual(kinds, ["container", "volume", "database", "image", "worktree"])
        calls = self._calls()
        self.assertNotIn(f"{RUN_NS}-e2e", calls)
        self.assertNotIn(f"docs/qa/{RUN_ID}", calls)
        self.assertIn(f"git worktree remove .worktrees/{RUN_NS}\n", calls)
        self.assertNotIn("--force", calls)
        self.assertIn(f"drop {RUN_DB}", calls)
        self.assertTrue((self.tmp / ".worktrees" / f"{RUN_NS}-e2e").is_dir())

    def test_down_manifest_of_another_run_refused(self):
        manifest = self._manifest(_set(["run_id"], "7-20261124T1200Z"))
        code, stdout = self._script("down", "--run", RUN_ID, "--manifest", manifest, QA_ENV_PROVIDER="compose")
        self.assertEqual(code, 2, stdout)
        self.assertIn("another run", self._checked(stdout)["error"])
        self.assertNoRemoval()

    def test_down_non_owned_listed_id_refused_before_any_removal(self):
        forged_line = f"{RUN_NS}_x\ncontainer\t{RUN_NS}-forged"  # both lines would look run-owned
        unsafe = (f"{FOREIGN_NS}_db", f"{RUN_NS}-x; touch pwned", f"-{RUN_NS}", f"{RUN_NS}\nvolume\tother", forged_line)
        for rid in unsafe:
            with self.subTest(id=rid):
                self.log.write_text("", encoding="utf-8")
                manifest = self._manifest(_set(["created_resources", 3, "id"], rid))
                code, stdout = self._script("down", "--run", RUN_ID, "--manifest", manifest, QA_ENV_PROVIDER="compose")
                self.assertEqual(code, 2, stdout)
                self.assertFalse(json.loads(stdout)["ok"])
                self.assertNoRemoval()
                self.assertFalse((self.tmp / "pwned").exists())

    def test_stopped_down_reports_skipped(self):
        (self.tmp / ".worktrees" / RUN_NS).mkdir(parents=True)
        code, stdout = self._script(
            "down", "--run", RUN_ID, "--manifest", self._manifest(), QA_ENV_PROVIDER="compose", STUB_FAIL="volume rm",
        )
        self.assertEqual(code, 1, stdout)
        output = self._checked(stdout)
        self.assertEqual(output["removed"], [{"kind": "container", "id": f"{RUN_NS}-app-1"}])
        self.assertEqual(output["failed"]["kind"], "volume")
        self.assertEqual([item["kind"] for item in output["skipped"]], ["database", "image", "worktree"])
        self.assertNotIn("image rm", self._calls())
        self.assertTrue((self.tmp / ".worktrees" / RUN_NS).is_dir())

    def test_worktree_removal_never_forced(self):
        (self.tmp / ".worktrees" / RUN_NS).mkdir(parents=True)
        code, stdout = self._script(
            "down", "--run", RUN_ID, "--manifest", self._manifest(), "--resource", f"worktree:.worktrees/{RUN_NS}",
            QA_ENV_PROVIDER="compose",
        )
        self.assertEqual(code, 0, stdout)
        self.assertEqual(self._calls().strip(), f"git worktree remove .worktrees/{RUN_NS}")

    def test_slot_provider(self):
        code, stdout = self._script(
            "up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="slot", STUB_STACK_RESOURCES=f"database\t{RUN_DB}",
        )
        self.assertEqual(code, 0, stdout)
        self.assertEqual(self._checked(stdout)["created_resources"], [{"kind": "database", "id": RUN_DB}])
        self.assertIn(f"stack create {RUN_NS} --ref abc1234", self._calls())
        code, stdout = self._script("up", "--run", RUN_ID, "--ref", "abc1234", QA_ENV_PROVIDER="slot", STUB_NO_URLS="1")
        self.assertEqual(code, 1, stdout)
        self.assertEqual(self._checked(stdout)["error"], "stack urls returned nothing")
        code, stdout = self._script("health", "--run", RUN_ID, QA_ENV_PROVIDER="slot", STUB_STACK_HEALTH="")
        self.assertEqual(code, 1, stdout)
        self.assertEqual(self._checked(stdout)["error"], "no health check ran")
        code, stdout = self._script("health", "--run", RUN_ID, QA_ENV_PROVIDER="slot", STUB_STACK_HEALTH="api\t\tdown")
        self.assertEqual(code, 1, stdout)
        self.assertEqual(self._checked(stdout)["checks"], [{"name": "api", "ok": False, "detail": "down"}])
        code, stdout = self._script("health", "--run", RUN_ID, QA_ENV_PROVIDER="slot", STUB_STACK_HEALTH="app\tok\t")
        self.assertEqual(code, 0, stdout)
        health = "api\tfail\tdown\tcode 503"  # tab inside the detail survives (internal separator is not tab)
        code, stdout = self._script("health", "--run", RUN_ID, QA_ENV_PROVIDER="slot", STUB_STACK_HEALTH=health)
        self.assertEqual(self._checked(stdout)["checks"], [{"name": "api", "ok": False, "detail": "down\tcode 503"}])
        code, stdout = self._script(
            "down", "--run", RUN_ID, "--manifest", self._manifest(), "--resource", f"database:{RUN_DB}",
            QA_ENV_PROVIDER="slot",
        )
        self.assertEqual(code, 0, stdout)
        self.assertIn(f"stack remove {RUN_NS} database {RUN_DB}", self._calls())

    def test_down_refuses_resource_outside_manifest(self):
        manifest = self._manifest(lambda run: run.update(created_resources=run["created_resources"][:1]))
        code, stdout = self._script(
            "down", "--run", RUN_ID, "--manifest", manifest, "--resource", f"container:{RUN_NS}-app-1"
        )
        self.assertEqual(code, 2, stdout)
        self.assertIn("is not a qa-env resource in run.json", json.loads(stdout)["error"])

    def test_usage_errors_exit_2(self):
        usages = (
            ["restart", "--run", RUN_ID],
            ["up", "--run", "bad"],
            ["up", "--run", RUN_ID],
            ["seed", "--run", RUN_ID],
            ["health", "--run"],
            ["health", "--run", "--ref"],
            ["down", "--run", RUN_ID, "--manifest"],
            ["up", "--run", "142-20261124T1200Z9", "--ref", "x"],
            ["health", "--run", "--ref", "x"],
            ["health", "--run", ""],
            ["seed", "--run", RUN_ID, "--prefix", "--x"],
            ["down", "--run", RUN_ID, "--manifest", ""],
            ["up", "--run", RUN_ID, "--ref", "-b"],
            ["up", "--run", RUN_ID, "--ref", "--upload-pack=x"],
        )
        for args in usages:
            with self.subTest(args=args):
                code, stdout = self._script(*args)
                self.assertEqual((code, stdout), (2, ""))


if __name__ == "__main__":
    unittest.main()
