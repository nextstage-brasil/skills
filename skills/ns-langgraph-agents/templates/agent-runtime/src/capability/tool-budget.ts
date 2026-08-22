export type ToolBudgetKind = "local" | "mcp" | "skill";

export type ToolBudgetLimits = {
  maxToolCallsPerTurn: number;
  maxMcpCallsPerTurn: number;
};

export type RecordCallResult = {
  allowed: boolean;
  reason?: "budget_exhausted" | "duplicate_skip";
};

function readEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** @env MAX_TOOL_CALLS_PER_TURN, MAX_MCP_CALLS_PER_TURN */
export function resolveToolBudget(): ToolBudgetLimits {
  return {
    maxToolCallsPerTurn: readEnvNumber("MAX_TOOL_CALLS_PER_TURN", 20),
    maxMcpCallsPerTurn: readEnvNumber("MAX_MCP_CALLS_PER_TURN", 10),
  };
}

/**
 * Per-turn tool/MCP budget + duplicate fingerprint skip.
 * Gather nodes SHOULD call `recordCall` before invoking a tool.
 */
export class TurnToolBudget {
  private readonly limits: ToolBudgetLimits;
  private toolCalls = 0;
  private mcpCalls = 0;
  private readonly seen = new Set<string>();
  private duplicateSkips = 0;
  private lastRoundAllDuplicates = false;

  constructor(limits?: Partial<ToolBudgetLimits>) {
    const resolved = resolveToolBudget();
    this.limits = {
      maxToolCallsPerTurn:
        limits?.maxToolCallsPerTurn ?? resolved.maxToolCallsPerTurn,
      maxMcpCallsPerTurn:
        limits?.maxMcpCallsPerTurn ?? resolved.maxMcpCallsPerTurn,
    };
  }

  getCounts(): {
    toolCalls: number;
    mcpCalls: number;
    duplicateSkips: number;
  } {
    return {
      toolCalls: this.toolCalls,
      mcpCalls: this.mcpCalls,
      duplicateSkips: this.duplicateSkips,
    };
  }

  isExhausted(): boolean {
    return (
      this.toolCalls >= this.limits.maxToolCallsPerTurn ||
      this.mcpCalls >= this.limits.maxMcpCallsPerTurn
    );
  }

  /** True when the last `beginRound`…`endRound` batch was only duplicates. */
  allCallsWereDuplicates(): boolean {
    return this.lastRoundAllDuplicates;
  }

  beginRound(): void {
    this.lastRoundAllDuplicates = true;
  }

  endRound(attempted: number): void {
    if (attempted === 0) {
      this.lastRoundAllDuplicates = false;
    }
  }

  /**
   * Returns whether the call may proceed. Duplicate fingerprints are skipped;
   * exhausted budgets reject further calls.
   */
  recordCall(
    kind: ToolBudgetKind,
    toolName: string,
    fingerprint: string,
  ): RecordCallResult {
    const key = `${toolName}:${fingerprint}`;
    if (this.seen.has(key)) {
      this.duplicateSkips += 1;
      return { allowed: false, reason: "duplicate_skip" };
    }

    if (this.toolCalls >= this.limits.maxToolCallsPerTurn) {
      this.lastRoundAllDuplicates = false;
      return { allowed: false, reason: "budget_exhausted" };
    }
    if (
      kind === "mcp" &&
      this.mcpCalls >= this.limits.maxMcpCallsPerTurn
    ) {
      this.lastRoundAllDuplicates = false;
      return { allowed: false, reason: "budget_exhausted" };
    }

    this.seen.add(key);
    this.toolCalls += 1;
    if (kind === "mcp") {
      this.mcpCalls += 1;
    }
    this.lastRoundAllDuplicates = false;
    return { allowed: true };
  }
}
