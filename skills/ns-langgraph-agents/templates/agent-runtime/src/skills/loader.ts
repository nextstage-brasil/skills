import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export interface SkillDefinition {
  id: string;
  when_to_use: string;
  classification: "read" | "write" | "destructive" | "admin";
  body: string;
  sourcePath: string;
}

/**
 * Parses optional YAML-like front-matter (key: value) between --- fences.
 */
export function parseSkillMarkdown(
  raw: string,
  sourcePath: string,
): SkillDefinition {
  const trimmed = raw.trimStart();
  let front: Record<string, string> = {};
  let body = raw;

  if (trimmed.startsWith("---")) {
    const end = trimmed.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = trimmed.slice(3, end).trim();
      body = trimmed.slice(end + 4).trimStart();
      front = Object.fromEntries(
        fm
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.includes(":"))
          .map((line) => {
            const idx = line.indexOf(":");
            return [
              line.slice(0, idx).trim(),
              line.slice(idx + 1).trim(),
            ] as const;
          }),
      );
    }
  }

  const id =
    front.id ??
    sourcePath
      .split(/[/\\]/)
      .pop()
      ?.replace(/\.md$/i, "") ??
    "unnamed";

  const classification = (front.classification ?? "read") as SkillDefinition["classification"];

  return {
    id,
    when_to_use: front.when_to_use ?? `Use skill ${id} when appropriate.`,
    classification:
      classification === "write" ||
      classification === "destructive" ||
      classification === "admin"
        ? classification
        : "read",
    body: body.trim(),
    sourcePath,
  };
}

export async function loadSkillFile(path: string): Promise<SkillDefinition> {
  const raw = await readFile(path, "utf8");
  return parseSkillMarkdown(raw, path);
}

export async function loadSkillsFromDir(dir: string): Promise<SkillDefinition[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const skills: SkillDefinition[] = [];
  for (const name of entries) {
    if (!name.endsWith(".md")) {
      continue;
    }
    skills.push(await loadSkillFile(join(dir, name)));
  }
  return skills;
}
