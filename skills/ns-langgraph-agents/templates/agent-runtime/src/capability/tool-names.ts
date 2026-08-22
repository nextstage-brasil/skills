/** Wire tool names MUST match Claude/OpenAI pattern (no `:`). */

export const WIRE_TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,128}$/;

export function skillToolName(id: string): string {
  return `use_skill__${id}`;
}

export function mcpToolName(serverId: string, toolName: string): string {
  return `mcp__${serverId}__${toolName}`;
}

export function assertWireToolName(name: string): void {
  if (!WIRE_TOOL_NAME_RE.test(name)) {
    throw new Error(
      `invalid_wire_tool_name:${name} (must match ${WIRE_TOOL_NAME_RE})`,
    );
  }
}

export type ParsedWireToolName =
  | { kind: "skill"; skillId: string }
  | { kind: "mcp"; serverId: string; toolName: string }
  | { kind: "local"; name: string };

/**
 * Parses LLM wire names. Accepts legacy `use_skill:` / `mcp:` from
 * checkpointed histories; new binds MUST emit `__`.
 */
export function parseWireToolName(name: string): ParsedWireToolName {
  const skillSep = name.startsWith("use_skill__")
    ? "__"
    : name.startsWith("use_skill:")
      ? ":"
      : null;
  if (skillSep !== null) {
    const prefix = `use_skill${skillSep}`;
    return { kind: "skill", skillId: name.slice(prefix.length) };
  }

  if (name.startsWith("mcp__")) {
    const rest = name.slice("mcp__".length);
    const idx = rest.indexOf("__");
    if (idx > 0) {
      return {
        kind: "mcp",
        serverId: rest.slice(0, idx),
        toolName: rest.slice(idx + 2),
      };
    }
  }

  if (name.startsWith("mcp:")) {
    const rest = name.slice("mcp:".length);
    const idx = rest.indexOf(":");
    if (idx > 0) {
      return {
        kind: "mcp",
        serverId: rest.slice(0, idx),
        toolName: rest.slice(idx + 1),
      };
    }
  }

  return { kind: "local", name };
}
