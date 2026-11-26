#!/usr/bin/env python3
"""Q8 automation rules for ns-qa-homologation (references/automation-handoff.md). Stdlib only. Pure: no I/O.

Single source for: E2E git names (branch, base, remote, protected globs, branch_pattern), the git argv the
agent executes (never push to base/protected, never force, never merge), candidate selection + no-op skip,
stability over recorded runner runs, review rounds, commit message and MR title/description.
Used by qa_automation.py (Q8), qa_profile_rules.py (Q0 gate extras), qa_run_rules.py (--check-run),
qa_cleanup_plan.py and qa_publish_plan.py (Q8 terminal before Q9).
"""

from __future__ import annotations

import fnmatch
import re
import unicodedata
from dataclasses import dataclass

from qa_common import canonical_sha256, find_duplicates

MAX_REVIEW_ROUNDS = 3  # catalog review standard (ADR-18); not a profile key
MIN_STABILITY_RUNS = 2
APPROVED = "Approved"
REVIEW_VERDICTS = ("Approved", "Rejected", "Blocked")
APPROVAL_SCORE = 10
TERMINAL_STATES = ("passed", "skipped")
AUTOMATION_PHASE = "Q8"
AUTOMATION_LEVEL = "L3"
MARKER_PREFIX = "ns-qa:run="
RELATED = "Related to"
PLACEHOLDERS = ("iid", "run_id", "slug")
_ID_PLACEHOLDERS = ("iid", "run_id")
MAX_BRANCH = 200
MAX_SLUG = 40
MAX_SUBJECT = 72
_BRANCH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
_PROTECTED = re.compile(r"^[A-Za-z0-9*][A-Za-z0-9._/*-]*$")
_REMOTE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
_PLACEHOLDER = re.compile(r"\{([^{}]*)\}")
_REPO_PATH = re.compile(r"^[A-Za-z0-9.][A-Za-z0-9._/@+-]*$")  # run schema repoPath
_SHA = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")
_CONTROL = re.compile("[\\x00-\\x1f\\x7f\\u2028\\u2029\\u202a-\\u202e\\u2066-\\u2069]")  # incl. bidi overrides
_MENTION = re.compile(r"(?<![\w`])@[A-Za-z0-9_][A-Za-z0-9_./-]*")  # GitLab user/group mention
_AUTHOR_NAME = re.compile(r"^[^<>\x00-\x1f\x7f]{1,100}$")
_AUTHOR_EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$")
_MR_URL = re.compile(r"^https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?/[A-Za-z0-9._/-]+/-/merge_requests/([0-9]{1,9})$")
REPORT_PATH = re.compile(r"^automation/[A-Za-z0-9][A-Za-z0-9._-]*\.xml$")
REPORT_DIR = "automation"
# Emitted git argv: allowed subcommands, and flags that are never emitted (defense in depth).
_GIT_SUBCOMMANDS = ("fetch", "switch", "add", "commit", "push")
_FORBIDDEN_FLAGS = ("-f", "--force", "--force-with-lease", "--force-if-includes", "--mirror", "--delete", "-d", "-D",
                    "--prune", "--no-verify", "--amend", "--all", "-a", "--tags", "-C", "-B", "--force-create",
                    "--discard-changes", "--orphan", "--hard", "--receive-pack", "--upload-pack", "--exec",
                    "-o", "--push-option")


class AutomationError(ValueError):
    """A Q8 rule refused the input (caller maps to exit 2)."""


def text_problem(value: str, label: str, limit: int) -> str | None:
    """Single printable line, 1..limit chars, never the published-comment marker."""
    if not value.strip() or len(value) > limit:
        return f"{label} must be 1-{limit} characters"
    if _CONTROL.search(value):
        return f"{label} must be one line without control characters"
    if MARKER_PREFIX in value:
        return f"{label} must not contain the marker prefix {MARKER_PREFIX}"
    return None


def _mention_problem(value: str, label: str) -> str | None:
    return f"{label} must not contain an @mention" if _MENTION.search(value) else None


def subject_problem(subject: str) -> str | None:
    """Commit subject = MR title: one safe line, no @mention (MCP posts as the agent's account)."""
    return text_problem(subject, "subject", MAX_SUBJECT) or _mention_problem(subject, "subject")


