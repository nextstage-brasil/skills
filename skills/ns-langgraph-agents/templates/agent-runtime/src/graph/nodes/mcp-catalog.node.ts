import type { AgentStateType, McpCatalogTool } from "../../state.js";
import type { McpToolDescriptor } from "../../mcp/client.js";

const STUB_VERSION = "stub";

/**
 * Map MCP descriptors → durable catalog entries.
 * Always pass `inputSchema` when the descriptor has one (truncated later in analyst payload).
 */
export function toCatalogTools(
  descriptors: ReadonlyArray<McpToolDescriptor>,
): McpCatalogTool[] {
  return descriptors.map((d) => {
    const entry: McpCatalogTool = {
      name: d.name,
      description: d.description ?? "",
    };
    if (d.inputSchema !== undefined) {
      entry.inputSchema = d.inputSchema;
    }
    return entry;
  });
}

/**
 * Persist MCP tool names + descriptions + inputSchema on state.
 * No-op when catalogVersion matches. Never store bound StructuredTool or secrets.
 * Stub returns empty catalog; product forks replace with discoverMcpTools → toCatalogTools.
 */
export async function mcpCatalogNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  if (state.mcpCatalog?.catalogVersion === STUB_VERSION) {
    return {};
  }
  return {
    mcpCatalog: {
      tools: toCatalogTools([]),
      catalogVersion: STUB_VERSION,
      discoveredAt: new Date().toISOString(),
    },
    turnDecisions: [{ route: "mcp_catalog", outcome: "stub_empty" }],
  };
}
