#!/usr/bin/env python3
"""Aggregate per-repo release_metrics.json into release-metrics.json with pt-BR KPI text.

Usage:
    python release_kpis.py metrics-a.json metrics-b.json --processo processo.json > release-metrics.json

processo.json keys:
    versao, producao, entregas_planejadas, revisoes_concluidas, revisoes_total, frentes_negocio
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime


def fmt_int(n: int | float) -> str:
    return f"{int(round(n)):,}".replace(",", ".")


def fmt_mult(ratio: float) -> str:
    if ratio < 3:
        text = f"{ratio:.1f}".replace(".", ",")
        if text.endswith(",0"):
            text = text[:-2]
        return f"{text}×"
    return f"{int(round(ratio))}×"


def fmt_pct(ratio: float) -> str:
    return f"{int(round(ratio * 100))}%"


def fmt_mil_lines(n: int) -> str:
    if n >= 1_000:
        mil = int(round(n / 1000))
        return f"~{fmt_int(mil)} mil"
    return fmt_int(n)


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    parser = argparse.ArgumentParser(description="Aggregate release metrics into KPIs")
    parser.add_argument("metrics", nargs="+", help="metrics-*.json from release_metrics.sh")
    parser.add_argument("--processo", required=True, help="processo.json with non-code fields")
    args = parser.parse_args()

    repos = [load_json(p) for p in args.metrics]
    processo = load_json(args.processo)

    warnings: list[str] = []
    for r in repos:
        behind = int(r.get("commits_na_base_fora_do_alvo") or 0)
        if behind > 0:
            warnings.append(
                f"ALERTA: {r.get('repo')}: commits_na_base_fora_do_alvo={behind} "
                "(produção tem commits que o alvo não tem — confirme antes do relatório)"
            )

    commits = sum(int(r.get("commits") or 0) for r in repos)
    arquivos_base = sum(int(r["arquivos"]["base"]) for r in repos)
    arquivos_alvo = sum(int(r["arquivos"]["alvo"]) for r in repos)
    arquivos_novos = sum(int(r["arquivos"].get("novos") or 0) for r in repos)
    # Distinct files changed ≈ novos + modified; use sum of area arquivos as changed set size
    arquivos_alterados = 0
    linhas_add = 0
    linhas_rem = 0
    nucleo_base = sum(int(r["nucleo_arquivos"]["base"]) for r in repos)
    nucleo_alvo = sum(int(r["nucleo_arquivos"]["alvo"]) for r in repos)
    loc_base = sum(int(r["linhas_codigo"]["base"]) for r in repos)
    loc_alvo = sum(int(r["linhas_codigo"]["alvo"]) for r in repos)
    tests_base = sum(int(r["casos_de_teste"]["base"]) for r in repos)
    tests_alvo = sum(int(r["casos_de_teste"]["alvo"]) for r in repos)
    tests_ui_base = sum(
        int(r["casos_de_teste"]["base"]) for r in repos if r.get("papel") == "interface"
    )
    tests_ui_alvo = sum(
        int(r["casos_de_teste"]["alvo"]) for r in repos if r.get("papel") == "interface"
    )

    firsts = [parse_date(r.get("primeiro_commit")) for r in repos]
    lasts = [parse_date(r.get("ultimo_commit")) for r in repos]
    firsts_ok = [d for d in firsts if d]
    lasts_ok = [d for d in lasts if d]
    if firsts_ok and lasts_ok:
        dias = (max(lasts_ok) - min(firsts_ok)).days
    else:
        dias = 0

    # Merge areas by name
    areas: dict[str, dict] = {}
    for r in repos:
        for a in r.get("areas") or []:
            name = a["area"]
            bucket = areas.setdefault(
                name,
                {
                    "area": name,
                    "papel": a.get("papel") or "apoio",
                    "arquivos": 0,
                    "adicionadas": 0,
                    "removidas": 0,
                },
            )
            bucket["arquivos"] += int(a.get("arquivos") or 0)
            bucket["adicionadas"] += int(a.get("adicionadas") or 0)
            bucket["removidas"] += int(a.get("removidas") or 0)
            if a.get("papel") in ("nucleo", "produto"):
                bucket["papel"] = a["papel"]

    for bucket in areas.values():
        bucket["linhas_alteradas"] = bucket["adicionadas"] + bucket["removidas"]
        arq = bucket["arquivos"] or 1
        bucket["densidade"] = round(bucket["linhas_alteradas"] / arq, 1)

    total_linhas_alt = sum(b["linhas_alteradas"] for b in areas.values()) or 1
    arquivos_alterados = sum(b["arquivos"] for b in areas.values())
    linhas_add = sum(b["adicionadas"] for b in areas.values())
    linhas_rem = sum(b["removidas"] for b in areas.values())

    foco_candidates = [
        b
        for b in areas.values()
        if b["papel"] in ("nucleo", "produto") and b["linhas_alteradas"] > 0
    ]
    foco_candidates.sort(key=lambda b: b["linhas_alteradas"], reverse=True)
    top3 = foco_candidates[:3]
    foco_areas = []
    foco_soma = 0.0
    for b in top3:
        share = b["linhas_alteradas"] / total_linhas_alt
        foco_soma += share
        foco_areas.append(
            {
                "area": b["area"],
                "papel": b["papel"],
                "arquivos": b["arquivos"],
                "linhas_alteradas": b["linhas_alteradas"],
                "participacao": share,
                "participacao_fmt": fmt_pct(share),
                "densidade": b["densidade"],
                "densidade_fmt": f"{b['densidade']}".replace(".", ",") + " linhas/arquivo",
            }
        )

    porte_ratio = (arquivos_alvo / arquivos_base) if arquivos_base else 0.0
    testes_ratio = (tests_alvo / tests_base) if tests_base else 0.0
    nucleo_ratio = (nucleo_alvo / nucleo_base) if nucleo_base else 0.0

    revisoes_ok = int(processo.get("revisoes_concluidas") or 0)
    revisoes_total = int(processo.get("revisoes_total") or 0)
    revisoes_ratio = (revisoes_ok / revisoes_total) if revisoes_total else 0.0

    out = {
        "versao": processo.get("versao"),
        "producao": processo.get("producao"),
        "avisos": warnings,
        "repos": [
            {
                "repo": r.get("repo"),
                "papel": r.get("papel"),
                "base": r.get("base"),
                "alvo": r.get("alvo"),
                "commits_na_base_fora_do_alvo": r.get("commits_na_base_fora_do_alvo"),
            }
            for r in repos
        ],
        "areas": list(areas.values()),
        "kpis": {
            "entra_em_producao": {
                "valor": processo.get("producao"),
                "fmt": processo.get("producao"),
                "rotulo": "Entra em produção",
            },
            "porte_do_produto": {
                "base": arquivos_base,
                "alvo": arquivos_alvo,
                "multiplicador": porte_ratio,
                "fmt": fmt_mult(porte_ratio),
                "de_para_fmt": f"de {fmt_int(arquivos_base)} para {fmt_int(arquivos_alvo)} arquivos",
                "rotulo": "Porte do produto",
            },
            "testes_automaticos": {
                "base": tests_base,
                "alvo": tests_alvo,
                "multiplicador": testes_ratio,
                "fmt": fmt_mult(testes_ratio),
                "de_para_fmt": f"de {fmt_int(tests_base)} para {fmt_int(tests_alvo)} casos",
                "rotulo": "Testes automáticos",
            },
            "dias_de_trabalho": {
                "valor": dias,
                "fmt": fmt_int(dias),
                "rotulo": "Dias de trabalho",
                "primeiro_commit": min(firsts_ok).isoformat() if firsts_ok else None,
                "ultimo_commit": max(lasts_ok).isoformat() if lasts_ok else None,
            },
            "foco_da_entrega": {
                "participacao_top3": foco_soma,
                "fmt": fmt_pct(foco_soma),
                "areas": foco_areas,
                "rotulo": "Foco da entrega",
                "nota": "Calculado por linhas alteradas (adicionadas + removidas), nunca por arquivos",
            },
            "alteracoes_de_codigo": {
                "valor": commits,
                "fmt": fmt_int(commits),
                "rotulo": "Alterações de código (commits)",
            },
            "arquivos_criados_ou_alterados": {
                "valor": arquivos_alterados,
                "novos": arquivos_novos,
                "fmt": fmt_int(arquivos_alterados),
                "rotulo": "Arquivos criados ou alterados",
            },
            "linhas_de_codigo_escritas": {
                "adicionadas": linhas_add,
                "removidas": linhas_rem,
                "fmt": fmt_mil_lines(linhas_add),
                "fmt_exato": fmt_int(linhas_add),
                "rotulo": "Linhas de código escritas",
            },
            "revisoes_de_entrega_concluidas": {
                "concluidas": revisoes_ok,
                "total": revisoes_total,
                "participacao": revisoes_ratio,
                "fmt": f"{fmt_int(revisoes_ok)} de {fmt_int(revisoes_total)}",
                "rotulo": "Revisões de entrega concluídas",
            },
            "entregas_planejadas": {
                "valor": int(processo.get("entregas_planejadas") or 0),
                "fmt": fmt_int(int(processo.get("entregas_planejadas") or 0)),
                "rotulo": "Entregas planejadas",
            },
            "frentes_de_negocio": {
                "valor": int(processo.get("frentes_negocio") or 0),
                "fmt": fmt_int(int(processo.get("frentes_negocio") or 0)),
                "rotulo": "Frentes de negócio",
            },
            "crescimento_do_nucleo": {
                "base": nucleo_base,
                "alvo": nucleo_alvo,
                "multiplicador": nucleo_ratio,
                "fmt": fmt_mult(nucleo_ratio),
                "de_para_fmt": f"de {fmt_int(nucleo_base)} para {fmt_int(nucleo_alvo)} arquivos",
                "rotulo": "Crescimento do núcleo",
            },
            "testes_nas_telas_do_cliente": {
                "base": tests_ui_base,
                "alvo": tests_ui_alvo,
                "fmt": f"{fmt_int(tests_ui_base)} → {fmt_int(tests_ui_alvo)}",
                "rotulo": "Testes nas telas do cliente",
            },
            "codigo_da_aplicacao": {
                "base": loc_base,
                "alvo": loc_alvo,
                "fmt": f"{fmt_int(loc_base)} → {fmt_int(loc_alvo)}",
                "rotulo": "Código da aplicação",
            },
        },
    }

    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")

    if warnings:
        for w in warnings:
            print(w, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
