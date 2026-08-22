import { describe, expect, it } from "vitest";
import {
  COMPOSER_PRODUCT_PROMPT_KEY,
  GATHER_PRODUCT_PROMPT_KEY,
  MOTOR_INVARIANTS,
  PRODUCT_SYSTEM_PROMPT_KEY,
  composeSystemPrompt,
  readProductSystemPrompt,
} from "../../src/capability/system-prompt.js";

describe("composeSystemPrompt", () => {
  it("returns motor invariant alone when no product prompt", () => {
    expect(composeSystemPrompt({ role: "analyst" })).toBe(MOTOR_INVARIANTS.analyst);
    expect(composeSystemPrompt({ role: "composer", configurable: {} })).toBe(
      MOTOR_INVARIANTS.composer,
    );
  });

  it("concatenates base_invariant + injected product prompt", () => {
    const out = composeSystemPrompt({
      role: "composer",
      productPrompt: "You are Acme support. Reply in pt-BR.",
    });
    expect(out.startsWith(MOTOR_INVARIANTS.composer)).toBe(true);
    expect(out.endsWith("You are Acme support. Reply in pt-BR.")).toBe(true);
    expect(out).toContain("\n\n");
  });

  it("reads product_system_prompt from configurable", () => {
    const out = composeSystemPrompt({
      role: "analyst",
      configurable: { [PRODUCT_SYSTEM_PROMPT_KEY]: "Persona A" },
    });
    expect(out).toBe(`${MOTOR_INVARIANTS.analyst}\n\nPersona A`);
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
    ).toBe(`${MOTOR_INVARIANTS.analyst}\n\nAnalyst-only`);
  });

  it("explicit productPrompt wins over configurable", () => {
    const out = composeSystemPrompt({
      role: "analyst",
      productPrompt: "Explicit",
      configurable: { [PRODUCT_SYSTEM_PROMPT_KEY]: "From config" },
    });
    expect(out).toBe(`${MOTOR_INVARIANTS.analyst}\n\nExplicit`);
  });

  it("trims whitespace-only injection to invariant-only", () => {
    expect(composeSystemPrompt({ role: "analyst", productPrompt: "   " })).toBe(
      MOTOR_INVARIANTS.analyst,
    );
  });
});
