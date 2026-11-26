#!/usr/bin/env python3
"""Q8 automation guard for ns-qa-homologation (effective L3). Stdlib only. Executes nothing.

Selects the scenarios to automate (or records the justified no-op skip), derives the E2E branch,
binds stability runs and review rounds to the exact spec set, and emits the git argv the agent runs
(never push to base/protected, never force, never merge). The MR title/description is built and
validated before create_merge_request; the MR is recorded in run.json (references/automation-handoff.md).

Usage (every subcommand: --run-dir RUN_DIR --profile PROFILE_MD [--repo .]):
  plan [--title TEXT]          select scenarios / record skip; branch name + fetch/switch argv
  specs --spec PATH...         declare the spec set (relative to the E2E worktree); hashes it
  record-run --junit automation/<name>.xml
                               one explicit runner run (retries 0) on the declared spec set
  record-review --verdict V --score S
                               V = Approved | Rejected | Blocked; lint runs in-process; max 3 rounds
  commit --subject TEXT        stable + approved spec set -> add/commit argv (message: prefix + subject)
  record-commit --sha SHA      -> push argv
  record-push                  branch pushed -> MR title + description (RUN_DIR/automation/mr.md)
  record-mr --iid N --url URL  MR created from that description (or found by source branch)
  status                       read-only state + next step

Exit codes (1 never returned by design):
  0  done
  2  refused: level not L3, gate order (Q7b not passed, Q8 already terminal, publication started),
     no worktree, branch base/protected/invalid, spec changed, run not mapped or recorded twice,
     unstable, review not approved / rounds exhausted, bad sha / url, mr.md edited
  3  invalid input: unreadable/unparseable file, invalid profile, bad usage, lint input
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "automation", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lint_e2e_antipatterns import CONFIG_NAME, LintInputError, lint_files, load_config  # noqa: E402
from qa_artifacts import (  # noqa: E402
    JUDGMENT_FILE,
    LEDGER_FILE,
    RUN_FILE,
    TEMPLATES,
    checked_ledger,
    read_json,
    read_text,
    require_profile_pin,
)
from qa_automation_rules import (  # noqa: E402
    AUTOMATION_LEVEL,
    IN_REPO_ROOT,
    MAX_REVIEW_ROUNDS,
    REPORT_DIR,
    REPORT_PATH,
    REVIEW_VERDICTS,
    AutomationError,
    GitCommands,
    approving_review,
    author_identity,
    commit_message,
    mr_text,
    mr_url_problem,
    normalize_repo_path,
    phase_state,
    repo_path_problem,
    review_problem,
    run_outcomes,
    select_scenarios,
    sha_problem,
    specs_sha256,
    stability,
    subject_problem,
)
from qa_common import (  # noqa: E402
    InvalidInput,
    Rejected,
    canonical_sha256,
    sha256_file,
    utc_timestamp,
    write_json_atomic,
    write_text_atomic,
)
from qa_junit_rules import map_cases, parse_junit, read_safe_xml, report_fingerprint, resolve_report, scenario_outcome  # noqa: E402
from qa_policy import AutomationPolicy, load_automation_policy  # noqa: E402
from qa_run_rules import check_run  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
MR_FILE = "mr.md"
_AUTHOR_ENV = ("AGENT_GIT_AUTHOR_NAME", "AGENT_GIT_AUTHOR_EMAIL")


def _empty_automation(scenarios=(), excluded=(), skip_reason=None, branch=None) -> dict:
    return {"scenarios": list(scenarios), "excluded": list(excluded), "skip_reason": skip_reason, "branch": branch,
            "specs": [], "runs": [], "reviews": [], "subject": None, "commit_specs_sha256": None, "commit": None,
            "pushed": False, "mr": None}


@dataclass
class _Context:
    run_dir: Path
    repo: Path
    run: dict
    policy: AutomationPolicy

    def save(self) -> None:
        """run.json written only when it still passes --check-run."""
        report = check_run(self.run, load_schema(TEMPLATES / "qa-run.schema.json"))
        if report.errors:
            raise Rejected(*(f"{RUN_FILE} would break: {error}" for error in report.errors))
        write_json_atomic(self.run_dir / RUN_FILE, self.run)

    def automation(self) -> dict:
        automation = self.run.get("automation")
        if automation is None:
            raise Rejected("Q8 not planned: run plan first")
        if automation["skip_reason"] is not None:
            raise Rejected(f"Q8 is a no-op ({automation['skip_reason']}): mark Q8 skipped, nothing to do")
        return automation

    def open_automation(self) -> dict:
        """Planned, not committed: specs, runs and reviews may still change."""
        automation = self.automation()
        if automation["commit"] is not None:
            raise Rejected(f"commit {automation['commit']} recorded: spec set, runs and reviews are final")
        return automation

    def checkout(self) -> Path:
        """E2E repo checkout (execution.e2e_root): source of the repo's own lint config, never written."""
        return self.repo / normalize_repo_path(self.policy.e2e_root or "")

    def worktree_repo_root(self) -> str:
        """run.json repo_root of the run-owned E2E worktree: the E2E repo (execution.e2e_root, nested or
        separate repo) or "." when the E2E folder lives inside the product repo (monorepo, in-repo layout)."""
        root = normalize_repo_path(self.policy.e2e_root or "")
        candidates = {root, IN_REPO_ROOT}
        found = {normalize_repo_path(item.get("repo_root", "")) for item in self.run["created_resources"]
                 if item["kind"] == "worktree" and item["via"] == "agent"
                 and normalize_repo_path(item.get("repo_root", "")) in candidates}
        if len(found) > 1:
            raise Rejected(f"run-owned E2E worktrees under both repo_root {root} and {IN_REPO_ROOT} in {RUN_FILE}: need exactly one")
        return found.pop() if found else root

    def in_repo(self) -> bool:
        return self.worktree_repo_root() == IN_REPO_ROOT and normalize_repo_path(self.policy.e2e_root or "") != IN_REPO_ROOT

    def e2e_subdir(self) -> str:
        """E2E folder inside the worktree: the e2e_root in the in-repo layout, "" when the worktree is the E2E repo."""
        return normalize_repo_path(self.policy.e2e_root or "") if self.in_repo() else ""

    def worktree(self) -> str:
        """Absolute path of the run-owned E2E worktree: the one agent worktree with repo_root =
        execution.e2e_root (E2E repo) or "." (E2E folder inside the product repo), a linked git worktree
        (regular `.git` file), so `git -C` never climbs to an enclosing repository."""
        root = self.worktree_repo_root()
        found = [item for item in self.run["created_resources"]
                 if item["kind"] == "worktree" and item["via"] == "agent"
                 and normalize_repo_path(item.get("repo_root", "")) == root]
        if len(found) != 1:
            raise Rejected(f"{len(found)} run-owned E2E worktree(s) with repo_root {root} in {RUN_FILE}: need exactly "
                           "one (create + register it first: execution-lanes.md Runner lane step 3)")
        path = found[0]["id"] if root == IN_REPO_ROOT else f"{root}/{found[0]['id']}"
        target = self.repo
        for part in PurePosixPath(path).parts:
            target = target / part
            if target.is_symlink():
                raise Rejected(f"worktree {path}: symlink refused")
        if not target.is_dir():
            raise Rejected(f"worktree {path} missing on disk")
        gitfile = target / ".git"
        if gitfile.is_symlink() or not gitfile.is_file():
            raise Rejected(f"worktree {path} is not a linked git worktree (no regular .git file)")
        return os.path.abspath(target)

    def git(self, automation: dict) -> GitCommands:
        return GitCommands(self.worktree(), self.policy.git, automation["branch"])

    def hashed_specs(self, paths: list[str]) -> list[dict]:
        base = Path(self.worktree())
        specs = []
        for path in paths:
            problem = repo_path_problem(path)
            if problem:
                raise Rejected(problem)
            subdir = self.e2e_subdir()
            if subdir and not path.startswith(f"{subdir}/"):
                raise Rejected(f"spec {path}: must be inside {subdir}/ (in-repo E2E folder)")
            target = base
            for part in PurePosixPath(path).parts:
                target = target / part
                if target.is_symlink():
                    raise Rejected(f"spec {path}: symlink refused")
            if not target.is_file():
                raise Rejected(f"spec {path}: not a file in the E2E worktree")
            try:
                digest = hashlib.sha256(target.read_bytes()).hexdigest()
            except OSError as exc:
                raise InvalidInput(f"spec {path}: {exc.strerror or exc}") from exc
            specs.append({"path": path, "sha256": digest})
        return specs

    def current_specs(self, automation: dict) -> str:
        """Declared spec set, re-hashed from disk; any change = new set (declare again, stability restarts)."""
        if not automation["specs"]:
            raise Rejected("no spec declared: run specs first")
        on_disk = self.hashed_specs([item["path"] for item in automation["specs"]])
        changed = [now["path"] for now, then in zip(on_disk, automation["specs"]) if now["sha256"] != then["sha256"]]
        if changed:
            raise Rejected(f"spec changed since declared: {', '.join(changed)}: run specs again (stability restarts)")
        return specs_sha256(automation["specs"])

    def plan_scenarios(self) -> dict:
        """plan.yml + ledger, plan unchanged since the Q7b judgment (plan_sha256): automate/existing pinned."""
        checked = checked_ledger(self.run_dir / LEDGER_FILE, self.run_dir)
        if checked.report.errors:
            raise Rejected(*(f"ledger rejected: {error}" for error in checked.report.errors))
        if checked.plan is None:
            raise Rejected("plan.yml required: automate flags live there")
        judgment = read_json(self.run_dir / JUDGMENT_FILE, JUDGMENT_FILE)
        if not isinstance(judgment, dict) or judgment.get("plan_sha256") != canonical_sha256(checked.plan):
            raise Rejected(f"plan.yml changed since the Q7b judgment ({JUDGMENT_FILE} plan_sha256): re-run qa_judge.py")
        return {"plan": checked.plan, "ledger": checked.ledger}


