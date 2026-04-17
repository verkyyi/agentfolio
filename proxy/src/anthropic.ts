import { buildSystemPrompt, extractTarget, type PromptInputs } from './prompt';
import type { SlugContext } from './context';

export interface CallInputs {
  apiKey: string;
  model: string;
  slug: string;
  name: string;
  ctx: SlugContext;
  messages: { role: 'user' | 'assistant'; content: string }[];
  signal?: AbortSignal;
}

export async function callAnthropic(inputs: CallInputs): Promise<Response> {
  const target = extractTarget(inputs.ctx.fitted, inputs.slug);
  const promptInputs: PromptInputs = {
    name: inputs.name,
    target,
    fitted: inputs.ctx.fitted,
    directives: inputs.ctx.directives,
    jd: inputs.ctx.jd,
  };
  const systemText = buildSystemPrompt(promptInputs);

  const body = {
    model: inputs.model,
    max_tokens: 1024,
    stream: true,
    system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
    messages: inputs.messages,
  };

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': inputs.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: inputs.signal,
  });
}
