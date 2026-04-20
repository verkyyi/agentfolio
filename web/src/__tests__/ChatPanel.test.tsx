import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel, mergeDelta, appendBlock, parseSse, type Segment, type SseEvent } from '../components/ChatPanel';
import type { BlockFrame } from '../blocks/types';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

function sseResponse(chunks: string[]) {
  const stream = new ReadableStream({
    start(c) {
      for (const s of chunks) c.enqueue(new TextEncoder().encode(s));
      c.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('ChatPanel — offline state', () => {
  it('renders an offline card when VITE_CHAT_PROXY_URL is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" ownerName="Lianghui Yi" email="a@b.co" profiles={[{ network: 'LinkedIn', url: 'https://l.co' }]} />);
    expect(screen.getByText(/chat is offline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /a@b\.co/ })).toHaveAttribute('href', 'mailto:a@b.co');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://l.co');
  });

  it('does not render the "· chat" left label in offline state', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" ownerName="Lianghui Yi" />);
    // No leading "· chat" span anywhere
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
  });
});

describe('ChatPanel — inline default state', () => {
  it('always shows greeting + suggestion chips without needing a click', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    expect(screen.getByTestId('chat-greeting')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chat-suggestion');
    expect(chips).toHaveLength(3);
  });

  it('greeting names the owner and does not mention target/context', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(/knows Lianghui Yi/);
    expect(greeting).toHaveTextContent(/ask me anything/i);
    expect(greeting).not.toHaveTextContent(/context/i);
  });

  it('greeting includes the tagline sentence when provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="anthropic-fde-nyc"
        ownerName="Lianghui Yi"
        tagline="Senior engineer with a decade of experience."
      />,
    );
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Lianghui Yi\. Senior engineer with a decade of experience\. Ask me anything\./,
    );
  });

  it('greeting falls back gracefully when tagline is absent', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Lianghui Yi\. Ask me anything\./,
    );
    expect(greeting.textContent).not.toMatch(/\.\s{2,}Ask/);
  });

  it('header does not render a "· chat" or "context:" left label', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
    expect(screen.queryByText(/context:/i)).not.toBeInTheDocument();
  });

  it('renders the greeting prop when provided, replacing the hardcoded line', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="anthropic-fde-nyc"
        ownerName="Lianghui Yi"
        greeting="Hey — I'm an agent that knows Verky. Ask me about the Flink pipeline."
      />,
    );
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey — I'm an agent that knows Verky\. Ask me about the Flink pipeline\./,
    );
    expect(greeting).not.toHaveTextContent(/Ask me anything/);
  });

  it('renders three tailored suggestion chips when suggestions prop is provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="anthropic-fde-nyc"
        ownerName="Lianghui Yi"
        suggestions={['Why Anthropic?', 'Walk me through the Flink pipeline', "What's not on the résumé?"]}
      />,
    );
    const chips = screen.getAllByTestId('chat-suggestion').map((el) => el.textContent);
    expect(chips).toEqual([
      'Why Anthropic?',
      'Walk me through the Flink pipeline',
      "What's not on the résumé?",
    ]);
  });

  it('falls back to DEFAULT_SUGGESTIONS when suggestions prop has 0 or 7+ items', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="anthropic-fde-nyc"
        ownerName="Lianghui Yi"
        suggestions={['A', 'B', 'C', 'D', 'E', 'F', 'G']}
      />,
    );
    const chips = screen.getAllByTestId('chat-suggestion').map((el) => el.textContent);
    expect(chips).toEqual([
      'Walk me through the résumé',
      'Why is this a fit?',
      "What's not on the résumé?",
    ]);
  });

  it('renders 4 suggestions when 4 are provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="default"
        ownerName="Verky"
        suggestions={['A', 'B', 'C', 'D']}
      />
    );
    const buttons = screen.getAllByTestId('chat-suggestion');
    expect(buttons).toHaveLength(4);
    expect(buttons.map((b) => b.textContent)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('renders 2 suggestions when 2 are provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="default"
        ownerName="Verky"
        suggestions={['A', 'B']}
      />
    );
    expect(screen.getAllByTestId('chat-suggestion')).toHaveLength(2);
  });

  it('falls back to the hardcoded greeting when greeting prop is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" greeting="" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Lianghui Yi\. Ask me anything\./,
    );
  });

  it('clicking a chip prefills the input but does not auto-submit', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    const chip = screen.getAllByTestId('chat-suggestion')[0];
    await user.click(chip);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(chip.textContent);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reset link appears only when messages exist', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.anthropic-fde-nyc',
      JSON.stringify([{ role: 'assistant', segments: [{ kind: 'text', text: 'hi again' }] }]),
    );
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
  });

  it('reset link is hidden when there are no messages', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
  });
});

