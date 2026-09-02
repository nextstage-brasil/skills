#!/usr/bin/env python3
"""Deterministic DAG layering and topological order for backlog items.

Critical path: longest dependency chain where weight is the sum of node
effort along the path (not edge count).

@param items: JSON array with id, title, depends_on, effort/effort_pm, rice_score, rank
@return: JSON with cycles, layers, topological_order, reordered, critical_path, mermaid

Usage:
    python3 dag_order.py file.json
    echo '[...]' | python3 dag_order.py -
"""
import json
import sys
from collections import deque
from typing import Any


def resolve_id(raw: dict, index: int) -> str:
    if raw.get("id") is not None:
        return str(raw["id"])
    if raw.get("title") is not None:
        return str(raw["title"])
    return f"item-{index}"


def normalize_item(raw: dict, index: int) -> dict:
    effort = raw.get("effort")
    if effort is None:
        effort = raw.get("effort_pm", 0)
    depends = raw.get("depends_on")
    if depends is None:
        depends = []
    node_id = resolve_id(raw, index)
    return {
        **raw,
        "id": node_id,
        "effort": float(effort),
        "depends_on": [str(d) for d in depends],
    }


def build_graph(nodes: dict[str, dict]) -> tuple[dict[str, list[str]], dict[str, int]]:
    adj: dict[str, list[str]] = {nid: [] for nid in nodes}
    in_degree: dict[str, int] = {nid: 0 for nid in nodes}
    for nid, node in nodes.items():
        for dep in node["depends_on"]:
            dep = str(dep)
            if dep not in nodes:
                continue
            adj[dep].append(nid)
            in_degree[nid] += 1
    return adj, in_degree


def sanitize_mermaid_id(node_id: str) -> str:
    safe = node_id.replace("-", "_").replace(".", "_").replace(" ", "_")
    if safe != node_id or not safe.replace("_", "").isalnum():
        return f'"{node_id}"'
    return safe


def find_cycles(nodes: dict[str, dict], adj: dict[str, list[str]]) -> list[list[str]]:
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in nodes}
    parent: dict[str, str | None] = {nid: None for nid in nodes}
    cycles: list[list[str]] = []

    def dfs(u: str) -> None:
        color[u] = GRAY
        for v in adj[u]:
            if color[v] == GRAY:
                cycle: list[str] = [v]
                cur = u
                while cur != v:
                    cycle.append(cur)
                    cur = parent[cur] or v
                cycle.reverse()
                if cycle not in cycles:
                    cycles.append(cycle)
            elif color[v] == WHITE:
                parent[v] = u
                dfs(v)
        color[u] = BLACK

    for nid in nodes:
        if color[nid] == WHITE:
            dfs(nid)
    return cycles


def intra_sort_key(item: dict) -> tuple:
    rice = item.get("rice_score")
    rice_key = -float(rice) if rice is not None else 0
    return (rice_key, item["effort"], item["id"])


def kahn_layers(
    nodes: dict[str, dict], adj: dict[str, list[str]], in_degree: dict[str, int]
) -> list[list[str]]:
    in_deg = dict(in_degree)
    layers: list[list[str]] = []
    current = sorted(nid for nid, deg in in_deg.items() if deg == 0)
    visited = 0

    while current:
        layers.append(current)
        visited += len(current)
        next_layer: list[str] = []
        for nid in current:
            for succ in adj[nid]:
                in_deg[succ] -= 1
                if in_deg[succ] == 0:
                    next_layer.append(succ)
        current = sorted(next_layer)

    if visited != len(nodes):
        return []
    return layers


def sort_layer(layer_ids: list[str], nodes: dict[str, dict]) -> list[str]:
    items = [nodes[nid] for nid in layer_ids]
    items.sort(key=intra_sort_key)
    return [item["id"] for item in items]


def rice_rank_map(nodes: dict[str, dict]) -> dict[str, int]:
    if all(item.get("rank") is not None for item in nodes.values()):
        return {item["id"]: int(item["rank"]) for item in nodes.values()}
    ranked = sorted(nodes.values(), key=intra_sort_key)
    return {item["id"]: pos for pos, item in enumerate(ranked, start=1)}


