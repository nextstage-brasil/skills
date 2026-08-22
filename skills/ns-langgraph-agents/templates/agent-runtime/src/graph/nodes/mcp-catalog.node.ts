import type { AgentStateType } from "../../state.js";

const STUB_VERSION = "stub";

/**
 * Persist MCP tool names+descriptions on state. No-op when catalogVersion matches.
 * Never store bound StructuredTool or secrets.
 */
export async function mcpCatalogNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  if (state.mcpCatalog?.catalogVersion === STUB_VERSION) {
    return {};
  }
  return {
    mcpCatalog: {
      tools: [],
      catalogVersion: STUB_VERSION,
      discoveredAt: new Date().toISOString(),
    },
    turnDecisions: [{ route: "mcp_catalog", outcome: "stub_empty" }],
  };
}
