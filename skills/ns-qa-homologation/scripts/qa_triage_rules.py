#!/usr/bin/env python3
"""Failure triage engine (references/failure-triage.md). Stdlib only.

Replays one scenario's attempt history (ledger ``scenarios[].history``) and
returns the decision for its last run. Objective signals decide first (health,
infra/data/spec signals, alternating results); the agent's ``suggested_class``
only decides the residue (TEST vs PRODUCT). Shared by qa_triage.py (runtime
decision) and qa_ledger_rules.py (recorded status/triage must match the replay).
"""

from __future__ import annotations

from dataclasses import dataclass, field

ENV_SIGNALS = frozenset({"infra_timeout", "systemic_5xx"})
DATA_SIGNALS = frozenset({"precondition_missing", "data_conflict", "seed_failed"})
TEST_SIGNALS = frozenset({"spec_error"})

ENV_MAX_RESETS = 2  # per run (Q5 + Q6)
DATA_MAX_RESEEDS = 2  # per scenario
TEST_MAX_FIXES = 3  # per scenario
FLAKY_RUNS = 3  # unchanged runs that confirm a flaky scenario
PRODUCT_MIN_REPRODUCTIONS = 2  # healthy-env reproductions before a PRODUCT finding

_RECORD = "record"
STOP_RUN = "stop_run"
_STALL = "stall"
_RECHECK_HEALTH = "recheck_health"
_ENV_RESET = "env_reset"
_RESEED = "reseed"
_FIX_SPEC = "fix_spec"
_REPRODUCE = "reproduce"
_RERUN_STABILITY = "rerun_stability"

RUN_CHANGES = ("none", "env_reset", "reseed", "spec_fix")  # ledger history[].change enum
_TERMINAL_ACTIONS = frozenset({_RECORD, STOP_RUN})
# Change the next run must declare after each retry action.
_EXPECTED_CHANGE = {
    _ENV_RESET: "env_reset",
    _RESEED: "reseed",
    _FIX_SPEC: "spec_fix",
    _REPRODUCE: "none",
    _RERUN_STABILITY: "none",
}


class TriageError(ValueError):
    """History breaks the triage protocol (a run that the previous decision did not allow)."""


@dataclass(frozen=True)
class Decision:
    action: str
    triage: str | None
    reason: str
    status: str | None = None
    class_source: str | None = None
    cap: dict | None = None
    counters: dict = field(default_factory=dict)

    @property
    def terminal(self) -> bool:
        return self.action in _TERMINAL_ACTIONS

    @property
    def expected_change(self) -> str | None:
        return _EXPECTED_CHANGE.get(self.action)

    def as_dict(self) -> dict:
        return {
            "action": self.action,
            "terminal": self.terminal,
            "status": self.status,
            "triage": self.triage,
            "class_source": self.class_source,
            "expected_change": self.expected_change,
            "cap": self.cap,
            "counters": self.counters,
            "reason": self.reason,
        }


@dataclass
class _Replay:
    """Counters accumulated while replaying a history up to the current run."""

    history: list[dict]
    run_env_resets: int
    last_class: str | None = None

    def count_changes(self, upto: int, change: str) -> int:
        return sum(1 for attempt in self.history[: upto + 1] if attempt["change"] == change)

    def window(self, upto: int) -> list[dict]:
        """Runs since the last change (inclusive): same input, so outcomes must agree."""
        start = 0
        for index in range(upto, -1, -1):
            if self.history[index]["change"] != "none":
                start = index
                break
        return self.history[start : upto + 1]

    def counters(self, upto: int) -> dict:
        window = self.window(upto)
        return {
            "runs": upto + 1,
            "env_resets": self.run_env_resets,
            "reseeds": self.count_changes(upto, "reseed"),
            "spec_fixes": self.count_changes(upto, "spec_fix"),
            "window_runs": len(window),
            "reproductions": sum(1 for attempt in window if _is_product_reproduction(attempt)),
        }


def _is_product_reproduction(attempt: dict) -> bool:
    return (
        attempt["outcome"] == "fail"
        and attempt["health"] == "ok"
        and not attempt["signals"]
        and attempt["suggested_class"] == "PRODUCT"
    )


def _cap(name: str, used: int, maximum: int) -> dict:
    return {"class": name, "used": used, "max": maximum}


def _decide_env(state: _Replay, upto: int, is_last: bool) -> Decision:
    # Earlier ENV runs were followed by a reset (checked by the change rule); the run-wide
    # counter only matters for the run being decided now.
    used = state.run_env_resets if is_last else state.count_changes(upto, "env_reset")
    counters = state.counters(upto)
    if used < ENV_MAX_RESETS:
        return Decision(_ENV_RESET, "ENV", "environment unhealthy: reset, re-check health, re-run",
                        class_source="signal", cap=_cap("ENV", used, ENV_MAX_RESETS), counters=counters)
    return Decision(STOP_RUN, "ENV", f"ENV retries exhausted ({used}/{ENV_MAX_RESETS}): stop the run, verdict Blocked",
                    status="blocked", class_source="signal", cap=_cap("ENV", used, ENV_MAX_RESETS), counters=counters)


@dataclass(frozen=True)
class _CappedClass:
    name: str
    change: str
    maximum: int
    retry: str
    how: str


_DATA = _CappedClass("DATA", "reseed", DATA_MAX_RESEEDS, _RESEED, "reseed run data")
_TEST = _CappedClass("TEST", "spec_fix", TEST_MAX_FIXES, _FIX_SPEC, "fix the spec (never the product, never weaken it)")


