import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { readJsonBody } from "./read-json-body.js";
import {
  CONTENT_MAX,
  KEY_MAX,
  MemoryKeyConflictError,
  USER_MEMORY_KINDS,
  getUserMemoryRepo,
  isSensitiveMemory,
  normalizeMemoryContent,
  normalizeMemoryKey,
  type MemoryOwner,
  type UserMemory,
  type UserMemoryKind,
} from "../memory/user-memory.js";

/**
 * Caller-scoped CRUD for the frontend "what the agent remembers about me" screen.
 * Owner always comes from the authenticated identity — never from path or body (no IDOR).
 *
 * GET    /memories                 ?kind=&include_invalid=true
 * POST   /memories                 { kind, key, content, why? }
 * GET    /memories/:id
 * PATCH  /memories/:id             { kind?, key?, content?, why? }
 * DELETE /memories/:id             hard delete (+ superseded history of that key)
 * DELETE /memories                 purge all memories of the caller (LGPD erasure)
 */

const CreateBody = z.object({
  kind: z.enum(USER_MEMORY_KINDS),
  key: z.string().min(1).max(KEY_MAX),
  content: z.string().min(1).max(CONTENT_MAX),
  why: z.string().max(CONTENT_MAX).nullable().optional(),
});

const PatchBody = CreateBody.partial().refine((b) => Object.keys(b).length > 0, {
  message: "empty_patch",
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(res: ServerResponse, status: number, data?: unknown) {
  if (data === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function toMemoryApi(m: UserMemory) {
  return {
    id: m.id,
    kind: m.kind,
    key: m.key,
    content: m.content,
    why: m.why,
    source: m.source,
    evidence_thread_id: m.evidenceThreadId,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
    invalid_at: m.invalidAt,
  };
}

async function readBody(req: IncomingMessage): Promise<unknown | undefined> {
  try {
    return await readJsonBody(req);
  } catch {
    return undefined;
  }
}

/** Returns true when the request was a /memories route (handled). */
export async function handleMemoryRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  owner: MemoryOwner | null,
): Promise<boolean> {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "memories" || parts.length > 2) {
    return false;
  }
  if (!owner) {
    json(res, 401, { error: "user_required" });
    return true;
  }
  const repo = getUserMemoryRepo();
  const id = parts[1];
  if (id !== undefined && !UUID_RE.test(id)) {
    json(res, 404, { error: "memory_not_found" });
    return true;
  }

  try {
    if (!id && req.method === "GET") {
      const kindParam = url.searchParams.get("kind");
      if (kindParam && !(USER_MEMORY_KINDS as readonly string[]).includes(kindParam)) {
        json(res, 400, { error: "invalid_kind" });
        return true;
      }
      const items = await repo.list(owner, {
        kind: (kindParam as UserMemoryKind | null) ?? undefined,
        includeInvalid: url.searchParams.get("include_invalid") === "true",
      });
      json(res, 200, { items: items.map(toMemoryApi) });
      return true;
    }

    if (!id && req.method === "POST") {
      const raw = await readBody(req);
      if (raw === undefined) {
        json(res, 400, { error: "invalid_json" });
        return true;
      }
      const parsed = CreateBody.safeParse(raw);
      if (!parsed.success) {
        json(res, 400, { error: "invalid_body", issues: parsed.error.issues });
        return true;
      }
      const key = normalizeMemoryKey(parsed.data.key);
      const content = normalizeMemoryContent(parsed.data.content);
      if (isSensitiveMemory(`${key} ${content}`)) {
        json(res, 422, { error: "sensitive_content" });
        return true;
      }
      const created = await repo.create(owner, {
        kind: parsed.data.kind,
        key,
        content,
        why: parsed.data.why ?? null,
        source: "user",
      });
      json(res, 201, toMemoryApi(created));
      return true;
    }

    if (!id && req.method === "DELETE") {
      const deleted = await repo.purge(owner);
      json(res, 200, { deleted });
      return true;
    }

    if (id && req.method === "GET") {
      const item = await repo.get(owner, id);
      if (!item) {
        json(res, 404, { error: "memory_not_found" });
        return true;
      }
      json(res, 200, toMemoryApi(item));
      return true;
    }

    if (id && req.method === "PATCH") {
      const raw = await readBody(req);
      if (raw === undefined) {
        json(res, 400, { error: "invalid_json" });
        return true;
      }
      const parsed = PatchBody.safeParse(raw);
      if (!parsed.success) {
        json(res, 400, { error: "invalid_body", issues: parsed.error.issues });
        return true;
      }
      const patch = {
        ...parsed.data,
        ...(parsed.data.key !== undefined ? { key: normalizeMemoryKey(parsed.data.key) } : {}),
        ...(parsed.data.content !== undefined
          ? { content: normalizeMemoryContent(parsed.data.content) }
          : {}),
      };
      if (isSensitiveMemory(`${patch.key ?? ""} ${patch.content ?? ""}`)) {
        json(res, 422, { error: "sensitive_content" });
        return true;
      }
      const updated = await repo.update(owner, id, patch);
      if (!updated) {
        json(res, 404, { error: "memory_not_found" });
        return true;
      }
      json(res, 200, toMemoryApi(updated));
      return true;
    }

    if (id && req.method === "DELETE") {
      const removed = await repo.remove(owner, id);
      json(res, removed ? 204 : 404, removed ? undefined : { error: "memory_not_found" });
      return true;
    }

    json(res, 405, { error: "method_not_allowed" });
    return true;
  } catch (err) {
    if (err instanceof MemoryKeyConflictError) {
      json(res, 409, { error: err.code });
      return true;
    }
    throw err;
  }
}
