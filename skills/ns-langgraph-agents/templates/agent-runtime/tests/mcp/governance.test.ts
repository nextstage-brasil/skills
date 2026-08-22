import { describe, expect, it } from "vitest";
import { governDiscoveredTools } from "../../src/mcp/governance.js";
import { resolveMcpServer } from "../../src/mcp/registry.js";
import type { McpServerConfig } from "../../src/mcp/registry.js";

describe("mcp governance", () => {
  const server: McpServerConfig = {
    id: "gitlab",
    url_source: "env",
    url_key: "GITLAB_MCP_URL",
    allow_tools: ["list_issues", "read_issue"],
    classification_overrides: {
      read_issue: "read",
      list_issues: "read",
    },
  };

  it("keeps only allowlisted tools from list_tools", () => {
    const governed = governDiscoveredTools(server, [
      { name: "list_issues", description: "list" },
      { name: "delete_issue", description: "danger" },
      { name: "read_issue" },
    ]);
    expect(governed.map((g) => g.name).sort()).toEqual([
      "list_issues",
      "read_issue",
    ]);
    expect(governed.every((g) => g.kind === "mcp")).toBe(true);
  });

  it("resolves url from env and rejects missing", () => {
    const resolved = resolveMcpServer(server, {
      env: { GITLAB_MCP_URL: "http://mcp.local/" },
      authorization: "token",
    });
    expect(resolved.url).toBe("http://mcp.local");
    expect(resolved.authorization).toBe("token");

    expect(() =>
      resolveMcpServer(server, { env: {} }),
    ).toThrow(/mcp_server_url_missing/);
  });

  it("resolves url from payload when url_source=payload", () => {
    const cfg: McpServerConfig = {
      id: "qlik",
      url_source: "payload",
      url_key: "qlik_mcp_url",
      allow_tools: ["query"],
    };
    const resolved = resolveMcpServer(cfg, {
      payload: { qlik_mcp_url: "https://qlik.example/mcp" },
    });
    expect(resolved.url).toBe("https://qlik.example/mcp");
  });
});
