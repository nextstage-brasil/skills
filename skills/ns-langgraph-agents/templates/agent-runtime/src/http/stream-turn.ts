import type { IncomingMessage, ServerResponse } from "node:http";
import { AGENT_ERROR, errorCodeOf } from "../shared/error-codes.js";
import { progressMessage } from "../conversation/presentation/progress.js";
import { readLatencyBudgetMs } from "../shared/latency-budget.js";
import { asRecord } from "../shared/records.js";
import { extractPendingInterrupt } from "./pending-interrupt.js";
import { getRunCtx } from "../observability/run-context.js";
import {
  endSse,
  envelope,
  initSse,
  writeSseEvent,
} from "./sse.js";

/** Minimal surface used by the HTTP turn streamer (avoids coupling to LangGraph generics). */
export type CompiledGraph = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: (
    input: any,
    config: any,
  ) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState: (config: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoke: (input: any, config: any) => Promise<unknown>;
};

function pickResponseMarkdown(values: unknown): string {
  const rec = asRecord(values);
  if (!rec) {
    return "";
  }
  if (typeof rec.responseMarkdown === "string") {
    return rec.responseMarkdown;
  }
  return "";
}

function pickLocale(values: unknown): string | null {
  const rec = asRecord(values);
  if (!rec) {
    return null;
  }
  return typeof rec.turnLocale === "string" ? rec.turnLocale : null;
}

function pickOptionalField(
  values: unknown,
  key: "render_spec" | "paint",
): unknown {
  const rec = asRecord(values);
  if (!rec || !(key in rec) || rec[key] === undefined || rec[key] === null) {
    return undefined;
  }
  return rec[key];
}

function endAborted(
  res: ServerResponse,
  abortReason: "budget" | "client_close" | null,
): void {
  if (abortReason === "budget") {
    endSse(
      res,
      envelope("failed", "Latency budget exceeded", {
        error_code: AGENT_ERROR.LATENCY_BUDGET,
      }),
    );
    return;
  }
  endSse(res, envelope("cancelled", "Client disconnected"));
}

/** Multi-mode graph.stream yields `[mode, data]`; single-mode yields bare data. */
function isModeTuple(chunk: unknown): chunk is [string, unknown] {
  return (
    Array.isArray(chunk) &&
    chunk.length === 2 &&
    typeof chunk[0] === "string" &&
    (chunk[0] === "values" || chunk[0] === "custom")
  );
}

function emitCustomTick(res: ServerResponse, data: unknown): void {
  const rec = asRecord(data);
  if (!rec) {
    return;
  }
  const status =
    typeof rec.status === "string"
      ? rec.status
      : typeof rec.type === "string"
        ? rec.type
        : null;
  if (status !== "response_streaming") {
    return;
  }
  const message = typeof rec.message === "string" ? rec.message : "";
  writeSseEvent(res, envelope("response_streaming", message));
}

function handleValuesChunk(
  chunk: unknown,
  state: {
    locale: string | null;
    lastIntent: string | null;
    lastValues: unknown;
  },
  res: ServerResponse,
): void {
  state.lastValues = chunk;
  state.locale = pickLocale(chunk) ?? state.locale;
  const intent = asRecord(asRecord(chunk)?.analysis)?.userFacingIntent;
  if (typeof intent === "string" && intent.trim() && intent !== state.lastIntent) {
    state.lastIntent = intent.trim();
    writeSseEvent(res, envelope("thinking", state.lastIntent));
  }
}

/**
 * Stream graph updates over SSE. Abort on client disconnect or latency budget.
 * Composer custom ticks → `response_streaming` as they arrive (not only at end).
 * After stream: pending interrupt → terminal `interrupted`; else `completed`.
 */
export async function streamGraphTurn(params: {
  req: IncomingMessage;
  res: ServerResponse;
  graph: CompiledGraph;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runConfig: any;
}): Promise<void> {
  const { req, res, graph, input, runConfig } = params;
  initSse(res);

  const budgetMs = readLatencyBudgetMs();
  const ac = new AbortController();
  let abortReason: "budget" | "client_close" | null = null;
  const onClose = () => {
    abortReason = "client_close";
    ac.abort();
  };
  req.on("close", onClose);
  const timer = setTimeout(() => {
    abortReason = "budget";
    ac.abort();
  }, budgetMs);

  const live = {
    locale: null as string | null,
    lastIntent: null as string | null,
    lastValues: null as unknown,
  };

  try {
    writeSseEvent(
      res,
      envelope("thinking", progressMessage("thinking", live.locale)),
    );

    const streamOrPromise = graph.stream(input, {
      ...runConfig,
      streamMode: ["values", "custom"],
      signal: ac.signal,
    });
    const stream = await streamOrPromise;

    for await (const chunk of stream) {
      if (ac.signal.aborted || res.writableEnded) {
        break;
      }
      if (isModeTuple(chunk)) {
        const [mode, data] = chunk;
        if (mode === "custom") {
          emitCustomTick(res, data);
          continue;
        }
        handleValuesChunk(data, live, res);
        continue;
      }
      handleValuesChunk(chunk, live, res);
    }

    if (ac.signal.aborted && !res.writableEnded) {
      endAborted(res, abortReason);
      return;
    }

    const graphState = await graph.getState(runConfig);
    const interrupt = extractPendingInterrupt(graphState);
    if (interrupt) {
      endSse(
        res,
        envelope("interrupted", interrupt.question, { interrupt }),
      );
      return;
    }

    const values = asRecord(graphState)?.values ?? live.lastValues ?? {};
    const md = pickResponseMarkdown(values);
    const renderSpec = pickOptionalField(values, "render_spec");
    const paint = pickOptionalField(values, "paint");
    const usage = getRunCtx()?.turnUsage ?? null;
    endSse(
      res,
      envelope("completed", md, {
        usage,
        ...(renderSpec !== undefined ? { render_spec: renderSpec } : {}),
        ...(paint !== undefined ? { paint } : {}),
      }),
    );
  } catch (err) {
    if (res.writableEnded) {
      return;
    }
    const code = errorCodeOf(err);
    if (code === AGENT_ERROR.LATENCY_BUDGET || abortReason === "budget") {
      endAborted(res, "budget");
      return;
    }
    if (abortReason === "client_close" || ac.signal.aborted) {
      endAborted(res, "client_close");
      return;
    }
    const message = err instanceof Error ? err.message : "unknown_error";
    endSse(
      res,
      envelope("failed", message, { error_code: AGENT_ERROR.INTERNAL }),
    );
  } finally {
    clearTimeout(timer);
    req.off("close", onClose);
  }
}
