import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SystemPromptRole } from "./system-prompt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type RolePromptMeta = {
  body: string;
  promptVersion: string;
};

const cache = new Map<SystemPromptRole, RolePromptMeta>();

function parseFrontmatter(raw: string): { body: string; promptVersion: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { body: raw.trim(), promptVersion: "" };
  }
  const fm = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  const verLine = fm.match(/^prompt_version:\s*["']?([^"'\n]+)["']?\s*$/m);
  const promptVersion = verLine?.[1]?.trim() ?? "";
  return { body, promptVersion };
}

/** Parse raw prompt file text — throws when prompt_version missing. */
export function parseRolePromptSource(
  role: SystemPromptRole,
  raw: string,
): RolePromptMeta {
  const parsed = parseFrontmatter(raw);
  if (!parsed.promptVersion) {
    throw new Error(`prompt_version_missing:${role}`);
  }
  return {
    body: parsed.body,
    promptVersion: parsed.promptVersion,
  };
}

/** Load role markdown + prompt_version (frontmatter required). */
export function loadRolePromptMeta(role: SystemPromptRole): RolePromptMeta {
  const hit = cache.get(role);
  if (hit !== undefined) {
    return hit;
  }
  const path = join(__dirname, "prompts", `${role}.md`);
  const raw = readFileSync(path, "utf8");
  const meta = parseRolePromptSource(role, raw);
  cache.set(role, meta);
  return meta;
}

/** Motor body only (SSoT for composeSystemPrompt). */
export function loadRolePrompt(role: SystemPromptRole): string {
  return loadRolePromptMeta(role).body;
}

/** Test helper — clear memo between cases. */
export function clearRolePromptCache(): void {
  cache.clear();
}
