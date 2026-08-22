import { getPool } from "../db/client.js";

async function upsertCheckpointRow(
  threadId: string,
  nodeName: string,
  stateData: unknown,
): Promise<void> {
  const pool = getPool();

  const existing = await pool.query<{ step_number: number }>(
    `SELECT step_number FROM agent_checkpoints
     WHERE thread_id = $1 AND node_name = $2
     ORDER BY step_number DESC LIMIT 1`,
    [threadId, nodeName],
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE agent_checkpoints
       SET state_data = $3
       WHERE thread_id = $1 AND node_name = $2
         AND step_number = (
           SELECT MAX(step_number) FROM agent_checkpoints
           WHERE thread_id = $1 AND node_name = $2
         )`,
      [threadId, nodeName, JSON.stringify(stateData)],
    );
  } else {
    const maxResult = await pool.query<{ max: string | null }>(
      `SELECT MAX(step_number) AS max FROM agent_checkpoints WHERE thread_id = $1`,
      [threadId],
    );
    const nextStep = maxResult.rows[0]?.max === null ? 0 : Number(maxResult.rows[0].max) + 1;
    await pool.query(
      `INSERT INTO agent_checkpoints (thread_id, step_number, node_name, state_data)
       VALUES ($1, $2, $3, $4)`,
      [threadId, nextStep, nodeName, JSON.stringify(stateData)],
    );
  }
}

export async function saveAgentMemory(
  threadId: string,
  namespace: string,
  data: unknown,
): Promise<void> {
  await upsertCheckpointRow(threadId, `memory:${namespace}`, data);
}

export async function loadAgentMemory(
  threadId: string,
  namespace: string,
): Promise<unknown | null> {
  const pool = getPool();
  const result = await pool.query<{ state_data: unknown }>(
    `SELECT state_data FROM agent_checkpoints
     WHERE thread_id = $1 AND node_name = $2
     ORDER BY step_number DESC LIMIT 1`,
    [threadId, `memory:${namespace}`],
  );
  const row = result.rows[0];
  if (!row) return null;
  return row.state_data ?? null;
}
