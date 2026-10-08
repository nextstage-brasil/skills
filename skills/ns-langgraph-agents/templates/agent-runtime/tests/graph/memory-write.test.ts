import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { memoryWriteNode } from "../../src/graph/nodes/memory-write.node.js";
import { composerNode } from "../../src/graph/nodes/composer.node.js";
import { getGraph, resetGraphForTests } from "../../src/graph/graph.js";
import { resetCheckpointerForTests } from "../../src/memory/checkpointer.js";
import {
  InMemoryUserMemoryRepo,
  resetUserMemoryRepoForTests,
} from "../../src/memory/user-memory.js";
import { loadUserMemoryBlock } from "../../src/memory/user-memory-context.js";
import { runStorage } from "../../src/observability/run-context.js";
import { AgentState, type AgentStateType } from "../../src/state.js";

function baseState(patch: Partial<AgentStateType>): AgentStateType {
  const defaults = Object.fromEntries(
    Object.entries(AgentState.spec).map(([k, ch]) => [
      k,
      (ch as unknown as { initialValueFactory?: () => unknown }).initialValueFactory?.(),
    ]),
  );
  return { ...(defaults as AgentStateType), ...patch };
}

describe("memory_write node", () => {
  let repo: InMemoryUserMemoryRepo;

  beforeEach(() => {
    repo = new InMemoryUserMemoryRepo();
    resetUserMemoryRepoForTests(repo);
  });
  afterEach(() => resetUserMemoryRepoForTests(null));

  it("applies ops for the turn user and the composer acknowledges without asking", async () => {
    await runStorage.run({ threadId: "t-mem", tenantId: "1", userId: "alice" }, async () => {
      // Prime the per-turn cache, then write — the composer must see fresh memory.
      expect(await loadUserMemoryBlock()).toBe("");
      const out = await memoryWriteNode(
        baseState({
          memoryOps: [{ op: "remember", kind: "glossary", key: "pf", content: "PF é ponto de função" }],
          turnLocale: "pt-BR",
        }),
      );
      expect(out.memoryOps).toEqual([]);
      expect(out.memoryNotices).toHaveLength(1);
      expect(await loadUserMemoryBlock()).toContain("PF é ponto de função");

      const composed = await composerNode(
        baseState({ memoryNotices: out.memoryNotices, turnLocale: "pt-BR" }),
      );
      expect(composed.responseMarkdown?.split("\n")[0]).toBe("Registrado: PF é ponto de função");
      expect(composed.responseMarkdown).not.toMatch(/\?/);
    });
    const [row] = await repo.list({ tenantId: "1", userId: "alice" });
    expect(row.evidenceThreadId).toBe("t-mem");
  });

  it("skips without a user identity", async () => {
    await runStorage.run({ threadId: "t-anon", tenantId: "1" }, async () => {
      const out = await memoryWriteNode(
        baseState({ memoryOps: [{ op: "remember", kind: "glossary", key: "pf", content: "x" }] }),
      );
      expect(out.turnDecisions?.[0].outcome).toBe("skipped_no_user");
    });
    expect(await repo.list({ tenantId: "1", userId: "alice" })).toHaveLength(0);
  });

  it("fails open when the store throws", async () => {
    resetUserMemoryRepoForTests({
      ...repo,
      findActive: async () => {
        throw new Error("db down");
      },
    } as unknown as InMemoryUserMemoryRepo);
    await runStorage.run({ threadId: "t-err", tenantId: "1", userId: "alice" }, async () => {
      const out = await memoryWriteNode(
        baseState({ memoryOps: [{ op: "remember", kind: "glossary", key: "pf", content: "x" }] }),
      );
      expect(out.turnDecisions?.[0].outcome).toBe("store_error");
    });
  });
});

describe("graph wiring", () => {
  beforeEach(() => {
    resetGraphForTests();
    resetCheckpointerForTests();
    resetUserMemoryRepoForTests(new InMemoryUserMemoryRepo());
  });
  afterEach(() => resetUserMemoryRepoForTests(null));

  it("routes analyst through memory_write and resets notices each turn", async () => {
    const graph = await getGraph();
    const thread = { configurable: { thread_id: "mem-wiring" } };
    await graph.invoke({ messages: [new HumanMessage("oi")] }, thread);
    await graph.updateState(thread, {
      memoryNotices: [{ outcome: "remembered", kind: "glossary", key: "pf", content: "stale" }],
    });
    const turn2 = await graph.invoke({ messages: [new HumanMessage("segunda")] }, thread);
    expect(turn2.memoryNotices).toEqual([]);
    expect(Object.keys(graph.nodes)).toContain("memory_write");
  });
});
