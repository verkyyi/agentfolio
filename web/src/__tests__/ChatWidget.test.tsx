import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatWidget } from '../components/ChatWidget';

afterEach(() => {
  vi.unstubAllEnvs();
  sessionStorage.clear();
});

describe('ChatWidget — mount condition', () => {
  it('renders nothing when VITE_CHAT_PROXY_URL is empty', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', '');
    const { container } = render(<ChatWidget slug="notion" target="Notion" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the floating button when env is set', () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    render(<ChatWidget slug="notion" target="Notion" />);
    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
  });

  it('opens the panel when the button is clicked', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion · Eng" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    expect(screen.getByText(/Notion · Eng/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows a static greeting referencing the target when opened', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion · Eng" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    const greeting = screen.getByTestId('chat-greeting');
    expect(greeting.textContent).toMatch(/Notion · Eng/);
  });
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

describe('ChatWidget — streaming send', () => {
  it('sends a POST and renders streamed assistant deltas', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    const fetchMock = vi.fn(async () => sseResponse([
      'event: content_block_delta\ndata: {"delta":{"text":"Hi"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"text":" there"}}\n\n',
      'event: message_stop\ndata: {}\n\n',
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    await user.type(screen.getByRole('textbox'), 'tell me about notion');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body as string);
    expect(body.slug).toBe('notion');
    expect(body.messages[0]).toEqual({ role: 'user', content: 'tell me about notion' });

    await screen.findByText('Hi there');
  });
});

describe('ChatWidget — persistence + reset', () => {
  it('loads messages from sessionStorage on mount', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'Welcome back' }]),
    );
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('reset clears messages and sessionStorage', async () => {
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
    sessionStorage.setItem(
      'agentfolio.chat.notion',
      JSON.stringify([{ role: 'assistant', content: 'old' }]),
    );
    const user = userEvent.setup();
    render(<ChatWidget slug="notion" target="Notion" />);
    await user.click(screen.getByRole('button', { name: /chat/i }));
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('agentfolio.chat.notion')).toBeNull();
  });
});
