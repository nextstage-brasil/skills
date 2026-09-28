import { beforeEach, describe, expect, it } from "vitest";
import {
  initialTurnUiState,
  isSendBlocked,
  resetTurnUiIds,
  turnUiReducer,
  type TurnUiState,
} from "../../src/http/dev-chat-app/turn-ui.js";

describe("turnUiReducer", () => {
  beforeEach(() => {
    resetTurnUiIds();
  });

  it("appends user line first", () => {
    let s = initialTurnUiState();
    s = turnUiReducer(s, { type: "user_append", text: "hi" });
    expect(s.messages[0]).toMatchObject({ role: "user", text: "hi" });
  });

  it("overwrites one status slot in place", () => {
    let s: TurnUiState = turnUiReducer(initialTurnUiState(), {
      type: "turn_open",
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "thinking", message: "Planning…" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "tool_started", message: "Fetching…" },
    });
    expect(s.statusText).toBe("Fetching…");
  });

  it("empty message does not leak status name", () => {
    let s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: { status: "thinking", message: "Planning…" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "accessing_data", message: "" },
    });
    expect(s.statusText).toBe("Planning…");
    expect(s.statusText).not.toContain("accessing_data");
  });

  it("removes status slot on first response_streaming", () => {
    let s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: { status: "thinking", message: "Planning…" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "response_streaming", message: "Hello" },
    });
    expect(s.statusText).toBeNull();
    expect(s.messages.filter((m) => m.role === "assistant")).toHaveLength(1);
  });

  it("one assistant block per turn under streaming", () => {
    let s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: { status: "response_streaming", message: "A" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "response_streaming", message: "AB" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "response_streaming", message: "ABC" },
    });
    expect(s.messages.filter((m) => m.role === "assistant")).toHaveLength(1);
    expect(s.messages[0]?.text).toBe("ABC");
    expect(s.messages[0]?.streaming).toBe(true);
  });

  it("paints every response_streaming tick immediately (no timer coalesce)", () => {
    const ticks = ["H", "He", "Hel", "Hell", "Hello"];
    let s = initialTurnUiState();
    const seen: string[] = [];
    for (const t of ticks) {
      s = turnUiReducer(s, {
        type: "envelope",
        envelope: { status: "response_streaming", message: t },
      });
      seen.push(s.messages.find((m) => m.role === "assistant")?.text ?? "");
    }
    expect(seen).toEqual(ticks);
  });

  it("completed clears status and finalizes one block", () => {
    let s = turnUiReducer(initialTurnUiState(), { type: "turn_open" });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "thinking", message: "Planning…" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: { status: "response_streaming", message: "Hello" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: {
        status: "completed",
        message: "Hello world",
        usage: {
          prompt_tokens: 10,
          cached_tokens: 0,
          completion_tokens: 5,
          total_tokens: 15,
        },
        paint: { kind: "chart" },
      },
    });
    expect(s.statusText).toBeNull();
    expect(s.turnOpen).toBe(false);
    const assistants = s.messages.filter((m) => m.role === "assistant");
    expect(assistants).toHaveLength(1);
    expect(assistants[0]?.text).toBe("Hello world");
    expect(assistants[0]?.streaming).toBe(false);
    expect(assistants[0]?.usage?.prompt_tokens).toBe(10);
    expect(assistants[0]?.paint).toEqual({ kind: "chart" });
  });

  it("finalizeAssistant does not overwrite non-streaming assistant", () => {
    let s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: {
        status: "completed",
        message: "First",
      },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: {
        status: "completed",
        message: "Second",
      },
    });
    const assistants = s.messages.filter((m) => m.role === "assistant");
    expect(assistants).toHaveLength(2);
    expect(assistants[0]?.text).toBe("First");
    expect(assistants[1]?.text).toBe("Second");
  });

  it("interrupted exposes options", () => {
    const s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: {
        status: "interrupted",
        message: "Approve?",
        interrupt: {
          kind: "hitl",
          question: "Approve?",
          options: [{ id: "approved", label: "Yes" }],
        },
      },
    });
    expect(s.interrupt?.options[0]?.id).toBe("approved");
    expect(s.statusText).toBeNull();
    expect(s.turnOpen).toBe(false);
  });

  it("send blocked while turn open", () => {
    const closed = initialTurnUiState();
    expect(isSendBlocked(closed)).toBe(false);
    const open = turnUiReducer(closed, { type: "turn_open" });
    expect(isSendBlocked(open)).toBe(true);
    expect(open.turnOpen).toBe(true);
  });

  it("terminal failed clears status and shows error once", () => {
    let s = turnUiReducer(initialTurnUiState(), {
      type: "envelope",
      envelope: { status: "thinking", message: "Planning…" },
    });
    s = turnUiReducer(s, {
      type: "envelope",
      envelope: {
        status: "failed",
        message: "boom",
        error_code: "x",
      },
    });
    expect(s.statusText).toBeNull();
    expect(s.messages.filter((m) => m.role === "error")).toHaveLength(1);
  });
});
