import type { RunnableConfig } from "@langchain/core/runnables";

export type RunContext = {
  tenant_id?: string;
  op?: "invoke" | "message" | "resume";
  tags?: string[];
  metadata?: Record<string, string | undefined>;
};

const DEFAULT_PROJECT = "{{PRODUCT_SLUG}}";

let initialized = false;

/**
 * Opt-in: enable via LANGSMITH_ENABLED=true + LANGCHAIN_API_KEY.
 * Observability default is PostgreSQL (src/observability/postgres.ts).
 */
export function initLangSmith(): { enabled: boolean; project: string } {
  if (initialized) {
    return {
      enabled: process.env.LANGCHAIN_TRACING_V2 === "true",
      project: process.env.LANGCHAIN_PROJECT ?? DEFAULT_PROJECT,
    };
  }
  initialized = true;

  const optIn = process.env.LANGSMITH_ENABLED === "true";
  const hasKey = Boolean(process.env.LANGCHAIN_API_KEY?.trim());

  if (optIn && hasKey) {
    if (!process.env.LANGCHAIN_TRACING_V2) {
      process.env.LANGCHAIN_TRACING_V2 = "true";
    }
    if (!process.env.LANGCHAIN_PROJECT) {
      process.env.LANGCHAIN_PROJECT = DEFAULT_PROJECT;
    }
  }

  const enabled = process.env.LANGCHAIN_TRACING_V2 === "true" && hasKey;
  const project = process.env.LANGCHAIN_PROJECT ?? DEFAULT_PROJECT;

  if (enabled) {
    console.info(`[langsmith] tracing enabled → project "${project}"`);
  }

  return { enabled, project };
}

export function buildRunConfig(threadId: string, ctx: RunContext = {}): RunnableConfig {
  const tenant = ctx.tenant_id ?? "1";
  const op = ctx.op ?? "invoke";
  const extraTags = ctx.tags ?? [];
  const meta = { thread_id: threadId, tenant_id: ctx.tenant_id, op, ...ctx.metadata };

  return {
    configurable: { thread_id: threadId },
    runName: `agent-${op}-${tenant}`,
    metadata: meta,
    tags: [tenant, op, ...extraTags].filter(Boolean),
  };
}
