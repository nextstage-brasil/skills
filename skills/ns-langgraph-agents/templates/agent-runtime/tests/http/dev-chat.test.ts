import { afterEach, describe, expect, it } from "vitest";
import {
  isDevChatEnabled,
  renderDevChatHtml,
  serveDevChatApp,
} from "../../src/http/dev-chat.js";
import type { ServerResponse } from "node:http";

describe("dev-chat", () => {
  afterEach(() => {
    delete process.env.DEV_CHAT_ENABLED;
    delete process.env.AGENT_SERVICE_BEARER_TOKEN;
    delete process.env.DEV_CHAT_SHOW_PROGRESS;
    delete process.env.DEV_CHAT_INITIAL_MESSAGE;
  });

  it("is disabled by default", () => {
    expect(isDevChatEnabled()).toBe(false);
  });

  it("enables only with DEV_CHAT_ENABLED=true", () => {
    process.env.DEV_CHAT_ENABLED = "true";
    expect(isDevChatEnabled()).toBe(true);
  });

  it("renders styled shell with pico layout and DEV ONLY banner", () => {
    const html = renderDevChatHtml();
    expect(html).toContain("<html");
    expect(html).toContain("@picocss/pico");
    expect(html).toContain('class="layout"');
    expect(html).toContain("DEV ONLY");
    expect(html).toContain("IBM Plex");
    expect(html).toContain('id="dev-chat-root"');
    expect(html).toContain("/dev-chat/app.js");
    expect(html).toContain(".chat-head .usage");
  });

  it("does not embed bearer token in HTML", () => {
    process.env.AGENT_SERVICE_BEARER_TOKEN = "dev-secret";
    const html = renderDevChatHtml();
    expect(html).not.toContain("dev-secret");
    expect(html).not.toContain("data-bearer");
  });

  it("exposes cost rates as data attributes and banner", () => {
    process.env.DEV_CHAT_COST_PER_M_IN = "1";
    process.env.DEV_CHAT_COST_PER_M_OUT = "10";
    const html = renderDevChatHtml();
    expect(html).toContain('data-cost-in="1"');
    expect(html).toContain('data-cost-out="10"');
    expect(html).toContain("$1.00 / $10.00");
  });

  it("defaults initial message to Good morning", () => {
    expect(renderDevChatHtml()).toContain('data-initial-message="Good morning"');
  });

  it("allows blank initial message when env is empty string", () => {
    process.env.DEV_CHAT_INITIAL_MESSAGE = "";
    expect(renderDevChatHtml()).toContain('data-initial-message=""');
  });

  it("returns 404 for app.js when disabled", () => {
    delete process.env.DEV_CHAT_ENABLED;
    let status = 0;
    const res = {
      writeHead: (s: number) => {
        status = s;
      },
      end: () => undefined,
    } as unknown as ServerResponse;
    serveDevChatApp(res);
    expect(status).toBe(404);
  });
});
