#!/usr/bin/env python3
"""Unit + CLI tests for qa_gate.py and its modules. Stdlib only.

Every rejection case asserts the specific reason (error substring), so a test
cannot pass because some unrelated rule happened to fire.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import (
    ACCEPTANCE_YML,
    PLAN_YML,
    SKILL,
    base_ledger,
    filled_profile_text,
    run_gate,
    sha256_bytes,
    write_ledger,
    write_plan_run,
    write_repo_with_profile,
)
from qa_schema_lite import SchemaLite, SchemaLiteError, load_schema
from qa_yaml_lite import YamlLiteError, extract_yaml_block, parse


class ReasonAssertions(unittest.TestCase):
    def assertReason(self, errors: list[str], expected: str):
        self.assertTrue(any(expected in error for error in errors), f"{expected!r} not in {errors}")


class YamlLiteTests(ReasonAssertions):
    def test_nested_mapping_flow_and_scalars(self):
        result = parse(
            "a: 1\nb:\n  c: true\n  d: [x, \"y z\", 2.5]\n  e: { k: v, n: null }\nf: 'it''s'\ng: \"q\\\"t\"\n"
        )
        self.assertEqual(
            result.data,
            {"a": 1, "b": {"c": True, "d": ["x", "y z", 2.5], "e": {"k": "v", "n": None}}, "f": "it's", "g": 'q"t'},
        )

    def test_sequence_of_mappings_and_same_indent_sequence(self):
        result = parse("items:\n- id: A\n  n: 1\n- id: B\n  n: 2\nother:\n  - plain\n  - -1\n")
        self.assertEqual(result.data["items"], [{"id": "A", "n": 1}, {"id": "B", "n": 2}])
        self.assertEqual(result.data["other"], ["plain", -1])

    def test_inferred_marker_any_case_and_fail_closed(self):
        result = parse(
            "a:\n  b: x  # inferred\n  c: y # Inferred from config\n  d: z # verified\n"
            "  e: w # INFERRED\n  f: v # value not inferred yet\nl:\n  - one #  inferred \n  - two\n"
        )
        self.assertEqual(result.inferred, ["a.b", "a.c", "a.e", "a.f", "l.0"])
        self.assertEqual(result.unclear_inferred, ["a.f"])

    def test_huge_digit_run_never_crashes(self):
        self.assertEqual(parse("a: 123456789012345678\n").data, {"a": 123456789012345678})
        self.assertIsInstance(parse("a: " + "9" * 5000 + "\n").data["a"], float)

    def test_hash_inside_quotes_is_not_comment(self):
        self.assertEqual(parse('a: "x # y"\n').data, {"a": "x # y"})

    def test_unsupported_constructs_raise(self):
        cases = {
            "a: |\n  x\n": "unsupported YAML construct '|'",
            "a: &anchor 1\n": "unsupported YAML construct '&'",
            "a:\n\t b: 1\n": "tab indentation",
            "a: b: c\n": "contains ': '",
            "a: 1\na: 2\n": "duplicate key 'a'",
            "a: [1, 2\n": "expected ',' or ']'",
            "---\na: 1\n": "document markers",
            "a: {k: 1, k: 2}\n": "duplicate key 'k'",
            'a: "x\\q"\n': "unsupported escape",
            "a:\n  - - x\n": "nested compact sequence",
            "a: [x}y]\n": "bracket inside plain flow value",
            "a: {k: [x]y}\n": "expected ',' or '}'",
            "a: 'open\n": "unterminated quoted string",
        }
        for text, reason in cases.items():
            with self.subTest(text=text):
                with self.assertRaises(YamlLiteError) as caught:
                    parse(text)
                self.assertIn(reason, str(caught.exception))

    def test_extract_requires_single_terminated_block(self):
        self.assertEqual(extract_yaml_block("x\n```yaml\na: 1\n```\n"), "a: 1")
        cases = {
            "```yaml\na: 1\n```\n```yaml\nb: 2\n```\n": "exactly one",
            "no block": "no fenced",
            "```yaml\na: 1\n": "unterminated",
        }
        for text, reason in cases.items():
            with self.subTest(text=text):
                with self.assertRaises(YamlLiteError) as caught:
                    extract_yaml_block(text)
                self.assertIn(reason, str(caught.exception))


class SchemaLiteTests(ReasonAssertions):
    def test_unsupported_schema_forms_raise(self):
        for schema in (
            {"type": "object", "patternProperties": {}},
            {"type": ["string", "null"]},
            {"type": "array", "items": [{"type": "string"}]},
            {"type": "object", "additionalProperties": {"type": "string"}},
        ):
            with self.subTest(schema=schema), self.assertRaises(SchemaLiteError):
                SchemaLite(schema).validate({"x": "y"} if schema["type"] == "object" else ["x"])

    def test_bool_is_not_integer(self):
        self.assertReason(SchemaLite({"type": "integer"}).validate(True), "expected integer")

    def test_keyword_reasons(self):
        cases = [
            ({"type": "array", "uniqueItems": True}, [1, 1], "items must be unique"),
            ({"anyOf": [{"type": "string"}, {"type": "integer"}]}, 1.5, "does not match any allowed shape"),
            ({"type": "number", "maximum": 10}, 11, "above maximum 10"),
            ({"type": "number", "minimum": 0}, -1, "below minimum 0"),
            ({"type": "string", "minLength": 2}, "a", "shorter than 2"),
            ({"type": "string", "pattern": "^a"}, "b", "does not match ^a"),
            ({"enum": [None, "x"]}, False, "must be one of"),
            ({"const": 1}, True, "must equal 1"),
            ({"type": "object", "required": ["k"]}, {}, "missing required 'k'"),
            ({"type": "object", "additionalProperties": False}, {"k": 1}, "unknown key 'k'"),
            ({"if": {"const": 1}, "then": {"const": 2}, "else": {"const": 3}}, 4, "must equal 3"),
            ({"type": "array", "minItems": 1}, [], "needs at least 1"),
        ]
        for schema, value, reason in cases:
            with self.subTest(reason=reason):
                self.assertReason(SchemaLite(schema).validate(value), reason)

    def test_valid_values_pass(self):
        self.assertEqual(SchemaLite({"anyOf": [{"type": "string"}, {"type": "integer"}]}).validate(3), [])
        self.assertEqual(SchemaLite({"type": "number", "maximum": 10}).validate(10), [])
        self.assertEqual(SchemaLite({"type": "array", "uniqueItems": True}).validate([1, 2]), [])

    def test_bundled_schemas_are_supported(self):
        for path in (SKILL / "templates").glob("*.schema.json"):
            with self.subTest(schema=path.name):
                load_schema(path).validate({})


_SECTION_HEADING = re.compile(r"^### (?:Root|`([a-z_]+)`)")
_FIELD_ROW = re.compile(r"^\| ([^|]*`[^|]*) \|")
_BACKTICK = re.compile(r"`([^`]+)`")


def _documented_profile_paths() -> set[str]:
    """Key paths from the field tables of profile-schema.md + profile-schema-policy.md."""
    paths: set[str] = set()
    for name in ("profile-schema.md", "profile-schema-policy.md"):
        section = None
        in_field_table = False
        for line in (SKILL / "references" / name).read_text(encoding="utf-8").splitlines():
            heading = _SECTION_HEADING.match(line)
            if heading or line.startswith("## "):
                section = (heading.group(1) or "") if heading else None
                continue
            if line.startswith("| Key |"):
                in_field_table = True
                continue
            if not line.strip():
                in_field_table = False
            row = _FIELD_ROW.match(line)
            if section is None or not in_field_table or not row:
                continue
            tokens = [token.replace("[]", "") for token in _BACKTICK.findall(row.group(1))]
            parent = tokens[0].rsplit(".", 1)[0] if "." in tokens[0] else ""
            for index, token in enumerate(tokens):
                relative = token if index == 0 or "." in token else ".".join(filter(None, [parent, token]))
                paths.add(".".join(filter(None, [section, relative])))
    return paths


def _schema_leaf_paths(node: dict, prefix: str = "") -> set[str]:
    leaves: set[str] = set()
    for key, sub in node.get("properties", {}).items():
        path = f"{prefix}.{key}" if prefix else key
        leaves |= _schema_leaf_paths(sub, path) if "properties" in sub else {path}
    return leaves


class ProfileDocSchemaSyncTests(unittest.TestCase):
    """profile-schema*.md (human) and qa-profile.schema.json (machine) must not drift."""

    def setUp(self):
        self.documented = _documented_profile_paths()
        schema = json.loads((SKILL / "templates" / "qa-profile.schema.json").read_text(encoding="utf-8"))
        self.leaves = _schema_leaf_paths(schema)

    def test_every_documented_key_exists_in_schema(self):
        schema_paths = {leaf.rsplit(".", depth)[0] for leaf in self.leaves for depth in range(0, leaf.count(".") + 1)}
        missing = sorted(path for path in self.documented if path not in schema_paths and path not in self.leaves)
        self.assertEqual(missing, [])

    def test_every_schema_key_is_documented(self):
        undocumented = sorted(
            leaf
            for leaf in self.leaves
            if not any(leaf == path or leaf.startswith(path + ".") for path in self.documented)
        )
        self.assertEqual(undocumented, [])


class CheckProfileTests(ReasonAssertions):
    def _run(self, text: str, sync_config: bool = True) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            profile = write_repo_with_profile(root, text, sync_config)
            return run_gate(["--check-profile", str(profile), "--repo", str(root)])

    def test_template_with_placeholders_is_invalid(self):
        code, payload = run_gate(["--check-profile", str(SKILL / "templates" / "qa-profile.template.md")])
        self.assertEqual(code, 3)
        self.assertReason(payload["errors"], "tracker.mcp_server: unfilled placeholder")

    def test_filled_template_valid_at_implemented_level(self):
        code, payload = self._run(filled_profile_text())
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["autonomy_declared"], "L1")
        self.assertEqual(payload["autonomy_effective"], "L1")
        self.assertEqual(payload["autonomy_caps"], [])
        self.assertEqual(payload["inferred"], [])
        self.assertEqual(payload["warnings"], [])
        self.assertEqual(len(payload["profile_sha256"]), 64)

    def test_levels_above_implemented_capped_to_l1(self):
        for declared in ("L2", "L3"):
            with self.subTest(declared=declared):
                code, payload = self._run(filled_profile_text({"autonomy_level: L1  ": f"autonomy_level: {declared}  "}))
                self.assertEqual(code, 0, payload)
                self.assertEqual(payload["autonomy_effective"], "L1")
                self.assertReason(payload["autonomy_caps"], "Q7 verdict, Q7b, Q8, Q9) not implemented")

    def test_provider_none_caps_to_l0(self):
        text = filled_profile_text(
            {"provider: script ": "provider: none ", "teardown: discard_env": "teardown: none",
             "seed: { kind: script,": "seed: { kind: none,"}
        )
        code, payload = self._run(text)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["autonomy_effective"], "L0")
        self.assertEqual(payload["autonomy_caps"], ["environment.provider none: nothing to execute; run is plan + local report"])

    def test_unknown_browser_tool_is_warning(self):
        text = filled_profile_text({"[playwright-mcp, claude-in-chrome,": "[playwright-mcp, my-browser, claude-in-chrome,"})
        code, payload = self._run(text)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["autonomy_effective"], "L1")
        self.assertReason(payload["warnings"], "execution.browser_tool_preference: unknown tool 'my-browser'")

    def test_declared_l0_has_no_caps(self):
        code, payload = self._run(filled_profile_text({"autonomy_level: L1  ": "autonomy_level: L0  "}))
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["autonomy_effective"], "L0")
        self.assertEqual(payload["autonomy_caps"], [])

    def test_inferred_field_reported_with_cap(self):
        text = filled_profile_text(
            {
                "autonomy_level: L1  ": "autonomy_level: L2  ",
                "  e2e_authoring: auto             # auto | repo-local | ns-e2e-tests": "  e2e_authoring: auto # inferred",
            }
        )
        code, payload = self._run(text)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["inferred"], ["execution.e2e_authoring"])
        self.assertReason(payload["autonomy_caps"], "1 inferred field(s) cap autonomy at L1")

    def test_inferred_variants_cap_autonomy(self):
        line = "  e2e_authoring: auto             # auto | repo-local | ns-e2e-tests"
        cases = {
            "  e2e_authoring: auto # Inferred": None,
            "  e2e_authoring: auto # inferred from playwright.config.ts": None,
            "  e2e_authoring: auto # guessed, inferred later": "does not start with it; treated as inferred",
        }
        for replacement, warning in cases.items():
            with self.subTest(comment=replacement):
                text = filled_profile_text({"autonomy_level: L1  ": "autonomy_level: L2  ", line: replacement})
                code, payload = self._run(text)
                self.assertEqual(code, 0, payload)
                self.assertEqual(payload["inferred"], ["execution.e2e_authoring"])
                self.assertReason(payload["autonomy_caps"], "inferred field(s) cap autonomy at L1")
                if warning:
                    self.assertReason(payload["warnings"], warning)
                else:
                    self.assertEqual(payload["warnings"], [])

    def test_rule_violations_exit_3(self):
        cases = {
            "credential value": (
                {"credentials_env: [QA_LOGIN_USER, QA_LOGIN_PASSWORD]": "credentials_env: [s3cret-value]"},
                "/auth/credentials_env/0: does not match",
            ),
            "teardown vs provider": ({"teardown: discard_env": "teardown: none"}, '/data/teardown: must equal "discard_env"'),
            "judge sum": ({"coverage: 3,": "coverage: 4,"}, "judge.weights: must sum to 10, got 11"),
            "unknown key": ({"qa_profile_version: 1\n": "qa_profile_version: 1\nlanguag: en\n"}, "unknown key 'languag'"),
            "never close": ({"close_issues: never": "close_issues: auto"}, "/policy/close_issues: must equal"),
            "runner retries": (
                {"runner_retries_during_verification: 0": "runner_retries_during_verification: 1"},
                "/execution/runner_retries_during_verification: must equal 0",
            ),
            "L3 without e2e_git field": (
                {"autonomy_level: L1  ": "autonomy_level: L3  ", "    base_branch: filled-": "    base_branch_x: filled-"},
                "/execution/e2e_git: missing required 'base_branch'",
            ),
            "separate project without project": (
                {"    project: filled-": "    projectx: filled-"},
                "/tracker/qa_issues: missing required 'project'",
            ),
            "url provider without version_url": (
                {"provider: script ": "provider: url ", "teardown: discard_env": "teardown: none",
                 "seed: { kind: script,": "seed: { kind: api,", "  # url: filled-": "  url: filled-"},
                "/environment: missing required 'version_url'",
            ),
            "url provider with seed script": (
                {"provider: script ": "provider: url ", "teardown: discard_env": "teardown: none",
                 "  # url: filled-": "  url: filled-", "  # version_url: filled-": "  version_url: filled-"},
                '/data/seed/kind: must be one of ["api", "none"]',
            ),
            "evidence dir without run id": (
                {"dir: docs/qa/{run_id}": "dir: docs/qa/latest"},
                "/evidence/dir: does not match",
            ),
            "timeout zero": ({"timeouts: { up: 1800,": "timeouts: { up: 0,"}, "/environment/timeouts/up: below minimum 1"),
        }
        for name, (replacements, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(filled_profile_text(replacements))
                self.assertEqual(code, 3, payload)
                self.assertReason(payload["errors"], reason)
                self.assertIsNone(payload["autonomy_effective"])

    def test_url_provider_profile_valid(self):
        text = filled_profile_text(
            {
                "provider: script ": "provider: url ",
                "teardown: discard_env": "teardown: none",
                "seed: { kind: script,": "seed: { kind: api,",
                "  # url: filled-": "  url: filled-",
                "  # version_url: filled-": "  version_url: filled-",
            }
        )
        code, payload = self._run(text)
        self.assertEqual(code, 0, payload)

    def test_mode_none_needs_no_qa_status_keys(self):
        text = filled_profile_text(
            {
                "mode: separate_project ": "mode: none ",
                "    project: filled-": "    # project: filled-",
                "    qa_from: status_backlog\n": "",
                "    qa_running: status_in_progress\n": "",
            }
        )
        code, payload = self._run(text)
        self.assertEqual(code, 0, payload)

    def test_warnings_do_not_fail(self):
        cases = {
            "absent status key": (
                filled_profile_text({"homologated: status_homologated": "homologated: status_custom_done"}),
                True,
                "key 'status_custom_done' absent from",
            ),
            "missing status_source": (filled_profile_text(), False, "not found; every status step will be skipped"),
            "evidence outside docs/qa": (
                filled_profile_text({"dir: docs/qa/{run_id}": "dir: reports/{run_id}"}),
                True,
                "outside gitignored docs/qa/",
            ),
        }
        for name, (text, sync_config, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(text, sync_config)
                self.assertEqual(code, 0, payload)
                self.assertReason(payload["warnings"], reason)

    def test_unreadable_status_source_is_warning(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            profile = write_repo_with_profile(root, filled_profile_text())
            (root / "docs" / "context" / "gitlab-sync-config.md").write_bytes(b"\xff\xfe\x00bad")
            code, payload = run_gate(["--check-profile", str(profile), "--repo", str(root)])
        self.assertEqual(code, 0, payload)
        self.assertReason(payload["warnings"], "unreadable")

    def test_missing_profile_and_bad_usage_exit_3(self):
        code, payload = run_gate(["--check-profile", "/nonexistent/qa-profile.md"])
        self.assertEqual(code, 3)
        self.assertEqual(payload["mode"], "profile")
        self.assertReason(payload["errors"], "profile:")
        code, payload = run_gate(["--check-profile", "a", "--check-plan", "b"])
        self.assertEqual(code, 3)
        self.assertReason(payload["errors"], "usage:")


def _outside_file(run_dir: Path, name: str = "outside.xml") -> Path:
    outside = run_dir.parent / name
    outside.write_bytes(b"<testsuite tests='1'/>")
    return outside


def _point_evidence_at(ledger: dict, path: str, content_file: Path) -> None:
    entry = ledger["scenarios"][0]["evidence"][0]
    entry["path"] = path
    entry["sha256"] = sha256_bytes(content_file.read_bytes())


class CheckLedgerTests(ReasonAssertions):
    def _run(self, mutate=None, raw: str | None = None) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp) / "run"
            ledger = base_ledger(run_dir)
            if mutate:
                mutate(ledger, run_dir)
            path = write_ledger(run_dir, ledger)
            if raw is not None:
                path.write_text(raw, encoding="utf-8")
            return run_gate(["--check-ledger", str(path)])

    def test_valid_ledger(self):
        code, payload = self._run()
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["errors"], [])
        self.assertFalse(payload["blocked"])

    def test_commit_prefix_matches_both_directions(self):
        def long_env_short_mr(ledger, _):
            ledger["environment"]["commit"] = "abc1234def5678"
            ledger["mr"]["commit"] = "abc1234"

        code, payload = self._run(long_env_short_mr)
        self.assertEqual(code, 0, payload)
        self.assertFalse(payload["blocked"])

    def test_blocked_is_flag_not_failure(self):
        cases = {
            "mr null": (lambda ledger, _: ledger.update(mr=None), "mr is null"),
            "commit mismatch": (
                lambda ledger, _: ledger["environment"].update(commit="fff0000"),
                "environment.commit fff0000 != mr.commit",
            ),
            "unhealthy": (lambda ledger, _: ledger["environment"].update(health="failed"), "environment.health is failed"),
        }
        for name, (mutate, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(mutate)
                self.assertEqual(code, 0, payload)
                self.assertTrue(payload["blocked"])
                self.assertReason(payload["blocked_reasons"], reason)

    def test_rejections_exit_2(self):
        def uncovered(ledger, _):
            ledger["criteria"].append({"id": "AC-3", "text": "x", "source": "issue", "criticality": "low"})

        def pass_without_evidence(ledger, _):
            ledger["scenarios"][0]["evidence"] = []

        def dotdot_to_existing_file(ledger, run_dir):
            _point_evidence_at(ledger, "../outside.xml", _outside_file(run_dir))

        def absolute_to_existing_file(ledger, run_dir):
            outside = _outside_file(run_dir)
            _point_evidence_at(ledger, str(outside.resolve()), outside)

        def symlink_escape(ledger, run_dir):
            outside = _outside_file(run_dir)
            target = run_dir / ledger["scenarios"][0]["evidence"][0]["path"]
            target.unlink()
            target.symlink_to(outside)
            ledger["scenarios"][0]["evidence"][0]["sha256"] = sha256_bytes(outside.read_bytes())

        def missing_file(ledger, run_dir):
            (run_dir / ledger["scenarios"][0]["evidence"][0]["path"]).unlink()

        def tampered_file(ledger, run_dir):
            (run_dir / ledger["scenarios"][0]["evidence"][1]["path"]).write_bytes(b"tampered")

        def fail_without_triage(ledger, _):
            ledger["scenarios"][1]["triage"] = None

        def flaky_status_wrong_triage(ledger, _):
            ledger["scenarios"][1].update(status="flaky", triage="ENV")

        def flaky_triage_wrong_status(ledger, _):
            ledger["scenarios"][0].update(triage="FLAKY")

        def product_without_finding(ledger, _):
            ledger["findings"] = []

        def product_single_repro(ledger, _):
            ledger["findings"][0]["reproduced"] = 1

        def round_gap(ledger, _):
            ledger["judge_rounds"][1]["round"] = 3

        def broken_score_chain(ledger, _):
            ledger["judge_rounds"][1]["score_before"] = 7.9

        def stalled_round_not_last(ledger, _):
            ledger["judge_rounds"].insert(0, {"round": 1, "score_before": 7.5, "score_after": 7.5, "added": []})
            ledger["judge_rounds"][1]["round"] = 2
            ledger["judge_rounds"][2]["round"] = 3

        def missing_residual_state(ledger, _):
            del ledger["residual_state"]

        def missing_data_source(ledger, _):
            del ledger["scenarios"][0]["data_source"]

        def unknown_finding_scenario(ledger, _):
            ledger["findings"][0]["scenario"] = "S-9"

        def covers_unknown_criterion(ledger, _):
            ledger["scenarios"][0]["covers"].append("AC-9")

        def duplicate_criterion(ledger, _):
            ledger["criteria"].append(dict(ledger["criteria"][0]))

        def duplicate_scenario(ledger, _):
            ledger["scenarios"].append(dict(ledger["scenarios"][0]))

        def duplicate_finding(ledger, _):
            ledger["findings"].append(dict(ledger["findings"][0]))

        cases = {
            uncovered: "/criteria/AC-3: not covered by any scenario",
            pass_without_evidence: "/scenarios/0/evidence: needs at least 1",
            dotdot_to_existing_file: "path ../outside.xml escapes the run dir",
            absolute_to_existing_file: "escapes the run dir",
            symlink_escape: "path results/run-1.xml goes through a symlink (refused)",
            missing_file: "file results/run-1.xml not found",
            tampered_file: "sha256 mismatch for evidence/S-1-01-saved.png",
            fail_without_triage: "/scenarios/S-2: status fail requires a triage class",
            flaky_status_wrong_triage: "/scenarios/S-2: status flaky and triage FLAKY must go together",
            flaky_triage_wrong_status: "/scenarios/S-1: status flaky and triage FLAKY must go together",
            product_without_finding: "/scenarios/S-2: triage PRODUCT without a finding",
            product_single_repro: "/findings/F-1: PRODUCT finding reproduced 1 < 2",
            round_gap: "/judge_rounds/1: round must be 2",
            broken_score_chain: "/judge_rounds/1: score_before must equal previous score_after",
            stalled_round_not_last: "/judge_rounds/0: a round without score gain must end the cycle",
            missing_residual_state: "missing required 'residual_state'",
            missing_data_source: "/scenarios/0: missing required 'data_source'",
            unknown_finding_scenario: "/findings/F-1: references unknown scenario S-9",
            covers_unknown_criterion: "/scenarios/S-1: covers unknown AC-9",
            duplicate_criterion: "/criteria: duplicate id AC-1",
            duplicate_scenario: "/scenarios: duplicate id S-1",
            duplicate_finding: "/findings: duplicate id F-1",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    @unittest.skipIf(hasattr(os, "geteuid") and os.geteuid() == 0, "root reads chmod 000 files")
    def test_unreadable_evidence_exit_2(self):
        def unreadable(ledger, run_dir):
            (run_dir / ledger["scenarios"][0]["evidence"][0]["path"]).chmod(0)

        code, payload = self._run(unreadable)
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "file results/run-1.xml unreadable")

    def test_invalid_json_exit_3(self):
        code, payload = self._run(raw="{not json")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "invalid JSON")


def _move_last_scenario_first(plan: str) -> str:
    head, rest = plan.split("scenarios:\n", 1)
    body, waivers = rest.split("waivers:", 1)
    blocks = ["  - id:" + block for block in body.split("  - id:") if block.strip()]
    return head + "scenarios:\n" + "".join([blocks[-1], *blocks[:-1]]) + "waivers:" + waivers


class CheckPlanTests(ReasonAssertions):
    def _run(self, acceptance: str = ACCEPTANCE_YML, plan: str = PLAN_YML) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = write_plan_run(Path(tmp) / "run", acceptance, plan)
            return run_gate(["--check-plan", str(run_dir)])

    def test_valid_plan_lists_waivers_and_summary(self):
        code, payload = self._run()
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["errors"], [])
        self.assertEqual(payload["waivers"][0]["ac"], "AC-1")
        self.assertEqual(
            payload["summary"],
            {
                "criteria": 2,
                "derived_criteria": 1,
                "scenarios": 4,
                "scenarios_by_type": {"positive": 2, "negative": 1, "regression": 1},
                "areas": 2,
            },
        )

    def test_summary_counts_only_derived_criteria(self):
        code, payload = self._run(ACCEPTANCE_YML.replace("source: derived", "source: issue"))
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["summary"]["derived_criteria"], 0)

    def test_rejections_exit_2(self):
        ambiguous_no_assumption = ACCEPTANCE_YML.replace(
            "    ambiguity: clear\n    origin:", "    ambiguity: ambiguous\n    origin:"
        )
        cases = {
            "critical missing negative": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("type: negative", "type: positive"),
                "acceptance.criteria.AC-1: critical needs a negative scenario",
            ),
            "waiver removed": (
                ACCEPTANCE_YML,
                PLAN_YML.split("waivers:")[0] + "waivers: []\n",
                "acceptance.criteria.AC-1: critical needs a business_rule scenario",
            ),
            "medium without positive": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("    type: positive\n    lane: browser", "    type: negative\n    lane: browser"),
                "acceptance.criteria.AC-2: medium needs a positive scenario",
            ),
            "derived without assumption": (
                ACCEPTANCE_YML.replace('    assumption: "Issue omits validation; derived from the MR diff"\n', ""),
                PLAN_YML,
                "acceptance.criteria.AC-2: source derived / ambiguity ambiguous requires assumption",
            ),
            "ambiguous without assumption": (
                ambiguous_no_assumption,
                PLAN_YML,
                "acceptance.criteria.AC-1: source derived / ambiguity ambiguous requires assumption",
            ),
            "area without scenario": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("areas: [IA-2]", "areas: [IA-1]"),
                "plan.areas.IA-2: indirect area has no scenario",
            ),
            "AC without scenario": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("covers: [AC-2]", "covers: [AC-1]"),
                "acceptance.criteria.AC-2: no planned scenario",
            ),
            "risk order": (
                ACCEPTANCE_YML,
                _move_last_scenario_first(PLAN_YML),
                "plan.scenarios.S-1: risk order broken",
            ),
            "duplicate scenario id": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("id: S-2", "id: S-1"),
                "plan.scenarios: duplicate id S-1",
            ),
            "duplicate criterion id": (
                ACCEPTANCE_YML.replace("id: AC-2", "id: AC-1"),
                PLAN_YML,
                "acceptance.criteria: duplicate id AC-1",
            ),
            "duplicate area id": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("{ id: IA-2,", "{ id: IA-1,"),
                "plan.areas: duplicate id IA-1",
            ),
            "unknown covers": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("covers: [AC-2]", "covers: [AC-2, AC-9]"),
                "plan.scenarios.S-4: covers unknown AC-9",
            ),
            "unknown area": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("areas: [IA-2]", "areas: [IA-2, IA-9]"),
                "plan.scenarios.S-3: unknown area IA-9",
            ),
            "unknown waiver AC": (
                ACCEPTANCE_YML,
                PLAN_YML.replace("{ ac: AC-1,", "{ ac: AC-9,"),
                "plan.waivers: unknown AC-9",
            ),
            "schema violation": (ACCEPTANCE_YML, PLAN_YML.replace("lane: runner", "lane: robot"), "plan.yml /scenarios/0/lane"),
        }
        for name, (acceptance, plan, reason) in cases.items():
            with self.subTest(case=name):
                self.assertNotEqual((acceptance, plan), (ACCEPTANCE_YML, PLAN_YML), "case must change input")
                code, payload = self._run(acceptance, plan)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_missing_plan_exit_3(self):
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            (run_dir / "acceptance.yml").write_text(ACCEPTANCE_YML, encoding="utf-8")
            code, payload = run_gate(["--check-plan", str(run_dir)])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "plan.yml")


if __name__ == "__main__":
    unittest.main()
