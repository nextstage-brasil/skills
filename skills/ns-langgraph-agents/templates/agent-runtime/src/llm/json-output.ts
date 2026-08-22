import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { createChatModel } from "./provider.js";
import type { LlmConfig } from "./config.js";
import { getRunCtx } from "../observability/run-context.js";
import { logCheckpoint, logLlmCall, getNextStepNumber } from "../observability/postgres.js";

function findJsonObjectSlice(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not contain a JSON object");
  }
  return text.slice(start, end + 1);
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(findJsonObjectSlice(candidate)) as unknown;
}

type JsonInvokeParams = {
  system: string;
  user: string;
  jsonShapeHint: string;
};

async function invokeRaw(
  config: LlmConfig,
  params: JsonInvokeParams,
  useJsonObjectMode: boolean,
): Promise<string> {
  const base = createChatModel(config);
  const model = useJsonObjectMode
    ? base.withConfig({ response_format: { type: "json_object" } })
    : base;

  const messages = [
    new SystemMessage(
      [
        params.system,
        "",
        "You must respond with a single valid JSON object only (no markdown, no prose outside JSON).",
        params.jsonShapeHint,
      ].join("\n"),
    ),
    new HumanMessage(params.user),
  ];

  const t0 = Date.now();
  const response = await model.invoke(messages);
  const latencyMs = Date.now() - t0;

  const raw =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const ctx = getRunCtx();
  if (ctx) {
    try {
      let checkpointId = ctx.checkpointId;
      if (!checkpointId) {
        const step = await getNextStepNumber(ctx.threadId);
        checkpointId = await logCheckpoint(
          ctx.threadId,
          step,
          ctx.nodeName ?? "llm_call",
          null,
        );
        ctx.checkpointId = checkpointId;
      }
      await logLlmCall({
        checkpointId,
        modelName: `${config.role}:${config.model}`,
        promptRaw: params.user,
        responseRaw: raw,
        promptTokens: (response.usage_metadata?.input_tokens as number | undefined) ?? 0,
        completionTokens: (response.usage_metadata?.output_tokens as number | undefined) ?? 0,
        latencyMs,
      });
    } catch {
      // observability must never break the agent
    }
  }

  return raw;
}

function shouldRetryWithoutJsonMode(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("tool_choice") ||
    msg.includes("response_format") ||
    msg.includes("Invalid tool") ||
    msg.includes("json_object")
  );
}

export async function invokeJsonSchema<T extends z.ZodTypeAny>(
  config: LlmConfig,
  schema: T,
  params: JsonInvokeParams,
): Promise<z.infer<T>> {
  let raw: string;
  try {
    raw = await invokeRaw(config, params, true);
  } catch (err) {
    if (!shouldRetryWithoutJsonMode(err)) {
      throw err;
    }
    raw = await invokeRaw(config, params, false);
  }

  return schema.parse(extractJsonObject(raw));
}
