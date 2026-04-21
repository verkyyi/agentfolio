import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

const mockAdapted = {
  basics: { name: 'Verky Yi', summary: 'Product engineer.' },
  work: [],
  meta: { agentfolio: { suggestions: ['Roles?', 'Recent work?', 'AI experience?', 'Resume?'] } },
};

beforeEach(() => {
  vi.stubEnv('VITE_CHAT_PROXY_URL', 'https://proxy.example');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('/data/adapted/')) {
      return { ok: true, json: async () => mockAdapted } as unknown as Response;
    }
    return { ok: false } as unknown as Response;
  }));
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('App landing', () => {
  it('renders Hero and ChatPanel, not ResumeTheme or GithubActivity', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Verky Yi')).toBeInTheDocument());
    expect(screen.getByLabelText('Chat')).toBeInTheDocument();
    expect(screen.queryByTestId('resume-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-activity')).not.toBeInTheDocument();
  });

  it('renders 4 suggestions from meta.agentfolio.suggestions', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId('chat-suggestion')).toHaveLength(4));
  });

  it('opens the resume side panel when chat streams an open-panel block', async () => {
    const enc = new TextEncoder();
    const sseBody = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode('event: text\ndata: {"delta":"See my resume: "}\n\n'));
        c.enqueue(enc.encode('event: block\ndata: {"id":"b1","type":"open-panel","data":{"panel":"resume"}}\n\n'));
        c.enqueue(enc.encode('event: done\ndata: {}\n\n'));
        c.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      const s = String(url);
      if (s.includes('/data/adapted/')) {
        return { ok: true, json: async () => mockAdapted } as unknown as Response;
      }
      if (s.endsWith('/chat')) {
        return { ok: true, body: sseBody } as unknown as Response;
      }
      return { ok: false } as unknown as Response;
    }));
    vi.stubEnv('VITE_CHAT_PROXY_URL', 'http://test-proxy');

    render(<App />);
    await waitFor(() => expect(screen.getByText('Verky Yi')).toBeInTheDocument());
    const input = screen.getByLabelText('Message') as HTMLInputElement;
    await userEvent.type(input, 'show resume');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByTestId('side-panel')).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByTestId('side-panel-resume')).toBeInTheDocument();
  });
});
