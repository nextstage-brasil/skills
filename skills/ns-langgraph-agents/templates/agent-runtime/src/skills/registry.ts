import { resolveSkillsDir } from "../shared/config-paths.js";
import {
  capabilityIdSkill,
  type CapabilityMeta,
} from "../capability/types.js";
import { loadSkillsFromDir, type SkillDefinition } from "./loader.js";

let skills: SkillDefinition[] = [];
let bootstrapped = false;

export async function bootstrapSkillsRegistry(
  skillsDir?: string,
): Promise<SkillDefinition[]> {
  const dir = skillsDir ?? resolveSkillsDir();
  skills = await loadSkillsFromDir(dir);
  bootstrapped = true;
  console.info(`[skills] loaded ${skills.length} from ${dir}`);
  return skills;
}

export function getSkills(): SkillDefinition[] {
  if (!bootstrapped) {
    throw new Error("skills_registry_not_bootstrapped");
  }
  return skills;
}

export function getSkill(id: string): SkillDefinition | undefined {
  return getSkills().find((s) => s.id === id);
}

export function skillsAsCapabilities(
  list: ReadonlyArray<SkillDefinition> = getSkills(),
): CapabilityMeta[] {
  return list.map((s) => ({
    id: capabilityIdSkill(s.id),
    name: s.id,
    classification: s.classification,
    kind: "skill" as const,
  }));
}

/** Test helper */
export function resetSkillsRegistryForTests(): void {
  skills = [];
  bootstrapped = false;
}
