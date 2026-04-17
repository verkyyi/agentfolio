import { describe, it, expect, vi, afterEach } from 'vitest';
import { callHints, buildHintsPrompt, parseHintsResponse } from '../src/hints';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('buildHintsPrompt', () => {
  it('includes name, target, and resume body', () => {
    const p = buildHintsPrompt({
      name: 'Alex',
      target: 'Notion — Staff Engineer',
      fitted: '<!--\nfit-summary:\ntarget: Notion\n-->\nExperience at Acme.',
      directives: null,
      jd: null,
    });
    expect(p).toContain('Alex');
    expect(p).toContain('Notion — Staff Engineer');
    expect(p).toContain('Experience at Acme.');
    expect(p).toContain('JSON array');
  });
  it('includes directives + jd when present', () => {
    const p = buildHintsPrompt({
      name: 'Alex', target: 't', fitted: 'r',
      directives: 'use markdown', jd: 'Senior role',
    });
    expect(p).toContain('use markdown');
    expect(p).toContain('Senior role');
  });
});

describe('parseHintsResponse', () => {
  it('extracts JSON array from an Anthropic messages non-streaming body', () => {
    const body = { content: [{ type: 'text', text: '["a","b","c"]' }] };
    expect(parseHintsResponse(body)).toEqual(['a', 'b', 'c']);
  });
  it('tolerates code fences and leading prose', () => {
    const body = { content: [{ type: 'text', text: 'Here you go:\n```json\n["x","y"]\n```' }] };
    expect(parseHintsResponse(body)).toEqual(['x', 'y']);
  });
  it('caps at 5 items and trims each to 80 chars', () => {
    const many = new Array(8).fill(0).map((_, i) => `hint ${i} ${'x'.repeat(100)}`);
    const body = { content: [{ type: 'text', text: JSON.stringify(many) }] };
    const out = parseHintsResponse(body);
    expect(out.length).toBe(5);
    for (const h of out) expect(h.length).toBeLessThanOrEqual(80);
  });
  it('returns [] for malformed JSON', () => {
    const body = { content: [{ type: 'text', text: 'not json' }] };
    expect(parseHintsResponse(body)).toEqual([]);
  });
  it('returns [] for non-string items', () => {
    const body = { content: [{ type: 'text', text: '[1,2,3]' }] };
    expect(parseHintsResponse(body)).toEqual([]);
  });
});

describe('callHints', () => {
  it('POSTs to /messages with stream:false and system cached block', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(
      JSON.stringify({ content: [{ type: 'text', text: '["q1","q2","q3"]' }] }),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const hints = await callHints({
      apiKey: 'sk-x', model: 'claude',
      name: 'Alex', target: 't', fitted: 'r', directives: null, jd: null,
      recentMessages: [],
    });
    expect(hints).toEqual(['q1', 'q2', 'q3']);
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) throw new Error('fetch not called');
    const body = JSON.parse(firstCall[1].body as string);
    expect(body.stream).toBe(false);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });
  it('returns [] on non-200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const hints = await callHints({
      apiKey: 'sk-x', model: 'claude', name: 'Alex', target: 't',
      fitted: 'r', directives: null, jd: null, recentMessages: [],
    });
    expect(hints).toEqual([]);
  });
  it('forwards recentMessages as Anthropic user/assistant turns', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(
      JSON.stringify({ content: [{ type: 'text', text: '[]' }] }),
      { status: 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);
    await callHints({
      apiKey: 'sk-x', model: 'claude', name: 'Alex', target: 't',
      fitted: 'r', directives: null, jd: null,
      recentMessages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }],
    });
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) throw new Error('fetch not called');
    const body = JSON.parse(firstCall[1].body as string);
    expect(body.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'Generate the hints now.' },
    ]);
  });
});
