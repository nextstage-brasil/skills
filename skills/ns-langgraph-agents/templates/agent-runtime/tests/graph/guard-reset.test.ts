import { describe, expect, it, beforeEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import {
  getGraph,
  resetGraphForTests,
} from "../../src/graph/graph.js";
import { resetCheckpointerForTests } from "../../src/memory/checkpointer.js";

describe("guard turn reset", () => {
  beforeEach(() => {
    resetGraphForTests();
    resetCheckpointerForTests();
  });

  it("clears paint from prior turn on next completed values", async () => {
    const graph = await getGraph();
    const thread = { configurable: { thread_id: "paint-reset-1" } };

    const turn1 = await graph.invoke(
      {
        messages: [new HumanMessage("hello")],
        paint: { kind: "chart", id: "stale" },
        render_spec: { type: "table" },
        analysis: { userFacingIntent: "stale intent" },
      },
      thread,
    );
    // Seed paint via direct channel write then re-invoke through guard reset.
    // First invoke runs full graph; force paint onto checkpoint then second turn.
    await graph.updateState(thread, {
      paint: { kind: "chart", id: "stale" },
      render_spec: { type: "table" },
      analysis: { userFacingIntent: "stale intent" },
    });

    const turn2 = await graph.invoke(
      { messages: [new HumanMessage("second turn")] },
      thread,
    );

    expect(turn1.responseMarkdown).toBeTruthy();
    expect(turn2.paint).toBeNull();
    expect(turn2.render_spec).toBeNull();
    expect(turn2.analysis?.userFacingIntent).not.toBe("stale intent");
  });
});
