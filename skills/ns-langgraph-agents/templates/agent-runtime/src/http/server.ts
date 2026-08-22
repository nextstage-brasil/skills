import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isDevChatEnabled, renderDevChatHtml } from "./dev-chat.js";
import { getGraph } from "../graph/graph.js";
import { buildRunConfig, initLangSmith } from "../observability/langsmith.js";
import { initOtel } from "../observability/otel.js";
import { initDb, logThread, syncTenant } from "../observability/postgres.js";
import { runStorage } from "../observability/run-context.js";
import { resolveCheckpointerMode } from "../memory/checkpointer.js";
import { bootstrapSkillsRegistry } from "../skills/registry.js";
import { AGENT_ERROR } from "../shared/error-codes.js";

initLangSmith();

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readLatencyBudgetMs(): number {
  const raw = process.env.TURN_LATENCY_BUDGET_MS?.trim();
  if (!raw) {
    return 60_000;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

async function invokeWithLatencyBudget<T>(
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const budgetMs = readLatencyBudgetMs();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), budgetMs);
  try {
    const result = await Promise.race([
      run(ac.signal),
      new Promise<never>((_resolve, reject) => {
        ac.signal.addEventListener("abort", () => {
          const err = new Error(AGENT_ERROR.LATENCY_BUDGET);
          (err as Error & { code: string }).code = AGENT_ERROR.LATENCY_BUDGET;
          reject(err);
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export function createAgentServer() {
  return createServer(async (_req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(_req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      const graph = await getGraph();

      if (_req.method === "GET" && parts[0] === "health") {
        return json(res, 200, { status: "ok" });
      }

      if (_req.method === "GET" && parts[0] === "dev-chat") {
        if (!isDevChatEnabled()) {
          return json(res, 404, { error: "not_found" });
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderDevChatHtml());
        return;
      }

      if (_req.method === "POST" && parts[0] === "threads" && parts.length === 1) {
        const threadId = `thread_${Date.now()}`;
        const tenantId = "1";

        await syncTenant(tenantId, tenantId);
        await logThread(threadId, tenantId);

        const result = await runStorage.run({ threadId, tenantId }, async () =>
          invokeWithLatencyBudget(async (signal) =>
            graph.invoke(
              { messages: [] },
              {
                ...buildRunConfig(threadId, { tenant_id: tenantId, op: "invoke" }),
                signal,
              },
            ),
          ),
        );

        return json(res, 201, { thread_id: threadId, state: result });
      }

      return json(res, 404, { error: "not_found" });
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : undefined;
      if (code === AGENT_ERROR.LATENCY_BUDGET) {
        return json(res, 504, {
          error: AGENT_ERROR.LATENCY_BUDGET,
          error_code: AGENT_ERROR.LATENCY_BUDGET,
        });
      }
      const message = err instanceof Error ? err.message : "unknown_error";
      if (message === AGENT_ERROR.LATENCY_BUDGET) {
        return json(res, 504, {
          error: AGENT_ERROR.LATENCY_BUDGET,
          error_code: AGENT_ERROR.LATENCY_BUDGET,
        });
      }
      return json(res, 500, { error: message });
    }
  });
}

export async function startServer(port = Number(process.env.PORT ?? 3100)) {
  const mode = resolveCheckpointerMode();
  await initDb();
  await initOtel();
  await bootstrapSkillsRegistry();
  await getGraph();
  const server = createAgentServer();
  server.listen(port, () => {
    console.info(`[memory] checkpointer=${mode}`);
    console.info(`[db] observability ready`);
    console.log(`{{PRODUCT_SLUG}}-agent-api listening on ${port}`);
  });
  return server;
}

if (process.env.RUN_HTTP === "1") {
  startServer();
}
