import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FittedPreview } from '../components/FittedPreview';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('data/fitted/anthropic-fde-nyc.md')) {
      return { ok: true, text: async () => '# Lianghui Yi\n\nSenior Data Infrastructure Engineer' };
    }
    return { ok: false, status: 404 };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FittedPreview', () => {
  it('renders markdown content for a slug', async () => {
    render(<FittedPreview slug="anthropic-fde-nyc" />);
    await waitFor(() => expect(screen.getByText('Lianghui Yi')).toBeInTheDocument());
    expect(screen.getByText('Senior Data Infrastructure Engineer')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    render(<FittedPreview slug="nonexistent" />);
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument());
  });
});
