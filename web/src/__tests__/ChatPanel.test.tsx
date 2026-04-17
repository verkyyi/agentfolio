import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    render(<ChatPanel slug="default" target="default" email="a@b.co" profiles={[{ network: 'LinkedIn', url: 'https://l.co' }]} />);
    expect(screen.getByText(/chat is offline/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /a@b\.co/ })).toHaveAttribute('href', 'mailto:a@b.co');
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://l.co');
  });
});

describe('ChatPanel — inline default state', () => {
  it('always shows greeting + suggestion chips without needing a click', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByTestId('chat-greeting')).toBeInTheDocument();
    const chips = screen.getAllByTestId('chat-suggestion');
    expect(chips).toHaveLength(3);
  });

  it('clicking a chip prefills the input but does not auto-submit', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
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
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByRole('button', { name: /clear conversation/i })).toBeInTheDocument();
  });

  it('reset link is hidden when there are no messages', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatPanel slug="notion" target="Notion" />);
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
    render(<ChatPanel slug="notion" target="Notion" />);
    await user.type(screen.getByRole('textbox'), 'tell me about notion');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    await screen.findByText('Hi there');
  });
});

describe('ChatPanel — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'Welcome back' }]),
    );
    render(<ChatPanel slug="notion" target="Notion" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'old' }]),
    );
    const user = userEvent.setup();
    render(<ChatPanel slug="notion" target="Notion" />);
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
    render(<ChatPanel slug="notion" target="Notion" />);
    await user.type(screen.getByRole('textbox'), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await screen.findByText(/something went wrong/i);
    expect(screen.getByText('hi')).toBeInTheDocument();
    const assistantBubbles = document.querySelectorAll('.chatp-msg.assistant');
    // Only the greeting — no empty placeholder
    expect(assistantBubbles.length).toBe(1);
  });
});
