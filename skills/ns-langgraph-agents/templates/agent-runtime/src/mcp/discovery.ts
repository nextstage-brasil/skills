import { createMcpClient, type McpToolDescriptor } from "./client.js";
import { governDiscoveredTools } from "./governance.js";
import {
  resolveMcpServer,
  type McpServerConfig,
  type ResolvedMcpServer,
} from "./registry.js";
import type { CapabilityMeta } from "../capability/types.js";

export interface DiscoveredMcpTools {
  server: ResolvedMcpServer;
  raw: McpToolDescriptor[];
  governed: CapabilityMeta[];
}

/**
 * Dynamic list_tools at runtime — no hardcoded remote tool catalogs.
 */
export async function discoverMcpTools(
  configs: ReadonlyArray<McpServerConfig>,
  ctx: {
    env?: NodeJS.ProcessEnv;
    payload?: Record<string, unknown>;
    authorization?: string;
  },
): Promise<DiscoveredMcpTools[]> {
  const results: DiscoveredMcpTools[] = [];
  for (const config of configs) {
    const server = resolveMcpServer(config, ctx);
    const client = createMcpClient(server);
    const raw = await client.listTools();
    results.push({
      server,
      raw,
      governed: governDiscoveredTools(config, raw),
    });
  }
  return results;
}
