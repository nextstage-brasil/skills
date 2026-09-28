import { describe, expect, it, afterEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  streamGraphTurn,
  type CompiledGraph,
} from "../../src/http/stream-turn.js";
import { buildRunConfig } from "../../src/observability/langsmith.js";

async function collectSse(
  port: number,
  path: string,
  body: unknown,
): Promise<{ events: string[]; data: unknown[] }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const events: string[] = [];
  const data: unknown[] = [];
  for (const block of text.split("\n\n")) {
    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("event: ")) events.push(line.slice(7));
      if (line.startsWith("data: ")) {
        try {
          data.push(JSON.parse(line.slice(6)));
        } catch {
          /* skip */
        }
      }
    }
  }
  return { events, data };
}

describe("message SSE stream", () => {
  let server: ReturnType<typeof createServer> | null = null;
  let port = 0;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      server = null;
    }
  });

  it("streams progress then terminal completed", async () => {
    const graph: CompiledGraph = {
      stream: async function* () {
        yield [
          "values",
          {
            turnLocale: "en-US",
            analysis: { userFacingIntent: "Planning…" },
          },
        ];
        yield [
          "custom",
          { status: "response_streaming", message: "Hel" },
        ];
        yield [
          "custom",
          { status: "response_streaming", message: "Hello" },
        ];
        yield [
          "values",
          {
            turnLocale: "en-US",
            responseMarkdown: "Hello",
            analysis: { userFacingIntent: "Planning…" },
          },
        ];
      },
      getState: async () => ({ values: { responseMarkdown: "Hello" } }),
      invoke: async () => ({}),
    };

    server = createServer(async (req, res) => {
      await streamGraphTurn({
        req,
        res,
        graph,
        input: { messages: [new HumanMessage("hi")] },
        runConfig: buildRunConfig("t1", { op: "message" }),
      });
    });
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    port = (server.address() as AddressInfo).port;

    const { events, data } = await collectSse(port, "/x", { message: "hi" });
    expect(events).toContain("thinking");
    expect(events.filter((e) => e === "response_streaming")).toEqual([
      "response_streaming",
      "response_streaming",
    ]);
    const streaming = data.filter(
      (d) => (d as { status?: string }).status === "response_streaming",
    ) as { message: string }[];
    expect(streaming.map((s) => s.message)).toEqual(["Hel", "Hello"]);
    expect(events[events.length - 1]).toBe("completed");
    const last = data[data.length - 1] as { status: string; message: string };
    expect(last.status).toBe("completed");
    expect(last.message).toBe("Hello");
  });

  it("ends with interrupted when graph state has pending interrupt", async () => {
    const graph: CompiledGraph = {
      stream: async function* () {
        yield { turnLocale: "en-US" };
      },
      getState: async () => ({
        tasks: [
          {
            interrupts: [
              {
                value: {
                  kind: "tool_approval",
                  question: "Allow write?",
                  options: [
                    { id: "approved", label: "Yes" },
                    { id: "rejected", label: "No" },
                  ],
                },
              },
            ],
          },
        ],
      }),
      invoke: async () => ({}),
    };

    server = createServer(async (req, res) => {
      await streamGraphTurn({
        req,
        res,
        graph,
        input: { messages: [new HumanMessage("hi")] },
        runConfig: buildRunConfig("t2", { op: "message" }),
      });
    });
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    port = (server.address() as AddressInfo).port;

    const { events, data } = await collectSse(port, "/x", { message: "hi" });
    expect(events[events.length - 1]).toBe("interrupted");
    const last = data[data.length - 1] as {
      status: string;
      interrupt: { question: string };
      paint?: unknown;
    };
    expect(last.status).toBe("interrupted");
    expect(last.interrupt.question).toBe("Allow write?");
    expect(last.paint).toBeUndefined();
  });

  it("resume stream ends completed after Command-shaped input", async () => {
    const graph: CompiledGraph = {
      stream: async function* () {
        yield {
          turnLocale: "en-US",
          responseMarkdown: "Resumed OK",
        };
      },
      getState: async () => ({
        values: { responseMarkdown: "Resumed OK" },
      }),
      invoke: async () => ({}),
    };

    server = createServer(async (req, res) => {
      await streamGraphTurn({
        req,
        res,
        graph,
        input: { resume: { decision: "approved" } },
        runConfig: buildRunConfig("t-resume", { op: "resume" }),
      });
    });
    await new Promise<void>((resolve) => {
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    port = (server.address() as AddressInfo).port;

    const { events, data } = await collectSse(port, "/resume", {
      decision: "approved",
    });
    expect(events[events.length - 1]).toBe("completed");
    const last = data[data.length - 1] as { status: string; message: string };
    expect(last.status).toBe("completed");
    expect(last.message).toBe("Resumed OK");
  });
});
