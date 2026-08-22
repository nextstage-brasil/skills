-- view_costs_by_thread — NULL ≠ 0; specific ILIKE before generic

CREATE OR REPLACE VIEW view_costs_by_thread AS
SELECT
  th.id AS thread_id,
  th.tenant_id,
  l.model_name,
  l.stage,
  COUNT(l.id) AS total_requests,
  SUM(l.prompt_tokens) AS total_prompt_tokens,
  SUM(l.completion_tokens) AS total_completion_tokens,
  SUM(
    CASE
      WHEN l.model_name ILIKE '%gpt-4o-mini%' THEN
        (l.prompt_tokens * 0.00015 + l.completion_tokens * 0.0006) / 1000000.0
      WHEN l.model_name ILIKE '%gpt-4o%' THEN
        (l.prompt_tokens * 0.005 + l.completion_tokens * 0.015) / 1000000.0
      WHEN l.model_name ILIKE '%claude-3-5-sonnet%' OR l.model_name ILIKE '%claude-sonnet-5%' THEN
        (l.prompt_tokens * 0.003 + l.completion_tokens * 0.015) / 1000000.0
      WHEN l.model_name ILIKE '%claude-3-haiku%' THEN
        (l.prompt_tokens * 0.00025 + l.completion_tokens * 0.00125) / 1000000.0
      ELSE NULL
    END
  ) AS estimated_cost_usd,
  COUNT(*) FILTER (
    WHERE CASE
      WHEN l.model_name ILIKE '%gpt-4o-mini%' THEN 1
      WHEN l.model_name ILIKE '%gpt-4o%' THEN 1
      WHEN l.model_name ILIKE '%claude-3-5-sonnet%' OR l.model_name ILIKE '%claude-sonnet-5%' THEN 1
      WHEN l.model_name ILIKE '%claude-3-haiku%' THEN 1
      ELSE NULL
    END IS NULL
  ) AS unpriced_calls
FROM threads th
JOIN agent_checkpoints c ON c.thread_id = th.id
JOIN llm_logs l ON l.checkpoint_id = c.id
GROUP BY th.id, th.tenant_id, l.model_name, l.stage;
