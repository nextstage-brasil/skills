import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { z } from "zod";
import { createChatModel } from "./provider.js";
import type { LlmConfig } from "./config.js";
import { getRunCtx, accumulateTurnUsage } from "../observability/run-context.js";
import { logCheckpoint, logLlmCall, getNextStepNumber } from "../observability/postgres.js";

/** Per-process memo: models that rejected json_object mode skip it forever. */
const noJsonModeModels = new Set<string>();

function modelKey(config: LlmConfig): string {
  return `${config.provider}:${config.model}`;
}

/** Test helper — clear JSON-mode memo between cases. */
export function clearJsonModeMemo(): void {
  noJsonModeModels.clear();
}

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

/**
 * Extract growing string value of a JSON string field from an incomplete buffer.
 * Finds `"<field>"\s*:\s*"` then unescapes until closing `"` or truncation.
 * Returns null until the field opener is present.
 */
export function extractPartialMarkdown(
  buffer: string,
  fieldName = "markdown",
): string | null {
  const keyRe = new RegExp(`"${escapeRegExp(fieldName)}"\\s*:\\s*"`);
  const m = keyRe.exec(buffer);
  if (!m) {
    return null;
  }
  let i = m.index + m[0].length;
  let out = "";
  while (i < buffer.length) {
    const c = buffer[i];
    if (c === "\\") {
      if (i + 1 >= buffer.length) {
        break;
      }
      const n = buffer[i + 1];
      if (n === "u") {
        if (i + 5 >= buffer.length) {
          break;
        }
        const hex = buffer.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          break;
        }
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      const map: Record<string, string> = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
      };
      if (map[n] !== undefined) {
        out += map[n];
        i += 2;
        continue;
      }
      out += n;
      i += 2;
      continue;
    }
    if (c === '"') {
      break;
    }
    out += c;
    i += 1;
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type JsonInvokeParams = {
  system: string;
  user: string;
  jsonShapeHint: string;
  /** Motor role prompt_version — recorded on llm_logs when observability is on. */
  promptVersion?: string;
};

type StreamJsonParams = JsonInvokeParams & {
  /** Fired each time extracted markdown grows (composer ticks). */
  onPartialMarkdown?: (md: string) => void;
  /** JSON string field to peel from incomplete buffer (default `markdown`). */
  markdownField?: string;
};

function buildMessages(params: JsonInvokeParams) {
  return [
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
}

function chunkToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

async function recordLlmObservability(
  config: LlmConfig,
  params: JsonInvokeParams,
  raw: string,
  latencyMs: number,
  usage: {
    promptTokens: number;
    completionTokens: number;
    cachedTokens: number;
  },
): Promise<void> {
  accumulateTurnUsage(usage);
  const ctx = getRunCtx();
  if (!ctx) {
    return;
  }
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
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      latencyMs,
      stage: config.stage,
      promptVersion: params.promptVersion,
    });
  } catch {
    // observability must never break the agent
  }
}

async function invokeRaw(
  config: LlmConfig,
  params: JsonInvokeParams,
  useJsonObjectMode: boolean,
): Promise<string> {
  const base = createChatModel(config);
  const model = useJsonObjectMode
    ? base.withConfig({ response_format: { type: "json_object" } })
    : base;

  const messages = buildMessages(params);

  const t0 = Date.now();
  const response = await model.invoke(messages);
  const latencyMs = Date.now() - t0;

  const raw =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  const promptTokens =
    (response.usage_metadata?.input_tokens as number | undefined) ?? 0;
  const completionTokens =
    (response.usage_metadata?.output_tokens as number | undefined) ?? 0;
  const cachedTokens =
    (
      response.usage_metadata as
        | { input_token_details?: { cache_read?: number } }
        | undefined
    )?.input_token_details?.cache_read ?? 0;

  await recordLlmObservability(config, params, raw, latencyMs, {
    promptTokens,
    completionTokens,
    cachedTokens,
  });

  return raw;
}

/**
 * Stream JSON object via `model.stream()`. Peels growing `markdown` (or
 * `markdownField`) from the incomplete buffer and calls `onPartialMarkdown`
 * on each growth. Final parse uses the same zod schema as invoke.
 */
async function streamRaw(
  config: LlmConfig,
  params: StreamJsonParams,
  useJsonObjectMode: boolean,
): Promise<string> {
  const base = createChatModel(config);
  const model = useJsonObjectMode
    ? base.withConfig({ response_format: { type: "json_object" } })
    : base;

  const messages = buildMessages(params);
  const field = params.markdownField ?? "markdown";
  let raw = "";
  let lastEmitted = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let cachedTokens = 0;

  const t0 = Date.now();
  const stream = await model.stream(messages);
  for await (const chunk of stream) {
    raw += chunkToText(chunk.content);
    const partial = extractPartialMarkdown(raw, field);
    if (partial !== null && partial !== lastEmitted) {
      lastEmitted = partial;
      params.onPartialMarkdown?.(partial);
    }
    const usage = chunk.usage_metadata;
    if (usage) {
      promptTokens = (usage.input_tokens as number | undefined) ?? promptTokens;
      completionTokens =
        (usage.output_tokens as number | undefined) ?? completionTokens;
      cachedTokens =
        (
          usage as { input_token_details?: { cache_read?: number } }
        ).input_token_details?.cache_read ?? cachedTokens;
    }
  }
  const latencyMs = Date.now() - t0;

  await recordLlmObservability(config, params, raw, latencyMs, {
    promptTokens,
    completionTokens,
    cachedTokens,
  });

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

/** Structured JSON hop (analyst/planner). May use invoke — not user-facing stream. */
export async function invokeJsonSchema<T extends z.ZodTypeAny>(
  config: LlmConfig,
  schema: T,
  params: JsonInvokeParams,
): Promise<z.infer<T>> {
  const key = modelKey(config);
  const preferJson = !noJsonModeModels.has(key);
  let raw: string;
  try {
    raw = await invokeRaw(config, params, preferJson);
  } catch (err) {
    if (!preferJson || !shouldRetryWithoutJsonMode(err)) {
      throw err;
    }
    noJsonModeModels.add(key);
    raw = await invokeRaw(config, params, false);
  }

  return schema.parse(extractJsonObject(raw));
}

/**
 * Composer reply hop: MUST use `model.stream()` so partial markdown becomes
 * `response_streaming` ticks. Analyst/planner keep `invokeJsonSchema`.
 */
export async function streamJsonSchema<T extends z.ZodTypeAny>(
  config: LlmConfig,
  schema: T,
  params: StreamJsonParams,
): Promise<z.infer<T>> {
  const key = modelKey(config);
  const preferJson = !noJsonModeModels.has(key);
  let raw: string;
  try {
    raw = await streamRaw(config, params, preferJson);
  } catch (err) {
    if (!preferJson || !shouldRetryWithoutJsonMode(err)) {
      throw err;
    }
    noJsonModeModels.add(key);
    raw = await streamRaw(config, params, false);
  }

  return schema.parse(extractJsonObject(raw));
}