def branch_problem(name: str) -> str | None:
    """Stricter subset of git check-ref-format: safe as one argv element, never an option."""
    if not 1 <= len(name) <= MAX_BRANCH or not _BRANCH.match(name):
        return f"branch {name!r} must match [A-Za-z0-9][A-Za-z0-9._/-]* (max {MAX_BRANCH})"
    if ".." in name or "//" in name or "/." in name or name.endswith(("/", ".", ".lock")) or ".lock/" in name:
        return f"branch {name!r}: no '..', '//', '/.', '.lock' component, trailing '/' or '.'"
    if name == "HEAD":
        return "branch 'HEAD' is reserved"
    return None


def protected_problem(pattern: str) -> str | None:
    if not _PROTECTED.match(pattern) or ".." in pattern or len(pattern) > MAX_BRANCH:
        return f"protected branch {pattern!r} must be a branch name or '*' glob ([A-Za-z0-9._/*-])"
    return None


def remote_problem(name: str) -> str | None:
    if not _REMOTE.match(name) or ".." in name:
        return f"remote {name!r} must match [A-Za-z0-9][A-Za-z0-9._-]* (max 100, no '..')"
    return None


def is_protected(branch: str, base: str, protected: tuple[str, ...]) -> bool:
    return branch == base or any(fnmatch.fnmatchcase(branch, pattern) for pattern in protected)


def slugify(title: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:MAX_SLUG].strip("-")


def pattern_problem(pattern: str) -> str | None:
    names = _PLACEHOLDER.findall(pattern)
    unknown = sorted({name for name in names if name not in PLACEHOLDERS})
    if unknown:
        return f"branch_pattern placeholder(s) {', '.join(unknown)} unknown (allowed: {', '.join(PLACEHOLDERS)})"
    if not any(name in names for name in _ID_PLACEHOLDERS):
        return "branch_pattern must contain {iid} or {run_id}: one branch per homologated issue"
    sample = branch_problem(render_pattern(pattern, "1", "1-20260101T0000Z", "slug"))
    return f"branch_pattern renders an invalid branch: {sample}" if sample else None


def render_pattern(pattern: str, iid: str, run_id: str, slug: str) -> str:
    values = {"iid": iid, "run_id": run_id, "slug": slug}
    return _PLACEHOLDER.sub(lambda match: values[match.group(1)], pattern)


@dataclass(frozen=True)
class GitPolicy:
    """profile execution.e2e_git (validated)."""

    base_branch: str
    branch_pattern: str
    commit_prefix: str
    remote: str
    protected: tuple[str, ...]

    def derive_branch(self, iid: str, run_id: str, title: str | None) -> str:
        slug = ""
        if "{slug}" in self.branch_pattern:
            slug = slugify(title or "")
            if not slug:
                raise AutomationError("branch_pattern needs {slug}: --title must contain ASCII letters or digits")
        branch = render_pattern(self.branch_pattern, iid, run_id, slug)
        return self.checked_branch(branch)

    def checked_branch(self, branch: str) -> str:
        problem = branch_problem(branch)
        if problem:
            raise AutomationError(problem)
        if is_protected(branch, self.base_branch, self.protected):
            raise AutomationError(f"branch {branch} is the base branch or protected: Q8 pushes only its own branch")
        return branch


def check_git_argv(argv: list[str], git: GitPolicy, branch: str) -> list[str]:
    """Guard on every emitted argv: git -C <dir> <allowed subcommand>; no force/merge/delete; push = own branch."""
    if len(argv) < 4 or argv[:2] != ["git", "-C"] or argv[3] not in _GIT_SUBCOMMANDS:
        raise AutomationError(f"refused argv {argv!r}: only git -C <worktree> {'|'.join(_GIT_SUBCOMMANDS)}")
    for element in argv[3:]:
        if element.split("=", 1)[0] in _FORBIDDEN_FLAGS:
            raise AutomationError(f"refused argv: flag {element} is never emitted (no force, merge, delete, hooks skip)")
    if argv[3] == "push":
        refspec = argv[-1]
        source, _sep, destination = refspec.partition(":")
        if source != f"refs/heads/{branch}" or destination != source:  # rejects + (force), : (delete)
            raise AutomationError(f"refused push refspec {refspec}: only refs/heads/<own branch> to the same name")
        if is_protected(branch, git.base_branch, git.protected):
            raise AutomationError(f"refused push to {branch}: base or protected branch")
    return argv


