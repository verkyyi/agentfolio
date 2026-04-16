import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorContext } from '../hooks/useVisitorContext';

const registry = {
  'sample-company': {
    company: 'sample-company',
    role: 'Software Engineer',
    created: '2026-01-01',
    context: 'Sample',
  },
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => registry,
  })));
});

describe('useVisitorContext', () => {
  it('returns default context at root path', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'default',
      company: 'default',
    });
  });

  it('resolves slug from path against the registry', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/sample-company' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context).toMatchObject({
      source: 'slug',
      slug: 'sample-company',
      company: 'sample-company',
      role: 'Software Engineer',
    });
  });

  it('returns not_found company for unknown slug', async () => {
    const { result } = renderHook(() =>
      useVisitorContext({ pathname: '/not-a-real-slug' }),
    );
    await waitFor(() => expect(result.current.context).not.toBeNull());
    expect(result.current.context?.company).toBe('__not_found__');
  });
});