def load_context(run_dir: Path, profile: Path, repo: Path, mutating: bool) -> _Context:
    policy = load_automation_policy(profile, repo)
    run = read_json(run_dir / RUN_FILE, RUN_FILE)
    report = check_run(run, load_schema(TEMPLATES / "qa-run.schema.json"))
    if report.errors:
        raise Rejected(*(f"{RUN_FILE} {error}" for error in report.errors))
    require_profile_pin(run, profile)
    level = run["level"]["effective"]
    if level != AUTOMATION_LEVEL:
        raise Rejected(f"effective {level}: Q8 automation runs at {AUTOMATION_LEVEL} only")
    if mutating:
        state = phase_state(run, "Q8")
        if state in ("passed", "skipped"):
            raise Rejected(f"Q8 already {state}: nothing to change")
        if "publication" in run:
            raise Rejected("publication started: Q8 runs before Q9")
        if report.open_pause is not None:
            raise Rejected(f"open {report.open_pause['reason']} pause: answer it first")
    branch = (run.get("automation") or {}).get("branch")
    if branch is not None:
        policy.git.checked_branch(branch)  # run.json edited to a base/protected branch -> refused
    return _Context(run_dir=run_dir, repo=repo, run=run, policy=policy)


def command_plan(ctx: _Context, args: argparse.Namespace) -> dict:
    if "automation" in ctx.run:
        raise Rejected("Q8 already planned: use status")
    if phase_state(ctx.run, "Q7b") != "passed":
        raise Rejected("Q7b not passed: Q8 runs after the judge")
    inputs = ctx.plan_scenarios()
    selection = select_scenarios(inputs["plan"], inputs["ledger"], ctx.policy.runner == "none")
    if selection.skip_reason:
        ctx.run["automation"] = _empty_automation(excluded=selection.excluded, skip_reason=selection.skip_reason)
        ctx.save()
        return {"skip": True, "reason": selection.skip_reason, "excluded": list(selection.excluded),
                "next": "set run.json Q8 skipped (note = reason), then Q9"}
    ctx.worktree()
    iid = ctx.run["issue"]["dev"].rsplit("#", 1)[1]
    branch = ctx.policy.git.derive_branch(iid, ctx.run["run_id"], args.title)
    automation = _empty_automation(selection.scenarios, selection.excluded, None, branch)
    argv = ctx.git(automation).branch()
    ctx.run["automation"] = automation
    ctx.save()
    return {"skip": False, "scenarios": list(selection.scenarios), "excluded": list(selection.excluded),
            "branch": branch, "authoring": ctx.policy.authoring, "argv": argv}


