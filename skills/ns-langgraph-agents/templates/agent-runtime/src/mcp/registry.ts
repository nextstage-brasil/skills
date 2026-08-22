import type { UrlSource } from "../capability/types.js";

export interface McpServerConfig {
  id: string;
  /** Resolve base URL from env var name or from request payload key */
  url_source: UrlSource;
  /** Env var name when url_source=env; payload field when url_source=payload */
  url_key: string;
  /** Optional default classification for tools not in localOverrides */
  default_classification?: "read" | "write" | "destructive" | "admin";
  /** Per-tool local classification overrides (never trust server claims alone) */
  classification_overrides?: Record<
    string,
    "read" | "write" | "destructive" | "admin"
  >;
  /** Tool name allowlist for this server (empty = none bound) */
  allow_tools: string[];
}

export interface ResolvedMcpServer {
  id: string;
  url: string;
  authorization?: string;
  config: McpServerConfig;
}

/**
 * Resolves server URL. Auth is Bearer passthrough only — motor never does OAuth.
 */
export function resolveMcpServer(
  config: McpServerConfig,
  ctx: {
    env?: NodeJS.ProcessEnv;
    payload?: Record<string, unknown>;
    authorization?: string;
  },
): ResolvedMcpServer {
  const env = ctx.env ?? process.env;
  let url: string | undefined;

  if (config.url_source === "env") {
    url = env[config.url_key];
  } else {
    const raw = ctx.payload?.[config.url_key];
    url = typeof raw === "string" ? raw : undefined;
  }

  if (!url || url.trim().length === 0) {
    throw new Error(
      `mcp_server_url_missing:${config.id}:${config.url_source}:${config.url_key}`,
    );
  }

  return {
    id: config.id,
    url: url.replace(/\/$/, ""),
    authorization: ctx.authorization,
    config,
  };
}
