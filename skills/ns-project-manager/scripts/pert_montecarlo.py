#!/usr/bin/env python3
"""PERT statistics and Monte Carlo simulation for probabilistic forecasting.

Generalizes the RouteWise-specific monte-carlo-routewise.py into a
parametrizable script: N stories with (O, M, P) estimates, grouped into
configurable parallel tracks with independent parallelism factors and
optional start offsets (e.g. a track blocked until week 9 for hardware).

@param config: JSON with "stories" (id, o, m, p) and "tracks" (story_ids,
               parallelism_factor, start_offset)
@return: JSON with PERT per story, project totals, and simulation percentiles

Usage:
    python pert_montecarlo.py config.json
    echo '{...}' | python pert_montecarlo.py -
"""
import json
import math
import random
import sys

N_DEFAULT = 10_000


def pert(o: float, m: float, p: float) -> dict:
    estimate = (o + 4 * m + p) / 6
    variance = ((p - o) / 6) ** 2
    stddev = math.sqrt(variance)
    return {"pert": round(estimate, 2), "variance": round(variance, 4), "stddev": round(stddev, 2)}


def triangular(o: float, m: float, p: float) -> float:
    u = random.random()
    fc = (m - o) / (p - o) if p != o else 0.5
    if u < fc:
        return o + math.sqrt(u * (p - o) * (m - o))
    return p - math.sqrt((1 - u) * (p - o) * (p - m))


def simulate(config: dict, n: int) -> list:
    stories = {s["id"]: s for s in config["stories"]}
    totals = []
    for _ in range(n):
        track_totals = []
        for track in config["tracks"]:
            track_sum = sum(
                triangular(stories[sid]["o"], stories[sid]["m"], stories[sid]["p"])
                for sid in track["story_ids"]
            )
            factor = track.get("parallelism_factor", 1.0)
            offset = track.get("start_offset", 0.0)
            track_totals.append(offset + track_sum / factor)
        totals.append(max(track_totals))
    totals.sort()
    return totals


def percentile(sorted_values: list, pct: int) -> float:
    idx = min(int(pct * len(sorted_values) / 100), len(sorted_values) - 1)
    return round(sorted_values[idx], 2)


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: pert_montecarlo.py <file.json|-» (stdin)", file=sys.stderr)
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    config = json.loads(raw)
    n = config.get("simulations", N_DEFAULT)

    pert_by_story = {}
    for story in config["stories"]:
        pert_by_story[story["id"]] = {**story, **pert(story["o"], story["m"], story["p"])}

    total_pert = sum(v["pert"] for v in pert_by_story.values())
    total_variance = sum(v["variance"] for v in pert_by_story.values())
    total_stddev = round(math.sqrt(total_variance), 2)

    totals = simulate(config, n)

    result = {
        "pert_by_story": list(pert_by_story.values()),
        "project_totals": {
            "sum_pert": round(total_pert, 2),
            "aggregate_stddev": total_stddev,
        },
        "monte_carlo": {
            "simulations": n,
            "p50": percentile(totals, 50),
            "p85": percentile(totals, 85),
            "p95": percentile(totals, 95),
            "mean": round(sum(totals) / len(totals), 2),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
