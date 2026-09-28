#!/usr/bin/env node
import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = join(root, "dist", "dev-chat-app.js");
mkdirSync(join(root, "dist"), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src/http/dev-chat-app/main.tsx")],
  bundle: true,
  outfile,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  minify: true,
  sourcemap: true,
  logLevel: "info",
});

console.log(`dev-chat bundle → ${outfile}`);
