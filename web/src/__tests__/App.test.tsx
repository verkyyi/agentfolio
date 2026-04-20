import { render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText(/This page is an agent/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Chat')).toBeInTheDocument();
    expect(screen.queryByTestId('resume-theme')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-activity')).not.toBeInTheDocument();
  });

  it('renders 4 suggestions from meta.agentfolio.suggestions', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByTestId('chat-suggestion')).toHaveLength(4));
  });
});
