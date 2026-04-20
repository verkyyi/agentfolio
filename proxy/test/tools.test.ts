import { describe, expect, it, beforeEach } from 'vitest';
import { TOOL_DEFS, executeTool, _resetBlockCounter } from '../src/tools';

beforeEach(() => _resetBlockCounter());

describe('TOOL_DEFS', () => {
  it('includes open_panel', () => {
    const names = TOOL_DEFS.map((t) => t.name);
    expect(names).toContain('open_panel');
  });
});

describe('executeTool open_panel', () => {
  it('returns ok and an open-panel display_block', async () => {
    const res = await executeTool('open_panel', { panel: 'resume' }, { slug: 'default' });
    expect(res.result).toEqual({ ok: true });
    expect(res.display_block).toEqual({
      id: 'blk_1',
      type: 'open-panel',
      data: { panel: 'resume' },
    });
  });

  it('rejects unknown panel', async () => {
    await expect(executeTool('open_panel', { panel: 'other' } as never, { slug: 'default' }))
      .rejects.toThrow();
  });
});

describe('executeTool unknown name', () => {
  it('throws', async () => {
    await expect(executeTool('nope' as never, {}, { slug: 'default' }))
      .rejects.toThrow(/unknown tool/i);
  });
});
