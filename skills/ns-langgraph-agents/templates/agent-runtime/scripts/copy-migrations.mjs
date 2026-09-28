#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copyDir(relSrc, relDest) {
  const src = join(root, relSrc);
  const dest = join(root, relDest);
  if (!existsSync(src)) {
    console.error(`missing: ${src}`);
    process.exit(1);
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`copied ${relSrc} → ${relDest}`);
}

copyDir("src/db/migrations", "dist/db/migrations");
copyDir(
  "src/conversation/prompts",
  "dist/conversation/prompts",
);
