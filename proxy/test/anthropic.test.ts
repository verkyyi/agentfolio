import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runToolLoop } from '../src/anthropic';
import { _resetBlockCounter } from '../src/tools';

function mockClaude(responses: unknown[]) {
  let i = 0;
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    async json() { return responses[i++]; },
  } as unknown as Response));
}

function collector() {
  const frames: string[] = [];
  const writer = {
    frames,
    write(f: string) { frames.push(f); },
    close() {},
  };
  return writer;
}

beforeEach(() => _resetBlockCounter());

describe('runToolLoop', () => {
  it('streams text frames for a plain response', async () => {
    const claude = mockClaude([
      {
        id: 'msg_1',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello.' }],
      },
    ]);
    const writer = collector();
    await runToolLoop({
      claude: claude as typeof fetch, model: 'test-model', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'hi' }],
      ctx: { slug: 'default' }, writer,
    });
    const joined = writer.frames.join('');
    expect(joined).toContain('event: text\ndata: {"delta":"Hello."}');
    expect(writer.frames[writer.frames.length - 1]).toBe('event: done\ndata: {}\n\n');
  });

  it('emits a block frame for open_panel tool_use', async () => {
    const claude = mockClaude([
      {
        id: 'msg_1',
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Here → ' },
          { type: 'tool_use', id: 'tu_1', name: 'open_panel', input: { panel: 'resume' } },
        ],
      },
      {
        id: 'msg_2',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'See the panel.' }],
      },
    ]);
    const writer = collector();
    await runToolLoop({
      claude: claude as typeof fetch, model: 'test-model', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'show resume' }],
      ctx: { slug: 'default' }, writer,
    });
    const joined = writer.frames.join('');
    expect(joined).toContain('event: text\ndata: {"delta":"Here → "}');
    expect(joined).toContain('event: block');
    expect(joined).toContain('"type":"open-panel"');
    expect(joined).toContain('"panel":"resume"');
    expect(joined).toContain('event: text\ndata: {"delta":"See the panel."}');
    expect(writer.frames[writer.frames.length - 1]).toBe('event: done\ndata: {}\n\n');
  });

  it('emits error frame on upstream failure', async () => {
    const claude = vi.fn(async () => ({
      ok: false, status: 500,
      async json() { return {}; },
    } as unknown as Response));
    const writer = collector();
    await runToolLoop({
      claude: claude as typeof fetch, model: 'test-model', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'hi' }],
      ctx: { slug: 'default' }, writer,
    });
    const joined = writer.frames.join('');
    expect(joined).toContain('event: error');
    expect(joined).toContain('upstream_500');
  });

  it('sends tool results back when claude invokes a tool', async () => {
    const claude = mockClaude([
      {
        id: 'msg_1',
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'open_panel', input: { panel: 'activity' } },
        ],
      },
      {
        id: 'msg_2',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'ok' }],
      },
    ]);
    const writer = collector();
    await runToolLoop({
      claude: claude as typeof fetch, model: 'test-model', apiKey: 'k',
      system: 'sys', messages: [{ role: 'user', content: 'activity' }],
      ctx: { slug: 'default' }, writer,
    });
    // Claude was called twice — second time with the tool_result in history.
    expect((claude as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
    const secondCallBody = JSON.parse((claude as ReturnType<typeof vi.fn>).mock.calls[1]![1]!.body as string);
    const lastMessage = secondCallBody.messages[secondCallBody.messages.length - 1];
    expect(lastMessage.role).toBe('user');
    expect(Array.isArray(lastMessage.content)).toBe(true);
    expect(lastMessage.content[0].type).toBe('tool_result');
    expect(lastMessage.content[0].tool_use_id).toBe('tu_1');
  });
});
