import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  initialTurnUiState,
  isSendBlocked,
  turnUiReducer,
  type InterruptPayload,
  type StreamEnvelope,
} from "./turn-ui.js";

marked.setOptions({ gfm: true, breaks: true });

function renderMarkdown(md: string): string {
  return DOMPurify.sanitize(marked.parse(md) as string);
}

function readCostRates(): { inPerM: number; outPerM: number } {
  const el = document.getElementById("dev-chat-root");
  return {
    inPerM: Number(el?.dataset.costIn),
    outPerM: Number(el?.dataset.costOut),
  };
}

const COST = readCostRates();

function estimateCost(prompt: number, completion: number): number {
  const inPerM = Number.isFinite(COST.inPerM) ? COST.inPerM : 0;
  const outPerM = Number.isFinite(COST.outPerM) ? COST.outPerM : 0;
  return (prompt * inPerM + completion * outPerM) / 1e6;
}

function usageLine(prompt: number, cached: number, completion: number): string {
  const total = prompt + completion;
  const cost = estimateCost(prompt, completion);
  const fmt = cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2);
  return `prompt ${prompt} | cached ${cached} | completion ${completion} | total ${total} · ~$${fmt}`;
}

function readShowProgress(): boolean {
  const el = document.getElementById("dev-chat-root");
  return el?.dataset.showProgress !== "false";
}

function readInitialMessage(): string {
  const el = document.getElementById("dev-chat-root");
  // Server owns default ("Good morning"); client only reads data-initial-message.
  return el?.dataset.initialMessage ?? "";
}

function uuid(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `thread_${Date.now()}`;
}

const LS = "agentapi.devchat.v2";

