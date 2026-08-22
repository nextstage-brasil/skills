import { describe, expect, it } from "vitest";
import { pruneStaleToolMessages } from "../../src/memory/prepare-llm-messages.js";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

describe("prepare-llm-messages", () => {
  it("prunes orphan tool messages", () => {
    const messages = [
      new HumanMessage("hi"),
      new AIMessage({ content: "", tool_calls: [{ id: "c1", name: "t", args: {} }] }),
      new ToolMessage({ content: "ok", tool_call_id: "c1" }),
      new ToolMessage({ content: "orphan", tool_call_id: "missing" }),
    ];
    const pruned = pruneStaleToolMessages(messages);
    expect(pruned).toHaveLength(3);
    expect(
      pruned.some(
        (m) =>
          m._getType() === "tool" &&
          (m as ToolMessage).tool_call_id === "missing",
      ),
    ).toBe(false);
  });
});