describe('ChatPanel — streaming send', () => {
  it('sends a POST and renders streamed assistant deltas', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: text\ndata: {"delta":"Hi"}\n\n',
      'event: text\ndata: {"delta":" there"}\n\n',
      'event: done\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'tell me about anthropic-fde-nyc');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    await screen.findByText('Hi there');
  });

  it('includes the rendered greeting in the POST body', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([
      'event: done\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <ChatPanel
        slug="anthropic-fde-nyc"
        ownerName="Lianghui Yi"
        greeting="Hey — ask about the Flink pipeline."
      />,
    );
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.greeting).toBe('Hey — ask about the Flink pipeline.');
    expect(body.slug).toBe('anthropic-fde-nyc');
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it('sends the fallback greeting when no greeting prop is provided', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([
      'event: done\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.greeting).toContain('Lianghui Yi');
    expect(body.greeting).toContain('Ask me anything');
  });

  it('renders interleaved text → block → text in wire order', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const sse =
      'event: text\ndata: {"delta":"before "}\n\n' +
      'event: block\ndata: {"id":"b1","type":"open-panel","data":{"panel":"resume"}}\n\n' +
      'event: text\ndata: {"delta":"after"}\n\n' +
      'event: done\ndata: {}\n\n';
    const fetchMock = vi.fn(async () => sseResponse([sse]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Wait for streaming to finish and all segments to be rendered.
    await waitFor(() => {
      expect(screen.getByText(/before/)).toBeInTheDocument();
      expect(screen.getByText(/\[block:open-panel\]/)).toBeInTheDocument();
      expect(screen.getByText(/after/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify ordering in the assistant message body.
    const bubbles = document.querySelectorAll('.chatp-msg.assistant:not(.chatp-greeting) .chatp-msg-body');
    expect(bubbles.length).toBeGreaterThan(0);
    const last = bubbles[bubbles.length - 1] as HTMLElement;
    const text = last.textContent || '';
    expect(text.indexOf('before')).toBeLessThan(text.indexOf('[block:open-panel]'));
    expect(text.indexOf('[block:open-panel]')).toBeLessThan(text.indexOf('after'));
  });
});

describe('ChatPanel — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.anthropic-fde-nyc',
      JSON.stringify([{ role: 'assistant', segments: [{ kind: 'text', text: 'Welcome back' }] }]),
    );
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.anthropic-fde-nyc',
      JSON.stringify([{ role: 'assistant', segments: [{ kind: 'text', text: 'old' }] }]),
    );
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.click(screen.getByRole('button', { name: /clear conversation/i }));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('agentfolio.chat.anthropic-fde-nyc')).toBeNull();
  });
});

describe('ChatPanel — error handling', () => {
  it('removes the trailing empty assistant bubble on fetch error', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/something went wrong/i);
    expect(screen.getByText('hi')).toBeInTheDocument();
    const assistantBubbles = document.querySelectorAll('.chatp-msg.assistant');
    // Only the greeting — no empty placeholder
    expect(assistantBubbles.length).toBe(1);
  });
});

