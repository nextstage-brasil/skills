import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT_API_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function resolveConfigDir(envValue: string | undefined, defaultAbsoluteDir: string): string {
  const trimmed = envValue?.trim();
  if (!trimmed) {
    return defaultAbsoluteDir;
  }
  return isAbsolute(trimmed) ? trimmed : join(AGENT_API_ROOT, trimmed);
}

export function resolveSkillsDir(envValue = process.env.SKILLS_DIR): string {
  return resolveConfigDir(envValue, join(AGENT_API_ROOT, "skills"));
}

export function resolveTenantsDir(envValue = process.env.TENANTS_DIR): string {
  return resolveConfigDir(envValue, join(AGENT_API_ROOT, "config", "tenants"));
}

export function resolvePlaybooksDir(envValue = process.env.PLAYBOOKS_DIR): string {
  return resolveConfigDir(envValue, join(AGENT_API_ROOT, "config", "verticals"));
}
