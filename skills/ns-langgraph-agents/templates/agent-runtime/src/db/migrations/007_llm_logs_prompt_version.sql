-- llm_logs.prompt_version — motor role prompt version from conversation/prompts frontmatter
ALTER TABLE llm_logs
  ADD COLUMN IF NOT EXISTS prompt_version TEXT;

CREATE INDEX IF NOT EXISTS idx_llm_logs_prompt_version ON llm_logs(prompt_version);
