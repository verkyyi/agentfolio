import { buildSystemPrompt, extractTarget, type PromptInputs } from './prompt';
import type { AdaptedResume, SlugContext } from './context';
import { TOOL_DEFS, executeTool, makeBlockIdGenerator, type ToolContext } from './tools';

export interface CallInputs {
  apiKey: string;
  model: string;
  slug: string;
  name: string;
  ctx: SlugContext;
  messages: { role: 'user' | 'assistant'; content: string }[];
  greeting?: string;
  signal?: AbortSignal;
}

export interface LoopWriter {
  write(frame: string): void | Promise<void>;
  close(): void | Promise<void>;
}

export interface ToolLoopInputs {
  claude: typeof fetch;
  apiKey: string;
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  ctx: { slug: string; blockId?: () => string; adapted?: AdaptedResume | null };
  writer: LoopWriter;
  signal?: AbortSignal;
}

const MAX_ROUNDS = 8;

function sseText(delta: string): string {
  return `event: text\ndata: ${JSON.stringify({ delta })}\n\n`;
}
function sseBlock(block: unknown): string {
  return `event: block\ndata: ${JSON.stringify(block)}\n\n`;
}
function sseError(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
}
const SSE_DONE = 'event: done\ndata: {}\n\n';

export async function runToolLoop(inputs: ToolLoopInputs): Promise<void> {
  const { claude, apiKey, model, system, ctx, writer, signal } = inputs;
  const history = inputs.messages.slice();
  const localBlockId = makeBlockIdGenerator();
  const scopedCtx: ToolContext = {
    slug: ctx.slug,
    blockId: ctx.blockId ?? localBlockId,
    adapted: ctx.adapted ?? null,
  };

  try {
    let round = 0;
    for (; round < MAX_ROUNDS; round++) {
      const resp = await claude('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          tools: TOOL_DEFS,
          messages: history,
        }),
        signal,
      });
      if (!resp.ok) {
        let upstreamBody = '';
        try { upstreamBody = await resp.text(); } catch { /* ignore */ }
        console.log(JSON.stringify({
          level: 'error',
          where: 'claude_upstream',
          slug: scopedCtx.slug,
          status: resp.status,
          body: upstreamBody.slice(0, 500),
        }));
        await writer.write(sseError(`upstream_${resp.status}`));
        return;
      }
      const body = await resp.json() as {
        stop_reason: string;
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
        >;
      };

      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];
      for (const block of body.content) {
        if (block.type === 'text') {
          await writer.write(sseText(block.text));
        } else if (block.type === 'tool_use') {
          try {
            const { result, display_block } = await executeTool(block.name, block.input, scopedCtx);
            if (display_block) await writer.write(sseBlock(display_block));
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: String((e as Error).message) }),
            });
          }
        }
      }

      if (body.stop_reason !== 'tool_use' || toolResults.length === 0) {
        break;
      }
      history.push({ role: 'assistant', content: body.content });
      history.push({ role: 'user', content: toolResults });
    }
    if (round >= MAX_ROUNDS) {
      console.log(JSON.stringify({
        level: 'warn',
        where: 'tool_loop',
        slug: scopedCtx.slug,
        message: 'max_rounds_reached',
      }));
      await writer.write(sseError('max_rounds_reached'));
      return;
    }
    await writer.write(SSE_DONE);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    console.log(JSON.stringify({
      level: 'error',
      where: 'tool_loop',
      slug: scopedCtx.slug,
      message: msg,
    }));
    await writer.write(sseError('internal_error'));
  } finally {
    await writer.close();
  }
}

// Entry point called from worker.ts. Returns a streaming Response whose body is
// the framed SSE emitted by the tool loop.
export async function callAnthropic(inputs: CallInputs): Promise<Response> {
  const target = extractTarget(inputs.ctx.fitted, inputs.slug);
  const promptInputs: PromptInputs = {
    name: inputs.name,
    target,
    fitted: inputs.ctx.fitted,
    directives: inputs.ctx.directives,
    jd: inputs.ctx.jd,
    greeting: inputs.greeting,
  };
  const system = buildSystemPrompt(promptInputs);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = new TextEncoder();
  const w = writable.getWriter();
  const writer: LoopWriter = {
    write: async (f) => { await w.write(encoder.encode(f)); },
    close: async () => { await w.close(); },
  };

  runToolLoop({
    claude: fetch,
    apiKey: inputs.apiKey,
    model: inputs.model,
    system,
    messages: inputs.messages,
    ctx: { slug: inputs.slug, adapted: inputs.ctx.adapted },
    writer,
    signal: inputs.signal,
  }).catch((e) => {
    console.log(JSON.stringify({
      level: 'error',
      where: 'tool_loop_outer',
      slug: inputs.slug,
      message: String((e as Error).message ?? e),
    }));
  });

  return new Response(readable, { status: 200 });
}
