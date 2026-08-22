import { describe, expect, it } from "vitest";
import {
  DEFAULT_FALLBACK_LOCALE,
  formatCurrency,
  formatDate,
  formatNumber,
  resolveConversationLocale,
} from "../../src/shared/locale.js";

describe("resolveConversationLocale", () => {
  it("observes Portuguese from conversation", () => {
    const res = resolveConversationLocale({
      texts: ["Olá, quanto está em reais o valor?"],
    });
    expect(res.locale).toBe("pt-BR");
    expect(res.currency).toBe("BRL");
    expect(res.source).toBe("conversation");
  });

  it("observes English from conversation", () => {
    const res = resolveConversationLocale({
      texts: ["Hello, how much in dollars please?"],
    });
    expect(res.locale).toBe("en-US");
    expect(res.currency).toBe("USD");
    expect(res.source).toBe("conversation");
  });

  it("conversation beats weak locale_hint", () => {
    const res = resolveConversationLocale({
      texts: ["Preciso de ajuda com a agenda amanhã"],
      localeHint: "en-US",
    });
    expect(res.locale).toBe("pt-BR");
    expect(res.source).toBe("conversation");
  });

  it("uses hint when conversation is ambiguous", () => {
    const res = resolveConversationLocale({
      texts: ["ok"],
      localeHint: "en",
    });
    expect(res.locale).toBe("en-US");
    expect(res.source).toBe("hint");
  });

  it("falls back when empty", () => {
    const res = resolveConversationLocale({ texts: [] });
    expect(res.locale).toBe(DEFAULT_FALLBACK_LOCALE);
    expect(res.source).toBe("fallback");
  });
});

describe("formatters", () => {
  it("formats currency for pt-BR", () => {
    const s = formatCurrency(1234.5, "pt-BR", "BRL");
    expect(s).toMatch(/1\.234/);
    expect(s).toMatch(/50/);
  });

  it("formats currency for en-US", () => {
    const s = formatCurrency(1234.5, "en-US", "USD");
    expect(s).toMatch(/1,234/);
  });

  it("formats number and date", () => {
    expect(formatNumber(1234.5, "pt-BR")).toMatch(/1\.234/);
    const d = formatDate(new Date(2026, 7, 5), "pt-BR");
    expect(d).toMatch(/05/);
    expect(d).toMatch(/08/);
    expect(d).toMatch(/2026/);
  });
});
