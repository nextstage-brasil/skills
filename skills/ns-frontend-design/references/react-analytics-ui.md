# React analytics UI

Use when the confirmed stack is **React** (`docs/context/stack-confirmed.md`, `design-brief.md`, or codebase audit).

## Default chart library: Recharts

Prefer **Recharts** for agent-facing or operator dashboards unless the repo already standardizes another chart library.

| Need | Approach |
| ---- | -------- |
| KPIs | Stat cards from project primitives; optional `LineChart` / `AreaChart` sparkline when trend adds value |
| Bar / line | `BarChart`, `LineChart` — labeled axes, legend when multiple series |
| Timeline | `LineChart` or `AreaChart` on a time axis; state time range in caption |
| Tables | Project table components beside charts — not Recharts `Table` as default |
| Sources | Caption under each plot: `Source: {system} · {period}` |
| Alerts | Project callout/alert components for thresholds, errors, incomplete data |

## Rules

- Match project tokens, typography, and spacing from `design-brief.md`.
- Every plot is self-describing: title (specific metric), axis labels with units, legend when needed.
- Respect `prefers-reduced-motion`; avoid decorative animation on charts.
- Do not add Plotly, Vega, Chart.js, Nivo, or ECharts on greenfield React work unless the codebase already uses them.
- When data comes from agent/MCP evidence channels, UI reads structured props/state — charts display evidence; they are not the source of truth for numbers.

## Composition

Typical analytics screen layout:

1. KPI row (stats + optional sparklines)
2. Primary chart (bar or line)
3. Timeline or secondary breakdown
4. Supporting table
5. Source captions and alert callouts when thresholds fail or data is partial

Keep hierarchy flat and minimal — see `anti-slop.md`.
