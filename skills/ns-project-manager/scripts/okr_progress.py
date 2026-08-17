#!/usr/bin/env python3
"""Deterministic Green/Yellow/Red rubric for OKR progress vs. elapsed cycle time.

Rule (fixed, do not let the LLM "feel" this — it's a formula):
  proportional_target = time_elapsed_pct * kr_target
  ratio = kr_progress / proportional_target
  ratio >= 0.6           -> green
  0.4 <= ratio < 0.6      -> yellow
  ratio < 0.4             -> red
A KR with a blocker that has no owner forces red regardless of ratio.
A project is red if any KR is red; yellow if any KR is yellow (and none red)
or there is an active blocker with an owner and mitigation plan; else green.

@param payload: JSON with "cycle_elapsed_pct" (0-1) and "projects", each with
                "krs" (target, progress) and "blockers" (has_owner: bool)
@return: JSON scorecard per project and per KR

Usage:
    python okr_progress.py portfolio.json
    echo '{...}' | python okr_progress.py -
"""
import json
import sys


def kr_status(progress: float, target: float, elapsed_pct: float) -> dict:
    proportional_target = elapsed_pct * target
    if proportional_target <= 0:
        ratio = None
        status = "yellow"
    else:
        ratio = progress / proportional_target
        if ratio >= 0.6:
            status = "green"
        elif ratio >= 0.4:
            status = "yellow"
        else:
            status = "red"
    return {"proportional_target": round(proportional_target, 2), "ratio": round(ratio, 2) if ratio is not None else None, "status": status}


def project_status(kr_statuses: list, blockers: list) -> str:
    if any(k["status"] == "red" for k in kr_statuses):
        return "red"
    if any(not b.get("has_owner", False) for b in blockers):
        return "red"
    if any(k["status"] == "yellow" for k in kr_statuses):
        return "yellow"
    if any(b.get("has_owner", False) for b in blockers):
        return "yellow"
    return "green"


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: okr_progress.py <file.json|-» (stdin)", file=sys.stderr)
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    payload = json.loads(raw)
    elapsed_pct = payload["cycle_elapsed_pct"]

    scorecard = []
    for project in payload["projects"]:
        krs_out = []
        for kr in project["krs"]:
            evaluated = kr_status(kr["progress"], kr["target"], elapsed_pct)
            krs_out.append({**kr, **evaluated})
        blockers = project.get("blockers", [])
        scorecard.append({
            "project": project["name"],
            "status": project_status(krs_out, blockers),
            "krs": krs_out,
            "blockers": blockers,
        })

    print(json.dumps({"cycle_elapsed_pct": elapsed_pct, "scorecard": scorecard}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
