import {
  capabilityIdMcp,
  type CapabilityMeta,
  type ToolClassification,
} from "../capability/types.js";
import type { McpToolDescriptor } from "./client.js";
import type { McpServerConfig } from "./registry.js";

/**
 * Apply local allowlist + classification on list_tools result.
 * Never trust server-declared read-only flags alone.
 */
export function governDiscoveredTools(
  server: McpServerConfig,
  discovered: ReadonlyArray<McpToolDescriptor>,
): CapabilityMeta[] {
  const allow = new Set(server.allow_tools);
  const defaultClass: ToolClassification =
    server.default_classification ?? "read";
  const overrides = server.classification_overrides ?? {};

  const out: CapabilityMeta[] = [];
  for (const tool of discovered) {
    if (!allow.has(tool.name)) {
      continue;
    }
    out.push({
      id: capabilityIdMcp(server.id, tool.name),
      name: tool.name,
      classification: overrides[tool.name] ?? defaultClass,
      kind: "mcp",
      server: server.id,
    });
  }
  return out;
}

export function isToolAllowedOnServer(
  server: McpServerConfig,
  toolName: string,
): boolean {
  return server.allow_tools.includes(toolName);
}
