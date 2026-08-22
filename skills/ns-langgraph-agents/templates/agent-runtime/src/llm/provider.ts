import { ChatOpenAI } from "@langchain/openai";
import type { LlmConfig } from "./config.js";
import { resolveLlmConfig } from "./config.js";

export function createChatModel(config: LlmConfig): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    streaming: true,
    configuration: { baseURL: config.baseURL },
  });
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