class GitCommands:
    """argv lists for the agent (executes nothing). Every list passes check_git_argv."""

    def __init__(self, worktree: str, git: GitPolicy, branch: str):
        self._worktree = worktree
        self._git = git
        self._branch = branch

    def _argv(self, *args: str) -> list[str]:
        return check_git_argv(["git", "-C", self._worktree, *args], self._git, self._branch)

    def branch(self) -> list[list[str]]:
        remote, base = self._git.remote, self._git.base_branch
        return [self._argv("fetch", remote, base),
                self._argv("switch", "--no-track", "-c", self._branch, f"{remote}/{base}")]

    def commit(self, specs: list[str], message: str, author: str | None) -> list[list[str]]:
        identity = [f"--author={author}"] if author else []
        return [self._argv("add", "--", *specs),
                self._argv("commit", f"--message={message}", *identity, "--", *specs)]

    def push(self) -> list[list[str]]:
        ref = f"refs/heads/{self._branch}"
        return [self._argv("push", "--set-upstream", self._git.remote, f"{ref}:{ref}")]


def author_identity(name: str | None, email: str | None) -> str | None:
    """ns-harness agent-git-identity: --author only when both values are set and non-empty."""
    if not name or not email:
        return None
    if not _AUTHOR_NAME.match(name) or not _AUTHOR_EMAIL.match(email):
        raise AutomationError("AGENT_GIT_AUTHOR_NAME / AGENT_GIT_AUTHOR_EMAIL unsafe for --author")
    return f"{name} <{email}>"


def repo_path_problem(path: str, label: str = "spec") -> str | None:
    """Relative path safe as an argv element (schema repoPath): no '..', '//', leading '-' or '/'."""
    if not _REPO_PATH.match(path) or ".." in path or "//" in path or path.endswith("/"):
        return f"{label} {path!r} must be a relative path ([A-Za-z0-9._/@+-], no '..', no leading '-')"
    return None


def normalize_repo_path(path: str) -> str:
    """'./e2e/' -> 'e2e' (profile e2e_root vs run.json repo_root)."""
    while path.startswith("./"):
        path = path[2:]
    return path.rstrip("/")


_GIT_FIELD_RULES = {
    "base_branch": branch_problem,
    "branch_pattern": pattern_problem,
    "remote": remote_problem,
    "commit_prefix": lambda value: text_problem(value, "commit_prefix", 50) or _mention_problem(value, "commit_prefix"),
}


def git_profile_problems(git: dict, skip) -> list[str]:
    """Q0 gate extras for execution.e2e_git (string values only; skip(value) = unfilled placeholder)."""
    found = [rule(git[key]) for key, rule in _GIT_FIELD_RULES.items()
             if isinstance(git.get(key), str) and not skip(git[key])]
    found += [protected_problem(item) for item in git.get("protected_branches") or []
              if isinstance(item, str) and not skip(item)]
    return [f"execution.e2e_git: {problem}" for problem in found if problem]


def sha_problem(sha: str) -> str | None:
    return None if _SHA.match(sha) else f"commit {sha!r} must be a full lowercase hex sha (40 or 64)"


def mr_url_problem(url: str, iid: int) -> str | None:
    match = _MR_URL.match(url)
    if not match or int(match.group(1)) != iid:
        return f"MR url must be http(s)://<host>/<project>/-/merge_requests/{iid}"
    return None


# ---- candidates + no-op skip ----------------------------------------------------------------------------


@dataclass(frozen=True)
class Selection:
    scenarios: tuple[str, ...]
    excluded: tuple[dict, ...]
    skip_reason: str | None


def select_scenarios(plan: dict, ledger: dict, runner_none: bool) -> Selection:
    """automate: true + runner lane + no existing coverage + ledger pass. Nothing left = justified skip."""
    if runner_none:
        return Selection((), (), "execution.runner none: no runner to automate with")
    status = {item["id"]: item["status"] for item in ledger["scenarios"]}
    marked = [item for item in plan["scenarios"] if item["automate"]]
    if not marked:
        return Selection((), (), "no plan scenario marked automate: true")
    chosen, excluded = [], []
    for item in marked:
        reason = _exclusion(item, status.get(item["id"]))
        if reason:
            excluded.append({"scenario": item["id"], "reason": reason})
        else:
            chosen.append(item["id"])
    if chosen:
        return Selection(tuple(chosen), tuple(excluded), None)
    detail = "; ".join(f"{entry['scenario']} {entry['reason']}" for entry in excluded)
    return Selection((), tuple(excluded), f"no automatable scenario ({detail})")


