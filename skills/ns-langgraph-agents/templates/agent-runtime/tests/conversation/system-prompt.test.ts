import { describe, expect, it } from "vitest";
import {
  COMPOSER_PRODUCT_PROMPT_KEY,
  GATHER_PRODUCT_PROMPT_KEY,
  PRODUCT_SYSTEM_PROMPT_KEY,
  composeSystemPrompt,
  motorInvariant,
  readProductSystemPrompt,
} from "../../src/conversation/system-prompt.js";

describe("composeSystemPrompt", () => {
  it("returns motor invariant alone when no product prompt", () => {
    expect(composeSystemPrompt({ role: "analyst" })).toBe(motorInvariant("analyst"));
    expect(composeSystemPrompt({ role: "composer", configurable: {} })).toBe(
      motorInvariant("composer"),
    );
  });

  it("concatenates base_invariant + injected product prompt", () => {
    const out = composeSystemPrompt({
      role: "composer",
      productPrompt: "You are Acme support. Reply in pt-BR.",
    });
    expect(out.startsWith(motorInvariant("composer"))).toBe(true);
    expect(out.endsWith("You are Acme support. Reply in pt-BR.")).toBe(true);
    expect(out).toContain("\n\n");
  });

  it("reads product_system_prompt from configurable", () => {
    const out = composeSystemPrompt({
      role: "analyst",
      configurable: { [PRODUCT_SYSTEM_PROMPT_KEY]: "Persona A" },
    });
    expect(out).toBe(`${motorInvariant("analyst")}\n\nPersona A`);
  });

  it("prefers role-specific override over shared product prompt", () => {
    const configurable = {
      [PRODUCT_SYSTEM_PROMPT_KEY]: "Shared",
      [GATHER_PRODUCT_PROMPT_KEY]: "Analyst-only",
      [COMPOSER_PRODUCT_PROMPT_KEY]: "Composer-only",
    };
    expect(readProductSystemPrompt(configurable, "analyst")).toBe("Analyst-only");
    expect(readProductSystemPrompt(configurable, "composer")).toBe("Composer-only");
    expect(
      composeSystemPrompt({ role: "analyst", configurable }),
    ).toBe(`${motorInvariant("analyst")}\n\nAnalyst-only`);
  });

  it("explicit productPrompt wins over configurable", () => {
    const out = composeSystemPrompt({
      role: "analyst",
      productPrompt: "Explicit",
      configurable: { [PRODUCT_SYSTEM_PROMPT_KEY]: "From config" },
    });
    expect(out).toBe(`${motorInvariant("analyst")}\n\nExplicit`);
  });

  it("trims whitespace-only injection to invariant-only", () => {
    expect(composeSystemPrompt({ role: "analyst", productPrompt: "   " })).toBe(
      motorInvariant("analyst"),
    );
  });
});
