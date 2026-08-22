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

/**
 * Canonical harness manual test page — same HTTP/SSE contract as any integrator.
 * UX standard: Markdown render, replaceable status (Planejando… / Obtendo dados…),
 * cumulative `response_streaming` token display, per-message + thread usage/cost
 * ($2.50 in / $25 out per 1M tok, Claude Sonnet-scale estimate).
 * Prefills Bearer from AGENT_SERVICE_BEARER_TOKEN (visible; DEV only).
 * @env DEV_CHAT_SHOW_PROGRESS — default true; set "false" to hide Planejando… / Obtendo dados…
 * Product forks may add dedicated invoke fields.
 */
export function renderDevChatHtml(): string {
  const bearerToken = escapeHtmlAttr(
    process.env.AGENT_SERVICE_BEARER_TOKEN?.trim() ?? "",
  );
  const showProgress = process.env.DEV_CHAT_SHOW_PROGRESS !== "false";
  return `<!doctype html>
<html lang="pt-BR" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>dev-chat — agent-api</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"></script>
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
    --bot-bg: #1e2229;
    --err: #ff6b6b;
    --ok: #6bcf7f;
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
  .config label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin: 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--muted);
  }
  .config input,
  .config textarea,
  .composer textarea {
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
  .config input:focus,
  .config textarea:focus,
  .composer textarea:focus {
    border-color: var(--accent);
    outline: none;
    box-shadow: 0 0 0 2px rgba(61, 139, 253, 0.2);
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
  .config .actions button,
  .composer button {
    margin: 0;
    width: 100%;
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
  .config .actions button.secondary {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
  }
  .config .actions button.secondary:hover {
    border-color: var(--muted);
    color: #e8eaed;
    filter: none;
  }
  .config .actions button:hover,
  .composer button:hover { filter: brightness(1.08); }
  .config .actions button:disabled,
  .composer button:disabled { opacity: 0.45; cursor: default; }
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
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
    border: 1px solid transparent;
  }
  .msg.user {
    align-self: flex-end;
    background: var(--user-bg);
    border-color: #243447;
    color: #c8e1ff;
    white-space: pre-wrap;
  }
  .msg.assistant {
    align-self: flex-start;
    color: #d7dae0;
    background: var(--bot-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
  }
  .msg.assistant.streaming:not(.has-content) {
    display: none;
  }
  .msg.assistant .md-body {
    font-family: var(--pico-font-family);
    font-size: 13px;
    line-height: 1.5;
  }
  .msg.assistant .md-body > :first-child { margin-top: 0; }
  .msg.assistant .md-body > :last-child { margin-bottom: 0; }
  .msg.assistant .md-body p { margin: 0.4rem 0; }
  .msg.assistant .md-body ul, .msg.assistant .md-body ol { margin: 0.35rem 0; padding-left: 1.25rem; }
  .msg.assistant .md-body code {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 12px;
    background: #14171d;
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
  }
  .msg.assistant .md-body pre {
    background: #14171d;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.55rem 0.65rem;
    overflow-x: auto;
  }
  .msg.assistant .md-body pre code { background: transparent; padding: 0; }
  .msg.assistant .md-body table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; font-size: 12px; }
  .msg.assistant .md-body th, .msg.assistant .md-body td {
    border: 1px solid var(--border);
    padding: 0.3rem 0.45rem;
  }
  .msg.assistant.streaming:has(.md-body:empty) {
    display: none;
  }
  .msg-meta {
    margin-top: 0.45rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--border);
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--muted);
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
    will-change: transform;
  }
  @keyframes status-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .msg.reasoning {
    align-self: flex-start;
    max-width: 42rem;
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 11.5px;
    font-style: italic;
    padding: 0.15rem 0.4rem;
  }
  .msg.reasoning .md-body { opacity: 0.85; }
  .msg.error {
    align-self: stretch;
    background: #2a1518;
    border-color: #5a2a30;
    color: var(--err);
    font-size: 12px;
    white-space: pre-wrap;
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
  .composer button { width: auto; min-width: 4.5rem; flex-shrink: 0; }
  .composer-actions {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .composer button.stop {
    background: #3a2228;
    border: 1px solid #5a2a30;
    color: #ffc9c9;
  }
  .composer button.stop:hover { filter: brightness(1.08); }
  .composer button[hidden] { display: none !important; }
  @media (max-width: 800px) {
    .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .config { max-height: 38vh; border-right: none; border-bottom: 1px solid var(--border); }
  }
</style>
</head>
<body>
<div class="banner">DEV ONLY — gated by DEV_CHAT_ENABLED. Never enable in production. Tokens may be stored in localStorage on this machine. Cost estimate: $2.50 / $25 per 1M tok (Claude Sonnet-scale).</div>
<div class="layout">
  <aside class="config">
    <h1>Configuration</h1>
    <label>Base URL<input id="baseUrl" type="text" placeholder="base URL" /></label>
    <label>Bearer token<input id="token" type="text" value="${bearerToken}" placeholder="AGENT_SERVICE_BEARER_TOKEN" /></label>
    <label>thread_id<input id="threadId" type="text" placeholder="empty = new uuid" /></label>
    <label>extra payload JSON<textarea id="payload" placeholder='{"tenant_id":"1"}'></textarea></label>
    <div class="actions">
      <button id="newThreadBtn" type="button">New thread</button>
      <button id="clearStorageBtn" type="button" class="secondary">Clear storage</button>
    </div>
  </aside>
  <section class="chat">
    <div class="chat-head">
      <span class="title">Conversation</span>
      <span class="usage" id="threadUsage">prompt 0 | cached 0 | completion 0 | total 0 · ~$0.0000</span>
    </div>
    <div id="log"></div>
    <div class="composer">
      <textarea id="message" placeholder="Message…" rows="1"></textarea>
      <div class="composer-actions">
        <button id="sendBtn" type="button">Send</button>
        <button id="stopBtn" type="button" class="stop" hidden>Stop</button>
      </div>
    </div>
  </section>
</div>
<script>
(function () {
  var logEl = document.getElementById('log');
  var baseUrlEl = document.getElementById('baseUrl');
  var tokenEl = document.getElementById('token');
  var threadIdEl = document.getElementById('threadId');
  var payloadEl = document.getElementById('payload');
  var messageEl = document.getElementById('message');
  var sendBtn = document.getElementById('sendBtn');
  var stopBtn = document.getElementById('stopBtn');
  var newThreadBtn = document.getElementById('newThreadBtn');
  var clearStorageBtn = document.getElementById('clearStorageBtn');
  var threadUsageEl = document.getElementById('threadUsage');
  var LS = 'agentapi.devchat.v2';
  var USD_IN_PER_M = 2.5;
  var USD_OUT_PER_M = 25;
  var SHOW_PROGRESS = ${showProgress ? "true" : "false"};
  var threadTotals = { prompt: 0, cached: 0, completion: 0 };
  var statusEl = null;
  var assistantWrap = null;
  var assistantBody = null;
  var activeAbort = null;
  var activeReader = null;
  var toolsSeenThisTurn = false;
  var postToolAnswer = false;
  var directAnswerStream = false;
  var pendingStreamMessage = '';
  var answerStreamTimer = null;

  function resetTurnStreamState() {
    toolsSeenThisTurn = false;
    postToolAnswer = false;
    directAnswerStream = false;
    pendingStreamMessage = '';
    if (answerStreamTimer) {
      clearTimeout(answerStreamTimer);
      answerStreamTimer = null;
    }
  }

  function cancelAnswerStreamTimer() {
    if (answerStreamTimer) {
      clearTimeout(answerStreamTimer);
      answerStreamTimer = null;
    }
  }

  function handleResponseStreaming(message) {
    var text = (message == null) ? '' : String(message);
    pendingStreamMessage = text;
    if (postToolAnswer || directAnswerStream) {
      if (text.trim()) {
        setAssistantMarkdown(text, true);
      }
      return;
    }
    if (toolsSeenThisTurn) {
      setStatus('Analisando…');
      return;
    }
    setStatus('Planejando…');
    if (!answerStreamTimer) {
      answerStreamTimer = setTimeout(function () {
        answerStreamTimer = null;
        if (!toolsSeenThisTurn) {
          directAnswerStream = true;
          if (pendingStreamMessage.trim()) {
            setAssistantMarkdown(pendingStreamMessage, true);
          }
        }
      }, 280);
    }
  }

  function setComposerBusy(busy) {
    sendBtn.hidden = busy;
    stopBtn.hidden = !busy;
  }

  function abortActiveTurn() {
    if (activeAbort) {
      activeAbort.abort();
    }
    if (activeReader) {
      activeReader.cancel().catch(function () {});
    }
  }

  if (window.marked && marked.setOptions) {
    marked.setOptions({ gfm: true, breaks: true });
  }

  baseUrlEl.value = window.location.origin;

  try {
    var saved = JSON.parse(localStorage.getItem(LS) || '{}');
    if (saved.token) tokenEl.value = saved.token;
    if (saved.threadId) threadIdEl.value = saved.threadId;
    if (saved.payload) payloadEl.value = saved.payload;
    if (saved.threadTotals) {
      threadTotals = {
        prompt: Number(saved.threadTotals.prompt) || 0,
        cached: Number(saved.threadTotals.cached) || 0,
        completion: Number(saved.threadTotals.completion) || 0
      };
    }
  } catch (e) {}

  renderThreadUsage();

  function persist() {
    localStorage.setItem(LS, JSON.stringify({
      token: tokenEl.value,
      threadId: threadIdEl.value,
      payload: payloadEl.value,
      threadTotals: threadTotals
    }));
  }

  function estimateCost(prompt, completion) {
    return (prompt * USD_IN_PER_M + completion * USD_OUT_PER_M) / 1e6;
  }

  function fmtCost(n) {
    return '~$' + (n < 0.01 ? n.toFixed(4) : n.toFixed(2));
  }

  function usageLine(prompt, cached, completion) {
    var total = prompt + completion;
    return 'prompt ' + prompt + ' | cached ' + cached + ' | completion ' + completion + ' | total ' + total + ' · ' + fmtCost(estimateCost(prompt, completion));
  }

  function renderThreadUsage() {
    threadUsageEl.textContent = usageLine(threadTotals.prompt, threadTotals.cached, threadTotals.completion);
  }

  function resetThreadTotals() {
    threadTotals = { prompt: 0, cached: 0, completion: 0 };
    renderThreadUsage();
  }

  function addThreadUsage(usage) {
    if (!usage) return;
    threadTotals.prompt += Number(usage.prompt_tokens) || 0;
    threadTotals.cached += Number(usage.cached_tokens) || 0;
    threadTotals.completion += Number(usage.completion_tokens) || 0;
    renderThreadUsage();
    persist();
  }

  function renderMarkdown(md) {
    var raw = (md == null) ? '' : String(md);
    if (window.marked && window.DOMPurify) {
      return DOMPurify.sanitize(marked.parse(raw));
    }
    var div = document.createElement('div');
    div.textContent = raw;
    return div.innerHTML;
  }

  function appendUser(text) {
    var div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function appendError(text) {
    clearStatus();
    var div = document.createElement('div');
    div.className = 'msg error';
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    return div;
  }

  function setStatus(text) {
    if (!SHOW_PROGRESS) {
      clearStatus();
      return;
    }
    if (!text) {
      clearStatus();
      return;
    }
    clearDraftAssistant();
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'msg status';
      statusEl.setAttribute('aria-live', 'polite');
      var spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-busy', 'true');
      spinner.setAttribute('aria-hidden', 'true');
      var label = document.createElement('span');
      label.className = 'label';
      statusEl.appendChild(spinner);
      statusEl.appendChild(label);
      logEl.appendChild(statusEl);
    }
    statusEl.querySelector('.label').textContent = text;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearStatus() {
    if (statusEl && statusEl.parentNode) {
      statusEl.parentNode.removeChild(statusEl);
    }
    statusEl = null;
  }

  function assistantHasVisibleContent() {
    return Boolean(assistantBody && assistantBody.textContent.trim().length > 0);
  }

  function mountAssistantIfNeeded() {
    if (!assistantWrap) {
      return;
    }
    var visible = assistantHasVisibleContent();
    if (visible) {
      assistantWrap.classList.add('has-content');
      if (!assistantWrap.parentNode) {
        logEl.appendChild(assistantWrap);
      }
      clearStatus();
      logEl.scrollTop = logEl.scrollHeight;
    } else if (assistantWrap.classList.contains('streaming')) {
      assistantWrap.classList.remove('has-content');
      if (assistantWrap.parentNode) {
        assistantWrap.parentNode.removeChild(assistantWrap);
      }
    }
  }

  function clearDraftAssistant() {
    if (!assistantWrap) {
      return;
    }
    if (assistantWrap.parentNode) {
      assistantWrap.parentNode.removeChild(assistantWrap);
    }
    assistantWrap = null;
    assistantBody = null;
  }

  function clearReasoningNotes() {
    var notes = logEl.querySelectorAll('.msg.reasoning');
    for (var i = 0; i < notes.length; i++) {
      notes[i].parentNode.removeChild(notes[i]);
    }
  }

  function ensureAssistant(streaming) {
    if (!assistantWrap) {
      assistantWrap = document.createElement('div');
      assistantWrap.className = 'msg assistant' + (streaming ? ' streaming' : '');
      assistantBody = document.createElement('div');
      assistantBody.className = 'md-body';
      assistantWrap.appendChild(assistantBody);
    } else if (streaming) {
      assistantWrap.classList.add('streaming');
    } else {
      assistantWrap.classList.remove('streaming');
      assistantWrap.classList.remove('has-content');
    }
    return assistantBody;
  }

  function setAssistantMarkdown(md, streaming) {
    var text = (md == null) ? '' : String(md);
    if (streaming && !text.trim()) {
      return;
    }
    var body = ensureAssistant(streaming);
    body.innerHTML = renderMarkdown(text);
    if (streaming) {
      mountAssistantIfNeeded();
      return;
    }
    if (assistantWrap && !assistantWrap.parentNode) {
      logEl.appendChild(assistantWrap);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  function finishAssistant(md, usage) {
    var text = (md == null) ? '' : String(md);
    if (!text.trim() && !assistantWrap) {
      if (usage) {
        addThreadUsage(usage);
      }
      return;
    }
    var body = ensureAssistant(false);
    body.innerHTML = renderMarkdown(text);
    if (assistantWrap) {
      assistantWrap.classList.remove('has-content');
      if (!assistantWrap.parentNode) {
        logEl.appendChild(assistantWrap);
      }
      var old = assistantWrap.querySelector('.msg-meta');
      if (old) {
        old.remove();
      }
      if (usage) {
        var meta = document.createElement('div');
        meta.className = 'msg-meta';
        var p = Number(usage.prompt_tokens) || 0;
        var cached = Number(usage.cached_tokens) || 0;
        var c = Number(usage.completion_tokens) || 0;
        meta.textContent = usageLine(p, cached, c);
        assistantWrap.appendChild(meta);
        addThreadUsage(usage);
      }
    }
    assistantWrap = null;
    assistantBody = null;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function statusLabel(envelope) {
    if (envelope.status === 'thinking') {
      return toolsSeenThisTurn ? 'Analisando…' : 'Planejando…';
    }
    if (envelope.status === 'accessing_data') return 'Coletando dados…';
    if (envelope.status === 'tool_started') return 'Coletando dados…';
    if (envelope.status === 'tool_finished') return 'Analisando…';
    return envelope.status + (envelope.tool_name ? ' (' + envelope.tool_name + ')' : '');
  }

  function extraPayload() {
    var raw = payloadEl.value.trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      appendError('extra payload JSON invalid: ' + e.message);
      return {};
    }
  }

  function headers() {
    var h = { 'Content-Type': 'application/json' };
    if (tokenEl.value.trim()) h['Authorization'] = 'Bearer ' + tokenEl.value.trim();
    return h;
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'thread_' + Date.now();
  }

  function applyEnvelope(envelope) {
    if (envelope.status === 'response_streaming') {
      handleResponseStreaming(envelope.message);
      return;
    }
    if (envelope.status === 'completed') {
      cancelAnswerStreamTimer();
      clearStatus();
      clearReasoningNotes();
      finishAssistant(envelope.message || '', envelope.usage);
      return;
    }
    if (envelope.status === 'failed' || envelope.status === 'cancelled') {
      cancelAnswerStreamTimer();
      clearStatus();
      clearDraftAssistant();
      clearReasoningNotes();
      appendError(envelope.status + ': ' + (envelope.error_code || envelope.message || ''));
      if (envelope.usage) addThreadUsage(envelope.usage);
      return;
    }
    cancelAnswerStreamTimer();
    if (envelope.status === 'tool_started') {
      toolsSeenThisTurn = true;
      directAnswerStream = false;
    }
    if (envelope.status === 'tool_finished') {
      postToolAnswer = true;
    }
    clearDraftAssistant();
    setStatus(statusLabel(envelope));
  }

  async function handleResponse(res, turnAbort) {
    var contentType = res.headers.get('content-type') || '';
    if (contentType.indexOf('text/event-stream') === -1) {
      var body = await res.json();
      if (body.thread_id) threadIdEl.value = body.thread_id;
      if (!res.ok) {
        appendError(JSON.stringify(body));
        return;
      }
      appendError(JSON.stringify(body.state || body, null, 2));
      return;
    }

    var reader = res.body.getReader();
    activeReader = reader;
    var decoder = new TextDecoder();
    var buffer = '';
    assistantWrap = null;
    assistantBody = null;
    resetTurnStreamState();

    try {
      while (true) {
        if (turnAbort && turnAbort.signal.aborted) {
          await reader.cancel();
          break;
        }
        var chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        var parts = buffer.split(/\\n\\n/);
        buffer = parts.pop();
        for (var i = 0; i < parts.length; i++) {
          var lines = parts[i].split(/\\n/);
          for (var j = 0; j < lines.length; j++) {
            var line = lines[j];
            if (line.indexOf('data: ') !== 0) {
              continue;
            }
            var envelope;
            try {
              envelope = JSON.parse(line.slice(6));
            } catch (e) {
              continue;
            }
            applyEnvelope(envelope);
          }
        }
      }
      if (!turnAbort || !turnAbort.signal.aborted) {
        if (buffer.trim()) {
          var trailing = buffer.split(/\\n/);
          for (var k = 0; k < trailing.length; k++) {
            var tline = trailing[k];
            if (tline.indexOf('data: ') !== 0) {
              continue;
            }
            try {
              applyEnvelope(JSON.parse(tline.slice(6)));
            } catch (e) {}
          }
        }
        clearStatus();
      }
    } finally {
      if (activeReader === reader) {
        activeReader = null;
      }
    }
  }

  async function runTurn(url, body, userText) {
    abortActiveTurn();
    var turnAbort = new AbortController();
    activeAbort = turnAbort;
    setComposerBusy(true);
    appendUser(userText);
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        signal: turnAbort.signal,
      });
      await handleResponse(res, turnAbort);
    } catch (e) {
      if (!turnAbort.signal.aborted) {
        appendError(String(e));
      } else {
        clearStatus();
        if (assistantWrap && assistantWrap.classList.contains('streaming')) {
          assistantWrap.classList.remove('streaming');
        }
      }
    } finally {
      if (activeAbort === turnAbort) {
        activeAbort = null;
      }
      activeReader = null;
      setComposerBusy(false);
      persist();
    }
  }

  async function createThread() {
    if (!threadIdEl.value.trim()) threadIdEl.value = uuid();
    var text = messageEl.value.trim() || 'Hello';
    var body = Object.assign({ message: text, thread_id: threadIdEl.value.trim() }, extraPayload());
    messageEl.value = '';
    persist();
    await runTurn(
      baseUrlEl.value.replace(/\\/$/, '') + '/threads',
      body,
      body.message,
    );
  }

  async function sendMessage() {
    var text = messageEl.value.trim();
    if (!text) {
      return;
    }
    if (!threadIdEl.value.trim()) {
      await createThread();
      return;
    }
    var body = Object.assign({ message: text, thread_id: threadIdEl.value.trim() }, extraPayload());
    messageEl.value = '';
    persist();
    await runTurn(
      baseUrlEl.value.replace(/\\/$/, '') + '/threads/' + encodeURIComponent(threadIdEl.value.trim()) + '/message',
      body,
      text,
    );
  }

  newThreadBtn.addEventListener('click', function () {
    threadIdEl.value = uuid();
    resetThreadTotals();
    persist();
    createThread();
  });
  clearStorageBtn.addEventListener('click', function () {
    localStorage.removeItem(LS);
    tokenEl.value = '';
    threadIdEl.value = '';
    payloadEl.value = '';
    logEl.innerHTML = '';
    statusEl = null;
    assistantWrap = null;
    assistantBody = null;
    resetThreadTotals();
    setStatus('localStorage cleared');
  });
  sendBtn.addEventListener('click', sendMessage);
  stopBtn.addEventListener('click', abortActiveTurn);
  messageEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !sendBtn.hidden) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
</script>
</body>
</html>
`;
}
