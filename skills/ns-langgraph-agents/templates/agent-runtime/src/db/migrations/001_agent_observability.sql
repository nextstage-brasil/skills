-- Agent observability schema
-- Multi-tenant: tenant_id on every root table, cascades down via FKs.
-- LGPD/GDPR: anonymisation procedure zeroes text fields, keeps metrics.

CREATE TABLE IF NOT EXISTS tenants (
  id             VARCHAR(255) PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  retention_days INT          NOT NULL DEFAULT 30,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threads (
  id         VARCHAR(255) PRIMARY KEY,
  tenant_id  VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    VARCHAR(255),
  status     VARCHAR(50)  DEFAULT 'active',
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_threads_status    ON threads(status);

CREATE TABLE IF NOT EXISTS agent_checkpoints (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   VARCHAR(255) NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  step_number INT          NOT NULL,
  node_name   VARCHAR(100) NOT NULL,
  state_data  JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_thread_id  ON agent_checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_node_name  ON agent_checkpoints(node_name);

CREATE TABLE IF NOT EXISTS llm_logs (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id     UUID         NOT NULL REFERENCES agent_checkpoints(id) ON DELETE CASCADE,
  model_name        VARCHAR(100) NOT NULL,
  prompt_raw        TEXT,
  response_raw      TEXT,
  prompt_tokens     INT          NOT NULL DEFAULT 0,
  completion_tokens INT          NOT NULL DEFAULT 0,
  latency_ms        INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_logs_checkpoint_id ON llm_logs(checkpoint_id);

CREATE TABLE IF NOT EXISTS tool_executions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  llm_log_id  UUID         NOT NULL REFERENCES llm_logs(id) ON DELETE CASCADE,
  tool_name   VARCHAR(100) NOT NULL,
  arguments   JSONB,
  output_raw  TEXT,
  latency_ms  INT          NOT NULL DEFAULT 0,
  is_success  BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_llm_log_id ON tool_executions(llm_log_id);

-- -----------------------------------------------------------------------
-- Analytical views
-- -----------------------------------------------------------------------

CREATE OR REPLACE VIEW view_costs_by_tenant AS
SELECT
  t.tenant_id,
  l.model_name,
  COUNT(l.id)               AS total_requests,
  SUM(l.prompt_tokens)      AS total_prompt_tokens,
  SUM(l.completion_tokens)  AS total_completion_tokens,
  SUM(
    CASE
      WHEN l.model_name ILIKE '%gpt-4o%'            THEN (l.prompt_tokens * 0.005 + l.completion_tokens * 0.015) / 1000000.0
      WHEN l.model_name ILIKE '%gpt-4o-mini%'       THEN (l.prompt_tokens * 0.00015 + l.completion_tokens * 0.0006) / 1000000.0
      WHEN l.model_name ILIKE '%claude-3-5-sonnet%' THEN (l.prompt_tokens * 0.003 + l.completion_tokens * 0.015) / 1000000.0
      WHEN l.model_name ILIKE '%claude-3-haiku%'    THEN (l.prompt_tokens * 0.00025 + l.completion_tokens * 0.00125) / 1000000.0
      ELSE 0
    END
  ) AS estimated_cost_usd
FROM llm_logs l
JOIN agent_checkpoints c ON l.checkpoint_id = c.id
JOIN threads t ON c.thread_id = t.id
GROUP BY t.tenant_id, l.model_name;

CREATE OR REPLACE VIEW view_latency_bottlenecks AS
SELECT
  l.id                                       AS llm_log_id,
  c.node_name                                AS agent_step,
  l.model_name,
  l.latency_ms                               AS llm_latency_ms,
  COALESCE(SUM(te.latency_ms), 0)            AS tools_latency_ms,
  l.latency_ms + COALESCE(SUM(te.latency_ms), 0) AS total_step_latency_ms
FROM llm_logs l
JOIN agent_checkpoints c ON l.checkpoint_id = c.id
LEFT JOIN tool_executions te ON te.llm_log_id = l.id
GROUP BY l.id, c.node_name, l.model_name, l.latency_ms;

-- -----------------------------------------------------------------------
-- LGPD / GDPR anonymisation procedure
-- -----------------------------------------------------------------------

CREATE OR REPLACE PROCEDURE perform_lgpd_anonymisation()
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE llm_logs l
  SET
    prompt_raw   = '[ANONYMISED]',
    response_raw = '[ANONYMISED]'
  FROM agent_checkpoints c
  JOIN threads th ON c.thread_id = th.id
  JOIN tenants tn ON th.tenant_id = tn.id
  WHERE l.checkpoint_id = c.id
    AND th.updated_at < NOW() - (tn.retention_days * INTERVAL '1 day')
    AND l.prompt_raw <> '[ANONYMISED]';

  UPDATE tool_executions te
  SET
    arguments  = '"[ANONYMISED]"'::jsonb,
    output_raw = '[ANONYMISED]'
  FROM llm_logs l
  JOIN agent_checkpoints c ON l.checkpoint_id = c.id
  JOIN threads th ON c.thread_id = th.id
  JOIN tenants tn ON th.tenant_id = tn.id
  WHERE te.llm_log_id = l.id
    AND th.updated_at < NOW() - (tn.retention_days * INTERVAL '1 day')
    AND te.output_raw <> '[ANONYMISED]';

  UPDATE agent_checkpoints c
  SET state_data = '"[ANONYMISED]"'::jsonb
  FROM threads th
  JOIN tenants tn ON th.tenant_id = tn.id
  WHERE c.thread_id = th.id
    AND th.updated_at < NOW() - (tn.retention_days * INTERVAL '1 day')
    AND c.state_data <> '"[ANONYMISED]"'::jsonb;

  UPDATE threads th
  SET status = 'anonymised'
  FROM tenants tn
  WHERE th.tenant_id = tn.id
    AND th.updated_at < NOW() - (tn.retention_days * INTERVAL '1 day')
    AND th.status <> 'anonymised';
END;
$$;

-- -----------------------------------------------------------------------
-- pg_cron schedule (requires pg_cron extension — skip if not available)
-- -----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('lgpd-anonymisation', '0 3 * * *', 'CALL perform_lgpd_anonymisation();');
  END IF;
END;
$$;
