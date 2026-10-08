import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createAgentServer } from "../../src/http/server.js";
import {
  InMemoryUserMemoryRepo,
  resetUserMemoryRepoForTests,
} from "../../src/memory/user-memory.js";

let server: Server;
let base: string;

async function call(
  method: string,
  path: string,
  opts: { user?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.user) headers["X-User-Id"] = opts.user;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

describe("/memories CRUD", () => {
  beforeAll(async () => {
    server = createAgentServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    resetUserMemoryRepoForTests(null);
  });
  beforeEach(() => resetUserMemoryRepoForTests(new InMemoryUserMemoryRepo()));

  it("requires an authenticated user", async () => {
    expect((await call("GET", "/memories")).status).toBe(401);
  });

  it("creates, lists, reads, patches, deletes", async () => {
    const created = await call("POST", "/memories", {
      user: "alice",
      body: { kind: "glossary", key: "PF", content: "PF = ponto de função" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ key: "pf", source: "user", invalid_at: null });
    const id = created.body.id as string;

    const dup = await call("POST", "/memories", {
      user: "alice",
      body: { kind: "glossary", key: "pf", content: "other" },
    });
    expect(dup.status).toBe(409);

    const list = await call("GET", "/memories?kind=glossary", { user: "alice" });
    expect(list.body.items).toHaveLength(1);

    const patched = await call("PATCH", `/memories/${id}`, {
      user: "alice",
      body: { content: "PF = pontos de função" },
    });
    expect(patched.status).toBe(200);
    expect(patched.body.content).toBe("PF = pontos de função");

    expect((await call("GET", `/memories/${id}`, { user: "alice" })).status).toBe(200);
    expect((await call("DELETE", `/memories/${id}`, { user: "alice" })).status).toBe(204);
    expect((await call("GET", `/memories/${id}`, { user: "alice" })).status).toBe(404);
  });

  it("never exposes another user's memory", async () => {
    const created = await call("POST", "/memories", {
      user: "alice",
      body: { kind: "preference", key: "language", content: "Reply in pt-BR" },
    });
    const id = created.body.id as string;
    expect((await call("GET", `/memories/${id}`, { user: "bob" })).status).toBe(404);
    expect((await call("PATCH", `/memories/${id}`, { user: "bob", body: { content: "x" } })).status).toBe(404);
    expect((await call("DELETE", `/memories/${id}`, { user: "bob" })).status).toBe(404);
    expect((await call("GET", "/memories", { user: "bob" })).body.items).toHaveLength(0);
  });

  it("validates input and rejects sensitive content", async () => {
    expect((await call("POST", "/memories", { user: "alice", body: { kind: "company", key: "x", content: "y" } })).status).toBe(400);
    expect((await call("POST", "/memories", { user: "alice", body: { kind: "profile", key: "erp", content: "senha 123" } })).status).toBe(422);
    expect((await call("GET", "/memories?kind=nope", { user: "alice" })).status).toBe(400);
    expect((await call("PATCH", "/memories/not-a-uuid", { user: "alice", body: { content: "x" } })).status).toBe(404);
  });

  it("purges all memories of the caller only", async () => {
    await call("POST", "/memories", { user: "alice", body: { kind: "glossary", key: "a", content: "A" } });
    await call("POST", "/memories", { user: "alice", body: { kind: "glossary", key: "b", content: "B" } });
    await call("POST", "/memories", { user: "bob", body: { kind: "glossary", key: "a", content: "A" } });
    const purge = await call("DELETE", "/memories", { user: "alice" });
    expect(purge.body).toEqual({ deleted: 2 });
    expect((await call("GET", "/memories", { user: "bob" })).body.items).toHaveLength(1);
  });
});
