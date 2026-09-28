import { ChatOpenAI } from "@langchain/openai";
import type { LlmConfig } from "./config.js";
import { getProviderPreset, resolveLlmConfig } from "./config.js";

const reasoningIgnoredLogged = new Set<string>();

/** Map config.reasoning onto provider kwargs. Exported for unit tests. */
export function applyReasoning(
  config: LlmConfig,
  base: ConstructorParameters<typeof ChatOpenAI>[0],
): ConstructorParameters<typeof ChatOpenAI>[0] {
  const effort = config.reasoning;
  if (!effort || effort === "none") {
    return base;
  }
  const style = getProviderPreset(config.provider).reasoningStyle;
  if (style === "openai") {
    return {
      ...base,
      reasoning: { effort },
    } as ConstructorParameters<typeof ChatOpenAI>[0];
  }
  if (style === "modelKwargs") {
    return {
      ...base,
      modelKwargs: {
        ...(base as { modelKwargs?: Record<string, unknown> }).modelKwargs,
        reasoning: { effort },
      },
    };
  }
  const key = `${config.provider}:${config.model}`;
  if (!reasoningIgnoredLogged.has(key)) {
    reasoningIgnoredLogged.add(key);
    console.debug(
      `[llm] reasoning=${effort} ignored for provider=${config.provider}`,
    );
  }
  return base;
}

/** Test helper */
export function clearReasoningIgnoreLog(): void {
  reasoningIgnoredLogged.clear();
}

export function createChatModel(config: LlmConfig): ChatOpenAI {
  const base: ConstructorParameters<typeof ChatOpenAI>[0] = {
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    streaming: true,
    configuration: { baseURL: config.baseURL },
  };
  return new ChatOpenAI(applyReasoning(config, base));
}

export function getChatModel(): ChatOpenAI {
  const config = resolveLlmConfig();
  if (!config) {
    throw new Error(
      "LLM not configured. Set LLM_PROVIDER and LLM_API_KEY (or LLM_PROVIDER=lmstudio with LM Studio running).",
    );
  }
  return createChatModel(config);
}
