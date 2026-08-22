import { afterEach, describe, expect, it } from "vitest";
import { isDevChatEnabled, renderDevChatHtml } from "../../src/http/dev-chat.js";

describe("dev-chat", () => {
  afterEach(() => {
    delete process.env.DEV_CHAT_ENABLED;
    delete process.env.AGENT_SERVICE_BEARER_TOKEN;
    delete process.env.DEV_CHAT_SHOW_PROGRESS;
  });

  it("is disabled by default", () => {
    expect(isDevChatEnabled()).toBe(false);
  });

  it("enables only with DEV_CHAT_ENABLED=true", () => {
    process.env.DEV_CHAT_ENABLED = "true";
    expect(isDevChatEnabled()).toBe(true);
  });

  it("renders a self-contained HTML page calling /threads", () => {
    const html = renderDevChatHtml();
    expect(html).toContain("<html");
    expect(html).toContain("/threads");
    expect(html).toContain("text/event-stream");
    expect(html).toContain('class="layout"');
    expect(html).toContain("clearStorageBtn");
    expect(html).toContain("@picocss/pico");
    expect(html).toContain("threadUsage");
    expect(html).toContain("marked@");
    expect(html).toContain("Planejando");
    expect(html).toContain("Analisando");
    expect(html).toContain("Coletando dados");
    expect(html).toContain("md-body");
    expect(html).toContain("clearDraftAssistant");
    expect(html).toContain("var SHOW_PROGRESS = true;");
  });

  it("demotes non-empty reasoning drafts to a lightweight note instead of erasing them", () => {
    const html = renderDevChatHtml();
    // Ghost-bubble guard only discards empty streaming drafts; text becomes a muted note.
    expect(html).toContain("has-content");
    expect(html).toContain("function mountAssistantIfNeeded()");
    expect(html).toContain(".msg.assistant.streaming:not(.has-content)");
  });

  it("clears reasoning notes once the turn reaches a terminal status", () => {
    const html = renderDevChatHtml();
    expect(html).toContain("function clearReasoningNotes()");
    expect(html).toContain("clearReasoningNotes();");
  });

  it("renders a spinner icon next to the progress status label", () => {
    const html = renderDevChatHtml();
    expect(html).toContain(".msg.status .spinner");
    expect(html).toContain("@keyframes status-spin");
    expect(html).toContain("spinner.setAttribute('aria-busy', 'true');");
  });

  it("prefills Bearer from AGENT_SERVICE_BEARER_TOKEN", () => {
    process.env.AGENT_SERVICE_BEARER_TOKEN = 'dev-secret"&<>';
    const html = renderDevChatHtml();
    expect(html).toContain(
      'id="token" type="text" value="dev-secret&quot;&amp;&lt;&gt;"',
    );
  });

  it("renders a stop control that swaps with send while a turn is in flight", () => {
    const html = renderDevChatHtml();
    expect(html).toContain('id="stopBtn"');
    expect(html).toContain("function setComposerBusy(busy)");
    expect(html).toContain("function abortActiveTurn()");
    expect(html).toContain("signal: turnAbort.signal");
    expect(html).toContain("stopBtn.addEventListener('click', abortActiveTurn)");
  });

  it("injects SHOW_PROGRESS from DEV_CHAT_SHOW_PROGRESS", () => {
    delete process.env.DEV_CHAT_SHOW_PROGRESS;
    expect(renderDevChatHtml()).toContain("var SHOW_PROGRESS = true;");
    process.env.DEV_CHAT_SHOW_PROGRESS = "false";
    expect(renderDevChatHtml()).toContain("var SHOW_PROGRESS = false;");
  });
});
