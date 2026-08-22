/**
 * OpenTelemetry GenAI spans (opt-in).
 * Postgres remains the audit SoT — this layer is additive.
 *
 * Enable with OTEL_ENABLED=true. Without the SDK packages installed,
 * init is a no-op warn so products can adopt gradually.
 */

export type GenAiSpanKind = "invoke_agent" | "chat" | "execute_tool";

export interface GenAiSpanAttrs {
  "gen_ai.operation.name"?: GenAiSpanKind;
  "gen_ai.request.model"?: string;
  "gen_ai.usage.input_tokens"?: number;
  "gen_ai.usage.output_tokens"?: number;
  "gen_ai.tool.name"?: string;
  "gen_ai.tool.call.id"?: string;
  "gen_ai.agent.name"?: string;
  /** Content capture is opt-in (PII/LGPD). */
  "gen_ai.tool.call.arguments"?: string;
  "gen_ai.tool.call.result"?: string;
}

let enabled = false;
let tracer: {
  startSpan: (
    name: string,
    attrs?: GenAiSpanAttrs,
  ) => { end: () => void; setAttributes: (a: GenAiSpanAttrs) => void; recordException: (e: unknown) => void };
} | null = null;

export function isOtelEnabled(): boolean {
  return process.env.OTEL_ENABLED === "true";
}

export async function initOtel(): Promise<void> {
  if (!isOtelEnabled()) {
    return;
  }
  if (enabled) {
    return;
  }

  try {
    // Dynamic import keeps Vitest / default installs light when OTEL is off.
    const api = await import("@opentelemetry/api");
    tracer = {
      startSpan(name, attrs) {
        const span = api.trace.getTracer("agent-runtime").startSpan(name);
        if (attrs) {
          span.setAttributes(attrs as Record<string, string | number>);
        }
        return {
          end: () => span.end(),
          setAttributes: (a) =>
            span.setAttributes(a as Record<string, string | number>),
          recordException: (e) => {
            if (e instanceof Error) {
              span.recordException(e);
            }
          },
        };
      },
    };
    enabled = true;
    console.info("[otel] GenAI tracer ready (OTEL_ENABLED=true)");
  } catch {
    console.warn(
      "[otel] @opentelemetry/api not available — install OTel SDK packages to emit spans",
    );
  }
}

export function startGenAiSpan(
  kind: GenAiSpanKind,
  attrs: GenAiSpanAttrs = {},
): { end: () => void; setAttributes: (a: GenAiSpanAttrs) => void; recordException: (e: unknown) => void } {
  const name =
    kind === "invoke_agent"
      ? "invoke_agent"
      : kind === "chat"
        ? "chat"
        : "execute_tool";
  const merged: GenAiSpanAttrs = {
    "gen_ai.operation.name": kind,
    ...attrs,
  };
  if (!enabled || !tracer) {
    return {
      end: () => undefined,
      setAttributes: () => undefined,
      recordException: () => undefined,
    };
  }
  return tracer.startSpan(name, merged);
}

/** In-memory counters for robustness metrics (per process). */
const metrics = {
  toolCalls: 0,
  repeatedArgFingerprints: 0,
  budgetKilled: 0,
};
const fingerprintSeen = new Map<string, number>();

export function recordToolCallMetric(argFingerprint: string): void {
  metrics.toolCalls += 1;
  const n = (fingerprintSeen.get(argFingerprint) ?? 0) + 1;
  fingerprintSeen.set(argFingerprint, n);
  if (n > 1) {
    metrics.repeatedArgFingerprints += 1;
  }
}

export function recordBudgetKilled(): void {
  metrics.budgetKilled += 1;
}

export function getOtelRobustnessMetrics(): Readonly<typeof metrics> {
  return { ...metrics };
}

export function resetOtelMetricsForTests(): void {
  metrics.toolCalls = 0;
  metrics.repeatedArgFingerprints = 0;
  metrics.budgetKilled = 0;
  fingerprintSeen.clear();
}
