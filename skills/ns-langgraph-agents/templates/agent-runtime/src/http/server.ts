import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { isDevChatEnabled, renderDevChatHtml, serveDevChatApp } from "./dev-chat.js";
import {
  assertHitlResumeApprover,
  alwaysEscalateEffective,
  buildHitlResumePayload,
  hitlTurnDecisionEvent,
  HitlResumeError,
  type HitlResumeBody,
} from "./hitl-resume.js";
import { extractPendingInterrupt } from "./pending-interrupt.js";
import { handleMemoryRoute } from "./memory-routes.js";
import { readJsonBody } from "./read-json-body.js";
import { streamGraphTurn, type CompiledGraph } from "./stream-turn.js";
import { wantsSse } from "./sse.js";
import { getGraph } from "../graph/graph.js";
import { buildRunConfig, initLangSmith } from "../observability/langsmith.js";
import { initOtel } from "../observability/otel.js";
import {
  getLatestCheckpointId,
  initDb,
  logHitlDecision,
  logThread,
  syncTenant,
  upsertTurnDecisions,
} from "../observability/postgres.js";
import { runStorage } from "../observability/run-context.js";
import { resolveCheckpointerMode } from "../memory/checkpointer.js";
import { bootstrapSkillsRegistry } from "../skills/registry.js";
import { readLatencyBudgetMs } from "../shared/latency-budget.js";
import { AGENT_ERROR, errorCodeOf } from "../shared/error-codes.js";

initLangSmith();

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
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

/** Scaffold default tenant — product forks resolve from auth. */
function resolveTenantId(): string {
  return "1";
}

/**
 * Scaffold: trusted `X-User-Id` set by your gateway/BFF after auth.
 * Product forks resolve from the verified token (e.g. JWT `sub`).
 * Never read the user id from body or path. Absent → user memory off.
 */
function resolveUserId(req: IncomingMessage): string | undefined {
  const raw = req.headers["x-user-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
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

      if (parts[0] === "memories") {
        const userId = resolveUserId(_req);
        const owner = userId ? { tenantId: resolveTenantId(), userId } : null;
        if (await handleMemoryRoute(_req, res, url, owner)) {
          return;
        }
      }

      if (_req.method === "GET" && parts[0] === "dev-chat" && parts.length === 1) {
        if (!isDevChatEnabled()) {
          return json(res, 404, { error: "not_found" });
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderDevChatHtml());
        return;
      }

      if (
        _req.method === "GET" &&
        parts[0] === "dev-chat" &&
        parts[1] === "app.js" &&
        parts.length === 2
      ) {
        return serveDevChatApp(res);
      }

      if (_req.method === "POST" && parts[0] === "threads" && parts.length === 1) {
        const threadId = `thread_${Date.now()}`;
        const tenantId = resolveTenantId();
        const userId = resolveUserId(_req);

        await syncTenant(tenantId, tenantId);
        await logThread(threadId, tenantId, userId);

        const result = await runStorage.run({ threadId, tenantId, userId }, async () =>
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

      if (
        _req.method === "POST" &&
        parts[0] === "threads" &&
        parts[2] === "message" &&
        parts.length === 3
      ) {
        const threadId = parts[1];
        let body: Record<string, unknown>;
        try {
          body = (await readJsonBody(_req)) as Record<string, unknown>;
        } catch {
          return json(res, 400, { error: "invalid_json" });
        }
        const message =
          typeof body.message === "string" ? body.message.trim() : "";
        if (!message) {
          return json(res, 400, { error: "message_required" });
        }
        const tenantId = resolveTenantId();
        const userId = resolveUserId(_req);
        await syncTenant(tenantId, tenantId);
        await logThread(threadId, tenantId, userId);

        const runConfig = buildRunConfig(threadId, {
          tenant_id: tenantId,
          op: "message",
        });
        const input = { messages: [new HumanMessage(message)] };

        if (wantsSse(_req)) {
          await runStorage.run({ threadId, tenantId, userId }, async () =>
            streamGraphTurn({
              req: _req,
              res,
              graph: graph as CompiledGraph,
              input,
              runConfig,
            }),
          );
          return;
        }

        const result = await runStorage.run({ threadId, tenantId, userId }, async () =>
          invokeWithLatencyBudget(async (signal) =>
            graph.invoke(input, { ...runConfig, signal }),
          ),
        );
        return json(res, 200, { thread_id: threadId, state: result });
      }

      if (
        _req.method === "POST" &&
        parts[0] === "threads" &&
        parts[2] === "resume" &&
        parts.length === 3
      ) {
        const threadId = parts[1];
        const tenantId = resolveTenantId();
        const userId = resolveUserId(_req);
        let body: HitlResumeBody;
        try {
          body = (await readJsonBody(_req)) as HitlResumeBody;
        } catch {
          return json(res, 400, { error: "invalid_json" });
        }

        const runConfig = buildRunConfig(threadId, {
          tenant_id: tenantId,
          op: "resume",
        });
        const graphState = await graph.getState(runConfig);
        if (!extractPendingInterrupt(graphState)) {
          return json(res, 409, {
            error: AGENT_ERROR.HITL_NOT_PENDING,
            error_code: AGENT_ERROR.HITL_NOT_PENDING,
          });
        }
        const alwaysEscalate = alwaysEscalateEffective(body, graphState);
        try {
          assertHitlResumeApprover({
            ...body,
            always_escalate: alwaysEscalate,
          });
        } catch (err) {
          if (err instanceof HitlResumeError) {
            return json(res, 400, {
              error: err.code,
              error_code: err.code,
            });
          }
          throw err;
        }

        const resumePayload = buildHitlResumePayload(body, alwaysEscalate);
        const decidedAt = new Date();
        const decisionEvent = hitlTurnDecisionEvent(resumePayload, decidedAt);
        const checkpointId = await getLatestCheckpointId(threadId);
        await logHitlDecision({
          threadId,
          checkpointId,
          intentCategory:
            typeof decisionEvent.intent_category === "string"
              ? decisionEvent.intent_category
              : null,
          approverId:
            typeof decisionEvent.approver_id === "string"
              ? decisionEvent.approver_id
              : null,
          approverRole:
            typeof decisionEvent.approver_role === "string"
              ? decisionEvent.approver_role
              : null,
          decidedAt,
          decisionOutcome: String(decisionEvent.decision_outcome),
          alwaysEscalate: decisionEvent.always_escalate === true,
          resumePayload,
        });
        await upsertTurnDecisions(threadId, decisionEvent);

        const command = new Command({ resume: resumePayload });

        if (wantsSse(_req)) {
          await runStorage.run({ threadId, tenantId, userId }, async () =>
            streamGraphTurn({
              req: _req,
              res,
              graph: graph as CompiledGraph,
              input: command,
              runConfig,
            }),
          );
          return;
        }

        const result = await runStorage.run({ threadId, tenantId, userId }, async () =>
          invokeWithLatencyBudget(async (signal) =>
            // Command resume — LangGraph Command generics are wider than node-id union
            graph.invoke(command as never, {
              ...runConfig,
              signal,
            }),
          ),
        );

        return json(res, 200, { thread_id: threadId, state: result });
      }

      return json(res, 404, { error: "not_found" });
    } catch (err) {
      const code = errorCodeOf(err);
      if (code === AGENT_ERROR.LATENCY_BUDGET) {
        return json(res, 504, {
          error: AGENT_ERROR.LATENCY_BUDGET,
          error_code: AGENT_ERROR.LATENCY_BUDGET,
        });
      }
      const message = err instanceof Error ? err.message : "unknown_error";
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