def selection_problems(automation: dict | None, plan: dict, ledger: dict, runner_none: bool) -> list[str]:
    """Q8 selection / no-op reason must equal its recomputation from plan.yml (pinned by the Q7b judgment) +
    ledger: a hand-written skip_reason or a selection edited in run.json is refused (cleanup success, Q9)."""
    if automation is None:
        return ["/automation: missing: Q8 must be recorded by qa_automation.py plan"]
    expected = select_scenarios(plan, ledger, runner_none)
    recorded = (automation["scenarios"], automation["excluded"], automation["skip_reason"])
    if recorded != (list(expected.scenarios), list(expected.excluded), expected.skip_reason):
        return [f"/automation: selection or skip_reason differs from recomputation (plan.yml + ledger): expected "
                f"scenarios {list(expected.scenarios)}, skip_reason {expected.skip_reason!r}"]
    return []


def _exclusion(scenario: dict, status: str | None) -> str | None:
    if scenario["lane"] != "runner":
        return f"lane {scenario['lane']}: only runner scenarios are automated"
    if scenario["existing"]:
        return "existing runner coverage reused"
    if status != "pass":
        return f"ledger status {status}: only passing scenarios become regression specs"
    return None


# ---- stability + review ----------------------------------------------------------------------------------


def run_outcomes(per_scenario: dict, scenarios: tuple[str, ...], outcome_of) -> list[dict]:
    """Outcome per automated scenario in one report, in selection order (missing = no test case mapped)."""
    return [{"scenario": sid, "outcome": outcome_of(per_scenario[sid]) if sid in per_scenario else "missing"}
            for sid in scenarios]


def stability(runs: list[dict], specs_sha256: str, required: int) -> dict:
    """Window = trailing runs on this exact spec set. Stable = >= required runs, all green.
    A red run inside the window (fail then pass with nothing changed = flaky) blocks until the specs change."""
    window = []
    for run in reversed(runs):
        if run["specs_sha256"] != specs_sha256:
            break
        window.append(run)
    red = [run["source"] for run in reversed(window) if not run["green"]]
    return {"required": required, "window": len(window), "red": red,
            "stable": len(window) >= required and not red}


def approving_review(reviews: list[dict], specs_sha256: str) -> dict | None:
    last = reviews[-1] if reviews else None
    if last and last["verdict"] == APPROVED and last["specs_sha256"] == specs_sha256:
        return last
    return None


def review_problem(verdict: str, score: float, lint_findings: int) -> str | None:
    if verdict == APPROVED and (score != APPROVAL_SCORE or lint_findings):
        return f"verdict Approved needs score {APPROVAL_SCORE} and 0 lint findings (got {score:g}, {lint_findings})"
    if verdict != APPROVED and score == APPROVAL_SCORE and not lint_findings:
        return f"score {APPROVAL_SCORE} with 0 lint findings is Approved, not {verdict}"
    return None


# ---- commit + MR text -------------------------------------------------------------------------------------


def commit_message(prefix: str, subject: str, dev_issue: str) -> str:
    """D39: wording in the E2E repo's commit_language (subject from the agent); only ids are generated."""
    return f"{commit_title(prefix, subject)}\n\n{RELATED} {dev_issue}\n"


def e2e_marker(run_id: str) -> str:
    return f"<!-- {MARKER_PREFIX}{run_id};kind=e2e -->"


def _cell(text: str) -> str:
    """One table cell: whitespace runs (incl. newlines) flattened, pipes escaped, @mentions code-wrapped."""
    flat = re.sub(r"\s+", " ", text).replace("\\", "\\\\").replace("|", "\\|").strip()
    return _MENTION.sub(lambda match: f"`{match.group(0)}`", flat)


def commit_title(prefix: str, subject: str) -> str:
    return f"{prefix} {subject}"


