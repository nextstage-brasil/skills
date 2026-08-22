import { AsyncLocalStorage } from "node:async_hooks";

export type RunCtx = {
  threadId: string;
  tenantId: string;
  nodeName?: string;
  checkpointId?: string;
};

export const runStorage = new AsyncLocalStorage<RunCtx>();

export function getRunCtx(): RunCtx | undefined {
  return runStorage.getStore();
}

export function setNodeName(name: string): void {
  const ctx = runStorage.getStore();
  if (ctx) {
    ctx.nodeName = name;
  }
}

export function setCheckpointId(id: string): void {
  const ctx = runStorage.getStore();
  if (ctx) {
    ctx.checkpointId = id;
  }
}
