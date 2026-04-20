import type { BlockFrame } from './blocks';
import { getActivity, getRecentDailyCounts } from './bundledData';

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
  {
    name: 'get_recent_activity',
    description:
      'Summarizes recent GitHub activity over a recent window (30 or 90 days). Returns total commits and a daily sparkline. Use when the visitor asks about recent work, momentum, or what you have been shipping.',
    input_schema: {
      type: 'object',
      properties: {
        window: { type: 'string', enum: ['30d', '90d'] },
      },
    },
  },
  {
    name: 'get_repo_highlight',
    description:
      'Look up a specific GitHub repo by name and return a highlight card with description and primary language. Use when the visitor asks about a specific project.',
    input_schema: {
      type: 'object',
      properties: { repo: { type: 'string' } },
      required: ['repo'],
    },
  },
  {
    name: 'get_work_highlight',
    description:
      'Look up a specific work experience entry by company name and return a highlight card with role, period, and up to 4 bullet points. Use when the visitor asks about a specific job or company.',
    input_schema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        focus: { type: 'string' },
      },
      required: ['company'],
    },
  },
];

export interface ToolContext {
  slug: string;
  blockId: () => string;
  adapted?: import('./context').AdaptedResume | null;
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
  if (name === 'get_recent_activity') {
    const window = input.window === '90d' ? '90d' : '30d';
    const days = window === '90d' ? 90 : 30;
    const all = getRecentDailyCounts();
    // Tail slice (oldest-first is preserved; we want the last `days` entries).
    const recent = all.slice(Math.max(0, all.length - days));
    // Pad at the front if the bundle has fewer days than requested.
    const sparkline: number[] = [];
    for (let i = 0; i < days; i++) {
      const idx = recent.length - days + i;
      sparkline.push(idx >= 0 ? (recent[idx]?.count ?? 0) : 0);
    }
    const totalCommits = sparkline.reduce((a, b) => a + b, 0);
    const data = {
      window: window as '30d' | '90d',
      totalCommits,
      // activity.json has no per-repo commit counts; topRepos stays empty.
      // The renderer hides this field when empty (ActivitySummary.tsx).
      topRepos: [] as Array<{ name: string; commits: number }>,
      sparkline,
    };
    return {
      result: data,
      display_block: { id: _ctx.blockId(), type: 'activity-summary', data },
    };
  }
  if (name === 'get_repo_highlight') {
    const repoName = typeof input.repo === 'string' ? input.repo : '';
    const { repos } = getActivity();
    const match = repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase());
    if (!match) throw new Error(`repo not found: ${repoName}`);
    const data = {
      name: match.name,
      description: match.description ?? '',
      url: match.url,
      primaryLang: match.language ?? undefined,
    };
    return {
      result: data,
      display_block: { id: _ctx.blockId(), type: 'repo-card', data },
    };
  }
  if (name === 'get_work_highlight') {
    const company = typeof input.company === 'string' ? input.company : '';
    const work = _ctx.adapted?.work ?? [];
    const match = work.find((w) => {
      const n = (w.name ?? w.company) as string | undefined;
      return typeof n === 'string' && n.toLowerCase() === company.toLowerCase();
    });
    if (!match) throw new Error(`work entry not found: ${company}`);
    const period = [match.startDate, match.endDate].filter(Boolean).join(' – ');
    const rawBullets = Array.isArray(match.highlights) ? match.highlights : [];
    const bullets = rawBullets.slice(0, 4);
    const data = {
      company,
      role: (match.position as string) ?? '',
      period,
      bullets,
    };
    return {
      result: data,
      display_block: { id: _ctx.blockId(), type: 'work-highlight', data },
    };
  }
  throw new Error(`unknown tool: ${name}`);
}
