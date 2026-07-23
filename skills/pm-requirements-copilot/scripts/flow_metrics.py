#!/usr/bin/env python3
"""Compute Lead Time, Cycle Time and WIP from real GitLab issue label events.

Consumes the timeline of label changes per issue (as returned by
`list_issue_events` in the GitLab MCP) instead of manually typed numbers.

Expected input: JSON array of issues, each with "id" and "events" — a list
of {label, action ("add"|"remove"), created_at} ordered chronologically.
Configurable label names identify the "in progress" and "done" states
(defaults: "Status: In Progress" and "Status: Done").

@param payload: JSON with "issues" and optional "in_progress_label" / "done_label"
@return: JSON with per-issue lead/cycle time (days), WIP snapshot, and sprint aggregates

Usage:
    python flow_metrics.py issues_with_events.json
    echo '{...}' | python flow_metrics.py -
"""
import json
import sys
from datetime import datetime, timezone

IN_PROGRESS_DEFAULT = "Status: In Progress"
DONE_DEFAULT = "Status: Done"


def parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def issue_metrics(issue: dict, in_progress_label: str, done_label: str) -> dict:
    created_at = parse_ts(issue["created_at"]) if "created_at" in issue else None
    started_at = None
    done_at = None

    for event in sorted(issue.get("events", []), key=lambda e: e["created_at"]):
        ts = parse_ts(event["created_at"])
        if event["label"] == in_progress_label and event["action"] == "add" and started_at is None:
            started_at = ts
        if event["label"] == done_label and event["action"] == "add":
            done_at = ts

    lead_time_days = round((done_at - created_at).total_seconds() / 86400, 2) if created_at and done_at else None
    cycle_time_days = round((done_at - started_at).total_seconds() / 86400, 2) if started_at and done_at else None

    is_wip = started_at is not None and done_at is None
    wip_age_days = None
    if is_wip:
        wip_age_days = round((datetime.now(timezone.utc) - started_at).total_seconds() / 86400, 2)

    return {
        "id": issue["id"],
        "lead_time_days": lead_time_days,
        "cycle_time_days": cycle_time_days,
        "is_wip": is_wip,
        "wip_age_days": wip_age_days,
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: flow_metrics.py <file.json|-» (stdin)", file=sys.stderr)
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    payload = json.loads(raw)

    in_progress_label = payload.get("in_progress_label", IN_PROGRESS_DEFAULT)
    done_label = payload.get("done_label", DONE_DEFAULT)

    per_issue = [issue_metrics(issue, in_progress_label, done_label) for issue in payload["issues"]]

    closed_lead = [i["lead_time_days"] for i in per_issue if i["lead_time_days"] is not None]
    closed_cycle = [i["cycle_time_days"] for i in per_issue if i["cycle_time_days"] is not None]
    wip_items = [i for i in per_issue if i["is_wip"]]
    stale_threshold = payload.get("stale_wip_days", 5)
    stale_wip = [i for i in wip_items if (i["wip_age_days"] or 0) > stale_threshold]

    result = {
        "issues": per_issue,
        "aggregate": {
            "avg_lead_time_days": round(sum(closed_lead) / len(closed_lead), 2) if closed_lead else None,
            "avg_cycle_time_days": round(sum(closed_cycle) / len(closed_cycle), 2) if closed_cycle else None,
            "wip_count": len(wip_items),
            "stale_wip_count": len(stale_wip),
            "stale_wip_ids": [i["id"] for i in stale_wip],
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
