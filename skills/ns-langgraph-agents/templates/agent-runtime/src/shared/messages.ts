import type { BaseMessage } from "@langchain/core/messages";

/** Last human message text from durable messages (empty string if none). */
export function lastHumanText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m._getType() !== "human") {
      continue;
    }
    const content = m.content;
    if (typeof content === "string") {
      return content.trim();
    }
    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const block of content) {
        if (typeof block === "string") {
          parts.push(block);
        } else if (
          block &&
          typeof block === "object" &&
          "text" in block &&
          typeof (block as { text: unknown }).text === "string"
        ) {
          parts.push((block as { text: string }).text);
        }
      }
      return parts.join("").trim();
    }
  }
  return "";
}
