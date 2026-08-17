#!/usr/bin/env python3
"""Deterministic RICE and WSJF scoring for a backlog.

@param items: JSON array of objects with reach, impact, confidence, effort_pm,
               business_value, time_criticality, risk_reduction, job_size
@return: JSON with per-item scores and a combined ranking

Usage:
    python rice_wsjf.py backlog.json
    echo '[...]' | python rice_wsjf.py -
"""
import json
import sys


def score_item(item: dict) -> dict:
    reach = float(item["reach"])
    impact = float(item["impact"])
    confidence = float(item["confidence"])  # 0-1 or 0-100, normalized below
    effort = float(item["effort_pm"])
    if confidence > 1:
        confidence = confidence / 100.0

    rice = (reach * impact * confidence) / effort if effort else 0.0

    bv = float(item["business_value"])
    tc = float(item["time_criticality"])
    rr = float(item["risk_reduction"])
    job_size = float(item["job_size"])
    cost_of_delay = bv + tc + rr
    wsjf = cost_of_delay / job_size if job_size else 0.0

    return {
        **item,
        "rice_score": round(rice, 2),
        "cost_of_delay": round(cost_of_delay, 2),
        "wsjf": round(wsjf, 2),
    }


def rank(items: list) -> list:
    # Combined ranking: RICE desc, tie-break by Cost of Delay (WSJF) desc.
    return sorted(items, key=lambda i: (-i["rice_score"], -i["cost_of_delay"]))


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: rice_wsjf.py <file.json|-» (stdin)", file=sys.stderr)
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    items = json.loads(raw)

    scored = [score_item(item) for item in items]
    ranked = rank(scored)

    for position, item in enumerate(ranked, start=1):
        item["rank"] = position

    print(json.dumps(ranked, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
