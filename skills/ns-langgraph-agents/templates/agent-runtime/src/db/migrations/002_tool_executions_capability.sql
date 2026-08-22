-- Capability audit columns on tool_executions (Tools / MCP / Skills)
-- Safe to re-run: ADD COLUMN IF NOT EXISTS

ALTER TABLE tool_executions
  ADD COLUMN IF NOT EXISTS server VARCHAR(100);

ALTER TABLE tool_executions
  ADD COLUMN IF NOT EXISTS tool_kind VARCHAR(20);

ALTER TABLE tool_executions
  ADD COLUMN IF NOT EXISTS classification VARCHAR(20);

ALTER TABLE tool_executions
  ADD COLUMN IF NOT EXISTS arg_fingerprint VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_kind
  ON tool_executions(tool_kind);

CREATE INDEX IF NOT EXISTS idx_tool_executions_server
  ON tool_executions(server);

CREATE INDEX IF NOT EXISTS idx_tool_executions_arg_fingerprint
  ON tool_executions(arg_fingerprint);
