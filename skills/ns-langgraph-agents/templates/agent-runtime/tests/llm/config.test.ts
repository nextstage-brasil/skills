import { afterEach, describe, expect, it } from "vitest";
import {
  resolveLlmConfig,
  resolveLlmConfigForRole,
  resolveLlmProfiles,
} from "../../src/llm/config.js";
import {
  applyReasoning,
  createChatModel,
  clearReasoningIgnoreLog,
} from "../../src/llm/provider.js";

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
  clearReasoningIgnoreLog();
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

  it("allows mixed providers per stage", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "openai");
    setEnv("LLM_API_KEY", "sk-main");
    setEnv("LLM_MODEL", "gpt-4o-mini");
    setEnv("LLM_SUMMARIZE_PROVIDER", "lmstudio");
    setEnv("LLM_SUMMARIZE_MODEL", "gemma");
    setEnv("LLM_COMPOSER_PROVIDER", "openrouter");
    setEnv("LLM_COMPOSER_API_KEY", "or-key");
    setEnv("LLM_COMPOSER_MODEL", "anthropic/claude");
    setEnv("LLM_ANALYST_PROVIDER", "vllm");
    setEnv("LLM_ANALYST_BASE_URL", "http://127.0.0.1:8000/v1");
    setEnv("LLM_ANALYST_MODEL", "local");

    expect(resolveLlmConfigForRole("summarize")?.provider).toBe("lmstudio");
    expect(resolveLlmConfigForRole("composer")?.provider).toBe("openrouter");
    expect(resolveLlmConfigForRole("analyst")?.provider).toBe("vllm");
    expect(resolveLlmConfigForRole("analyst")?.baseURL).toBe(
      "http://127.0.0.1:8000/v1",
    );
  });

  it("BASE_URL override wins over preset", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "openai");
    setEnv("LLM_API_KEY", "sk");
    setEnv("LLM_BASE_URL", "http://proxy.local/v1");
    expect(resolveLlmConfig()?.baseURL).toBe("http://proxy.local/v1");
  });

  it("vllm without BASE_URL is not configured", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "vllm");
    setEnv("LLM_BASE_URL", undefined);
    setEnv("LLM_API_KEY", undefined);
    expect(resolveLlmConfig()).toBeNull();
  });

  it("vllm with BASE_URL defaults API key EMPTY", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "vllm");
    setEnv("LLM_BASE_URL", "http://127.0.0.1:8000/v1");
    setEnv("LLM_API_KEY", undefined);
    const cfg = resolveLlmConfig();
    expect(cfg?.apiKey).toBe("EMPTY");
  });

  it("stores reasoning effort on config", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "openai");
    setEnv("LLM_API_KEY", "sk");
    setEnv("LLM_REASONING", "medium");
    expect(resolveLlmConfig()?.reasoning).toBe("medium");
  });

  it("invalid REASONING leaves stage unconfigured", () => {
    setEnv("LLM_DISABLED", undefined);
    setEnv("LLM_PROVIDER", "openai");
    setEnv("LLM_API_KEY", "sk");
    setEnv("LLM_REASONING", "ultra");
    expect(resolveLlmConfig()).toBeNull();
  });
});

describe("applyReasoning mapping", () => {
  const base = {
    apiKey: "sk",
    model: "m",
    temperature: 0,
    streaming: true,
    configuration: { baseURL: "http://x" },
  };

  it("openai sets reasoning.effort", () => {
    const out = applyReasoning(
      {
        role: "main",
        provider: "openai",
        apiKey: "sk",
        model: "gpt",
        baseURL: "https://api.openai.com/v1",
        temperature: 0,
        stage: "main",
        reasoning: "low",
      },
      base,
    );
    expect((out as { reasoning?: { effort: string } }).reasoning).toEqual({
      effort: "low",
    });
  });

  it("openrouter sets modelKwargs.reasoning", () => {
    const out = applyReasoning(
      {
        role: "main",
        provider: "openrouter",
        apiKey: "or",
        model: "x",
        baseURL: "https://openrouter.ai/api/v1",
        temperature: 0,
        stage: "main",
        reasoning: "medium",
      },
      base,
    );
    expect(
      (out as { modelKwargs?: { reasoning?: { effort: string } } }).modelKwargs
        ?.reasoning,
    ).toEqual({ effort: "medium" });
  });

  it("omits reasoning for lmstudio and vllm", () => {
    for (const provider of ["lmstudio", "vllm"] as const) {
      const out = applyReasoning(
        {
          role: "main",
          provider,
          apiKey: "k",
          model: "m",
          baseURL: "http://127.0.0.1/v1",
          temperature: 0,
          stage: "main",
          reasoning: "high",
        },
        base,
      );
      expect((out as { reasoning?: unknown }).reasoning).toBeUndefined();
      expect(
        (out as { modelKwargs?: { reasoning?: unknown } }).modelKwargs
          ?.reasoning,
      ).toBeUndefined();
    }
  });
});

describe("createChatModel reasoning mapping", () => {
  it("creates model for openai with reasoning effort", () => {
    const model = createChatModel({
      role: "main",
      provider: "openai",
      apiKey: "sk",
      model: "gpt-4o",
      baseURL: "https://api.openai.com/v1",
      temperature: 0,
      stage: "main",
      reasoning: "low",
    });
    expect(model).toBeTruthy();
  });

  it("omits reasoning for lmstudio without throwing", () => {
    const model = createChatModel({
      role: "main",
      provider: "lmstudio",
      apiKey: "lm-studio",
      model: "gemma",
      baseURL: "http://127.0.0.1:1234/v1",
      temperature: 0,
      stage: "main",
      reasoning: "high",
    });
    expect(model).toBeTruthy();
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
