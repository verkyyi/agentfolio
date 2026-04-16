import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../components/Dashboard';

const indexJson = [
  { slug: 'default', filename: 'default.md' },
  { slug: 'notion', filename: 'notion.md' },
];

const defaultMd = '# Alex Chen\n\nSenior Software Engineer';
const notionMd = '# Alex Chen\n\nSenior Data Infrastructure Engineer';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('data/fitted/index.json')) {
      return { ok: true, json: async () => indexJson };
    }
    if (url.includes('data/fitted/default.md')) {
      return { ok: true, text: async () => defaultMd };
    }
    if (url.includes('data/fitted/notion.md')) {
      return { ok: true, text: async () => notionMd };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('loads manifest and renders sidebar with first item selected', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('default')).toBeInTheDocument());
    expect(screen.getByText('notion')).toBeInTheDocument();
    // First item preview loads
    await waitFor(() => expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument());
  });

  it('switches to another resume when sidebar item is clicked', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('notion')).toBeInTheDocument());
    await userEvent.click(screen.getByText('notion'));
    await waitFor(() => expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument());
  });

  it('switches between Preview and Diff tabs', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('notion')).toBeInTheDocument());
    await userEvent.click(screen.getByText('notion'));
    await waitFor(() => expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Diff' }));
    await waitFor(() => expect(screen.getByTestId('diff-container')).toBeInTheDocument());
  });

  it('shows empty state when index is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('index.json')) return { ok: true, json: async () => [] };
      return { ok: false, status: 404 };
    }));
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/no fitted resumes/i)).toBeInTheDocument());
  });
});