describe('ChatPanel — UX optimizations', () => {
  it('preserves newlines in rendered messages via a pre-wrap body span', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.anthropic-fde-nyc',
      JSON.stringify([{ role: 'assistant', segments: [{ kind: 'text', text: 'line one\nline two\nline three' }] }]),
    );
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    const body = document.querySelector('.chatp-msg.assistant:not(.chatp-greeting) .chatp-msg-body');
    expect(body).not.toBeNull();
    expect(body!.textContent).toBe('line one\nline two\nline three');
  });

  it('caps response length and appends a truncation indicator', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    // Stream > 2000 chars across two deltas so truncation fires mid-stream.
    const huge = 'x'.repeat(1500);
    const fetchMock = vi.fn(async () => sseResponse([
      `event: text\ndata: ${JSON.stringify({ delta: huge })}\n\n`,
      `event: text\ndata: ${JSON.stringify({ delta: huge })}\n\n`,
      'event: done\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'go');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Drip animation finishes and the truncation suffix appears.
    await screen.findByText(/response truncated/i, {}, { timeout: 4000 });
    const body = document.querySelector(
      '.chatp-msg.assistant:not(.chatp-greeting) .chatp-msg-body',
    ) as HTMLElement | null;
    expect(body).not.toBeNull();
    // 2000 x's + suffix. Never more than 2000 x's.
    expect(body!.textContent!.length).toBeLessThanOrEqual(2000 + ' … (response truncated)'.length);
    expect(body!.textContent).toMatch(/^x{2000}/);
  });

  it('shows a streaming class on the active assistant bubble and drops it when done', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: text\ndata: {"delta":"hey"}\n\n',
      'event: done\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="anthropic-fde-nyc" ownerName="Lianghui Yi" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Text fully revealed by the drip; streaming class dropped on the final tick.
    await screen.findByText('hey');
    await waitFor(() => {
      const last = document.querySelector(
        '.chatp-msg.assistant:not(.chatp-greeting)',
      );
      expect(last).not.toBeNull();
      expect(last!.classList.contains('streaming')).toBe(false);
    });
  });
});

describe('segment helpers', () => {
  it('mergeDelta appends to trailing text segment', () => {
    const segs: Segment[] = [{ kind: 'text', text: 'hello' }];
    const result = mergeDelta(segs, ' world');
    expect(result).toEqual([{ kind: 'text', text: 'hello world' }]);
  });

  it('mergeDelta starts new text segment after a block', () => {
    const block: BlockFrame = {
      id: 'b1', type: 'open-panel', data: { panel: 'resume' },
    };
    const segs: Segment[] = [
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
    ];
    const result = mergeDelta(segs, 'here');
    expect(result).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
      { kind: 'text', text: 'here' },
    ]);
  });

  it('appendBlock appends a block segment', () => {
    const block: BlockFrame = {
      id: 'b1', type: 'open-panel', data: { panel: 'resume' },
    };
    const segs: Segment[] = [{ kind: 'text', text: 'See ' }];
    const result = appendBlock(segs, block);
    expect(result).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'block', block },
    ]);
  });
});

function streamFrom(s: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) { c.enqueue(enc.encode(s)); c.close(); },
  });
}

async function collect(s: string): Promise<SseEvent[]> {
  const out: SseEvent[] = [];
  for await (const ev of parseSse(streamFrom(s))) out.push(ev);
  return out;
}

describe('parseSse (framed)', () => {
  it('yields text delta frames', async () => {
    const s =
      'event: text\ndata: {"delta":"hello "}\n\n' +
      'event: text\ndata: {"delta":"world"}\n\n' +
      'event: done\ndata: {}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'hello ' },
      { kind: 'text', delta: 'world' },
      { kind: 'done' },
    ]);
  });

  it('yields block frames', async () => {
    const block = { id: 'b1', type: 'open-panel', data: { panel: 'resume' } };
    const s =
      'event: text\ndata: {"delta":"see "}\n\n' +
      `event: block\ndata: ${JSON.stringify(block)}\n\n` +
      'event: done\ndata: {}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'see ' },
      { kind: 'block', block },
      { kind: 'done' },
    ]);
  });

  it('yields error frame and stops', async () => {
    const s =
      'event: text\ndata: {"delta":"partial "}\n\n' +
      'event: error\ndata: {"message":"boom"}\n\n' +
      'event: text\ndata: {"delta":"should-not-appear"}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'partial ' },
      { kind: 'error', message: 'boom' },
    ]);
  });

  it('tolerates chunks split mid-frame', async () => {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('event: text\nda'));
        c.enqueue(enc.encode('ta: {"delta":"hi"}\n\nevent: done\ndata: {}\n\n'));
        c.close();
      },
    });
    const out: SseEvent[] = [];
    for await (const ev of parseSse(stream)) out.push(ev);
    expect(out).toEqual([{ kind: 'text', delta: 'hi' }, { kind: 'done' }]);
  });

  it('ignores frames missing data lines', async () => {
    const s = 'event: text\n\nevent: text\ndata: {"delta":"ok"}\n\nevent: done\ndata: {}\n\n';
    expect(await collect(s)).toEqual([
      { kind: 'text', delta: 'ok' },
      { kind: 'done' },
    ]);
  });
});
