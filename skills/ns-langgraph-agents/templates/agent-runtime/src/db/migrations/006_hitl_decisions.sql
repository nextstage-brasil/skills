-- Append-only HITL approval events. Never UPDATE/DELETE rows.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS hitl_decisions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         VARCHAR(255) NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  checkpoint_id     UUID         REFERENCES agent_checkpoints(id) ON DELETE SET NULL,
  intent_category   VARCHAR(100),
  decision_actor    VARCHAR(20)  NOT NULL DEFAULT 'human',
  approver_id       VARCHAR(255),
  approver_role     VARCHAR(100),
  decided_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  decision_outcome  VARCHAR(20)  NOT NULL,
  always_escalate   BOOLEAN      NOT NULL DEFAULT FALSE,
  resume_payload    JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hitl_decisions_thread_id
  ON hitl_decisions(thread_id);

CREATE INDEX IF NOT EXISTS idx_hitl_decisions_decided_at
  ON hitl_decisions(decided_at);
