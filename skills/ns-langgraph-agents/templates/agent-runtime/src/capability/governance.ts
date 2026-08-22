import { createHash } from "node:crypto";
import type { CapabilityId } from "./types.js";

const windows = new Map<string, number[]>();

/**
 * Sliding-window rate limit. Returns true when the call is allowed.
 */
export function checkRateLimit(params: {
  tenantId: string;
  capabilityId: CapabilityId;
  limit: number;
  windowMs: number;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  const key = `${params.tenantId}:${params.capabilityId}`;
  const cutoff = now - params.windowMs;
  const prev = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (prev.length >= params.limit) {
    windows.set(key, prev);
    return false;
  }
  prev.push(now);
  windows.set(key, prev);
  return true;
}

/** Test helper — clears in-memory windows. */
export function resetRateLimitWindows(): void {
  windows.clear();
}

/**
 * Stable fingerprint of tool args for loop detection / audit.
 * Redacts common secret keys before hashing.
 */
export function argFingerprint(args: unknown): string {
  const normalized = JSON.stringify(redactSecrets(args), sortReplacer);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

const SECRET_KEY_RE =
  /^(authorization|api[_-]?key|token|password|secret|bearer|access[_-]?token)$/i;

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_RE.test(k) ? "[REDACTED]" : redactSecrets(v);
    }
    return out;
  }
  return value;
}

function sortReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (value as Record<string, unknown>)[k];
        return acc;
      }, {});
  }
  return value;
}

/**
 * Secrets and system prompts must travel via RunnableConfig.configurable —
 * never graph state / checkpointer / default logs.
 */
export function assertConfigurableSecret(
  configurable: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!configurable) {
    return undefined;
  }
  const raw = configurable[key];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}
