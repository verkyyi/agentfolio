import type { BlockFrame } from './blocks';

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'open_panel',
    description:
      'Opens a side panel in the visitor UI showing the full resume, full activity history, or the target job description. Call only when the visitor explicitly asks for the full resume, activity, or JD. Not for short answers.',
    input_schema: {
      type: 'object',
      properties: {
        panel: { type: 'string', enum: ['resume', 'activity', 'jd'] },
      },
      required: ['panel'],
    },
  },
];

export interface ToolContext {
  slug: string;
  blockId: () => string;
}

export interface ToolResult {
  result: unknown;
  display_block?: BlockFrame;
}

export function makeBlockIdGenerator(): () => string {
  let n = 0;
  return () => `blk_${++n}`;
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  if (name === 'open_panel') {
    const panel = input.panel;
    if (panel !== 'resume' && panel !== 'activity' && panel !== 'jd') {
      throw new Error(`invalid panel: ${String(panel)}`);
    }
    return {
      result: { ok: true },
      display_block: { id: _ctx.blockId(), type: 'open-panel', data: { panel } },
    };
  }
  throw new Error(`unknown tool: ${name}`);
}
