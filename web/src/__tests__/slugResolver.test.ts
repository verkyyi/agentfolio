import { describe, it, expect } from 'vitest';
import { resolveSlug, parseSlugFromPath } from '../utils/slugResolver';
import type { SlugRegistry } from '../types';

const registry: SlugRegistry = {
  'sample-company': {
    company: 'sample-company',
    role: 'Software Engineer',
    created: '2026-01-01',
    context: 'Sample',
  },
};

describe('parseSlugFromPath', () => {
  it('extracts slug from root path', () => {
    expect(parseSlugFromPath('/sample-company')).toBe('sample-company');
  });

  it('returns null for bare root', () => {
    expect(parseSlugFromPath('/')).toBeNull();
    expect(parseSlugFromPath('')).toBeNull();
  });

  it('strips base path before parsing', () => {
    expect(parseSlugFromPath('/agentfolio/sample-company', '/agentfolio/')).toBe('sample-company');
    expect(parseSlugFromPath('/agentfolio/', '/agentfolio/')).toBeNull();
  });

  it('takes first segment only', () => {
    expect(parseSlugFromPath('/sample-company/extra')).toBe('sample-company');
  });
});

describe('resolveSlug', () => {
  it('returns slug-based context when slug exists in registry', () => {
    const ctx = resolveSlug('sample-company', registry);
    expect(ctx).toEqual({
      source: 'slug',
      slug: 'sample-company',
      company: 'sample-company',
      role: 'Software Engineer',
    });
  });

  it('returns default when slug is null', () => {
    const ctx = resolveSlug(null, registry);
    expect(ctx).toEqual({
      source: 'default',
      company: 'default',
      role: null,
    });
  });

  it('returns not_found for unknown slug', () => {
    const ctx = resolveSlug('unknown-slug', registry);
    expect(ctx.source).toBe('default');
    expect(ctx.company).toBe('__not_found__');
    expect(ctx.slug).toBe('unknown-slug');
  });
});