def command_specs(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.open_automation()
    if len(set(args.spec)) != len(args.spec):
        raise Rejected("spec listed twice")
    automation["specs"] = ctx.hashed_specs(args.spec)
    automation.update(subject=None, commit_specs_sha256=None)  # any printed commit argv no longer applies
    ctx.save()
    return {"specs": automation["specs"], "specs_sha256": specs_sha256(automation["specs"])}


def _scenario_dicts(ctx: _Context, automation: dict) -> list[dict]:
    plan = ctx.plan_scenarios()["plan"]
    return [item for item in plan["scenarios"] if item["id"] in automation["scenarios"]]


def command_record_run(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.open_automation()
    current = ctx.current_specs(automation)
    path = resolve_report(ctx.run_dir, args.junit, REPORT_DIR, REPORT_PATH)
    raw = read_safe_xml(path, args.junit)
    cases = parse_junit(raw, args.junit)
    digest = report_fingerprint(raw, args.junit)
    if any(run["source"] == args.junit or run["sha256"] == digest for run in automation["runs"]):
        raise Rejected(f"{args.junit}: report already recorded (same path or same content: a second green run is a new runner execution)")
    per_scenario, unmapped = map_cases(cases, _scenario_dicts(ctx, automation))
    if not per_scenario:
        raise Rejected(f"{args.junit}: no test case maps to an automated scenario (tag @S-n / @AC-n)")
    outcomes = run_outcomes(per_scenario, tuple(automation["scenarios"]), scenario_outcome)
    failed = [case.label for case in cases if case.outcome == "fail"]
    skipped = [case.label for case in cases if case.outcome == "skipped"]
    green = {item["outcome"] for item in outcomes} == {"pass"} and not failed and not skipped
    automation["runs"].append({"source": args.junit, "sha256": digest, "specs_sha256": current, "green": green,
                               "outcomes": outcomes, "at": utc_timestamp()})
    ctx.save()
    return {"green": green, "outcomes": outcomes, "failed_cases": failed, "skipped_cases": skipped, "unmapped": unmapped,
            "stability": stability(automation["runs"], current, ctx.policy.stability_runs)}


def command_record_review(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.open_automation()
    if len(automation["reviews"]) >= MAX_REVIEW_ROUNDS:
        raise Rejected(f"max {MAX_REVIEW_ROUNDS} review rounds reached (ADR-18): stall, ask the human")
    current = ctx.current_specs(automation)
    root = Path(ctx.worktree())
    config_sha256 = _lint_config_sha256(ctx.checkout(), root / ctx.e2e_subdir())
    try:
        lint = lint_files(root, [item["path"] for item in automation["specs"]], load_config(ctx.checkout(), None),
                          ctx.policy.forbid_spec_intercepts)
    except LintInputError as exc:
        raise InvalidInput(f"lint: {exc}") from exc
    problem = review_problem(args.verdict, args.score, len(lint["findings"]))
    if problem:
        raise Rejected(problem, *(f"lint {item['location']} {item['rule']}" for item in lint["findings"]))
    round_number = len(automation["reviews"]) + 1
    automation["reviews"].append({"round": round_number, "reviewer": ctx.policy.reviewer, "verdict": args.verdict,
                                  "score": args.score, "lint_findings": len(lint["findings"]),
                                  "lint_rules": lint["rules"], "lint_config_sha256": config_sha256,
                                  "specs_sha256": current, "at": utc_timestamp()})
    ctx.save()
    exhausted = args.verdict != "Approved" and round_number == MAX_REVIEW_ROUNDS
    return {"round": round_number, "approved": args.verdict == "Approved", "lint": lint["findings"],
            "stall": args.verdict == "Blocked" or exhausted}


def _lint_config_sha256(checkout: Path, worktree: Path) -> str | None:
    """Lint config = the E2E repo checkout's own file (agent never edits it). A worktree copy that differs
    (e.g. written during Q8 to disable rules) is refused."""
    def digest(path: Path) -> str | None:
        if path.is_symlink():
            raise Rejected(f"{path}: symlink refused")
        return sha256_file(path) if path.is_file() else None

    try:
        source, local = digest(checkout / CONFIG_NAME), digest(worktree / CONFIG_NAME)
    except OSError as exc:
        raise InvalidInput(f"lint config: {exc.strerror or exc}") from exc
    if local is not None and local != source:
        raise Rejected(f"worktree {CONFIG_NAME} differs from the E2E repo checkout: lint config is the repo's own")
    return source


def _ready_to_commit(ctx: _Context, automation: dict) -> str:
    current = ctx.current_specs(automation)
    stable = stability(automation["runs"], current, ctx.policy.stability_runs)
    if not stable["stable"]:
        raise Rejected(f"spec set not stable: {stable['window']} run(s) on it, {stable['required']} green required, "
                       f"red: {', '.join(stable['red']) or 'none'}")
    if approving_review(automation["reviews"], current) is None:
        raise Rejected("last review is not Approved (score 10, lint clean) on the current spec set")
    return current


def command_commit(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.open_automation()
    problem = subject_problem(args.subject)
    if problem:
        raise Rejected(problem)
    current = _ready_to_commit(ctx, automation)
    author = author_identity(*(os.environ.get(name) for name in _AUTHOR_ENV))
    message = commit_message(ctx.policy.git.commit_prefix, args.subject, ctx.run["issue"]["dev"])
    argv = ctx.git(automation).commit([item["path"] for item in automation["specs"]], message, author)
    automation.update(subject=args.subject, commit_specs_sha256=current)
    ctx.save()
    return {"message": message, "argv": argv, "next": "run argv, then record-commit --sha $(git rev-parse HEAD)"}


def command_record_commit(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.open_automation()
    if automation["subject"] is None:
        raise Rejected("no commit planned: run commit first")
    problem = sha_problem(args.sha)
    if problem:
        raise Rejected(problem)
    if _ready_to_commit(ctx, automation) != automation["commit_specs_sha256"]:
        raise Rejected("spec set changed after commit argv was printed: run commit again")
    argv = ctx.git(automation).push()
    automation["commit"] = args.sha
    ctx.save()
    return {"commit": args.sha, "argv": argv}


def _mr(ctx: _Context, automation: dict) -> tuple[str, str]:
    current = specs_sha256(automation["specs"])
    window = stability(automation["runs"], current, ctx.policy.stability_runs)["window"]
    return mr_text(ctx.run, ctx.plan_scenarios()["plan"], ctx.policy.git.commit_prefix, ctx.policy.reviewer, window)


def command_record_push(ctx: _Context, _args: argparse.Namespace) -> dict:
    automation = ctx.automation()
    if automation["commit"] is None:
        raise Rejected("no commit recorded: run commit + record-commit first")
    if automation["mr"] is not None:
        raise Rejected("MR already recorded")
    title, description = _mr(ctx, automation)
    target = ctx.run_dir / REPORT_DIR
    target.mkdir(exist_ok=True)
    write_text_atomic(target / MR_FILE, description)
    automation["pushed"] = True
    ctx.save()
    return {"title": title, "description_file": str(target / MR_FILE),
            "description_sha256": hashlib.sha256(description.encode("utf-8")).hexdigest(),
            "source_branch": automation["branch"], "target_branch": ctx.policy.git.base_branch,
            "next": "list_merge_requests by source_branch (marker found -> record-mr with it), else "
                    "create_merge_request with exactly this title + description; never merge"}


def command_record_mr(ctx: _Context, args: argparse.Namespace) -> dict:
    automation = ctx.automation()
    if not automation["pushed"]:
        raise Rejected("branch not pushed: run record-push first")
    if automation["mr"] is not None:
        raise Rejected("MR already recorded")
    _title, description = _mr(ctx, automation)
    saved = read_text(ctx.run_dir / REPORT_DIR / MR_FILE)
    if saved != description:
        raise Rejected(f"{REPORT_DIR}/{MR_FILE} stale or edited: the MR description must equal the validated one")
    problem = mr_url_problem(args.url, args.iid)
    if problem:
        raise Rejected(problem)
    automation["mr"] = {"iid": args.iid, "url": args.url}
    ctx.save()
    return {"mr": automation["mr"], "next": "set run.json Q8 passed, then Q9 (preview carries the MR link)"}


def _next_step(automation: dict | None, stable: dict | None) -> str:
    if automation is None:
        return "plan"
    if automation["skip_reason"]:
        return "mark Q8 skipped"
    current = specs_sha256(automation["specs"])
    steps = (
        ("specs", not automation["specs"]),
        ("record-run until stable", not (stable and stable["stable"])),
        ("record-review", approving_review(automation["reviews"], current) is None),
        ("commit", automation["subject"] is None),
        ("run commit argv, record-commit", automation["commit"] is None),
        ("run push argv, record-push", not automation["pushed"]),
        ("record-mr", automation["mr"] is None),
    )
    return next((step for step, pending in steps if pending), "mark Q8 passed")


def command_status(ctx: _Context, _args: argparse.Namespace) -> dict:
    automation = ctx.run.get("automation")
    stable = None
    if automation and automation["specs"]:
        stable = stability(automation["runs"], specs_sha256(automation["specs"]), ctx.policy.stability_runs)
    return {"q8": phase_state(ctx.run, "Q8"), "automation": automation, "stability": stable,
            "next": _next_step(automation, stable)}


_COMMANDS = {
    "plan": command_plan,
    "specs": command_specs,
    "record-run": command_record_run,
    "record-review": command_record_review,
    "commit": command_commit,
    "record-commit": command_record_commit,
    "record-push": command_record_push,
    "record-mr": command_record_mr,
    "status": command_status,
}


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "automation", **payload}, indent=2, ensure_ascii=False))


def _score(value: str) -> float:
    number = float(value)
    if not 0 <= number <= 10:
        raise ValueError(value)
    return number


def _iid(value: str) -> int:
    if not value.isdigit() or not 1 <= int(value) <= 999_999_999:
        raise ValueError(value)
    return int(value)


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation Q8 automation guard (executes nothing)", allow_abbrev=False)
    commands = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)
    for name in _COMMANDS:
        sub = commands.add_parser(name, allow_abbrev=False)
        sub.add_argument("--run-dir", required=True, metavar="RUN_DIR")
        sub.add_argument("--profile", required=True, metavar="PROFILE_MD")
        sub.add_argument("--repo", default=".", help="project root (worktree repo_root is relative to it)")
    sub_for = commands.choices
    sub_for["plan"].add_argument("--title", help="dev issue title (branch_pattern {slug})")
    sub_for["specs"].add_argument("--spec", action="append", required=True, metavar="PATH")
    sub_for["record-run"].add_argument("--junit", required=True, metavar="automation/<name>.xml")
    sub_for["record-review"].add_argument("--verdict", required=True, choices=REVIEW_VERDICTS)
    sub_for["record-review"].add_argument("--score", required=True, type=_score, metavar="0-10")
    sub_for["commit"].add_argument("--subject", required=True)
    sub_for["record-commit"].add_argument("--sha", required=True)
    sub_for["record-mr"].add_argument("--iid", required=True, type=_iid)
    sub_for["record-mr"].add_argument("--url", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        ctx = load_context(Path(args.run_dir), Path(args.profile), Path(args.repo), args.command != "status")
        result = _COMMANDS[args.command](ctx, args)
    except InvalidInput as exc:
        _emit({"command": args.command, "ok": False, "errors": exc.errors})
        return EXIT_INVALID
    except SchemaLiteError as exc:
        _emit({"command": args.command, "ok": False, "errors": [f"bundled schema unsupported: {exc}"]})
        return EXIT_INVALID
    except Rejected as exc:
        _emit({"command": args.command, "ok": False, "errors": exc.errors})
        return EXIT_REJECTED
    except AutomationError as exc:
        _emit({"command": args.command, "ok": False, "errors": [str(exc)]})
        return EXIT_REJECTED
    except OSError as exc:
        _emit({"command": args.command, "ok": False, "errors": [f"write failed: {exc.strerror or exc}"]})
        return EXIT_INVALID
    _emit({"command": args.command, "ok": True, "errors": [], **result})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
