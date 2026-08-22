import { MemorySaver } from "@langchain/langgraph";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";

export type CheckpointerMode = "memory" | "postgres";

let checkpointerInstance: BaseCheckpointSaver | null = null;

export function resolveCheckpointerMode(): CheckpointerMode {
  const raw = (process.env.CHECKPOINTER ?? "postgres").trim().toLowerCase();
  if (raw === "memory") {
    return "memory";
  }
  return "postgres";
}

export async function getCheckpointer(): Promise<BaseCheckpointSaver> {
  if (checkpointerInstance) {
    return checkpointerInstance;
  }

  const mode = resolveCheckpointerMode();
  if (mode === "postgres") {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error("CHECKPOINTER=postgres requires DATABASE_URL");
    }
    const { PostgresSaver } = await import("@langchain/langgraph-checkpoint-postgres");
    const saver = PostgresSaver.fromConnString(url);
    await saver.setup();
    checkpointerInstance = saver;
    return saver;
  }

  checkpointerInstance = new MemorySaver();
  return checkpointerInstance;
}

export function resetCheckpointerForTests(): void {
  checkpointerInstance = null;
}
