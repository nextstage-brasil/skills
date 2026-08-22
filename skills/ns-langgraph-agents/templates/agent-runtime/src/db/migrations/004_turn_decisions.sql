-- turn_decisions JSONB on agent_checkpoints (ephemeral turn audit flushed at respond)

ALTER TABLE agent_checkpoints
  ADD COLUMN IF NOT EXISTS turn_decisions JSONB;

CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_turn_decisions
  ON agent_checkpoints USING GIN (turn_decisions)
  WHERE turn_decisions IS NOT NULL;
