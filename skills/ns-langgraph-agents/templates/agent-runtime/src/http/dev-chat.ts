import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerResponse } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @env DEV_CHAT_ENABLED - "true" enables GET /dev-chat manual test page (never in production) */
export function isDevChatEnabled(): boolean {
  return process.env.DEV_CHAT_ENABLED === "true";
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveBundlePath(): string {
  const candidates = [
    join(__dirname, "../dev-chat-app.js"),
    join(__dirname, "../../dist/dev-chat-app.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }
  return candidates[0];
}

/** Serve esbuild bundle at GET /dev-chat/app.js. Missing → 503. */
export function serveDevChatApp(res: ServerResponse): void {
  if (!isDevChatEnabled()) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  const path = resolveBundlePath();
  if (!existsSync(path)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("run npm run build:dev-chat");
    return;
  }
  const body = readFileSync(path);
  res.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

const DEFAULT_COST_PER_M_IN = 2.5;
const DEFAULT_COST_PER_M_OUT = 25;

/**
 * Styled shell only — React mounts into #dev-chat-root from /dev-chat/app.js.
 * @env DEV_CHAT_SHOW_PROGRESS — default true
 * @env DEV_CHAT_INITIAL_MESSAGE — composer prefill; unset → Good morning; empty → blank
 * @env DEV_CHAT_COST_PER_M_IN / DEV_CHAT_COST_PER_M_OUT — USD per 1M tokens (banner + App)
 */
export function renderDevChatHtml(): string {
  const showProgress = process.env.DEV_CHAT_SHOW_PROGRESS !== "false";
  const initialMessage =
    process.env.DEV_CHAT_INITIAL_MESSAGE === undefined
      ? "Good morning"
      : process.env.DEV_CHAT_INITIAL_MESSAGE;
  const costInRaw = Number(process.env.DEV_CHAT_COST_PER_M_IN);
  const costOutRaw = Number(process.env.DEV_CHAT_COST_PER_M_OUT);
  const costIn = Number.isFinite(costInRaw) ? costInRaw : DEFAULT_COST_PER_M_IN;
  const costOut = Number.isFinite(costOutRaw)
    ? costOutRaw
    : DEFAULT_COST_PER_M_OUT;
  const costLabel = `$${costIn.toFixed(2)} / $${costOut.toFixed(2)}`;
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>dev-chat — agent-api</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
<style>
  :root {
    --pico-font-family: "IBM Plex Sans", system-ui, sans-serif;
    --pico-font-size: 13px;
    --pico-line-height: 1.35;
    --pico-form-element-spacing-vertical: 0.35rem;
    --pico-form-element-spacing-horizontal: 0.55rem;
    --pico-border-radius: 6px;
    --pico-typography-spacing-vertical: 0.5rem;
    --panel: #16181d;
    --panel-2: #1c1f26;
    --border: #2a2f3a;
    --muted: #8b93a7;
    --accent: #3d8bfd;
    --user-bg: #1a2a3d;
    --err: #ff6b6b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #0e1014;
    color: #e8eaed;
    font-family: var(--pico-font-family);
    font-size: var(--pico-font-size);
  }
  .banner {
    background: linear-gradient(90deg, #4a1f1f, #3a2228);
    color: #ffc9c9;
    padding: 0.35rem 0.85rem;
    font-size: 11px;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    border-bottom: 1px solid #5c3030;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(260px, 30%) 1fr;
    flex: 1;
    min-height: 0;
  }
  #dev-chat-root {
    display: contents;
  }
  .config {
    background: var(--panel);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 0.85rem 0.9rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .config h1 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 0.35rem;
  }
  .config label, .approver label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
  }
  .config input, .config textarea, .composer textarea, .approver input {
    margin: 0;
    font-size: 12px;
    line-height: 1.3;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: var(--pico-border-radius);
    color: #e8eaed;
    padding: 0.4rem 0.5rem;
    width: 100%;
  }
  #payload {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 11px;
    resize: vertical;
    min-height: 3rem;
  }
  .config .actions {
    margin-top: 0.35rem;
    display: flex;
    gap: 0.4rem;
  }
  .config .actions button, .composer button, .options button {
    margin: 0;
    height: 2rem;
    font-size: 12px;
    font-weight: 500;
    padding: 0 0.75rem;
    background: var(--accent);
    border: none;
    border-radius: var(--pico-border-radius);
    color: #fff;
    cursor: pointer;
  }
  .config .actions button { width: 100%; }
  .config .actions button.secondary {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .chat {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: #12141a;
  }
  .chat-head {
    flex-shrink: 0;
    padding: 0.55rem 1rem;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: var(--panel);
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .chat-head .title { color: #c5cad6; }
  .chat-head .usage {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--muted);
    text-align: right;
  }
  #log {
    flex: 1;
    overflow-y: auto;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .msg {
    max-width: 42rem;
    word-break: break-word;
    font-size: 12.5px;
    line-height: 1.45;
  }
  .msg.user {
    align-self: flex-end;
    background: var(--user-bg);
    border: 1px solid #243447;
    color: #c8e1ff;
    white-space: pre-wrap;
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
  }
  .msg.assistant {
    align-self: flex-start;
    color: #d7dae0;
    padding: 0.15rem 0;
  }
  .msg.assistant .md-body {
    font-family: var(--pico-font-family);
    font-size: 13px;
    line-height: 1.5;
  }
  .msg.assistant .md-body code {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 12px;
    background: #14171d;
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
  }
  .msg.assistant .msg-usage {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 10px;
    color: var(--muted);
    margin-top: 0.35rem;
  }
  .msg.assistant .paint-slot {
    margin-top: 0.45rem;
    padding: 0.45rem 0.55rem;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: var(--pico-border-radius);
    overflow-x: auto;
  }
  .msg.assistant .paint-slot pre {
    margin: 0;
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 11px;
    color: var(--muted);
    white-space: pre-wrap;
  }
  .msg.status {
    align-self: flex-start;
    background: transparent;
    color: var(--muted);
    font-size: 11px;
    padding: 0.15rem 0.4rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .msg.status .spinner {
    display: inline-block;
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid rgba(139, 147, 167, 0.22);
    border-top-color: var(--muted);
    animation: status-spin 0.75s linear infinite;
  }
  @keyframes status-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .msg.error {
    align-self: stretch;
    background: #2a1518;
    border: 1px solid #5a2a30;
    color: var(--err);
    font-size: 12px;
    white-space: pre-wrap;
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
  }
  .msg.interrupt {
    align-self: stretch;
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 0.75rem;
    border-radius: 8px;
  }
  .msg.interrupt .options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }
  .composer {
    border-top: 1px solid var(--border);
    background: var(--panel);
    padding: 0.65rem 0.85rem;
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    flex-shrink: 0;
  }
  .composer textarea {
    flex: 1;
    resize: none;
    min-height: 2.35rem;
    max-height: 7rem;
  }
  .composer-actions {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .composer button { width: auto; min-width: 4.5rem; }
  .composer button.stop {
    background: #3a2228;
    border: 1px solid #5a2a30;
    color: #ffc9c9;
  }
  .composer button[hidden] { display: none !important; }
  @media (max-width: 800px) {
    .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .config { max-height: 38vh; border-right: none; border-bottom: 1px solid var(--border); }
  }
</style>
</head>
<body>
<div class="banner">DEV ONLY — gated by DEV_CHAT_ENABLED. Never enable in production. Tokens may be stored in localStorage on this machine. Cost estimate: ${costLabel} per 1M tok (in/out).</div>
<div class="layout" id="dev-chat-root"
  data-show-progress="${showProgress ? "true" : "false"}"
  data-initial-message="${escapeHtmlAttr(initialMessage)}"
  data-cost-in="${costIn}"
  data-cost-out="${costOut}">
</div>
<script type="module" src="/dev-chat/app.js"></script>
</body>
</html>
`;
}
