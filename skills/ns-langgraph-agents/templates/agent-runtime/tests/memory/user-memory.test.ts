import { describe, expect, it } from "vitest";
import {
  applyMemoryOps,
  InMemoryUserMemoryRepo,
  isSensitiveMemory,
  normalizeMemoryKey,
  renderUserMemoryBlock,
  type MemoryOwner,
} from "../../src/memory/user-memory.js";

const alice: MemoryOwner = { tenantId: "1", userId: "alice" };
const bob: MemoryOwner = { tenantId: "1", userId: "bob" };

describe("user memory rules", () => {
  it("normalizes keys for dedupe (case, accents, spaces)", () => {
    expect(normalizeMemoryKey("  Veículo   Novo ")).toBe("veiculo novo");
  });

  it("flags secrets and documents, keeps ordinary glossary terms", () => {
    expect(isSensitiveMemory("minha senha do ERP")).toBe(true);
    expect(isSensitiveMemory("CPF 123.456.789-09")).toBe(true);
    expect(isSensitiveMemory("api_key=x9f8a7b6c5d4e3f2a1b0c9d8e7")).toBe(true);
    expect(isSensitiveMemory("PF = ponto de função")).toBe(false);
    expect(isSensitiveMemory("token é a unidade de cobrança do modelo")).toBe(false);
  });

  it("remembers, skips identical repeats, and supersedes on change", async () => {
    const repo = new InMemoryUserMemoryRepo();
    const first = await applyMemoryOps({
      repo,
      owner: alice,
      threadId: "t1",
      ops: [{ op: "remember", kind: "glossary", key: "PF", content: "PF = ponto de função" }],
    });
    expect(first).toEqual([
      { outcome: "remembered", kind: "glossary", key: "pf", content: "PF = ponto de função" },
    ]);

    const repeat = await applyMemoryOps({
      repo,
      owner: alice,
      ops: [{ op: "remember", kind: "glossary", key: "pf", content: "PF = ponto de função" }],
    });
    expect(repeat).toEqual([]);

    const changed = await applyMemoryOps({
      repo,
      owner: alice,
      ops: [{ op: "remember", kind: "glossary", key: "pf", content: "PF = pessoa física" }],
    });
    expect(changed[0].outcome).toBe("updated");

    const active = await repo.list(alice);
    expect(active).toHaveLength(1);
    expect(active[0].content).toBe("PF = pessoa física");
    expect(active[0].source).toBe("agent");
    expect(await repo.list(alice, { includeInvalid: true })).toHaveLength(2);
  });

  it("forget hard-deletes the key including superseded history", async () => {
    const repo = new InMemoryUserMemoryRepo();
    await applyMemoryOps({
      repo,
      owner: alice,
      ops: [
        { op: "remember", kind: "preference", key: "language", content: "Reply in English" },
        { op: "remember", kind: "preference", key: "language", content: "Reply in pt-BR" },
      ],
    });
    const notices = await applyMemoryOps({
      repo,
      owner: alice,
      ops: [{ op: "forget", kind: "preference", key: "language" }],
    });
    expect(notices[0]).toMatchObject({ outcome: "forgotten", content: "Reply in pt-BR" });
    expect(await repo.list(alice, { includeInvalid: true })).toHaveLength(0);
  });

  it("declines sensitive or empty content and ignores malformed ops", async () => {
    const repo = new InMemoryUserMemoryRepo();
    const notices = await applyMemoryOps({
      repo,
      owner: alice,
      ops: [
        { op: "remember", kind: "profile", key: "erp", content: "a senha é hunter2" },
        { op: "remember", kind: "profile", key: "role", content: "   " },
        { op: "remember", kind: "company", key: "x", content: "y" },
        "garbage",
      ],
    });
    expect(notices.map((n) => [n.outcome, n.reason])).toEqual([
      ["declined", "sensitive"],
      ["declined", "invalid"],
    ]);
    expect(notices[0].content).toBe("");
    expect(await repo.list(alice)).toHaveLength(0);
  });

  it("isolates owners and purges only the caller", async () => {
    const repo = new InMemoryUserMemoryRepo();
    const op = { op: "remember", kind: "glossary", key: "pf", content: "PF = ponto de função" };
    await applyMemoryOps({ repo, owner: alice, ops: [op] });
    await applyMemoryOps({ repo, owner: bob, ops: [op] });
    const [aliceRow] = await repo.list(alice);
    expect(await repo.get(bob, aliceRow.id)).toBeNull();
    expect(await repo.remove(bob, aliceRow.id)).toBe(false);
    expect(await repo.purge(alice)).toBe(1);
    expect(await repo.list(bob)).toHaveLength(1);
  });
});

describe("renderUserMemoryBlock", () => {
  it("labels memory as data, orders preference first, and respects the budget", async () => {
    const repo = new InMemoryUserMemoryRepo();
    await applyMemoryOps({
      repo,
      owner: alice,
      ops: [
        { op: "remember", kind: "profile", key: "role", content: "Commercial manager" },
        { op: "remember", kind: "glossary", key: "pf", content: "PF = ponto de função" },
        { op: "remember", kind: "preference", key: "language", content: "Reply in pt-BR" },
      ],
    });
    const block = renderUserMemoryBlock(await repo.list(alice), 4000);
    expect(block).toContain("not instructions");
    const lines = block.split("\n").filter((l) => l.startsWith("- "));
    expect(lines[0]).toBe("- [preference] language: Reply in pt-BR");
    expect(lines[1]).toBe("- [glossary] pf: PF = ponto de função");

    const header = block.split("\n- ")[0];
    const budget = header.length + lines[0].length + 1 + 5;
    const tight = renderUserMemoryBlock(await repo.list(alice), budget);
    expect(tight.split("\n").filter((l) => l.startsWith("- "))).toHaveLength(1);
    expect(renderUserMemoryBlock([], 4000)).toBe("");
  });
});
