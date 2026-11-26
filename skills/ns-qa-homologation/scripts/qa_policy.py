#!/usr/bin/env python3
"""Profile values the verdict, judge and publication scripts read, with their defaults. Stdlib only.

Defaults live only here; references/profile-schema-policy.md and
templates/qa-profile.template.md are kept equal by sync tests.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from qa_automation_rules import GitPolicy
from qa_profile_rules import load_valid_profile
from qa_schema_lite import load_schema

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

CRITICALITY_WEIGHTS = {"critical": 4, "high": 3, "medium": 2, "low": 1}
BLOCKED_SCENARIO_RATIO = 0.2
JUDGE_WEIGHTS = {"coverage": 3, "depth": 2, "impact": 1.5, "evidence": 1.5, "data_realism": 1, "stability": 1}
JUDGE_MIN_SCORE = 8.5
MAX_ATTACHMENTS_PER_COMMENT = 10
CAPTURE_KINDS = ("screenshot", "console", "network", "runner_video")
STABILITY_RUNS = 2
E2E_REVIEWER = "ns-reviewer"
E2E_REMOTE = "origin"
E2E_AUTHORING = "auto"


@dataclass(frozen=True)
class QaPolicy:
    """Validated profile slice: verdict rubric, judge, publication target and status keys."""

    criticality_weights: dict = field(default_factory=lambda: dict(CRITICALITY_WEIGHTS))
    blocked_scenario_ratio: float = BLOCKED_SCENARIO_RATIO
    runner_none: bool = False
    judge_weights: dict = field(default_factory=lambda: dict(JUDGE_WEIGHTS))
    min_score: float = JUDGE_MIN_SCORE
    capture: tuple[str, ...] = CAPTURE_KINDS
    max_per_comment: int = MAX_ATTACHMENTS_PER_COMMENT
    status_source: str = "docs/context/gitlab-sync-config.md"
    status_result: dict = field(default_factory=dict)
    qa_issues_mode: str = "separate_project"

    @classmethod
    def from_profile(cls, data: dict) -> "QaPolicy":
        verdict = data.get("verdict") or {}
        judge = data.get("judge") or {}
        tracker = data["tracker"]
        return cls(
            criticality_weights=dict(verdict.get("criticality_weights", CRITICALITY_WEIGHTS)),
            blocked_scenario_ratio=verdict.get("blocked_scenario_ratio", BLOCKED_SCENARIO_RATIO),
            runner_none=data["execution"]["runner"] == "none",
            judge_weights=dict(judge.get("weights", JUDGE_WEIGHTS)),
            min_score=judge.get("min_score", JUDGE_MIN_SCORE),
            capture=tuple(data["evidence"].get("capture", CAPTURE_KINDS)),
            max_per_comment=(tracker.get("attachments") or {}).get("max_per_comment", MAX_ATTACHMENTS_PER_COMMENT),
            status_source=tracker["status_source"],
            status_result=dict(tracker.get("status_result") or {}),
            qa_issues_mode=tracker["qa_issues"]["mode"],
        )


@dataclass(frozen=True)
class AutomationPolicy:
    """Validated profile slice for Q8 (execution runner/E2E repo/git/lint + policy.e2e_reviewer)."""

    runner: str
    e2e_root: str | None
    authoring: str
    git: GitPolicy | None
    stability_runs: int = STABILITY_RUNS
    reviewer: str = E2E_REVIEWER
    forbid_spec_intercepts: bool = False

    @classmethod
    def from_profile(cls, data: dict) -> "AutomationPolicy":
        execution = data["execution"]
        git = execution.get("e2e_git")
        return cls(
            runner=execution["runner"],
            e2e_root=execution.get("e2e_root"),
            authoring=execution.get("e2e_authoring", E2E_AUTHORING),
            git=git_policy(git) if git else None,
            stability_runs=execution.get("stability_runs", STABILITY_RUNS),
            reviewer=(data.get("policy") or {}).get("e2e_reviewer", E2E_REVIEWER),
            forbid_spec_intercepts=(execution.get("e2e_lint") or {}).get("forbid_spec_intercepts", False),
        )


def git_policy(git: dict) -> GitPolicy:
    return GitPolicy(
        base_branch=git["base_branch"],
        branch_pattern=git["branch_pattern"],
        commit_prefix=git["commit_prefix"],
        remote=git.get("remote", E2E_REMOTE),
        protected=tuple(git.get("protected_branches", ())),
    )


def _valid_profile(profile: Path, repo: Path) -> dict:
    return load_valid_profile(profile, repo, load_schema(TEMPLATES / "qa-profile.schema.json"))


def load_policy(profile: Path, repo: Path) -> QaPolicy:
    """Profile validated with the Q0 rules (any error -> InvalidInput, exit 3)."""
    return QaPolicy.from_profile(_valid_profile(profile, repo))


def load_automation_policy(profile: Path, repo: Path) -> AutomationPolicy:
    """Profile validated with the Q0 rules (any error -> InvalidInput, exit 3)."""
    return AutomationPolicy.from_profile(_valid_profile(profile, repo))