def build_reordered(
    topo_order: list[str],
    layer_of: dict[str, int],
    nodes: dict[str, dict],
    rice_ranks: dict[str, int],
) -> list[dict]:
    reordered: list[dict] = []
    topo_pos = {nid: i + 1 for i, nid in enumerate(topo_order)}

    for nid in topo_order:
        rice_rank = rice_ranks[nid]
        topo_rank = topo_pos[nid]
        if topo_rank > rice_rank:
            deps = [d for d in nodes[nid]["depends_on"] if d in nodes]
            blocker = deps[0] if deps else ""
            reordered.append(
                {
                    "id": nid,
                    "title": nodes[nid].get("title", nid),
                    "rice_rank": rice_rank,
                    "topological_rank": topo_rank,
                    "layer": layer_of[nid],
                    "depends_on": blocker,
                    "flag": (
                        f"[DAG-REORDERED: item {nid} dropped from rank {rice_rank} "
                        f"to layer {layer_of[nid]} because it depends on {blocker}]"
                    ),
                }
            )
    return reordered


def critical_path(
    nodes: dict[str, dict], adj: dict[str, list[str]], in_degree: dict[str, int]
) -> dict:
    best_sum: dict[str, float] = {nid: nodes[nid]["effort"] for nid in nodes}
    best_pred: dict[str, str | None] = {nid: None for nid in nodes}
    in_deg = dict(in_degree)
    queue = deque(sorted(nid for nid, deg in in_deg.items() if deg == 0))

    while queue:
        u = queue.popleft()
        for v in adj[u]:
            candidate = best_sum[u] + nodes[v]["effort"]
            if candidate > best_sum[v]:
                best_sum[v] = candidate
                best_pred[v] = u
            in_deg[v] -= 1
            if in_deg[v] == 0:
                queue.append(v)

    if not nodes:
        return {"path": [], "effort_sum": 0, "titles": []}

    end = max(nodes.keys(), key=lambda nid: best_sum[nid])
    path: list[str] = []
    cur: str | None = end
    while cur is not None:
        path.append(cur)
        cur = best_pred[cur]
    path.reverse()
    return {
        "path": path,
        "effort_sum": round(best_sum[end], 2),
        "titles": [nodes[nid].get("title", nid) for nid in path],
    }


def build_mermaid(
    layers: list[list[str]], nodes: dict[str, dict], adj: dict[str, list[str]]
) -> str:
    lines = ["flowchart LR"]
    for idx, layer in enumerate(layers):
        lines.append(f"  subgraph L{idx} [Layer {idx}]")
        for nid in layer:
            safe = sanitize_mermaid_id(nid)
            title = nodes[nid].get("title", nid).replace('"', "'")
            lines.append(f'    {safe}["{title}"]')
        lines.append("  end")
    for src_id, successors in adj.items():
        src = sanitize_mermaid_id(src_id)
        for dst_id in successors:
            dst = sanitize_mermaid_id(dst_id)
            lines.append(f"  {src} --> {dst}")
    return "\n".join(lines)


