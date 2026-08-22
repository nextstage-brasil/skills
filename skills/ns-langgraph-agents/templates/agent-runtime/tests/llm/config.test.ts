import { afterEach, describe, expect, it } from "vitest";
import { resolveLlmConfig, resolveLlmProfiles } from "../../src/llm/config.js";

const envBackup: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (!(key in envBackup)) {
    envBackup[key] = process.env[key];
  }
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("resolveLlmConfig", () => {
  it("returns null when LLM_DISABLED is true", () => {
    setEnv("LLM_DISABLED", "true");
    expect(resolveLlmConfig()).toBeNull();
  });

  it("defaults to lmstudio main profile", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", undefined);
    setEnv("LLM_MODEL", undefined);

    const cfg = resolveLlmConfig();
    expect(cfg?.role).toBe("main");
    expect(cfg?.provider).toBe("lmstudio");
  });
});

describe("resolveLlmProfiles", () => {
  it("uses main for light when LLM_LIGHT_* is unset", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "lmstudio");
    setEnv("LLM_MODEL", "google/gemma-4-e4b");
    setEnv("LLM_LIGHT_MODEL", undefined);

    const profiles = resolveLlmProfiles();
    expect(profiles?.main.model).toBe("google/gemma-4-e4b");
    expect(profiles?.light.model).toBe("google/gemma-4-e4b");
  });
});
