export type ToolClassification = "read" | "write" | "destructive" | "admin";

export type ToolKind = "local" | "mcp" | "skill";

export type CapabilityId =
  | `local:${string}`
  | `mcp:${string}:${string}`
  | `skill:${string}`;

export type UrlSource = "env" | "payload";

export interface CapabilityMeta {
  id: CapabilityId;
  name: string;
  classification: ToolClassification;
  kind: ToolKind;
  server?: string;
}

export interface AllowlistPolicy {
  /** Explicit capability ids allowed for bind_tools */
  allow: ReadonlySet<CapabilityId> | ReadonlyArray<CapabilityId>;
  /** Classes denied even if listed (default: admin) */
  denyClasses?: ReadonlyArray<ToolClassification>;
}

export function capabilityIdLocal(name: string): CapabilityId {
  return `local:${name}`;
}

export function capabilityIdMcp(server: string, tool: string): CapabilityId {
  return `mcp:${server}:${tool}`;
}

export function capabilityIdSkill(id: string): CapabilityId {
  return `skill:${id}`;
}

export function isAllowed(
  meta: CapabilityMeta,
  policy: AllowlistPolicy,
): boolean {
  const deny = policy.denyClasses ?? (["admin"] as ToolClassification[]);
  if (deny.includes(meta.classification)) {
    return false;
  }
  const allow =
    policy.allow instanceof Set
      ? policy.allow
      : new Set(policy.allow);
  return allow.has(meta.id);
}

export function filterCapabilities(
  items: ReadonlyArray<CapabilityMeta>,
  policy: AllowlistPolicy,
): CapabilityMeta[] {
  return items.filter((item) => isAllowed(item, policy));
}
