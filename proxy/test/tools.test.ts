import { describe, expect, it } from 'vitest';
import { TOOL_DEFS, executeTool, makeBlockIdGenerator } from '../src/tools';

describe('TOOL_DEFS', () => {
  it('includes open_panel', () => {
    const names = TOOL_DEFS.map((t) => t.name);
    expect(names).toContain('open_panel');
  });
});

describe('executeTool open_panel', () => {
  it('returns ok and an open-panel display_block', async () => {
    const blockId = makeBlockIdGenerator();
    const res = await executeTool('open_panel', { panel: 'resume' }, { slug: 'default', blockId });
    expect(res.result).toEqual({ ok: true });
    expect(res.display_block).toEqual({
      id: 'blk_1',
      type: 'open-panel',
      data: { panel: 'resume' },
    });
  });

  it('rejects unknown panel', async () => {
    const blockId = makeBlockIdGenerator();
    await expect(executeTool('open_panel', { panel: 'other' } as never, { slug: 'default', blockId }))
      .rejects.toThrow();
  });
});

describe('executeTool unknown name', () => {
  it('throws', async () => {
    const blockId = makeBlockIdGenerator();
    await expect(executeTool('nope' as never, {}, { slug: 'default', blockId }))
      .rejects.toThrow(/unknown tool/i);
  });
});
