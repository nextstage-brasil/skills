import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  argFingerprint,
  checkRateLimit,
} from "../capability/governance.js";
import { mcpToolName } from "../capability/tool-names.js";
import { capabilityIdMcp } from "../capability/types.js";
import {
  resolveContextConfig,
  truncateToolOutput,
} from "../memory/context-window.js";
import { logToolExecution } from "../observability/postgres.js";
import { createMcpClient } from "./client.js";
import { isToolAllowedOnServer } from "./governance.js";
import type { ResolvedMcpServer } from "./registry.js";
import type { CapabilityMeta } from "../capability/types.js";
import type { McpToolDescriptor } from "./client.js";

export interface McpToolBindOptions {
  tenantId: string;
  llmLogId?: string;
  rateLimit?: { limit: number; windowMs: number };
  /** When false, skip Postgres audit (tests). Default true. */
  audit?: boolean;
}

/**
 * Extract LLM-visible text from an MCP tool result BEFORE truncate.
 * Prefer text content blocks XOR structuredContent — never JSON.stringify
 * the whole `{ content, structuredContent }` envelope (double-stringify).
 */
export function normalizeMcpToolResult(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }
  if (result === null || result === undefined) {
    return "";
  }
  if (typeof result !== "object") {
    return String(result);
  }

  const obj = result as Record<string, unknown>;
  const textFromContent = extractTextFromContent(obj.content);
  if (textFromContent !== null) {
    return textFromContent;
  }

  if ("structuredContent" in obj && obj.structuredContent !== undefined) {
    const sc = obj.structuredContent;
    return typeof sc === "string" ? sc : JSON.stringify(sc);
  }

  if ("content" in obj || "structuredContent" in obj) {
    return "";
  }

  return JSON.stringify(result);
}

function extractTextFromContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const parts: string[] = [];
  for (const block of content) {
    if (block === null || typeof block !== "object") {
      continue;
    }
    const b = block as Record<string, unknown>;
    if (b.type === "text" && typeof b.text === "string") {
      parts.push(b.text);
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Adapts a governed MCP tool into a LangChain StructuredTool for bind_tools.
 */
export function mcpToolToLangChain(
  server: ResolvedMcpServer,
  descriptor: McpToolDescriptor,
  meta: CapabilityMeta,
  opts: McpToolBindOptions,
): DynamicStructuredTool {
  const toolName = mcpToolName(server.id, descriptor.name);
  const rate = opts.rateLimit ?? { limit: 60, windowMs: 60_000 };

  return new DynamicStructuredTool({
    name: toolName,
    description:
      descriptor.description ??
      `MCP tool ${descriptor.name} on server ${server.id}`,
    schema: z.object({}).passthrough(),
    func: async (input) => {
      const args = input as Record<string, unknown>;
      const started = Date.now();
      const capId = capabilityIdMcp(server.id, descriptor.name);

      if (!isToolAllowedOnServer(server.config, descriptor.name)) {
        throw new Error(`mcp_tool_not_allowlisted:${server.id}:${descriptor.name}`);
      }

      if (
        !checkRateLimit({
          tenantId: opts.tenantId,
          capabilityId: capId,
          limit: rate.limit,
          windowMs: rate.windowMs,
        })
      ) {
        if (opts.audit !== false && opts.llmLogId) {
          await logToolExecution({
            llmLogId: opts.llmLogId,
            toolName,
            args,
            output: "rate_limited",
            latencyMs: Date.now() - started,
            isSuccess: false,
            server: server.id,
            toolKind: "mcp",
            argFingerprint: argFingerprint(args),
          });
        }
        throw new Error(`mcp_rate_limited:${capId}`);
      }

      const client = createMcpClient(server);
      try {
        const result = await client.callTool(descriptor.name, args);
        const normalized = normalizeMcpToolResult(result);
        const output = truncateToolOutput(
          normalized,
          resolveContextConfig().toolOutputMaxChars,
        );
        if (opts.audit !== false && opts.llmLogId) {
          await logToolExecution({
            llmLogId: opts.llmLogId,
            toolName,
            args,
            output,
            latencyMs: Date.now() - started,
            isSuccess: true,
            server: server.id,
            toolKind: "mcp",
            classification: meta.classification,
            argFingerprint: argFingerprint(args),
          });
        }
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : "mcp_call_failed";
        if (opts.audit !== false && opts.llmLogId) {
          await logToolExecution({
            llmLogId: opts.llmLogId,
            toolName,
            args,
            output: message,
            latencyMs: Date.now() - started,
            isSuccess: false,
            server: server.id,
            toolKind: "mcp",
            classification: meta.classification,
            argFingerprint: argFingerprint(args),
          });
        }
        throw err;
      }
    },
  });
}

export function bindGovernedMcpTools(
  discoveries: Array<{
    server: ResolvedMcpServer;
    raw: McpToolDescriptor[];
    governed: CapabilityMeta[];
  }>,
  opts: McpToolBindOptions,
): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [];
  for (const d of discoveries) {
    const byName = new Map(d.raw.map((t) => [t.name, t]));
    for (const meta of d.governed) {
      const desc = byName.get(meta.name);
      if (!desc) {
        continue;
      }
      tools.push(mcpToolToLangChain(d.server, desc, meta, opts));
    }
  }
  return tools;
}
