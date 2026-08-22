import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./client.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const files = (await readdir(migrationsDir))
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.info(`[db] applied ${file}`);
  }
}
