export type ReasoningStyle = "openai" | "modelKwargs" | "none";

const PROVIDER_PRESETS = {
  lmstudio: {
    baseURL: "http://127.0.0.1:1234/v1",
    defaultModel: "google/gemma-4-e4b",
    defaultApiKey: "lm-studio",
    requiresApiKey: false,
    requiresBaseUrl: false,
    reasoningStyle: "none" as ReasoningStyle,
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    defaultApiKey: "",
    requiresApiKey: true,
    requiresBaseUrl: false,
    reasoningStyle: "openai" as ReasoningStyle,
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-sonnet-5",
    defaultApiKey: "",
    requiresApiKey: true,
    requiresBaseUrl: false,
    reasoningStyle: "modelKwargs" as ReasoningStyle,
  },
  vllm: {
    baseURL: "",
    defaultModel: "default",
    defaultApiKey: "EMPTY",
    requiresApiKey: false,
    requiresBaseUrl: true,
    reasoningStyle: "none" as ReasoningStyle,
  },
} as const;

export type LlmProvider = keyof typeof PROVIDER_PRESETS;

export function getProviderPreset(provider: LlmProvider) {
  return PROVIDER_PRESETS[provider];
}

/** One row per resolvable role — env prefix + fallback profile. */
const STAGES = {
  main: { envPrefix: null as string | null, fallback: null as null },
  light: { envPrefix: "LLM_LIGHT", fallback: "main" as const },
  analyst: { envPrefix: "LLM_ANALYST", fallback: "main" as const },
  composer: { envPrefix: "LLM_COMPOSER", fallback: "main" as const },
  summarize: { envPrefix: "LLM_SUMMARIZE", fallback: "light" as const },
  guard: { envPrefix: "LLM_GUARD", fallback: "light" as const },
} as const;

export type LlmRole = keyof typeof STAGES;
export type LlmStage = LlmRole;

export type LlmReasoningEffort = "none" | "low" | "medium" | "high";

export type LlmConfig = {
  role: LlmRole;
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
  /** Persisted on llm_logs.stage */
  stage: LlmStage;
  /** unset/none omitted by provider; openai/openrouter map effort */
  reasoning?: LlmReasoningEffort;
};

export type LlmProfiles = {
  main: LlmConfig;
  light: LlmConfig;
};

const ENV_SUFFIXES = [
  "PROVIDER",
  "MODEL",
  "API_KEY",
  "TEMPERATURE",
  "BASE_URL",
  "REASONING",
] as const;

type EnvSuffix = (typeof ENV_SUFFIXES)[number];

const MAIN_ENV_KEYS: Record<EnvSuffix, string[]> = {
  PROVIDER: ["LLM_PROVIDER"],
  MODEL: ["LLM_MODEL", "OPENAI_MODEL"],
  API_KEY: ["LLM_API_KEY"],
  TEMPERATURE: ["LLM_TEMPERATURE"],
  BASE_URL: ["LLM_BASE_URL"],
  REASONING: ["LLM_REASONING"],
};

function parseProvider(raw: string | undefined): LlmProvider | null {
  const value = (raw ?? "lmstudio").trim().toLowerCase();
  if (value in PROVIDER_PRESETS) {
    return value as LlmProvider;
  }
  return null;
}

function parseReasoning(
  raw: string | undefined,
): LlmReasoningEffort | null | undefined {
  if (!raw) {
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (
    value === "none" ||
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value;
  }
  return null;
}

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function hasStageOverrides(prefix: string): boolean {
  return ENV_SUFFIXES.some((suffix) => Boolean(readEnv(`${prefix}_${suffix}`)));
}

function readRoleEnv(role: LlmRole, suffix: EnvSuffix): string | undefined {
  const { envPrefix, fallback } = STAGES[role];
  if (envPrefix) {
    const staged = readEnv(`${envPrefix}_${suffix}`);
    if (staged) {
      return staged;
    }
    if (fallback) {
      return readRoleEnv(fallback, suffix);
    }
  }
  for (const key of MAIN_ENV_KEYS[suffix]) {
    const v = readEnv(key);
    if (v) {
      return v;
    }
  }
  return undefined;
}

function resolveFallbackConfig(role: LlmRole): LlmConfig | null {
  const fb = STAGES[role].fallback;
  if (!fb) {
    return null;
  }
  return resolveLlmConfigForRole(fb) ?? resolveFallbackConfig(fb);
}

export function resolveLlmConfigForRole(role: LlmRole): LlmConfig | null {
  if (process.env.LLM_DISABLED === "true") {
    return null;
  }
  const stage = STAGES[role];
  if (stage.envPrefix && !hasStageOverrides(stage.envPrefix)) {
    if (role === "light") {
      return null;
    }
    const base = resolveFallbackConfig(role);
    if (!base) {
      return null;
    }
    return { ...base, role, stage: role };
  }

  const provider = parseProvider(readRoleEnv(role, "PROVIDER"));
  if (!provider) {
    return null;
  }

  const reasoning = parseReasoning(readRoleEnv(role, "REASONING"));
  if (reasoning === null) {
    return null;
  }

  const preset = PROVIDER_PRESETS[provider];
  const model = readRoleEnv(role, "MODEL") ?? preset.defaultModel;
  const baseURLOverride = readRoleEnv(role, "BASE_URL");
  const baseURL = baseURLOverride ?? preset.baseURL;
  const apiKey = readRoleEnv(role, "API_KEY") ?? preset.defaultApiKey;

  if (preset.requiresBaseUrl && !baseURL) {
    return null;
  }

  if (preset.requiresApiKey && !apiKey) {
    return null;
  }

  const temperature = Number(readRoleEnv(role, "TEMPERATURE") ?? "0.3");

  const config: LlmConfig = {
    role,
    provider,
    apiKey,
    model,
    baseURL,
    temperature,
    stage: role,
  };
  if (reasoning !== undefined) {
    config.reasoning = reasoning;
  }
  return config;
}

/** Main profile — reasoning, extraction, offer presentation. */
export function resolveLlmConfig(): LlmConfig | null {
  return resolveLlmConfigForRole("main");
}

/** Both profiles; `light` falls back to `main` when `LLM_LIGHT_*` is unset. */
export function resolveLlmProfiles(): LlmProfiles | null {
  const main = resolveLlmConfigForRole("main");
  if (!main) {
    return null;
  }
  const light = resolveLlmConfigForRole("light") ?? {
    ...main,
    role: "light" as const,
    stage: "light" as const,
  };
  return { main, light };
}

export function formatLlmConfigLabel(config: LlmConfig): string {
  return `${config.role}:${config.provider}/${config.model}`;
}