def _decide_capped(state: _Replay, upto: int, rule: _CappedClass, source: str) -> Decision:
    name, maximum = rule.name, rule.maximum
    used = state.count_changes(upto, rule.change)
    counters = state.counters(upto)
    cap = _cap(name, used, maximum)
    if used < maximum:
        return Decision(rule.retry, name, f"{name} failure: {rule.how}, re-run",
                        class_source=source, cap=cap, counters=counters)
    return Decision(_RECORD, name, f"{name} retries exhausted ({used}/{maximum}): scenario blocked",
                    status="blocked", class_source=source, cap=cap, counters=counters)


def _decide_flaky(state: _Replay, upto: int) -> Decision:
    counters = state.counters(upto)
    runs = counters["window_runs"]
    cap = _cap("FLAKY", runs, FLAKY_RUNS)
    if runs < FLAKY_RUNS:
        reason = f"pass and fail with the same input: stability run {runs + 1}/{FLAKY_RUNS}"
        return Decision(_RERUN_STABILITY, "FLAKY", reason,
                        class_source="signal", cap=cap, counters=counters)
    return Decision(_RECORD, "FLAKY", f"flaky after {runs} unchanged runs: never counts as pass",
                    status="flaky", class_source="signal", cap=cap, counters=counters)


def _decide_product(state: _Replay, upto: int) -> Decision:
    counters = state.counters(upto)
    reproductions = counters["reproductions"]
    cap = _cap("PRODUCT", reproductions, PRODUCT_MIN_REPRODUCTIONS)
    if reproductions < PRODUCT_MIN_REPRODUCTIONS:
        reason = f"suspected product defect: reproduce unchanged ({reproductions}/{PRODUCT_MIN_REPRODUCTIONS})"
        return Decision(_REPRODUCE, "PRODUCT", reason,
                        class_source="agent", cap=cap, counters=counters)
    reason = f"product defect reproduced {reproductions}x on a healthy environment: record finding"
    return Decision(_RECORD, "PRODUCT", reason,
                    status="fail", class_source="agent", cap=cap, counters=counters)


def _decide_failure(state: _Replay, upto: int, is_last: bool) -> Decision | None:
    """ENV/DATA decisions that come before the flaky check (they change the input)."""
    attempt = state.history[upto]
    signals = set(attempt["signals"])
    if attempt["health"] == "unknown":
        return Decision(_RECHECK_HEALTH, state.last_class, "failed run: re-check environment health before classifying",
                        counters=state.counters(upto))
    if attempt["health"] == "failed" or signals & ENV_SIGNALS:
        return _decide_env(state, upto, is_last)
    if signals & DATA_SIGNALS:
        return _decide_capped(state, upto, _DATA, "signal")
    return None


def _decide_residue(state: _Replay, upto: int) -> Decision:
    attempt = state.history[upto]
    if set(attempt["signals"]) & TEST_SIGNALS:
        return _decide_capped(state, upto, _TEST, "signal")
    if attempt["suggested_class"] == "TEST":
        return _decide_capped(state, upto, _TEST, "agent")
    if attempt["suggested_class"] == "PRODUCT":
        return _decide_product(state, upto)
    return Decision(_STALL, state.last_class, "failure fits no triage class: stop and ask the human",
                    counters=state.counters(upto))


def _decide(state: _Replay, upto: int, is_last: bool) -> Decision:
    attempt = state.history[upto]
    if attempt["outcome"] == "fail":
        early = _decide_failure(state, upto, is_last)
        if early is not None:
            return early
    if {item["outcome"] for item in state.window(upto)} == {"pass", "fail"}:
        return _decide_flaky(state, upto)
    if attempt["outcome"] == "pass":
        return Decision(_RECORD, state.last_class, "passed", status="pass", counters=state.counters(upto))
    return _decide_residue(state, upto)


def _check_shape(attempt: dict, run: int) -> None:
    if attempt["outcome"] == "pass" and (attempt["signals"] or attempt["suggested_class"] is not None):
        raise TriageError(f"run {run}: a pass carries no failure signals or suggested_class")


def _check_follows(previous: Decision | None, attempt: dict, run: int) -> None:
    change = attempt["change"]
    if previous is None:
        if change != "none":
            raise TriageError(f"run {run}: change {change} before any failure (first run must be change none)")
        return
    if previous.terminal:
        if previous.status == "pass" and change == "none":
            return  # unchanged re-run after a pass (shared spec file re-run): a later fail makes the window FLAKY
        raise TriageError(f"run {run}: run after terminal decision {previous.action} (status {previous.status})")
    if previous.action == _RECHECK_HEALTH:
        raise TriageError(f"run {run}: previous failed run has health unknown; re-check health before re-running")
    if previous.action == _STALL:
        raise TriageError(f"run {run}: run after stall; record the human answer on the stalled run first")
    if change != previous.expected_change:
        raise TriageError(
            f"run {run}: change {change} does not follow action {previous.action} (expected {previous.expected_change})"
        )


def replay(history: list[dict], run_env_resets: int) -> Decision:
    """Decision for the last run of a schema-valid history. Raises TriageError on protocol breaks."""
    if not history:
        raise TriageError("history is empty: nothing to triage")
    env_resets_in_history = sum(1 for attempt in history if attempt["change"] == "env_reset")
    if env_resets_in_history > run_env_resets:
        raise TriageError(
            f"{env_resets_in_history} env_reset run(s) in history > environment.resets {run_env_resets}"
        )
    state = _Replay(history=history, run_env_resets=run_env_resets)
    decision: Decision | None = None
    for index, attempt in enumerate(history):
        run = index + 1
        _check_shape(attempt, run)
        _check_follows(decision, attempt, run)
        decision = _decide(state, index, is_last=index == len(history) - 1)
        state.last_class = decision.triage  # classifying decisions set it; the others carry it over
    return decision
