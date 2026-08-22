import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  argFingerprint,
  checkRateLimit,
} from "../capability/governance.js";
import { skillToolName } from "../capability/tool-names.js";
import { capabilityIdSkill } from "../capability/types.js";
import {
  resolveContextConfig,
  truncateSkillBody,
} from "../memory/context-window.js";
import { logToolExecution } from "../observability/postgres.js";
import type { SkillDefinition } from "./loader.js";

export interface SkillToolBindOptions {
  tenantId: string;
  llmLogId?: string;
  rateLimit?: { limit: number; windowMs: number };
  audit?: boolean;
}

/**
 * One synthetic tool per skill. Invoke injects markdown body — no external I/O.
 */
export function skillToLangChainTool(
  skill: SkillDefinition,
  opts: SkillToolBindOptions,
): DynamicStructuredTool {
  const toolName = skillToolName(skill.id);
  const rate = opts.rateLimit ?? { limit: 30, windowMs: 60_000 };

  return new DynamicStructuredTool({
    name: toolName,
    description: skill.when_to_use,
    schema: z.object({
      reason: z
        .string()
        .optional()
        .describe("Why this skill applies to the current turn"),
    }),
    func: async (input) => {
      const args = input as { reason?: string };
      const started = Date.now();
      const capId = capabilityIdSkill(skill.id);

      if (
        !checkRateLimit({
          tenantId: opts.tenantId,
          capabilityId: capId,
          limit: rate.limit,
          windowMs: rate.windowMs,
        })
      ) {
        throw new Error(`skill_rate_limited:${capId}`);
      }

      const output = truncateSkillBody(
        skill.body,
        resolveContextConfig().skillBodyMaxChars,
      );
      if (opts.audit !== false && opts.llmLogId) {
        await logToolExecution({
          llmLogId: opts.llmLogId,
          toolName,
          args,
          output,
          latencyMs: Date.now() - started,
          isSuccess: true,
          toolKind: "skill",
          classification: skill.classification,
          argFingerprint: argFingerprint(args),
        });
      }
      return output;
    },
  });
}

export function bindSkillTools(
  skills: ReadonlyArray<SkillDefinition>,
  opts: SkillToolBindOptions,
  allowIds?: ReadonlySet<string> | ReadonlyArray<string>,
): DynamicStructuredTool[] {
  const allow =
    allowIds === undefined
      ? null
      : allowIds instanceof Set
        ? allowIds
        : new Set(allowIds);
  return skills
    .filter((s) => (allow ? allow.has(s.id) : true))
    .map((s) => skillToLangChainTool(s, opts));
}
