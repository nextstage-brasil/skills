import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/** Durable MCP catalog — names + descriptions only; never bound tools or secrets. */
export type McpCatalogState = {
  tools: { name: string; description: string }[];
  catalogVersion: string;
  discoveredAt?: string;
} | null;

export type EvidenceBundle = {
  kind: string;
  payload: unknown;
  incomplete?: boolean;
  warning?: string;
} | null;

export type DiscoveryBrief = {
  found: boolean;
  summary?: string;
  absenceConfirmed?: boolean;
} | null;

export type ExternalError = {
  code: string;
  message: string;
  retryable?: boolean;
} | null;

export type TurnDecision = {
  route?: string;
  outcome?: string;
  notes?: Record<string, unknown>;
};

export type AnalystStatus =
  | "need_more_data"
  | "complete"
  | "clarification_required"
  | null;

export type ExecutionPlan = {
  status: string;
  actions: unknown[];
} | null;

export type AnalysisState = {
  intent?: string;
  userFacingIntent?: string;
} | null;

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  plan: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  guardRoute: Annotation<"agent" | "respond" | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  summary: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  mcpCatalog: Annotation<McpCatalogState>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  analysis: Annotation<AnalysisState>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  executionPlan: Annotation<ExecutionPlan>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  executionResults: Annotation<unknown[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  analystStatus: Annotation<AnalystStatus>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  analystIteration: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  analystNarration: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  dataBundle: Annotation<EvidenceBundle>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  discoveryBrief: Annotation<DiscoveryBrief>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  externalError: Annotation<ExternalError>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  turnDecisions: Annotation<TurnDecision[]>({
    reducer: (prev, next) => (next.length === 0 ? [] : [...prev, ...next]),
    default: () => [],
  }),
  errorCode: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  turnLocale: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  turnCurrency: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  responseMarkdown: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentState.State;
