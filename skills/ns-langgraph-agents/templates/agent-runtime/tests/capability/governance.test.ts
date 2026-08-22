import { describe, expect, it, beforeEach } from "vitest";
import {
  argFingerprint,
  checkRateLimit,
  resetRateLimitWindows,
  filterCapabilities,
  capabilityIdLocal,
  capabilityIdMcp,
  type CapabilityMeta,
} from "../../src/capability/index.js";

describe("capability governance", () => {
  beforeEach(() => {
    resetRateLimitWindows();
  });

  it("redacts secrets in argFingerprint", () => {
    const a = argFingerprint({ q: "x", api_key: "secret-1" });
    const b = argFingerprint({ q: "x", api_key: "secret-2" });
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it("filters by allowlist and denies admin by default", () => {
    const items: CapabilityMeta[] = [
      {
        id: capabilityIdLocal("search"),
        name: "search",
        classification: "read",
        kind: "local",
      },
      {
        id: capabilityIdMcp("gitlab", "delete_issue"),
        name: "delete_issue",
        classification: "admin",
        kind: "mcp",
        server: "gitlab",
      },
    ];
    const allowed = filterCapabilities(items, {
      allow: [capabilityIdLocal("search"), capabilityIdMcp("gitlab", "delete_issue")],
    });
    expect(allowed.map((x) => x.name)).toEqual(["search"]);
  });

  it("enforces sliding-window rate limit", () => {
    const id = capabilityIdLocal("search");
    expect(
      checkRateLimit({
        tenantId: "1",
        capabilityId: id,
        limit: 2,
        windowMs: 60_000,
        now: 1000,
      }),
    ).toBe(true);
    expect(
      checkRateLimit({
        tenantId: "1",
        capabilityId: id,
        limit: 2,
        windowMs: 60_000,
        now: 1001,
      }),
    ).toBe(true);
    expect(
      checkRateLimit({
        tenantId: "1",
        capabilityId: id,
        limit: 2,
        windowMs: 60_000,
        now: 1002,
      }),
    ).toBe(false);
  });
});
