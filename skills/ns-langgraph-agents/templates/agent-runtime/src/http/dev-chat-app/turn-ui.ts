/** Pure turn UI state — unit-tested without jsdom. */

import type {
  AgentStreamStatus,
  AgentStreamEnvelope,
  AgentStreamUsage,
  InterruptPayload,
  InterruptOption,
} from "../stream-types.js";

export type StreamStatus = AgentStreamStatus;
export type { InterruptPayload, InterruptOption, AgentStreamUsage };
export type StreamEnvelope = Pick<AgentStreamEnvelope, "status" | "message"> &
  Partial<
    Omit<AgentStreamEnvelope, "status" | "message" | "error_code" | "usage">
  > & {
    error_code?: string | null;
    usage?: AgentStreamEnvelope["usage"];
  };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  streaming?: boolean;
  /** Per-assistant-message usage when terminal envelope carries it. */
  usage?: AgentStreamUsage | null;
  /** Paint / render_spec from completed envelope when present. */
  paint?: unknown;
};

export type TurnUiState = {
  messages: ChatMessage[];
  statusText: string | null;
  turnOpen: boolean;
  interrupt: InterruptPayload | null;
};

export function initialTurnUiState(): TurnUiState {
  return {
    messages: [],
    statusText: null,
    turnOpen: false,
    interrupt: null,
  };
}

let idSeq = 0;
function nextId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

/** Reset id counter for deterministic tests. */
export function resetTurnUiIds(): void {
  idSeq = 0;
}

export type TurnUiAction =
  | { type: "user_append"; text: string }
  | { type: "turn_open" }
  | { type: "turn_close" }
  | { type: "envelope"; envelope: StreamEnvelope };

function upsertAssistant(
  messages: ChatMessage[],
  text: string,
  streaming: boolean,
): ChatMessage[] {
  const copy = [...messages];
  const last = copy[copy.length - 1];
  if (last?.role === "assistant" && last.streaming) {
    copy[copy.length - 1] = { ...last, text, streaming };
    return copy;
  }
  return [
    ...copy,
    { id: nextId("a"), role: "assistant", text, streaming },
  ];
}

/** Overwrite trailing assistant only while it is still streaming. */
function finalizeAssistant(
  messages: ChatMessage[],
  text: string,
  extras?: { usage?: AgentStreamUsage | null; paint?: unknown },
): ChatMessage[] {
  const copy = [...messages];
  const last = copy[copy.length - 1];
  if (last?.role === "assistant" && last.streaming) {
    copy[copy.length - 1] = {
      ...last,
      text: text || last.text,
      streaming: false,
      usage: extras?.usage ?? last.usage ?? null,
      paint: extras?.paint !== undefined ? extras.paint : last.paint,
    };
    return copy;
  }
  if (!text.trim() && extras?.paint === undefined && !extras?.usage) {
    return copy;
  }
  return [
    ...copy,
    {
      id: nextId("a"),
      role: "assistant",
      text,
      streaming: false,
      usage: extras?.usage ?? null,
      paint: extras?.paint,
    },
  ];
}

/** True when composer send must no-op (turn already open). */
export function isSendBlocked(state: TurnUiState): boolean {
  return state.turnOpen;
}

export function turnUiReducer(
  state: TurnUiState,
  action: TurnUiAction,
): TurnUiState {
  switch (action.type) {
    case "user_append":
      return {
        ...state,
        messages: [
          ...state.messages,
          { id: nextId("u"), role: "user", text: action.text },
        ],
      };
    case "turn_open":
      return {
        ...state,
        turnOpen: true,
        interrupt: null,
        statusText: null,
      };
    case "turn_close":
      return { ...state, turnOpen: false };
    case "envelope": {
      const e = action.envelope;
      if (
        e.status === "thinking" ||
        e.status === "accessing_data" ||
        e.status === "tool_started" ||
        e.status === "tool_finished"
      ) {
        const nextText =
          typeof e.message === "string" && e.message.trim()
            ? e.message
            : state.statusText;
        return { ...state, statusText: nextText };
      }
      if (e.status === "response_streaming") {
        const text = e.message ?? "";
        return {
          ...state,
          statusText: null,
          messages: upsertAssistant(state.messages, text, true),
        };
      }
      if (e.status === "completed") {
        const paint =
          e.paint !== undefined
            ? e.paint
            : e.render_spec !== undefined
              ? e.render_spec
              : undefined;
        return {
          ...state,
          statusText: null,
          turnOpen: false,
          interrupt: null,
          messages: finalizeAssistant(state.messages, e.message ?? "", {
            usage: e.usage ?? null,
            paint,
          }),
        };
      }
      if (e.status === "interrupted") {
        return {
          ...state,
          statusText: null,
          turnOpen: false,
          interrupt: e.interrupt ?? null,
        };
      }
      if (e.status === "failed" || e.status === "cancelled") {
        const errText = `${e.status}: ${e.error_code || e.message || ""}`;
        return {
          ...state,
          statusText: null,
          turnOpen: false,
          interrupt: null,
          messages: [
            ...state.messages.filter(
              (m) => !(m.role === "assistant" && m.streaming),
            ),
            { id: nextId("e"), role: "error", text: errText },
          ],
        };
      }
      return state;
    }
    default:
      return state;
  }
}
