import { getPool } from "../db/client.js";
import { runMigrations } from "../db/migrate.js";

let dbReady = false;

export async function initDb(): Promise<void> {
  if (dbReady) return;
  await runMigrations();
  dbReady = true;
  console.info("[db] migrations applied");
}

export async function syncTenant(id: string, name: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO tenants (id, name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
    [id, name],
  );
}

export async function logThread(
  threadId: string,
  tenantId: string,
  userId?: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO threads (id, tenant_id, user_id, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
    [threadId, tenantId, userId ?? null],
  );
}

export async function updateThreadStatus(
  threadId: string,
  status: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE threads SET status = $2, updated_at = NOW() WHERE id = $1`,
    [threadId, status],
  );
}

export async function logCheckpoint(
  threadId: string,
  stepNumber: number,
  nodeName: string,
  stateData: unknown,
): Promise<string> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO agent_checkpoints (thread_id, step_number, node_name, state_data)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [threadId, stepNumber, nodeName, JSON.stringify(stateData)],
  );
  return result.rows[0].id;
}

export async function logLlmCall(params: {
  checkpointId: string;
  modelName: string;
  promptRaw: string;
  responseRaw: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  stage?: string | null;
}): Promise<string> {
  const pool = getPool();
  const hideInputs = process.env.LANGCHAIN_HIDE_INPUTS === "true";
  const promptRaw = hideInputs ? "[REDACTED]" : params.promptRaw;
  const responseRaw = hideInputs ? "[REDACTED]" : params.responseRaw;
  const result = await pool.query<{ id: string }>(
    `INSERT INTO llm_logs
       (checkpoint_id, model_name, prompt_raw, response_raw, prompt_tokens, completion_tokens, latency_ms, stage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      params.checkpointId,
      params.modelName,
      promptRaw,
      responseRaw,
      params.promptTokens,
      params.completionTokens,
      params.latencyMs,
      params.stage ?? null,
    ],
  );
  return result.rows[0].id;
}

/**
 * UPDATE turn_decisions on the latest checkpoint row for the thread (turn anchor).
 */
export async function upsertTurnDecisions(
  threadId: string,
  decisions: unknown,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE agent_checkpoints
     SET turn_decisions = $2::jsonb
     WHERE id = (
       SELECT id FROM agent_checkpoints
       WHERE thread_id = $1
       ORDER BY step_number DESC
       LIMIT 1
     )`,
    [threadId, JSON.stringify(decisions)],
  );
}

export async function logToolExecution(params: {
  llmLogId: string;
  toolName: string;
  args: unknown;
  output: string;
  latencyMs: number;
  isSuccess: boolean;
  server?: string | null;
  toolKind?: "local" | "mcp" | "skill" | null;
  classification?: string | null;
  argFingerprint?: string | null;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO tool_executions
       (llm_log_id, tool_name, arguments, output_raw, latency_ms, is_success,
        server, tool_kind, classification, arg_fingerprint)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      params.llmLogId,
      params.toolName,
      JSON.stringify(params.args),
      params.output,
      params.latencyMs,
      params.isSuccess,
      params.server ?? null,
      params.toolKind ?? null,
      params.classification ?? null,
      params.argFingerprint ?? null,
    ],
  );
}

export async function getLatestCheckpointId(
  threadId: string,
): Promise<string | null> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM agent_checkpoints WHERE thread_id = $1 ORDER BY step_number DESC LIMIT 1`,
    [threadId],
  );
  return result.rows[0]?.id ?? null;
}

export async function getNextStepNumber(threadId: string): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ max: string | null }>(
    `SELECT MAX(step_number) AS max FROM agent_checkpoints WHERE thread_id = $1`,
    [threadId],
  );
  const max = result.rows[0]?.max;
  return max === null || max === undefined ? 0 : Number(max) + 1;
}