def process(items: list[dict]) -> dict[str, Any]:
    if not items:
        return {
            "cycles": [],
            "layers": [],
            "topological_order": [],
            "items": [],
            "reordered": [],
            "critical_path": {"path": [], "effort_sum": 0, "titles": []},
            "mermaid": "flowchart LR",
        }

    normalized = [normalize_item(item, idx) for idx, item in enumerate(items)]
    nodes = {item["id"]: item for item in normalized}
    adj, in_degree = build_graph(nodes)

    cycles = find_cycles(nodes, adj)
    if cycles:
        return {"cycles": cycles}

    layers_raw = kahn_layers(nodes, adj, in_degree)
    if not layers_raw:
        return {"cycles": find_cycles(nodes, adj)}

    layers = [sort_layer(layer, nodes) for layer in layers_raw]
    topo_order: list[str] = []
    for layer in layers:
        topo_order.extend(layer)

    layer_of = {nid: idx for idx, layer in enumerate(layers) for nid in layer}
    topo_pos = {nid: i + 1 for i, nid in enumerate(topo_order)}
    rice_ranks = rice_rank_map(nodes)
    reordered = build_reordered(topo_order, layer_of, nodes, rice_ranks)
    cp = critical_path(nodes, adj, in_degree)
    mermaid = build_mermaid(layers, nodes, adj)

    output_items = []
    for nid in topo_order:
        item = dict(nodes[nid])
        item["layer"] = layer_of[nid]
        item["topological_rank"] = topo_pos[nid]
        output_items.append(item)

    return {
        "cycles": [],
        "layers": layers,
        "topological_order": topo_order,
        "items": output_items,
        "reordered": reordered,
        "critical_path": cp,
        "mermaid": mermaid,
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: dag_order.py <file.json|-» (stdin)", file=sys.stderr)
        sys.exit(1)

    raw = sys.stdin.read() if sys.argv[1] == "-" else open(sys.argv[1], encoding="utf-8").read()
    items = json.loads(raw)
    result = process(items)

    if result.get("cycles"):
        print(json.dumps({"cycles": result["cycles"]}, ensure_ascii=False, indent=2))
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))


def _self_check() -> None:
    cycle_items = [
        {"id": "A", "title": "A", "depends_on": ["B"], "effort": 1, "rice_score": 10},
        {"id": "B", "title": "B", "depends_on": ["A"], "effort": 1, "rice_score": 10},
    ]
    cycle_result = process(cycle_items)
    assert cycle_result.get("cycles"), "cycle case must detect cycles"
    assert cycle_result["cycles"] != [["unknown cycle"]], "no fake cycle placeholder"

    single_layer = [
        {"id": "US-01", "title": "one", "depends_on": [], "effort": 2, "rice_score": 50},
        {"id": "US-02", "title": "two", "depends_on": [], "effort": 1, "rice_score": 80},
        {"id": "US-03", "title": "three", "depends_on": [], "effort": 3, "rice_score": 30},
    ]
    sl = process(single_layer)
    assert len(sl["layers"]) == 1, "no edges must be single layer"
    assert sl["topological_order"] == ["US-02", "US-01", "US-03"], "rice desc intra-layer"

    chain = [
        {"id": "US-01", "title": "hardware", "depends_on": [], "effort": 5, "rice_score": 20, "rank": 2},
        {"id": "US-03", "title": "export", "depends_on": ["US-01"], "effort": 3, "rice_score": 90, "rank": 1},
    ]
    ch = process(chain)
    assert ch["topological_order"].index("US-03") > ch["topological_order"].index("US-01")
    assert len(ch["reordered"]) >= 1
    assert "subgraph" in ch["mermaid"], "mermaid must contain subgraph"
    assert '["export"]' in ch["mermaid"] or '["hardware"]' in ch["mermaid"], "mermaid title labels"

    no_id = [
        {"title": "alpha", "depends_on": [], "effort": 1, "rice_score": 5},
        {"title": "beta", "depends_on": ["alpha"], "effort": 2, "rice_score": 10},
    ]
    ni = process(no_id)
    assert ni["topological_order"][0] == "alpha", "missing id falls back to title"

    mixed_types = [
        {"id": "1", "title": "first", "depends_on": [2], "effort": 1, "rice_score": 10},
        {"id": 2, "title": "second", "depends_on": [], "effort": 1, "rice_score": 5},
    ]
    mx = process(mixed_types)
    assert len(mx["layers"]) == 2, "str id depending on int id must produce two layers"
    assert mx["topological_order"].index("2") < mx["topological_order"].index("1")

    empty = process([])
    assert empty["layers"] == [] and empty["topological_order"] == []


if __name__ == "__main__":
    if len(sys.argv) == 1:
        _self_check()
        print("dag_order.py self-check passed", file=sys.stderr)
    else:
        main()
