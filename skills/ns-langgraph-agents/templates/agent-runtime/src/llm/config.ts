export type LlmProvider = "lmstudio" | "openai" | "openrouter";

/** Profiles: main/light + named stages that fall back to main or light. */
export type LlmRole =
  | "main"
  | "light"
  | "analyst"
  | "composer"
  | "summarize"
  | "guard";

export type LlmStage =
  | "analyst"
  | "composer"
  | "summarize"
  | "main"
  | "light"
  | "guard";

export type LlmConfig = {
  role: LlmRole;
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
  /** Persisted on llm_logs.stage */
  stage: LlmStage;
};

export type LlmProfiles = {
  main: LlmConfig;
  light: LlmConfig;
};

const PROVIDER_PRESETS: Record<
  LlmProvider,
  { baseURL: string; defaultModel: string; defaultApiKey: string }
> = {
  lmstudio: {
    baseURL: "http://127.0.0.1:1234/v1",
    defaultModel: "google/gemma-4-e4b",
    defaultApiKey: "lm-studio",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    defaultApiKey: "",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-sonnet-5",
    defaultApiKey: "",
  },
};

const STAGE_ENV_PREFIX: Partial<Record<LlmRole, string>> = {
  analyst: "LLM_ANALYST",
  composer: "LLM_COMPOSER",
  summarize: "LLM_SUMMARIZE",
  light: "LLM_LIGHT",
  guard: "LLM_GUARD",
};

function parseProvider(raw: string | undefined): LlmProvider {
  const value = (raw ?? "lmstudio").trim().toLowerCase();
  if (value === "lmstudio" || value === "openai" || value === "openrouter") {
    return value;
  }
  throw new Error(
    `Unsupported LLM provider: ${raw}. Use lmstudio, openai, or openrouter.`,
  );
}

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function hasLightRoleOverrides(): boolean {
  return Boolean(
    readEnv("LLM_LIGHT_PROVIDER") ||
      readEnv("LLM_LIGHT_MODEL") ||
      readEnv("LLM_LIGHT_API_KEY") ||
      readEnv("LLM_LIGHT_TEMPERATURE"),
  );
}

function hasStageOverrides(prefix: string): boolean {
  return Boolean(
    readEnv(`${prefix}_PROVIDER`) ||
      readEnv(`${prefix}_MODEL`) ||
      readEnv(`${prefix}_API_KEY`) ||
      readEnv(`${prefix}_TEMPERATURE`),
  );
}

function stageForRole(role: LlmRole): LlmStage {
  if (
    role === "analyst" ||
    role === "composer" ||
    role === "summarize" ||
    role === "light" ||
    role === "main" ||
    role === "guard"
  ) {
    return role;
  }
  return "main";
}

function fallbackRole(role: LlmRole): "main" | "light" {
  if (role === "summarize" || role === "light" || role === "guard") {
    return "light";
  }
  return "main";
}

function readRoleEnv(role: LlmRole, suffix: string): string | undefined {
  const prefix = STAGE_ENV_PREFIX[role];
  if (prefix) {
    const staged = readEnv(`${prefix}_${suffix}`);
    if (staged) {
      return staged;
    }
    if (role === "light") {
      return readRoleEnv("main", suffix);
    }
    const fb = fallbackRole(role);
    return readRoleEnv(fb, suffix);
  }
  if (suffix === "PROVIDER") {
    return readEnv("LLM_PROVIDER");
  }
  if (suffix === "MODEL") {
    return readEnv("LLM_MODEL") ?? readEnv("OPENAI_MODEL");
  }
  if (suffix === "API_KEY") {
    return readEnv("LLM_API_KEY");
  }
  if (suffix === "TEMPERATURE") {
    return readEnv("LLM_TEMPERATURE");
  }
  return undefined;
}

export function resolveLlmConfigForRole(role: LlmRole): LlmConfig | null {
  if (process.env.LLM_DISABLED === "true") {
    return null;
  }
  if (role === "light" && !hasLightRoleOverrides()) {
    return null;
  }
  const prefix = STAGE_ENV_PREFIX[role];
  if (
    prefix &&
    role !== "light" &&
    role !== "main" &&
    !hasStageOverrides(prefix)
  ) {
    const fb = fallbackRole(role);
    const base =
      fb === "light"
        ? resolveLlmConfigForRole("light") ?? resolveLlmConfigForRole("main")
        : resolveLlmConfigForRole("main");
    if (!base) {
      return null;
    }
    return { ...base, role, stage: stageForRole(role) };
  }

  let provider: LlmProvider;
  try {
    provider = parseProvider(readRoleEnv(role, "PROVIDER"));
  } catch {
    return null;
  }

  const preset = PROVIDER_PRESETS[provider];
  const model = readRoleEnv(role, "MODEL") ?? preset.defaultModel;
  const baseURL = preset.baseURL;
  const apiKey = readRoleEnv(role, "API_KEY") ?? preset.defaultApiKey;

  if ((provider === "openai" || provider === "openrouter") && !apiKey) {
    return null;
  }

  const temperature = Number(readRoleEnv(role, "TEMPERATURE") ?? "0.3");

  return {
    role,
    provider,
    apiKey: apiKey || preset.defaultApiKey,
    model,
    baseURL,
    temperature,
    stage: stageForRole(role),
  };
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
