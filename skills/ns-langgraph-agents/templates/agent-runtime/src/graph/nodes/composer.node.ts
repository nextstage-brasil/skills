import type { RunnableConfig } from "@langchain/core/runnables";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";
import type { AgentStateType } from "../../state.js";
import { AGENT_ERROR } from "../../shared/error-codes.js";
import { isPtLocale, formatCurrency } from "../../shared/locale.js";
import { buildComposerUserPayload } from "../composer/payload.js";
import { composeSystemPrompt } from "../../conversation/system-prompt.js";
import { loadRolePromptMeta } from "../../conversation/load-role-prompt.js";
import { resolveLlmConfigForRole } from "../../llm/config.js";
import { streamJsonSchema } from "../../llm/json-output.js";

const ComposerLlmSchema = z.object({
  markdown: z.string(),
});

function emitResponseStreaming(
  config: RunnableConfig | undefined,
  message: string,
): void {
  const writer = (config as LangGraphRunnableConfig | undefined)?.writer;
  writer?.({ status: "response_streaming", message });
}

/**
 * Sole writer of user-facing Markdown. Narrates state channels — never invents evidence.
 * LLM when composer stage configured: MUST `streamJsonSchema` (model.stream) + tick
 * each partial markdown via custom writer. Stub (no LLM) may emit one tick.
 */
export async function composerNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const configurable = config?.configurable as Record<string, unknown> | undefined;
  const userPayload = buildComposerUserPayload(state);
  const system = composeSystemPrompt({ role: "composer", configurable });
  const promptMeta = loadRolePromptMeta("composer");

  if (state.errorCode === AGENT_ERROR.LLM_FAILURE) {
    const md = llmFailureCopy(state.turnLocale);
    emitResponseStreaming(config, md);
    return {
      responseMarkdown: md,
      turnDecisions: [
        {
          route: "composer",
          outcome: "llm_failure_notice",
          notes: { prompt_version: promptMeta.promptVersion },
        },
      ],
    };
  }

  const llm = resolveLlmConfigForRole("composer");
  if (llm) {
    try {
      const parsed = await streamJsonSchema(llm, ComposerLlmSchema, {
        system,
        user: userPayload,
        jsonShapeHint: '{"markdown":"markdown only"}',
        promptVersion: promptMeta.promptVersion,
        markdownField: "markdown",
        onPartialMarkdown: (md) => {
          emitResponseStreaming(config, md);
        },
      });
      const md = parsed.markdown.trim() || composeFromState(state);
      if (md !== parsed.markdown.trim()) {
        emitResponseStreaming(config, md);
      }
      return {
        responseMarkdown: md,
        turnDecisions: [
          {
            route: "composer",
            outcome: "written_llm",
            notes: {
              payloadChars: userPayload.length,
              prompt_version: promptMeta.promptVersion,
            },
          },
        ],
      };
    } catch (err) {
      const md = composeFromState(state);
      emitResponseStreaming(config, md);
      return {
        responseMarkdown: md,
        errorCode: AGENT_ERROR.LLM_FAILURE,
        turnDecisions: [
          {
            route: "composer",
            outcome: "llm_fallback_stub",
            notes: {
              error: err instanceof Error ? err.message : String(err),
              prompt_version: promptMeta.promptVersion,
            },
          },
        ],
      };
    }
  }

  const md = composeFromState(state);
  emitResponseStreaming(config, md);
  return {
    responseMarkdown: md,
    turnDecisions: [
      {
        route: "composer",
        outcome: "written",
        notes: {
          payloadChars: userPayload.length,
          stub: true,
          prompt_version: promptMeta.promptVersion,
        },
      },
    ],
  };
}

function llmFailureCopy(locale: string | null): string {
  return isPtLocale(locale)
    ? "Não consegui concluir o planejamento desta resposta. Tente de novo em instantes."
    : "I could not finish planning this answer. Please try again shortly.";
}

function composeFromState(state: AgentStateType): string {
  const locale = state.turnLocale;
  const isPt = isPtLocale(locale);

  if (state.externalError) {
    if (isPt) {
      return `Encontrei um erro externo (${state.externalError.code}): ${state.externalError.message}`;
    }
    return `I hit an external error (${state.externalError.code}): ${state.externalError.message}`;
  }
  if (state.dataBundle) {
    const kind = state.dataBundle.kind;
    const payload = state.dataBundle.payload;
    const valueLine = formatEvidenceValue(
      payload,
      locale ?? "pt-BR",
      state.turnCurrency,
    );
    if (isPt) {
      return valueLine
        ? `Encontrei isto (${kind}): ${valueLine}.`
        : `Encontrei isto (${kind}).`;
    }
    return valueLine
      ? `Here is what I found (${kind}): ${valueLine}.`
      : `Here is what I found (${kind}).`;
  }
  if (state.discoveryBrief?.absenceConfirmed) {
    return isPt
      ? "Não encontrei itens correspondentes no catálogo."
      : "I could not find matching items in the catalog.";
  }
  if (state.discoveryBrief?.summary) {
    return state.discoveryBrief.summary;
  }
  return isPt
    ? "Ainda não tenho evidência suficiente para responder."
    : "I do not have enough evidence yet to answer.";
}

function formatEvidenceValue(
  payload: unknown,
  locale: string,
  currency: string | null,
): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return formatCurrency(payload, locale, currency ?? undefined);
  }
  if (typeof payload === "object" && payload !== null && "value" in payload) {
    const v = (payload as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) {
      return formatCurrency(v, locale, currency ?? undefined);
    }
  }
  return null;
}
