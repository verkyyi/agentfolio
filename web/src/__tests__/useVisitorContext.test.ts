import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorContext } from '../hooks/useVisitorContext';

const registry = {
  'cohere-fde': {
    company: 'cohere',
    role: 'FDE, Agentic Platform',
    created: '2026-04-15',
    context: 'Applied via Ashby',
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => registry,
  })));
});

describe('useVisitorContext', () => {
  it('returns default context when path has no slug', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/agentfolio/' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'default',
      company: 'default',
    });
  });

  it('resolves slug from URL path against the registry', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/agentfolio/c/cohere-fde' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'slug',
      slug: 'cohere-fde',
      company: 'cohere',
      role: 'FDE, Agentic Platform',
    });
  });

  it('falls back to default when slug is unknown', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/c/not-a-real-slug' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context?.source).toBe('default');
  });
});
