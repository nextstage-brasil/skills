-- llm_logs.stage — distinguish intent / gather / composer / summarize roles

ALTER TABLE llm_logs
  ADD COLUMN IF NOT EXISTS stage VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_llm_logs_stage ON llm_logs(stage);
