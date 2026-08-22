/**
 * Conversation-observed locale — numbers/currency/dates follow the user's language
 * and context for this turn, not a fixed product locale.
 * @see ns-langgraph-agents/references/evidence-and-fidelity.md
 */

/** Weak app preference only — loses to clear conversation evidence. */
export const LOCALE_HINT_KEY = "locale_hint";

export const DEFAULT_FALLBACK_LOCALE = "pt-BR";

export type TurnLocaleResolution = {
  locale: string;
  currency?: string;
  source: "conversation" | "hint" | "fallback";
};

const PT_WORD_RE =
  /\b(olá|oi|obrigad[oa]|por\s+favor|quanto|valores?|reais?|real|mês|meses|amanhã|hoje|preciso|quero|ajuda|agend[ae]|e-?mail)\b/i;
const EN_WORD_RE =
  /\b(hello|hi|hey|thanks|please|how\s+much|values?|dollars?|usd|month|months|tomorrow|today|need|want|help|schedule|email)\b/i;
const PT_CURRENCY_RE = /\b(r\$|brl|reais?|real)\b/i;
const EN_CURRENCY_RE = /\b(\$|usd|dollars?)\b/i;
const PT_CHAR_RE = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;

function scorePortuguese(text: string): number {
  let score = 0;
  if (PT_CHAR_RE.test(text)) {
    score += 3;
  }
  const words = text.match(PT_WORD_RE);
  if (words) {
    score += 2 * words.length;
  }
  if (PT_CURRENCY_RE.test(text)) {
    score += 2;
  }
  return score;
}

function scoreEnglish(text: string): number {
  let score = 0;
  const words = text.match(EN_WORD_RE);
  if (words) {
    score += 2 * words.length;
  }
  if (EN_CURRENCY_RE.test(text)) {
    score += 2;
  }
  // ASCII-heavy short chitchat without PT signals leans EN only when EN words hit.
  return score;
}

function currencyFromText(text: string, locale: string): string | undefined {
  if (PT_CURRENCY_RE.test(text)) {
    return "BRL";
  }
  if (EN_CURRENCY_RE.test(text)) {
    return "USD";
  }
  if (locale.startsWith("pt")) {
    return "BRL";
  }
  if (locale.startsWith("en")) {
    return "USD";
  }
  return undefined;
}

function normalizeHint(hint: string | undefined): string | undefined {
  if (!hint || hint.trim().length === 0) {
    return undefined;
  }
  const t = hint.trim();
  if (t === "pt" || t.toLowerCase() === "pt-br") {
    return "pt-BR";
  }
  if (t === "en" || t.toLowerCase() === "en-us") {
    return "en-US";
  }
  return t;
}

/**
 * Resolve locale for this turn from recent human text (+ optional weak hint).
 * Does not persist; caller stores ephemeral turnLocale and clears in guard.
 */
export function resolveConversationLocale(params: {
  texts: string[];
  localeHint?: string | null;
  fallbackLocale?: string;
}): TurnLocaleResolution {
  const fallback = params.fallbackLocale?.trim() || DEFAULT_FALLBACK_LOCALE;
  const joined = params.texts.filter((t) => t.trim().length > 0).join("\n");
  const hint = normalizeHint(
    typeof params.localeHint === "string" ? params.localeHint : undefined,
  );

  if (joined.length === 0) {
    if (hint) {
      return {
        locale: hint,
        currency: currencyFromText("", hint),
        source: "hint",
      };
    }
    return {
      locale: fallback,
      currency: currencyFromText("", fallback),
      source: "fallback",
    };
  }

  const pt = scorePortuguese(joined);
  const en = scoreEnglish(joined);

  if (pt > en && pt > 0) {
    const locale = "pt-BR";
    return {
      locale,
      currency: currencyFromText(joined, locale),
      source: "conversation",
    };
  }
  if (en > pt && en > 0) {
    const locale = "en-US";
    return {
      locale,
      currency: currencyFromText(joined, locale),
      source: "conversation",
    };
  }

  // Ambiguous: weak hint, then fallback.
  if (hint) {
    return {
      locale: hint,
      currency: currencyFromText(joined, hint),
      source: "hint",
    };
  }
  return {
    locale: fallback,
    currency: currencyFromText(joined, fallback),
    source: "fallback",
  };
}

export function readLocaleHint(
  configurable: Record<string, unknown> | undefined,
): string | undefined {
  if (!configurable) {
    return undefined;
  }
  const raw = configurable[LOCALE_HINT_KEY];
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined;
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number,
  locale: string,
  currency?: string,
): string {
  let code = currency;
  if (!code) {
    if (locale.startsWith("pt")) {
      code = "BRL";
    } else if (locale.startsWith("en")) {
      code = "USD";
    } else {
      code = "BRL";
    }
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(value);
}

/** Numeric date order: pt* → DD/MM/YYYY; en* → MM/DD/YYYY. */
export function formatDate(
  date: Date,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
