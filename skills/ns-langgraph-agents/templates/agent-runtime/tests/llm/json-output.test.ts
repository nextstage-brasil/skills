import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const invokeLog: { jsonMode: boolean; method: "invoke" | "stream" }[] = [];

vi.mock("../../src/llm/provider.js", () => ({
  createChatModel: () => ({
    withConfig: () => ({
      invoke: async () => {
        invokeLog.push({ jsonMode: true, method: "invoke" });
        throw new Error("response_format not supported on this model");
      },
      stream: async function* () {
        invokeLog.push({ jsonMode: true, method: "stream" });
        throw new Error("response_format not supported on this model");
      },
    }),
    invoke: async () => {
      invokeLog.push({ jsonMode: false, method: "invoke" });
      return { content: '{"ok":true}', usage_metadata: {} };
    },
    stream: async function* () {
      invokeLog.push({ jsonMode: false, method: "stream" });
      yield { content: '{"markdown":"Hel' };
      yield { content: 'lo"}', usage_metadata: { input_tokens: 1, output_tokens: 2 } };
    },
  }),
}));

vi.mock("../../src/observability/run-context.js", () => ({
  getRunCtx: () => null,
  accumulateTurnUsage: () => undefined,
}));

import {
  clearJsonModeMemo,
  extractPartialMarkdown,
  invokeJsonSchema,
  streamJsonSchema,
} from "../../src/llm/json-output.js";

afterEach(() => {
  clearJsonModeMemo();
  invokeLog.length = 0;
});

describe("extractPartialMarkdown", () => {
  it("returns null until field opener appears", () => {
    expect(extractPartialMarkdown("{")).toBeNull();
    expect(extractPartialMarkdown('{"markdown"')).toBeNull();
  });

  it("grows as tokens arrive and unescapes", () => {
    expect(extractPartialMarkdown('{"markdown":"Hi')).toBe("Hi");
    expect(extractPartialMarkdown('{"markdown":"Hi\\n')).toBe("Hi\n");
    expect(extractPartialMarkdown('{"markdown":"Hi\\nthere"}')).toBe("Hi\nthere");
    expect(extractPartialMarkdown('{"markdown":"say \\"hi\\""}')).toBe('say "hi"');
  });

  it("supports custom field name", () => {
    expect(
      extractPartialMarkdown('{"responseMarkdown":"A', "responseMarkdown"),
    ).toBe("A");
  });
});

describe("json-output memo", () => {
  const schema = z.object({ ok: z.boolean() });
  const config = {
    role: "main" as const,
    provider: "lmstudio" as const,
    apiKey: "x",
    model: "local-no-json",
    baseURL: "http://127.0.0.1:1234/v1",
    temperature: 0,
    stage: "main" as const,
  };

  it("retries without json mode then memos skip for same model", async () => {
    const r1 = await invokeJsonSchema(config, schema, {
      system: "s",
      user: "u1",
      jsonShapeHint: "{}",
    });
    expect(r1.ok).toBe(true);
    expect(invokeLog).toEqual([
      { jsonMode: true, method: "invoke" },
      { jsonMode: false, method: "invoke" },
    ]);

    invokeLog.length = 0;
    const r2 = await invokeJsonSchema(config, schema, {
      system: "s",
      user: "u2",
      jsonShapeHint: "{}",
    });
    expect(r2.ok).toBe(true);
    expect(invokeLog).toEqual([{ jsonMode: false, method: "invoke" }]);
  });
});

describe("streamJsonSchema", () => {
  const schema = z.object({ markdown: z.string() });
  const config = {
    role: "composer" as const,
    provider: "lmstudio" as const,
    apiKey: "x",
    model: "local-stream",
    baseURL: "http://127.0.0.1:1234/v1",
    temperature: 0,
    stage: "composer" as const,
  };

  it("emits growing partial markdown via onPartialMarkdown", async () => {
    const partials: string[] = [];
    const parsed = await streamJsonSchema(config, schema, {
      system: "s",
      user: "u",
      jsonShapeHint: '{"markdown":"..."}',
      onPartialMarkdown: (md) => partials.push(md),
    });
    expect(partials).toEqual(["Hel", "Hello"]);
    expect(parsed.markdown).toBe("Hello");
    expect(invokeLog.some((e) => e.method === "stream")).toBe(true);
    expect(invokeLog.some((e) => e.method === "invoke")).toBe(false);
  });
});