def mr_text(run: dict, plan: dict, prefix: str, reviewer: str, green_runs: int) -> tuple[str, str]:
    """(title, description). Built and validated before create_merge_request (no MR edit tool)."""
    automation = run["automation"]
    titles = {item["id"]: item for item in plan["scenarios"]}
    review = automation["reviews"][-1]
    title = commit_title(prefix, automation["subject"])
    problem = _mention_problem(title, "MR title")
    if problem:
        raise AutomationError(problem)
    lines = [e2e_marker(run["run_id"]), "", title, "", "| Scenario | AC | Title |", "| -------- | -- | ----- |"]
    for sid in automation["scenarios"]:
        scenario = titles[sid]
        lines.append(f"| {sid} | {', '.join(scenario['covers'])} | {_cell(scenario['title'])} |")
    specs = ", ".join(f"`{item['path']}`" for item in automation["specs"])
    lines += ["", f"Specs: {specs}",
              f"Stability: {green_runs} consecutive green runs on these specs, runner retries 0",
              f"Review: {_cell(reviewer)} round {review['round']}, score {review['score']:g}/10",
              f"Lint: 0 findings; rules enforced: {', '.join(review['lint_rules']) or 'none'}",
              "", f"{RELATED} {run['issue']['dev']}", ""]
    description = "\n".join(lines)
    _validate_description(description, run)
    return title, description


def _validate_description(description: str, run: dict) -> None:
    related = [line for line in description.split("\n") if line.startswith(RELATED)]
    if related != [f"{RELATED} {run['issue']['dev']}"]:
        raise AutomationError(f"MR description must carry exactly one line '{RELATED} {run['issue']['dev']}'")
    if description.count(MARKER_PREFIX) != 1 or not description.startswith(e2e_marker(run["run_id"])):
        raise AutomationError("MR description must open with the run marker and carry it once")
    if re.search(r"[\x00-\x08\x0b-\x1f\x7f]", description):
        raise AutomationError("MR description contains control characters")


# ---- run.json state (single source for --check-run, cleanup and publication) ----------------------------


def phase_state(run: dict, phase: str) -> str | None:
    return next((item["state"] for item in run["phases"] if item["phase"] == phase), None)


def automation_terminal(run: dict) -> bool:
    """Q8 passed (MR recorded) or skipped (script-recorded no-op reason); --check-run ties both to automation."""
    return phase_state(run, AUTOMATION_PHASE) in TERMINAL_STATES


def automation_cell(run: dict) -> str | None:
    """Preview / summary value at L3: MR url, or 'none — <skip reason>'. None below L3."""
    if run["level"]["effective"] != AUTOMATION_LEVEL:
        return None
    automation = run.get("automation") or {}
    if automation.get("mr"):
        return f"{automation['mr']['url']} (!{automation['mr']['iid']})"
    return f"none — {automation.get('skip_reason') or 'not recorded'}"


def specs_sha256(specs: list[dict]) -> str:
    """Spec-set identity: stability runs and the approving review bind to it."""
    return canonical_sha256(sorted(({"path": item["path"], "sha256": item["sha256"]} for item in specs),
                                   key=lambda item: item["path"]))


def _skip_problems(automation: dict) -> list[str]:
    worked = [key for key in ("scenarios", "specs", "runs", "reviews") if automation[key]]
    worked += [key for key in ("branch", "subject", "commit_specs_sha256", "commit", "mr") if automation[key] is not None]
    worked += ["pushed"] if automation["pushed"] else []
    return [f"/automation: skip_reason with recorded {', '.join(worked)}"] if worked else []


def _selection_problems(automation: dict) -> list[str]:
    errors = []
    if not automation["scenarios"] or automation["branch"] is None:
        errors.append("/automation: no skip_reason needs scenarios and branch (qa_automation.py plan)")
    excluded = [item["scenario"] for item in automation["excluded"]]
    errors += [f"/automation/excluded: duplicate {sid}" for sid in find_duplicates(excluded)]
    errors += [f"/automation: {sid} both selected and excluded" for sid in automation["scenarios"] if sid in excluded]
    if automation["branch"] is not None:
        problem = branch_problem(automation["branch"])
        errors += [f"/automation/branch: {problem}"] if problem else []
    paths = [item["path"] for item in automation["specs"]]
    errors += [f"/automation/specs: duplicate {path}" for path in find_duplicates(paths)]
    errors += [f"/automation/specs: {problem}" for problem in map(repo_path_problem, paths) if problem]
    return errors


