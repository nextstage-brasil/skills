/** Read positive finite number from env, else fallback. */
export function readPositiveNumberEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
