/** Token usage shape shared by SSE + turn accumulator (http re-exports). */
export type AgentStreamUsage = {
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};
