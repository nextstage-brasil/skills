import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { resolveLlmProfiles } from "../llm/config.js";
import { createChatModel } from "../llm/provider.js";

const SUMMARY_SYSTEM_PROMPT =
  "Summarize the conversation below into a short paragraph. Preserve key facts, decisions, figures, and open questions. Do not add commentary or mention that this is a summary.";

function contentToText(content: BaseMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part
            ? String((part as { text: unknown }).text ?? "")
            : "",
      )
      .join("");
  }
  return content == null ? "" : String(content);
}

/**
 * Condenses `messages.slice(0, keepFromIndex)` into a single SystemMessage via
 * the `light` LLM profile. Returns null when there is nothing to summarize or
 * the light LLM call fails — caller falls back to pure trim, never breaks the turn.
 */
export async function summarizeOlderMessages(
  messages: BaseMessage[],
  keepFromIndex: number,
): Promise<SystemMessage | null> {
  const older = messages.slice(0, keepFromIndex);
  if (older.length === 0) {
    return null;
  }

  const profiles = resolveLlmProfiles();
  if (!profiles) {
    return null;
  }

  try {
    const lightModel = createChatModel(profiles.light);
    const transcript = older
      .map((m) => `${m._getType()}: ${contentToText(m.content)}`)
      .join("\n");
    const response = await lightModel.invoke([
      new SystemMessage(SUMMARY_SYSTEM_PROMPT),
      new HumanMessage(transcript),
    ]);
    const summaryText = contentToText(response.content).trim();
    if (!summaryText) {
      return null;
    }
    return new SystemMessage(`Conversation summary (earlier turns): ${summaryText}`);
  } catch {
    return null;
  }
}
