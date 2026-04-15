import { describe, it, expect } from 'vitest';
import { resolveSlug, parseSlugFromPath } from '../utils/slugResolver';
import type { SlugRegistry } from '../types';

const registry: SlugRegistry = {
  'cohere-fde': {
    company: 'cohere',
    role: 'FDE, Agentic Platform',
    created: '2026-04-15',
    context: 'Applied via Ashby',
  },
  general: {
    company: 'default',
    role: null,
    created: '2026-04-15',
    context: 'LinkedIn',
  },
};

describe('parseSlugFromPath', () => {
  it('extracts slug from /c/<slug>', () => {
    expect(parseSlugFromPath('/agentfolio/c/cohere-fde')).toBe('cohere-fde');
    expect(parseSlugFromPath('/c/cohere-fde')).toBe('cohere-fde');
  });

  it('returns null when no slug segment', () => {
    expect(parseSlugFromPath('/agentfolio/')).toBeNull();
    expect(parseSlugFromPath('/')).toBeNull();
    expect(parseSlugFromPath('/c/')).toBeNull();
  });

  it('ignores extra path segments after slug', () => {
    expect(parseSlugFromPath('/c/cohere-fde/something')).toBe('cohere-fde');
  });
});

describe('resolveSlug', () => {
  it('returns slug-based context when slug exists in registry', () => {
    const ctx = resolveSlug('cohere-fde', registry);
    expect(ctx).toEqual({
      source: 'slug',
      slug: 'cohere-fde',
      company: 'cohere',
      role: 'FDE, Agentic Platform',
    });
  });

  it('falls back to default when slug is null', () => {
    const ctx = resolveSlug(null, registry);
    expect(ctx).toEqual({
      source: 'default',
      company: 'default',
      role: null,
    });
  });

  it('falls back to default when slug is not in registry', () => {
    const ctx = resolveSlug('unknown-slug', registry);
    expect(ctx.source).toBe('default');
    expect(ctx.company).toBe('default');
  });
});