export function App() {
  const [state, dispatch] = useReducer(turnUiReducer, undefined, initialTurnUiState);
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [token, setToken] = useState("");
  const [threadId, setThreadId] = useState("");
  const [payload, setPayload] = useState("");
  const [composer, setComposer] = useState(readInitialMessage());
  const [threadTotals, setThreadTotals] = useState({
    prompt: 0,
    cached: 0,
    completion: 0,
  });
  const [approverId, setApproverId] = useState("");
  const [approverRole, setApproverRole] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const showProgress = readShowProgress();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS) || "{}") as {
        token?: string;
        threadId?: string;
        payload?: string;
        threadTotals?: { prompt: number; cached: number; completion: number };
      };
      if (saved.token) setToken(saved.token);
      if (saved.threadId) setThreadId(saved.threadId);
      if (saved.payload) setPayload(saved.payload);
      if (saved.threadTotals) setThreadTotals(saved.threadTotals);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LS,
      JSON.stringify({ token, threadId, payload, threadTotals }),
    );
  }, [token, threadId, payload, threadTotals]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.messages, state.statusText, state.interrupt]);

  const extraPayload = useCallback((): Record<string, unknown> => {
    const raw = payload.trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      dispatch({
        type: "envelope",
        envelope: {
          status: "failed",
          message: `extra payload JSON invalid: ${(e as Error).message}`,
        },
      });
      return {};
    }
  }, [payload]);

  const applyUsage = useCallback((usage: StreamEnvelope["usage"]) => {
    if (!usage) return;
    setThreadTotals((t) => ({
      prompt: t.prompt + (Number(usage.prompt_tokens) || 0),
      cached: t.cached + (Number(usage.cached_tokens) || 0),
      completion: t.completion + (Number(usage.completion_tokens) || 0),
    }));
  }, []);

  const handleEnvelope = useCallback(
    (envelope: StreamEnvelope) => {
      dispatch({ type: "envelope", envelope });
      if (envelope.usage) applyUsage(envelope.usage);
    },
    [applyUsage],
  );

  const runSse = useCallback(
    async (url: string, body: Record<string, unknown>, userText?: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      if (userText) {
        dispatch({ type: "user_append", text: userText });
      }
      dispatch({ type: "turn_open" });
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          // Dev bench identity — production gateways set X-User-Id from auth.
          "X-User-Id": "dev-user",
        };
        if (token.trim()) {
          headers.Authorization = `Bearer ${token.trim()}`;
        }
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("text/event-stream")) {
          const data = await res.json();
          if (data.thread_id) setThreadId(String(data.thread_id));
          handleEnvelope({
            status: res.ok ? "completed" : "failed",
            message: JSON.stringify(data.state ?? data, null, 2),
          });
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          handleEnvelope({ status: "failed", message: "no_body" });
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                const env = JSON.parse(line.slice(6)) as StreamEnvelope;
                // Paint each SSE event before reading the next chunk — no debounce/typewriter.
                flushSync(() => {
                  handleEnvelope(env);
                });
              } catch {
                /* skip */
              }
            }
          }
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          handleEnvelope({ status: "failed", message: String(e) });
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        dispatch({ type: "turn_close" });
      }
    },
    [handleEnvelope, token],
  );

  const sendMessage = useCallback(async () => {
    const text = composer.trim();
    if (!text || isSendBlocked(state)) return;
    let tid = threadId.trim();
    if (!tid) {
      tid = uuid();
      setThreadId(tid);
    }
    setComposer("");
    const body = { message: text, thread_id: tid, ...extraPayload() };
    await runSse(
      `${baseUrl.replace(/\/$/, "")}/threads/${encodeURIComponent(tid)}/message`,
      body,
      text,
    );
  }, [composer, state, threadId, extraPayload, runSse, baseUrl]);

  const resume = useCallback(
    async (optionId: string, interrupt: InterruptPayload) => {
      const tid = threadId.trim();
      if (!tid) return;
      const body: Record<string, unknown> = {
        decision: optionId,
        ...extraPayload(),
      };
      if (interrupt.always_escalate) {
        body.approver_id = approverId;
        body.approver_role = approverRole;
      }
      await runSse(
        `${baseUrl.replace(/\/$/, "")}/threads/${encodeURIComponent(tid)}/resume`,
        body,
      );
    },
    [threadId, extraPayload, approverId, approverRole, runSse, baseUrl],
  );

  return (
    <>
      <aside className="config">
        <h1>Configuration</h1>
        <label>
          Base URL
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="base URL"
          />
        </label>
        <label>
          Bearer token
          <input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="AGENT_SERVICE_BEARER_TOKEN"
          />
        </label>
        <label>
          thread_id
          <input
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder="empty = new uuid"
          />
        </label>
        <label>
          extra payload JSON
          <textarea
            id="payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder='{"tenant_id":"1"}'
          />
        </label>
        <div className="actions">
          <button
            type="button"
            onClick={() => {
              setThreadId(uuid());
              setThreadTotals({ prompt: 0, cached: 0, completion: 0 });
            }}
          >
            New thread
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              localStorage.removeItem(LS);
              setToken("");
              setThreadId("");
              setPayload("");
              setThreadTotals({ prompt: 0, cached: 0, completion: 0 });
            }}
          >
            Clear storage
          </button>
        </div>
      </aside>
      <section className="chat">
        <div className="chat-head">
          <span className="title">Conversation</span>
          <span className="usage" id="threadUsage">
            {usageLine(
              threadTotals.prompt,
              threadTotals.cached,
              threadTotals.completion,
            )}
          </span>
        </div>
        <div id="log" ref={logRef}>
          {state.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg user">
                {m.text}
              </div>
            ) : m.role === "error" ? (
              <div key={m.id} className="msg error">
                {m.text}
              </div>
            ) : (
              <div key={m.id} className="msg assistant">
                <div
                  className="md-body"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(m.text),
                  }}
                />
                {m.usage ? (
                  <div className="msg-usage">
                    {usageLine(
                      m.usage.prompt_tokens,
                      m.usage.cached_tokens,
                      m.usage.completion_tokens,
                    )}
                  </div>
                ) : null}
                {m.paint !== undefined && m.paint !== null ? (
                  <div className="paint-slot" data-paint="1">
                    <pre>{JSON.stringify(m.paint, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            ),
          )}
          {showProgress && state.statusText ? (
            <div className="msg status" aria-live="polite">
              <span className="spinner" aria-busy="true" aria-hidden="true" />
              <span className="label">{state.statusText}</span>
            </div>
          ) : null}
          {state.interrupt ? (
            <div className="msg interrupt">
              <p>{state.interrupt.question}</p>
              {state.interrupt.always_escalate ? (
                <div className="approver">
                  <label>
                    approver_id
                    <input
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                    />
                  </label>
                  <label>
                    approver_role
                    <input
                      value={approverRole}
                      onChange={(e) => setApproverRole(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
              <div className="options">
                {state.interrupt.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => resume(opt.id, state.interrupt!)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="composer">
          <textarea
            id="message"
            rows={1}
            value={composer}
            placeholder="Message…"
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isSendBlocked(state)) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <div className="composer-actions">
            <button
              id="sendBtn"
              type="button"
              hidden={isSendBlocked(state)}
              disabled={isSendBlocked(state)}
              onClick={() => void sendMessage()}
            >
              Send
            </button>
            <button
              id="stopBtn"
              type="button"
              className="stop"
              hidden={!isSendBlocked(state)}
              onClick={() => abortRef.current?.abort()}
            >
              Stop
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