def _run_problems(automation: dict) -> list[str]:
    runs, wanted = automation["runs"], set(automation["scenarios"])
    errors = [f"/automation/runs: {key} {dup} recorded twice"
              for key in ("source", "sha256") for dup in find_duplicates([run[key] for run in runs])]
    for index, run in enumerate(runs):
        named = [item["scenario"] for item in run["outcomes"]]
        if sorted(named) != sorted(wanted):
            errors.append(f"/automation/runs/{index}: outcomes must name each automated scenario once")
        if run["green"] and {item["outcome"] for item in run["outcomes"]} != {"pass"}:
            errors.append(f"/automation/runs/{index}: green with a scenario not pass")
    return errors


def _review_problems(automation: dict) -> list[str]:
    reviews = automation["reviews"]
    errors = [f"/automation/reviews: {len(reviews)} rounds > max {MAX_REVIEW_ROUNDS}"] if len(reviews) > MAX_REVIEW_ROUNDS else []
    for index, review in enumerate(reviews):
        if review["round"] != index + 1:
            errors.append(f"/automation/reviews/{index}: round must be {index + 1}")
        problem = review_problem(review["verdict"], review["score"], review["lint_findings"])
        errors += [f"/automation/reviews/{index}: {problem}"] if problem else []
    return errors


def _delivery_problems(automation: dict) -> list[str]:
    errors = []
    current = specs_sha256(automation["specs"])
    if (automation["subject"] is None) != (automation["commit_specs_sha256"] is None):
        errors.append("/automation/subject: subject and commit_specs_sha256 are set together (commit)")
    if automation["commit"] is not None:
        if automation["subject"] is None:
            errors.append("/automation/commit: needs subject")
        if automation["commit_specs_sha256"] != current:
            errors.append("/automation/commit: commit argv was printed for another spec set (run commit again)")
        if approving_review(automation["reviews"], current) is None:
            errors.append("/automation/commit: needs the last review Approved on the committed spec set")
        if not stability(automation["runs"], current, MIN_STABILITY_RUNS)["stable"]:
            errors.append(f"/automation/commit: needs >= {MIN_STABILITY_RUNS} green runs on the committed spec set")
        problem = sha_problem(automation["commit"])
        errors += [f"/automation/commit: {problem}"] if problem else []
    if automation["subject"] is not None:
        problem = subject_problem(automation["subject"])
        errors += [f"/automation/subject: {problem}"] if problem else []
    if automation["pushed"] and automation["commit"] is None:
        errors.append("/automation/pushed: needs commit")
    mr = automation["mr"]
    if mr is not None:
        if not automation["pushed"]:
            errors.append("/automation/mr: needs pushed branch")
        problem = mr_url_problem(mr["url"], mr["iid"])
        errors += [f"/automation/mr: {problem}"] if problem else []
    return errors


def automation_problems(automation: dict) -> list[str]:
    """Cross-field rules of run.json automation (schema-valid input)."""
    if automation["skip_reason"] is not None:
        return _skip_problems(automation)
    return (_selection_problems(automation) + _run_problems(automation) + _review_problems(automation)
            + _delivery_problems(automation))


def run_automation_problems(run: dict) -> list[str]:
    """--check-run: Q8 + automation only at effective L3; Q8 passed/skipped proven by automation; Q8 before Q9."""
    level, automation = run["level"]["effective"], run.get("automation")
    q8 = phase_state(run, AUTOMATION_PHASE)
    if level != AUTOMATION_LEVEL:
        errors = [f"/automation: effective {level} never automates (Q8 is L3 only)"] if automation is not None else []
        return errors + ([f"/phases: Q8 recorded at effective {level} (Q8 is L3 only)"] if q8 is not None else [])
    errors = []
    if q8 == "passed" and not (automation and automation["mr"]):
        errors.append("/phases: Q8 passed needs automation.mr (MR recorded)")
    if q8 == "skipped" and not (automation and automation["skip_reason"]):
        errors.append("/phases: Q8 skipped needs automation.skip_reason (no-op recorded by qa_automation.py plan)")
    if "publication" in run and q8 not in TERMINAL_STATES:
        errors.append("/publication: at L3 Q8 (passed or skipped) runs before Q9")
    return errors + (automation_problems(automation) if automation is not None else [])
