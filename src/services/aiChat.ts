import type { ChatTokenUsage } from '../state/types';

/** One turn in the AI conversation. Mirrors ChatTurn in ai_chat_service.dart. */
export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  text: string;
  usage?: ChatTokenUsage;
  charged?: number;
  remaining?: number;
}

export class QuotaExhaustedError extends Error {
  constructor() {
    super('quota_exhausted');
  }
}

// Same Cloudflare worker the mobile app talks to — same DeepSeek/Mistral/GPT/Gemini
// backends, same per-user token quota (keyed by Firebase uid).
const CHAT_ENDPOINT = 'https://studyflow-ai.nakachedoron37.workers.dev/chat';

function parseUsage(raw: Record<string, unknown> | undefined): ChatTokenUsage | undefined {
  if (!raw) return undefined;
  const details = raw['completion_tokens_details'] as Record<string, unknown> | undefined;
  const reasoning = details ? (details['reasoning_tokens'] as number | undefined) : undefined;
  const rawBreakdown = (raw['prompt_read_breakdown'] as Record<string, number>) ?? {};
  const total = (raw['total_tokens'] as number) ?? 0;
  const multiplier = (raw['cost_multiplier'] as number) ?? 1;
  return {
    promptTokens: (raw['prompt_tokens'] as number) ?? 0,
    completionTokens: (raw['completion_tokens'] as number) ?? 0,
    totalTokens: total,
    promptReadTokens: (raw['prompt_read_tokens'] as number) ?? 0,
    promptReadDescriptions: (raw['prompt_read_descriptions'] as string[]) ?? Object.keys(rawBreakdown),
    promptReadBreakdown: rawBreakdown,
    reasoningTokens: reasoning ?? null,
    costMultiplier: multiplier,
    historyTokensCharged: 0,
    chargedTokens: (raw['charged_tokens'] as number) ?? Math.min(total, Math.max(1, Math.ceil(total * multiplier))),
  };
}

/** Send the conversation to the worker and get back the assistant's reply
 * (natural language OR a JSON action object — the caller parses it) plus
 * token-usage stats. Mirrors AiChatService.complete in the Flutter app. */
export async function completeChat(
  messages: ChatTurn[],
  opts: { reasoningEffort?: string; provider?: string; idToken?: string | null; displayName?: string | null } = {},
): Promise<ChatCompletionResult> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.idToken ? { Authorization: `Bearer ${opts.idToken}` } : {}),
    },
    body: JSON.stringify({
      provider: opts.provider ?? 'deepseek',
      messages,
      reasoningEffort: opts.reasoningEffort,
      ...(opts.displayName ? { displayName: opts.displayName } : {}),
    }),
  });
  if (res.status === 402) throw new QuotaExhaustedError();
  if (!res.ok) throw new Error(`AI chat ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return {
    text: (body.text ?? '').trim(),
    usage: parseUsage(body.usage),
    charged: body.charged,
    remaining: body.remaining,
  };
}
