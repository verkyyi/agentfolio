import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../components/ChatPanel';

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
    render(<ChatPanel slug="default" ownerName="Alex Chen" email="a@b.co" profiles={[{ network: 'LinkedIn', url: 'https://l.co' }]} />);
    expect(screen.getByText(/chat is offline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /a@b\.co/ })).toHaveAttribute('href', 'mailto:a@b.co');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://l.co');
  });

  it('does not render the "· chat" left label in offline state', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    render(<ChatPanel slug="default" ownerName="Alex Chen" />);
    // No leading "· chat" span anywhere
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
  });
});

describe('ChatPanel — inline default state', () => {
  it('always shows greeting + suggestion chips without needing a click', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByTestId('chat-greeting')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chat-suggestion');
    expect(chips).toHaveLength(3);
  });

  it('greeting names the owner and does not mention target/context', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(/knows Alex Chen/);
    expect(greeting).toHaveTextContent(/ask me anything/i);
    expect(greeting).not.toHaveTextContent(/context/i);
  });

  it('greeting includes the tagline sentence when provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="notion"
        ownerName="Alex Chen"
        tagline="Senior engineer with a decade of experience."
      />,
    );
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Alex Chen\. Senior engineer with a decade of experience\. Ask me anything\./,
    );
  });

  it('greeting falls back gracefully when tagline is absent', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Alex Chen\. Ask me anything\./,
    );
    expect(greeting.textContent).not.toMatch(/\.\s{2,}Ask/);
  });

  it('header does not render a "· chat" or "context:" left label', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.queryByText(/· chat/)).not.toBeInTheDocument();
    expect(screen.queryByText(/context:/i)).not.toBeInTheDocument();
  });

  it('renders the greeting prop when provided, replacing the hardcoded line', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="notion"
        ownerName="Alex Chen"
        greeting="Hey — I'm an agent that knows Alex. Ask me about the Flink pipeline."
      />,
    );
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey — I'm an agent that knows Alex\. Ask me about the Flink pipeline\./,
    );
    expect(greeting).not.toHaveTextContent(/Ask me anything/);
  });

  it('renders three tailored suggestion chips when suggestions prop is provided', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="notion"
        ownerName="Alex Chen"
        suggestions={['Why Notion?', 'Walk me through the Flink pipeline', "What's not on the résumé?"]}
      />,
    );
    const chips = screen.getAllByTestId('chat-suggestion').map((el) => el.textContent);
    expect(chips).toEqual([
      'Why Notion?',
      'Walk me through the Flink pipeline',
      "What's not on the résumé?",
    ]);
  });

  it('falls back to DEFAULT_SUGGESTIONS when suggestions prop is not an array of exactly 3', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(
      <ChatPanel
        slug="notion"
        ownerName="Alex Chen"
        suggestions={['only one']}
      />,
    );
    const chips = screen.getAllByTestId('chat-suggestion').map((el) => el.textContent);
    expect(chips).toEqual([
      'Walk me through the résumé',
      'Why is this a fit?',
      "What's not on the résumé?",
    ]);
  });

  it('falls back to the hardcoded greeting when greeting prop is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" greeting="" />);
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting).toHaveTextContent(
      /Hey, I'm an agent that knows Alex Chen\. Ask me anything\./,
    );
  });

  it('clicking a chip prefills the input but does not auto-submit', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const chip = screen.getAllByTestId('chat-suggestion')[0];
    await user.click(chip);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(chip.textContent);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reset link appears only when messages exist', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'hi again' }]),
    );
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
  });

  it('reset link is hidden when there are no messages', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.queryByRole('button', { name: /clear conversation/i })).not.toBeInTheDocument();
  });
});

describe('ChatPanel — streaming send', () => {
  it('sends a POST and renders streamed assistant deltas', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n',
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.type(screen.getByRole('textbox'), 'tell me about notion');
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
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <ChatPanel
        slug="notion"
        ownerName="Alex Chen"
        greeting="Hey — ask about the Flink pipeline."
      />,
    );
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.greeting).toBe('Hey — ask about the Flink pipeline.');
    expect(body.slug).toBe('notion');
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it('sends the fallback greeting when no greeting prop is provided', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => sseResponse([
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.greeting).toContain('Alex Chen');
    expect(body.greeting).toContain('Ask me anything');
  });
});

describe('ChatPanel — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'Welcome back' }]),
    );
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'old' }]),
    );
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    await user.click(screen.getByRole('button', { name: /clear conversation/i }));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('agentfolio.chat.notion')).toBeNull();
  });
});

describe('ChatPanel — error handling', () => {
  it('removes the trailing empty assistant bubble on fetch error', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
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
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'line one\nline two\nline three' }]),
    );
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
    const body = document.querySelector('.chatp-msg.assistant:not(.chatp-greeting) .chatp-msg-body');
    expect(body).not.toBeNull();
    expect(body!.textContent).toBe('line one\nline two\nline three');
  });

  it('caps response length and appends a truncation indicator', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    // Stream > 2000 chars across two deltas so truncation fires mid-stream.
    const huge = 'x'.repeat(1500);
    const fetchMock = vi.fn(async () => sseResponse([
      `event: content_block_delta\ndata: ${JSON.stringify({ delta: { text: huge } })}\n\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({ delta: { text: huge } })}\n\n`,
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
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
      'event: content_block_delta\ndata: {"delta":{"text":"hey"}}\n\n',
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" ownerName="Alex Chen" />);
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
