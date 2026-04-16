import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FittedDiff } from '../components/FittedDiff';

const defaultMd = '# Alex Chen\n\nSenior Software Engineer with experience in full-stack development.';
const notionMd = '# Alex Chen\n\nSenior Data Infrastructure Engineer with experience in large-scale pipelines.';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
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

describe('FittedDiff', () => {
  it('renders inline diff with additions and deletions', async () => {
    render(<FittedDiff slug="notion" />);
    await waitFor(() => {
      expect(screen.getByText(/Data Infrastructure/)).toBeInTheDocument();
    });
    // Check that diff markers exist (added and removed spans)
    const container = screen.getByTestId('diff-container');
    const added = container.querySelectorAll('[data-diff="added"]');
    const removed = container.querySelectorAll('[data-diff="removed"]');
    expect(added.length).toBeGreaterThan(0);
    expect(removed.length).toBeGreaterThan(0);
  });

  it('shows disabled message for default slug', () => {
    render(<FittedDiff slug="default" />);
    expect(screen.getByText(/nothing to compare/i)).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    render(<FittedDiff slug="nonexistent" />);
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument());
  });
});
