import { describe, it, expect } from 'vitest';
import worker from '../src/worker';

describe('worker smoke', () => {
  it('returns 501 for unimplemented', async () => {
    const req = new Request('https://example.com/chat', { method: 'POST' });
    const env = {} as any;
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(501);
  });
});
