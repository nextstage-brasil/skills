import type { ResolvedMcpServer } from "./registry.js";

export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number | string;
  result: T;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: number | string | null;
  error: { code: number; message: string };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

let rpcId = 1;

/**
 * Minimal Streamable HTTP MCP client (JSON-RPC over POST).
 * Auth: Bearer passthrough only — motor never performs OAuth.
 */
export class McpClient {
  constructor(private readonly server: ResolvedMcpServer) {}

  async listTools(): Promise<McpToolDescriptor[]> {
    const result = await this.request<{ tools: McpToolDescriptor[] }>(
      "tools/list",
      {},
    );
    return result.tools ?? [];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request("tools/call", { name, arguments: args });
  }

  private async request<T>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    const id = rpcId++;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.server.authorization) {
      const raw = this.server.authorization;
      headers.Authorization = raw.startsWith("Bearer ")
        ? raw
        : `Bearer ${raw}`;
    }

    const res = await fetch(this.server.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `mcp_http_error:${this.server.id}:${res.status}:${method}`,
      );
    }

    const body = (await res.json()) as JsonRpcResponse<T>;
    if ("error" in body && body.error) {
      throw new Error(
        `mcp_rpc_error:${this.server.id}:${body.error.code}:${body.error.message}`,
      );
    }
    return (body as JsonRpcSuccess<T>).result;
  }
}

export function createMcpClient(server: ResolvedMcpServer): McpClient {
  return new McpClient(server);
}
